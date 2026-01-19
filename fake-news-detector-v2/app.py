import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F

app = FastAPI()

# 🧠 YOUR MODEL
MODEL_NAME = "hamzab/roberta-fake-news-classification"

print(f"⏳ Downloading/Loading brain from {MODEL_NAME}...")

# 🛑 FORCE CPU (To prevent Mac MPS crashes during debugging)
device = "cpu"
print(f"🚀 Using Device: {device.upper()}")

# Load Model
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).to(device)

print("✅ Model Loaded Successfully!")
print(f"🧐 Model expects {model.num_labels} labels.")

class TextRequest(BaseModel):
    text: str

@app.post("/predict_text")
def predict_text(request: TextRequest):
    print(f"\nIncoming request: {request.text[:30]}...")
    try:
        # 1. Prepare Text
        inputs = tokenizer(request.text, return_tensors="pt", truncation=True, max_length=512).to(device)
        
        # 2. Predict
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            
            # 🔍 CRITICAL DEBUG: Print the shape!
            print(f"🧠 Logits Shape: {logits.shape}")
            print(f"🧠 Raw Logits: {logits}")

            # 3. Handle different model shapes safely
            probs = F.softmax(logits, dim=1).cpu().numpy()[0]
            print(f"📊 Probabilities: {probs}")

            # Safe extraction
            score_0 = float(probs[0]) 
            # If model only has 1 label, this prevents crash:
            score_1 = float(probs[1]) if len(probs) > 1 else 0.0

            # Map results (Standard: 0=Fake, 1=Real)
            # If your model is inverted, we will see it in the logs
            if score_1 > score_0:
                label = "Real"
                confidence = score_1
            else:
                label = "Fake"
                confidence = score_0

        return {
            "label": label,
            "confidence": confidence * 100,
            "raw_scores": {"LABEL_0": score_0, "LABEL_1": score_1}
        }

    except Exception as e:
        # 🚨 This prints the ACTUAL error to your terminal
        print(f"❌ CRITICAL ERROR: {repr(e)}")
        import traceback
        traceback.print_exc()
        return {"label": "ERROR", "confidence": 0, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)