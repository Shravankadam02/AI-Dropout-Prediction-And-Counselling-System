# =========================================================
# DROPOUT PREDICTION API (FastAPI)
# Run: uvicorn api:app --reload --port 8000
# Requires: dropout_model.pkl, label_encoder.pkl, model_metadata.json
#           (all produced by train_model.py)
# pip install fastapi uvicorn shap joblib pandas
# =========================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, create_model
import joblib
import json
import pandas as pd
import shap

app = FastAPI(title="Student Dropout Risk API")

# Allow the dashboard (running on a different port) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Load model artifacts once at startup ----
model = joblib.load("dropout_model.pkl")
le = joblib.load("label_encoder.pkl")
with open("model_metadata.json") as f:
    metadata = json.load(f)

FEATURES = metadata["features"]
explainer = shap.TreeExplainer(model)

# ---- Build a request schema dynamically from the feature list ----
fields = {feat: (float, ...) for feat in FEATURES}
StudentInput = create_model("StudentInput", **fields)


@app.get("/")
def home():
    return {
        "status": "running",
        "model": metadata["model_name"],
        "test_accuracy": metadata["test_accuracy"],
        "features_required": FEATURES,
        "feature_descriptions": metadata.get("feature_descriptions", {}),
    }


@app.post("/predict")
def predict(student: StudentInput):
    row = pd.DataFrame([student.model_dump()])[FEATURES]

    pred_class = model.predict(row)[0]
    pred_proba = model.predict_proba(row)[0]
    label = le.inverse_transform([pred_class])[0]

    probs = {le.classes_[i]: float(pred_proba[i]) for i in range(len(le.classes_))}

    # SHAP explanation for this single student
    shap_values = explainer.shap_values(row)
    class_idx = int(pred_class)

    # Handle every shape SHAP can return depending on model/version:
    # - list of arrays, one per class: [n_classes] each (n_samples, n_features)
    # - 3D array: (n_samples, n_features, n_classes)  <- newer SHAP + multiclass XGBoost
    # - 2D array: (n_samples, n_features)              <- binary / regression case
    if isinstance(shap_values, list):
        contribs = shap_values[class_idx][0]
    else:
        arr = shap_values[0]
        if arr.ndim == 2:  # (n_features, n_classes)
            contribs = arr[:, class_idx]
        else:  # (n_features,)
            contribs = arr

    contrib_dict = dict(zip(FEATURES, [float(c) for c in contribs]))
    top_factors = sorted(contrib_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5]

    return {
        "prediction": label,
        "probabilities": probs,
        "risk_score": probs.get("Dropout", 0.0),
        "top_factors": [{"feature": f, "impact": v} for f, v in top_factors],
    }


@app.post("/predict_batch")
def predict_batch(students: list[StudentInput]):
    if not students:
        return []

    # Convert all students to a single DataFrame
    rows = pd.DataFrame([s.model_dump() for s in students])[FEATURES]

    # Vectorized predictions
    pred_classes = model.predict(rows)
    pred_probas = model.predict_proba(rows)
    labels = le.inverse_transform(pred_classes)

    # Vectorized SHAP values
    shap_values = explainer.shap_values(rows)

    results = []
    for i in range(len(students)):
        pred_class = pred_classes[i]
        pred_proba = pred_probas[i]
        label = labels[i]
        
        probs = {le.classes_[j]: float(pred_proba[j]) for j in range(len(le.classes_))}
        
        class_idx = int(pred_class)
        
        if isinstance(shap_values, list):
            contribs = shap_values[class_idx][i]
        else:
            if shap_values.ndim == 3:  # (n_samples, n_features, n_classes)
                contribs = shap_values[i, :, class_idx]
            else:  # (n_samples, n_features)
                contribs = shap_values[i, :]

        contrib_dict = dict(zip(FEATURES, [float(c) for c in contribs]))
        top_factors = sorted(contrib_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5]

        results.append({
            "prediction": label,
            "probabilities": probs,
            "risk_score": probs.get("Dropout", 0.0),
            "top_factors": [{"feature": f, "impact": v} for f, v in top_factors],
        })
        
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)