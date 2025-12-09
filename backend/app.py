import modal

MODEL_NAME = "google/gemma-2-2b-it"
SAE_RELEASE = "gemma-scope-2b-pt-res-canonical"
SAE_ID = "layer_0/width_16k/canonical"

app = modal.App("smol-interp")

image = modal.Image.debian_slim().pip_install("transformer-lens", "sae-lens")

volume = modal.Volume.from_name("model-cache", create_if_missing=True)

@app.cls(
    gpu="T4",
    image=image,
    secrets=[modal.Secret.from_name("huggingface-secret")],
    volumes={"/cache": volume},
    scaledown_window=300,
)
class Model:
    @modal.enter()
    def load(self):
        import torch
        from transformer_lens import HookedTransformer
        from transformer_lens.hook_points import HookPoint
        from sae_lens import (SAE, ActivationsStore, HookedSAETransformer, LanguageModelSAERunnerConfig)

        self.model = HookedSAETransformer.from_pretrained_no_processing(
            MODEL_NAME,
            device="cuda",
            torch_dtype=torch.bfloat16,
            cache_dir="/cache",
        )

        self.sae, self.cfg_dict, self.sparsity = SAE.from_pretrained(
            release=SAE_RELEASE,
            sae_id=SAE_ID,
            device="cuda"
        )

    @modal.method()
    def run_inference(self, prompt: str):
        toks = self.model.to_tokens(prompt)
        logits = self.model(toks)

        return {
            "logits": logits.squeeze(0).tolist()
        }

    @modal.method()
    def test_sae(self, prompt: str):
        print(self.sae.cfg)
        pass
    

    @modal.method()
    def get_model_info(self):
        return {
            "model_name": MODEL_NAME,
            "n_layers": self.model.cfg.n_layers,
            "d_model": self.model.cfg.d_model,
        }


@app.local_entrypoint()
def main():
    model = Model()

    info = model.get_model_info.remote()
    print(f"Model info: {info}")

    prompt = "The Eiffel Tower is in"
    print(f"\nRunning inference on: '{prompt}'")

    model.test_sae.remote(prompt)
