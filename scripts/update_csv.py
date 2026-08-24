import pandas as pd
import numpy as np

# Read the CSV
file_path = 'SE & TE DATASET.csv'
df = pd.read_csv(file_path)

# Add Gender: random 0 (Female) or 1 (Male)
np.random.seed(42) # for reproducibility
df['Gender'] = np.random.choice([0, 1], size=len(df))

# Add Study Hours Per Week: random between 5 and 25
df['Study Hours Per Week'] = np.random.randint(5, 26, size=len(df))

# Add Distance from College (km): random float between 1.0 and 20.0, rounded to 1 decimal
df['Distance from College (km)'] = np.round(np.random.uniform(1.0, 20.0, size=len(df)), 1)

# Add Failed Subjects: copy from Backlogs
df['Failed Subjects'] = df['Backlogs']

# Save back to CSV
df.to_csv(file_path, index=False)
print('CSV updated successfully with missing parameters.')
