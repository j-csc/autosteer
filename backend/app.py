import sys
from pathlib import Path
from typing import Optional

import modal

MODEL_NAME = "google/gemma-2-9b-it"

app = modal.App("smol-interp")

image = modal.Image.debian_slim().pip_install("transformer-lens")

@app.function(gpu="T4", image=image)
def load_model(model_name: str = MODEL_NAME):
    from transformer_lens import HookedTransformer

    model = HookedTransformer.from_pretrained(
        model_name,
        device_map="auto",
        torch_dtype="auto",
    )

    print(f"Loaded {model_name}")
    print(f"Model config: {model.cfg}")

    return {"model_name": model_name, "n_layers": model.cfg.n_layers, "d_model": model.cfg.d_model}

@app.local_entrypoint()
def main():
    result = load_model.remote()
    print(result)
