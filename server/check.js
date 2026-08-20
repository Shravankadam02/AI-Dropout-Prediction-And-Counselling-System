import 'dotenv/config';
import mongoose from 'mongoose';
import Student from './models/Student.js';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const s = await Student.findOne();
  console.log('Sample student:', s);
  process.exit(0);
});
