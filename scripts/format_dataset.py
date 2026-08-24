import pandas as pd
import numpy as np

df = pd.read_csv('SE & TE DATASET.csv')

# Create a new dataframe with the exact expected schema
out = pd.DataFrame()

# Map existing columns to the new schema
out['student_id'] = ['SETE' + str(i).zfill(4) for i in range(1, len(df) + 1)]

# Split Name into first and last
name_split = df['Name'].str.split(' ', n=1, expand=True)
out['first_name'] = name_split[0]
out['last_name'] = name_split[1].fillna('')

out['class'] = 'SE/TE'
out['roll_no'] = df['Roll No']
out['college'] = 'MET Institute of Engineering'
out['department'] = 'Engineering'

# Optional UI fields
out['mentor_id'] = ''
out['counsellor_id'] = ''

# Core mapping for UI compatibility
out['attendance_percent'] = df['Attendance (%)']
out['fees_due_days'] = df['Fees Payment Delay (Days)']
out['attempts_in_subject_x'] = df['Backlogs'] + 1
out['last_3_tests_avg'] = df['Internal Marks (%)']
out['previous_3_tests_avg'] = df['CGPA'] * 10  # Scale CGPA to 100 for the UI

# Optional UI contacts
out['email'] = ''
out['phone'] = ''
out['guardian_contact'] = ''
out['semester'] = ''

# ML Features mapping
out['age'] = df['Age']
out['gender'] = df.get('Gender', np.random.choice([0, 1], size=len(df)))
out['attendance_percentage'] = df['Attendance (%)']
out['previous_semester_gpa'] = df['CGPA']
out['backlogs'] = df['Backlogs']
out['internal_marks_percentage'] = df['Internal Marks (%)']
out['assignment_completion_rate'] = df['Assignment Completion Rate (%)']
out['study_hours_per_week'] = df.get('Study Hours Per Week', np.random.randint(5, 26, size=len(df)))
out['failed_subjects'] = df.get('Failed Subjects', df['Backlogs'])
out['family_income'] = df['Family Income (Annual INR)']
out['distance_from_college_km'] = df.get('Distance from College (km)', np.random.uniform(1.0, 20.0, size=len(df)))
out['fee_payment_delay'] = df['Fees Payment Delay (Days)'].apply(lambda x: 1 if x > 0 else 0)
out['scholarship'] = df['Scholarship']
out['extracurricular_participation'] = df['Extracurricular Participation']

out.to_csv('SE_TE_UPLOAD_READY.csv', index=False)
print('Formatted dataset saved to SE_TE_UPLOAD_READY.csv')
