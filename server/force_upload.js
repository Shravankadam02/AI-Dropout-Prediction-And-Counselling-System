import mongoose from 'mongoose';
import fs from 'fs';
import csv from 'csv-parser';
import 'dotenv/config';
import Student from './models/Student.js';

const REQUIRED_FIELDS = [
  'student_id', 'attendance_percent', 'fees_due_days',
  'attempts_in_subject_x', 'last_3_tests_avg', 'previous_3_tests_avg',
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB. Starting forcefully CSV upload...');
  const rows = [];
  
  fs.createReadStream('../data/students_1000_ai_ready.csv')
    .pipe(csv())
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      let processed = 0;
      let skipped = 0;

      for (const row of rows) {
        const missing = REQUIRED_FIELDS.filter((f) => !row[f] && row[f] !== '0');
        if (missing.length > 0) {
          skipped++;
          continue;
        }

        const studentData = {
          studentId: row.student_id,
          firstName: row.first_name || '',
          lastName: row.last_name || '',
          class: row.class || '',
          rollNo: row.roll_no || '',
          department: row.department || 'Unspecified',
          college: row.college || 'MET Institute of Engineering',
          mentorId: row.mentor_id || null,
          counsellorId: row.counsellor_id || null,
          attendancePercent: Number(row.attendance_percent),
          feesDueDays: Number(row.fees_due_days),
          attemptsInSubjectX: Number(row.attempts_in_subject_x),
          lastTest1: row.last_test_1 ? Number(row.last_test_1) : undefined,
          lastTest2: row.last_test_2 ? Number(row.last_test_2) : undefined,
          lastTest3: row.last_test_3 ? Number(row.last_test_3) : undefined,
          last3TestsAvg: Number(row.last_3_tests_avg),
          previous3TestsAvg: Number(row.previous_3_tests_avg),
          email: row.email || '',
          phone: row.phone || '',
          guardianContact: row.guardian_contact || '',
          semester: row.semester || '',

          // New ML Fields
          age: row.age ? Number(row.age) : undefined,
          gender: row.gender !== undefined ? Number(row.gender) : undefined,
          attendance_percentage: row.attendance_percentage ? Number(row.attendance_percentage) : undefined,
          previous_semester_gpa: row.previous_semester_gpa ? Number(row.previous_semester_gpa) : undefined,
          backlogs: row.backlogs !== undefined ? Number(row.backlogs) : undefined,
          internal_marks_percentage: row.internal_marks_percentage ? Number(row.internal_marks_percentage) : undefined,
          assignment_completion_rate: row.assignment_completion_rate ? Number(row.assignment_completion_rate) : undefined,
          study_hours_per_week: row.study_hours_per_week !== undefined ? Number(row.study_hours_per_week) : undefined,
          failed_subjects: row.failed_subjects !== undefined ? Number(row.failed_subjects) : undefined,
          family_income: row.family_income ? Number(row.family_income) : undefined,
          distance_from_college_km: row.distance_from_college_km ? Number(row.distance_from_college_km) : undefined,
          fee_payment_delay: row.fee_payment_delay !== undefined ? Number(row.fee_payment_delay) : undefined,
          scholarship: row.scholarship !== undefined ? Number(row.scholarship) : undefined,
          extracurricular_participation: row.extracurricular_participation !== undefined ? Number(row.extracurricular_participation) : undefined,
        };

        await Student.findOneAndUpdate(
          { studentId: studentData.studentId },
          studentData,
          { upsert: true, returnDocument: 'after' }
        );

        processed++;
        if (processed % 100 === 0) console.log(`Processed ${processed} students...`);
      }

      console.log(`Done! Processed: ${processed}, Skipped: ${skipped}`);
      process.exit();
    });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
