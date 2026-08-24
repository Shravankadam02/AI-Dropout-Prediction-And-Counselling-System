import csv
import random

features = [
    "age",
    "gender",
    "attendance_percentage",
    "previous_semester_gpa",
    "backlogs",
    "internal_marks_percentage",
    "assignment_completion_rate",
    "study_hours_per_week",
    "failed_subjects",
    "family_income",
    "distance_from_college_km",
    "fee_payment_delay",
    "scholarship",
    "extracurricular_participation"
]

data = []
for _ in range(1000):
    attendance = round(random.uniform(30.0, 100.0), 1)
    gpa = round(random.uniform(4.0, 10.0), 2)
    backlogs = random.choices([0, 1, 2, 3, 4], weights=[0.6, 0.2, 0.1, 0.05, 0.05])[0]
    failed = backlogs
    
    row = [
        random.randint(18, 25), # age
        random.choice([0, 1]), # gender
        attendance, # attendance_percentage
        gpa, # previous_semester_gpa
        backlogs, # backlogs
        round(random.uniform(40.0, 95.0), 1), # internal_marks_percentage
        round(random.uniform(20.0, 100.0), 1), # assignment_completion_rate
        random.randint(5, 40), # study_hours_per_week
        failed, # failed_subjects
        random.choice([150000, 300000, 500000, 800000, 1500000]), # family_income
        round(random.uniform(1.0, 50.0), 1), # distance_from_college_km
        random.choice([0, 1]), # fee_payment_delay
        random.choice([0, 1]), # scholarship
        random.choice([0, 1]) # extracurricular_participation
    ]
    data.append(row)

filename = "ml_model_test_data_1000.csv"
with open(filename, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(features)
    writer.writerows(data)

print(f"Generated {filename}")
