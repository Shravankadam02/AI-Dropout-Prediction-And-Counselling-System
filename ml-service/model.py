# =========================================================
# STUDENT DROPOUT PREDICTION - RANDOM FOREST (Real Dataset)
# Trained on: student_dropout_prediction_1000.csv
# =========================================================
# pip install pandas numpy scikit-learn shap joblib matplotlib seaborn

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import json

from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
import shap

np.random.seed(42)

# ---------------------------------------------------------
# 1. LOAD REAL DATA
#    Make sure student_dropout_prediction_1000.csv is in the
#    same folder as this script.
# ---------------------------------------------------------
CSV_PATH = "student_dropout_prediction_1000.csv"

try:
    raw = pd.read_csv(CSV_PATH)
except FileNotFoundError:
    raise SystemExit(
        f"Could not find '{CSV_PATH}'. Place the CSV in the same folder as model.py "
        "and run again."
    )

print("Rows loaded:", len(raw))
print(raw["dropout"].value_counts())

# ---------------------------------------------------------
# 2. PREPROCESS
# ---------------------------------------------------------
df = raw.copy()

# Encode gender as numeric (0 = Female, 1 = Male)
df["gender"] = df["gender"].map({"Female": 0, "Male": 1})

# Friendly target labels for a clearer dashboard
df["Target"] = df["dropout"].map({0: "No Dropout", 1: "Dropout"})

FEATURES = [
    "age", "gender", "attendance_percentage", "previous_semester_gpa",
    "backlogs", "internal_marks_percentage", "assignment_completion_rate",
    "study_hours_per_week", "failed_subjects", "family_income",
    "distance_from_college_km", "fee_payment_delay", "scholarship",
    "extracurricular_participation",
]

X = df[FEATURES]
y = df["Target"]

# ---------------------------------------------------------
# 3. ENCODE TARGET
# ---------------------------------------------------------
le = LabelEncoder()
y_enc = le.fit_transform(y)
label_map = dict(zip(le.classes_, le.transform(le.classes_).tolist()))
print("Label map:", label_map)

# ---------------------------------------------------------
# 4. TRAIN/TEST SPLIT
# ---------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)

# ---------------------------------------------------------
# 5. HYPERPARAMETER TUNING
# ---------------------------------------------------------
param_grid = {
    "n_estimators": [200, 400],
    "max_depth": [None, 10, 20],
    "min_samples_split": [2, 5],
    "max_features": ["sqrt", "log2"],
}

grid = GridSearchCV(
    RandomForestClassifier(random_state=42, class_weight="balanced"),
    param_grid, scoring="f1_macro",
    cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
    n_jobs=-1, verbose=1
)
grid.fit(X_train, y_train)
best_model = grid.best_estimator_
print("Best params:", grid.best_params_)

# ---------------------------------------------------------
# 6. EVALUATE
# ---------------------------------------------------------
y_pred = best_model.predict(X_test)
print("\nAccuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=le.classes_))

cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=le.classes_, yticklabels=le.classes_)
plt.xlabel("Predicted"); plt.ylabel("Actual"); plt.title("Confusion Matrix")
plt.tight_layout()
plt.savefig("confusion_matrix.png")
plt.close()

cv_scores = cross_val_score(best_model, X, y_enc, cv=5, scoring="f1_macro")
print("CV macro-F1:", cv_scores, "| mean:", cv_scores.mean())

# ---------------------------------------------------------
# 7. FEATURE IMPORTANCE
# ---------------------------------------------------------
importances = pd.Series(best_model.feature_importances_, index=FEATURES).sort_values(ascending=False)
print("\nFeature importances:\n", importances)

plt.figure(figsize=(8, 6))
importances.plot(kind="barh")
plt.gca().invert_yaxis()
plt.title("Feature Importances")
plt.tight_layout()
plt.savefig("feature_importance.png")
plt.close()

# ---------------------------------------------------------
# 8. SHAP EXPLAINABILITY
# ---------------------------------------------------------
explainer = shap.TreeExplainer(best_model)
shap_values = explainer.shap_values(X_test.iloc[:200])

dropout_idx = le.transform(["Dropout"])[0]
plt.figure()
if isinstance(shap_values, list):
    shap.summary_plot(shap_values[dropout_idx], X_test.iloc[:200], show=False)
else:
    shap.summary_plot(shap_values[:, :, dropout_idx], X_test.iloc[:200], show=False)
plt.tight_layout()
plt.savefig("shap_summary.png")
plt.close()
print("SHAP summary saved.")

# ---------------------------------------------------------
# 9. SAVE MODEL + METADATA
# ---------------------------------------------------------
joblib.dump(best_model, "dropout_model.pkl")
joblib.dump(le, "label_encoder.pkl")

metadata = {
    "model_name": "RandomForest",
    "trained_on": "student_dropout_prediction_1000.csv (real data, n=1000)",
    "features": FEATURES,
    "feature_descriptions": {
        "age": "Student age in years",
        "gender": "0 = Female, 1 = Male",
        "attendance_percentage": "Attendance percentage (0-100)",
        "previous_semester_gpa": "Previous semester GPA (0-10)",
        "backlogs": "Number of current backlogs",
        "internal_marks_percentage": "Internal assessment marks percentage (0-100)",
        "assignment_completion_rate": "Assignment completion percentage (0-100)",
        "study_hours_per_week": "Self-reported study hours per week",
        "failed_subjects": "Number of subjects failed",
        "family_income": "Annual family income (INR)",
        "distance_from_college_km": "Distance from college in km",
        "fee_payment_delay": "0 = fees paid on time, 1 = fee payment delayed",
        "scholarship": "0 = no scholarship, 1 = has scholarship",
        "extracurricular_participation": "0 = not involved, 1 = involved in extracurriculars",
    },
    "label_map": label_map,
    "best_params": grid.best_params_,
    "test_accuracy": float(accuracy_score(y_test, y_pred)),
    "test_macro_f1": float(f1_score(y_test, y_pred, average="macro")),
}
with open("model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("\nSaved: dropout_model.pkl, label_encoder.pkl, model_metadata.json")
print("Saved plots: confusion_matrix.png, feature_importance.png, shap_summary.png")