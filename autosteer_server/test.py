from dotenv import load_dotenv
import os
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import modal

app = modal.App()

load_dotenv()

hf_access_token = os.getenv("HF_ACCESS_TOKEN")

tokenizer = AutoTokenizer.from_pretrained(
    "google/gemma-2-2b-it",
    token=hf_access_token,
)
model = AutoModelForCausalLM.from_pretrained(
    "google/gemma-2-2b-it",
    output_hidden_states=True,
    torch_dtype=torch.bfloat16,
    token=hf_access_token,
)

input_text = "Write me a poem about Machine Learning."
input_ids = tokenizer(input_text, return_tensors="pt").to("cuda")

outputs = model.generate(**input_ids, max_new_tokens=32)
print(tokenizer.decode(outputs[0]))
