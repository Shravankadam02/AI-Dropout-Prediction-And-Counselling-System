import 'dotenv/config';
import mongoose from 'mongoose';
import Student from './models/Student.js';
import Note from './models/Note.js';
import { getTopReasons } from './services/riskCalculator.js';

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.time('fetch_students');
  const students = await Student.find({});
  console.timeEnd('fetch_students');

  console.time('process_students');
  const distribution = { High: 0, Medium: 0, Low: 0 };
  const byDepartment = {};
  const byClass = {};
  const attendanceDistribution = { '0-50%': 0, '51-65%': 0, '66-75%': 0, '76-85%': 0, '86-100%': 0 };
  const testTrends = [];
  const highRiskStudents = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const riskLevel = s.riskLevel || 'Low';
    const riskScore = s.riskScore || 0;
    const topReasons = getTopReasons(s.mlInsights);
    
    if (distribution[riskLevel] !== undefined) distribution[riskLevel]++;
    const dept = s.department || 'Unspecified';
    byDepartment[dept] = byDepartment[dept] || { High: 0, Medium: 0, Low: 0 };
    byDepartment[dept][riskLevel]++;

    const att = s.attendancePercent || 0;
    if (att <= 50) attendanceDistribution['0-50%']++;
    else if (att <= 65) attendanceDistribution['51-65%']++;
    else attendanceDistribution['86-100%']++;

    if (riskLevel === 'High') {
      highRiskStudents.push({ studentId: s.studentId, riskScore });
    }
  }
  console.timeEnd('process_students');

  console.time('fetch_notes');
  const openNotes = await Note.find({ status: 'open' }).sort({ createdAt: 1 });
  console.timeEnd('fetch_notes');

  console.log('Total students:', students.length);
  process.exit(0);
}

test();
