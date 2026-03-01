from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import os

app = Flask(__name__)
CORS(app)

# ============================================================
# Zero-shot classification — no fine-tuning required.
# facebook/bart-large-mnli is the standard benchmark model
# for zero-shot NLI and works well out of the box on
# real-world news article text.
# ============================================================
MODEL_ID = "facebook/bart-large-mnli"

print(f"⬇️  Loading zero-shot classifier: {MODEL_ID}...")
print("    (First run downloads ~1.6 GB — subsequent starts are instant)")

try:
    classifier = pipeline("zero-shot-classification", model=MODEL_ID)
    print("✅ Classifier ready!")
except Exception as e:
    print(f"❌ Could not load model: {e}")
    exit(1)

# Labels we ask the model to choose between
CANDIDATE_LABELS = ["real news", "fake news", "satire"]

LABEL_MAP = {
    "real news": "TRUSTED",
    "fake news": "FAKE",
    "satire":    "SATIRE",
}

# ============================================================
# ENDPOINTS
# ============================================================

@app.route('/predict_text', methods=['POST'])
def predict_text():
    """Called by the Node.js backend with raw article text."""
    data = request.json or {}
    text = data.get('text', '').strip()

    if len(text) < 10:
        return jsonify({"error": "Text too short to analyze."}), 400

    # Keep within a reasonable token budget
    text = text[:1500]

    result = classifier(text, candidate_labels=CANDIDATE_LABELS)

    top_label   = result["labels"][0]
    confidence  = result["scores"][0]
    mapped      = LABEL_MAP.get(top_label, "NEUTRAL")

    print(f"🔍 [{mapped} {confidence:.1%}] {text[:80]}...")

    return jsonify({
        "label":      mapped,
        "confidence": f"{confidence:.1%}",
    })


@app.route('/predict', methods=['POST'])
def predict():
    """Legacy endpoint — accepts claim + evidence or falls back to claim only."""
    data     = request.json or {}
    claim    = data.get('claim', '').strip()
    evidence = data.get('evidence', '').strip()

    if not claim:
        return jsonify({"error": "Please provide a claim."}), 400

    text = f"{claim} {evidence}".strip()[:1500]

    result     = classifier(text, candidate_labels=CANDIDATE_LABELS)
    top_label  = result["labels"][0]
    confidence = result["scores"][0]
    mapped     = LABEL_MAP.get(top_label, "NEUTRAL")

    print(f"🔍 [{mapped} {confidence:.1%}] {claim[:60]}...")

    return jsonify({
        "label":      mapped,
        "verdict":    mapped,
        "confidence": f"{confidence:.1%}",
        "details": {
            label: f"{score:.4f}"
            for label, score in zip(result["labels"], result["scores"])
        },
    })


if __name__ == '__main__':
    app.run(port=8000, debug=True)
