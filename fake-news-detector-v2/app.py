from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
import os

# Initialize the API
app = FastAPI(title="VeriNews AI Engine")

# ==========================================
# 1. CONFIGURATION
# ==========================================
# 🚀 We now point to your Hugging Face Cloud Repository
MODEL_ID = "Rishika08/verinews-roberta"

# ==========================================
# 2. LOAD AI MODEL (Runs once at startup)
# ==========================================
print(f"⏳ Downloading/Loading brain from {MODEL_ID}...")

try:
    # This automatically fetches the model from Hugging Face if not found locally
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
    
    # Check for Hardware Acceleration
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print("🚀 Using Acceleration: Apple MPS (Mac GPU)")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        print("🚀 Using Acceleration: NVIDIA CUDA (GPU)")
    else:
        device = torch.device("cpu")
        print("🐢 Using CPU")
        
    model.to(device)
    print("✅ Model Loaded Successfully!")

except Exception as e:
    print(f"❌ CRITICAL ERROR: Could not download model.\n{e}")
    # Common fix: Run 'huggingface-cli login' in terminal if repo is private

# ==========================================
# 3. DEFINE INPUT FORMAT
# ==========================================
class TextRequest(BaseModel):
    text: str

# ==========================================
# 4. PREDICTION ENDPOINT
# ==========================================
@app.post("/predict_text")
async def predict_text(request: TextRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        # A. Preprocessing
        inputs = tokenizer(
            request.text, 
            return_tensors="pt", 
            truncation=True, 
            max_length=512,
            padding=True
        ).to(device)

        # B. Inference
        with torch.no_grad():
            outputs = model(**inputs)

        # C. Post-processing
        logits = outputs.logits
        probs = F.softmax(logits, dim=-1)
        
        # Extract scores
        # Based on your training logs, index 0 is usually Fake, 1 is Real
        # We use .item() to get a standard Python float
        score_fake = probs[0][0].item()
        score_real = probs[0][1].item()

        if score_real > score_fake:
            prediction = "REAL"
            confidence = score_real
        else:
            prediction = "FAKE"
            confidence = score_fake

        return {
            "label": prediction,
            "confidence": round(confidence * 100, 2),
            "raw_scores": {"REAL": score_real, "FAKE": score_fake}
        }

    except Exception as e:
        print(f"❌ Prediction Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 5. HEALTH CHECK
# ==========================================
@app.get("/")
def health_check():
    return {"status": "online", "model": MODEL_ID}