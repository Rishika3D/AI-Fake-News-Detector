from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
import os

app = Flask(__name__)
CORS(app) # Allow React to talk to this API

# ============================================================
# ☁️ CLOUD CONFIGURATION
# ============================================================
# This is YOUR specific model hosted on Hugging Face
MODEL_ID = "Rishika08/faang-fact-checker"

print(f"⬇️  Initializing Logic Engine from: {MODEL_ID}...")
print("    (First run may take 30s to download the model cache)")

try:
    # This automatically downloads your model from the internet
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
    model.eval() # Set to inference mode (read-only)
    print("✅ Model Loaded Successfully & Ready for Queries!")
except Exception as e:
    print(f"❌ Critical Error: Could not download model from Hugging Face.\n{e}")
    exit(1)

# MNLI Label Mapping: 0=Entailment, 1=Neutral, 2=Contradiction
LABELS = ["TRUSTED", "NEUTRAL", "FAKE"]

# ============================================================
# 🔌 API ENDPOINT
# ============================================================
@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    claim = data.get('claim')
    evidence = data.get('evidence')

    # Basic Validation
    if not claim or not evidence:
        return jsonify({"error": "Please provide both a claim and evidence."}), 400

    # 1. Prepare Inputs for the AI
    inputs = tokenizer(
        claim, 
        evidence, 
        return_tensors="pt", 
        truncation=True, 
        max_length=512
    )

    # 2. Run Inference
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits

    # 3. Calculate Confidence
    probs = F.softmax(logits, dim=1)
    confidence, predicted_id = torch.max(probs, dim=1)
    
    # 4. Format Response
    verdict = LABELS[predicted_id.item()]
    confidence_score = confidence.item()

    print(f"🔍 Analyzed: '{claim}' vs Evidence -> Verdict: {verdict} ({confidence_score:.1%})")

    return jsonify({
        "verdict": verdict,
        "confidence": f"{confidence_score:.1%}",
        # Optional: Send raw scores if you want to show a bar chart on frontend
        "details": {
            "trusted_score": f"{probs[0][0]:.4f}",
            "neutral_score": f"{probs[0][1]:.4f}",
            "fake_score": f"{probs[0][2]:.4f}"
        }
    })

if __name__ == '__main__':
    # Run on port 5000
    app.run(port=5000, debug=True)