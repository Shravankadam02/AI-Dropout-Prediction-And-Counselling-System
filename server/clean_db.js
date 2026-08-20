import mongoose from 'mongoose';
import 'dotenv/config';
import Student from './models/Student.js';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB. Cleaning bloated riskHistory arrays...');
  const result = await Student.updateMany({}, { $set: { riskHistory: [] } });
  console.log(`Cleaned riskHistory for ${result.modifiedCount} students.`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
