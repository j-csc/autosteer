from typing import NamedTuple

import modal
import pandas as pd
import requests

MODEL_NAME = "google/gemma-2-2b-it"
SAE_RELEASE = "gemma-scope-2b-pt-res-canonical"
SAE_ID = "layer_0/width_16k/canonical"


class SteeringConfig(NamedTuple):
    steering_feature: int
    max_act: float
    steering_strength: float


app = modal.App("smol-interp")

image = modal.Image.debian_slim().pip_install("transformer-lens", "sae-lens")

volume = modal.Volume.from_name("model-cache", create_if_missing=True)

# TODO: Try feature finding with ablation and attribution patching and DLA


@app.cls(
    gpu="T4",
    image=image,
    secrets=[modal.Secret.from_name("huggingface-secret")],
    volumes={"/cache": volume},
    scaledown_window=300,
)
class Interp:
    @modal.enter()
    def load(self):
        import os
        import pickle

        import torch
        from sae_lens import (
            SAE,
            HookedSAETransformer,
        )

        self.model = HookedSAETransformer.from_pretrained_no_processing(
            MODEL_NAME,
            device="cuda",
            torch_dtype=torch.bfloat16,
            cache_dir="/cache",
        )

        self.sae, self.cfg_dict, self.sparsity = SAE.from_pretrained(
            release=SAE_RELEASE, sae_id=SAE_ID, device="cuda"
        )

        # Load or fetch Neuronpedia explanations with caching
        cache_path = "/cache/neuronpedia_explanations.pkl"
        if os.path.exists(cache_path):
            with open(cache_path, "rb") as f:
                self.explanations_df = pickle.load(f)
        else:
            self.explanations_df = self._fetch_neuronpedia_explanations()
            with open(cache_path, "wb") as f:
                pickle.dump(self.explanations_df, f)

    @modal.method()
    def run_inference(self, prompt: str):
        toks = self.model.to_tokens(prompt)
        logits = self.model(toks)

        return {"logits": logits.squeeze(0).tolist()}

    @modal.method()
    def get_explanations_df(self) -> pd.DataFrame:
        return self.explanations_df

    def _fetch_neuronpedia_explanations(
        self, sae_release=SAE_RELEASE, sae_id=SAE_ID
    ) -> pd.DataFrame:
        from sae_lens.loading.pretrained_saes_directory import (
            get_pretrained_saes_directory,
        )

        release = get_pretrained_saes_directory()[sae_release]
        neuronpedia_id = release.neuronpedia_id[sae_id]

        url = "https://www.neuronpedia.org/api/explanation/export?modelId={}&saeId={}".format(
            *neuronpedia_id.split("/")
        )
        headers = {"Content-Type": "application/json"}
        response = requests.get(url, headers=headers)
        df = pd.DataFrame(response.json())
        df["index"] = df["index"].astype(int)
        return df

    @modal.method()
    def get_activated_features(self, prompt: str):
        import torch
        from sae_lens import SAE

        assert self.sae is not None and isinstance(self.sae, SAE), (
            "SAE not loaded yet. Call load() first."
        )

        logits, cache = self.model.run_with_cache_with_saes(prompt, saes=[self.sae])

        assert logits is not None and isinstance(logits, torch.Tensor), (
            "Logits should be a tensor"
        )

        top_logit_token_id = logits[0, -1].argmax(-1)
        top_logit_token_text = self.model.to_string(top_logit_token_id)
        print(
            f"Top predicted token from standard model logits: {top_logit_token_text!r}"
        )

        cachename = f"{self.sae.cfg.metadata.hook_name}.hook_sae_acts_post"
        sae_acts_post = cache[cachename][0, -1, :]
        print([(act, idx) for act, idx in zip(*sae_acts_post.topk(5))])

    @modal.method()
    def get_model_info(self):
        return {
            "model_name": MODEL_NAME,
            "n_layers": self.model.cfg.n_layers,
            "d_model": self.model.cfg.d_model,
        }

    # TODO: Implement get_autosteer method
    @modal.method()
    def get_autosteer(self) -> list[SteeringConfig] | None:
        pass

    @modal.method()
    def run_with_steering(
        self,
        prompt: str,
        steering_configs: list[SteeringConfig],
        max_new_tokens: int = 100,
    ):
        from functools import partial

        import torch
        from sae_lens import SAE

        assert self.sae is not None and isinstance(self.sae, SAE), (
            "SAE not loaded yet. Call load() first."
        )

        def steering(
            activations, hook, steering_vector=None, max_act=1.0, steering_strength=1.0
        ):
            if steering_vector is None:
                return activations
            return activations + max_act * steering_strength * steering_vector

        input_ids = self.model.to_tokens(
            prompt, prepend_bos=self.sae.cfg.metadata.prepend_bos
        )

        combined_steering_vector = torch.zeros(
            self.sae.cfg.d_sae, device=self.model.cfg.device
        )

        for config in steering_configs:
            steering_vector = self.sae.W_dec[config.steering_feature].to(
                self.model.cfg.device
            )
            combined_steering_vector += (
                config.max_act * config.steering_strength * steering_vector
            )

        steering_hook = partial(
            steering,
            steering_vector=combined_steering_vector,
            max_act=1.0,
            steering_strength=1.0,
        )

        with self.model.hooks(
            fwd_hooks=[(self.sae.cfg.metadata.hook_name, steering_hook)]
        ):
            output = self.model.generate(
                input_ids,
                max_new_tokens=max_new_tokens,
                temperature=0.7,
                top_p=0.9,
                stop_at_eos=True,
                prepend_bos=self.sae.cfg.metadata.prepend_bos,
            )

        print(type(output), output)
        return self.model.tokenizer.decode(output[0])


@app.local_entrypoint()
def main():
    model = Interp()

    info = model.get_model_info.remote()
    print(f"Model info: {info}")

    # try steering
    prompt = "the quick brown fox jumps over the lazy dog"
    out = model.get_activated_features.remote(prompt)
    print(out)
