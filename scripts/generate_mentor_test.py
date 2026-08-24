import csv
import random

# All 35 columns
headers = [
    "student_id", "first_name", "last_name", "class", "roll_no", "college", 
    "department", "mentor_id", "counsellor_id", "attendance_percent", "fees_due_days", 
    "attempts_in_subject_x", "last_test_1", "last_test_2", "last_test_3", 
    "last_3_tests_avg", "previous_3_tests_avg", "email", "phone", "guardian_contact", 
    "semester", "age", "gender", "attendance_percentage", "previous_semester_gpa", 
    "backlogs", "internal_marks_percentage", "assignment_completion_rate", 
    "study_hours_per_week", "failed_subjects", "family_income", 
    "distance_from_college_km", "fee_payment_delay", "scholarship", "extracurricular_participation"
]

first_names = ['Aarav', 'Vihaan', 'Ananya', 'Diya', 'Rahul', 'Sneha', 'Amit', 'Neha', 'Rohan', 'Pooja', 'Karan', 'Riya', 'Sameer', 'Tanvi']
last_names = ['Sharma', 'Verma', 'Gupta', 'Kumar', 'Singh', 'Patel', 'Joshi', 'Mishra', 'Deshmukh', 'Kadam', 'Jadhav', 'Yadav']

data = []
for i in range(1, 26):
    fname = random.choice(first_names)
    lname = random.choice(last_names)
    
    last1 = random.randint(40, 100)
    last2 = random.randint(40, 100)
    last3 = random.randint(40, 100)
    avg3 = round((last1 + last2 + last3) / 3.0, 1)
    prev_avg = random.randint(50, 95)
    
    att = random.randint(50, 100)
    fees = random.choice([0, 0, 0, 15, 30])
    
    # Generate the row
    row = [
        f"MNT24{str(i).zfill(3)}",  # student_id
        fname,                      # first_name
        lname,                      # last_name
        random.choice(['FE', 'SE', 'TE', 'BE']), # class
        str(random.randint(1, 80)), # roll_no
        "MET Institute of Engineering", # college
        random.choice(['IT', 'Computer', 'Civil']), # department
        "",                         # mentor_id (Leave blank, backend assigns to logged-in mentor if mentor uploads)
        "",                         # counsellor_id
        att,                        # attendance_percent
        fees,                       # fees_due_days
        random.choice([1, 1, 2]),   # attempts_in_subject_x
        last1, last2, last3,        # tests
        avg3,                       # last_3_tests_avg
        prev_avg,                   # previous_3_tests_avg
        f"{fname.lower()}.{lname.lower()}{i}@example.com", # email
        f"98{random.randint(10000000, 99999999)}",         # phone
        f"88{random.randint(10000000, 99999999)}",         # guardian
        random.choice(['1', '3', '5', '7']),               # semester
        
        # ML fields
        random.randint(18, 23),     # age
        random.choice([0, 1]),      # gender
        att,                        # attendance_percentage
        round(random.uniform(5.0, 9.8), 1), # previous_semester_gpa
        random.choice([0, 0, 1, 2]), # backlogs
        random.randint(50, 95),     # internal_marks_percentage
        random.randint(40, 100),    # assignment_completion_rate
        random.randint(5, 20),      # study_hours_per_week
        random.choice([0, 0, 1]),   # failed_subjects
        random.choice([200000, 500000, 800000]), # family_income
        round(random.uniform(2.0, 30.0), 1), # distance
        1 if fees > 0 else 0,       # fee_payment_delay
        random.choice([0, 1]),      # scholarship
        random.choice([0, 1])       # extracurricular
    ]
    data.append(row)

filename = "mentor_upload_test_25.csv"
with open(filename, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(data)

print(f"Generated {filename}")
