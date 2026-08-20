import express from 'express';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import bcrypt from 'bcryptjs';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { calculateRiskBatch } from '../services/riskCalculator.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const REQUIRED_FIELDS = [
  'student_id', 'attendance_percent', 'fees_due_days',
  'attempts_in_subject_x', 'last_3_tests_avg', 'previous_3_tests_avg',
];

router.post('/', protect, requireRole('admin', 'mentor'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const rows = [];
  const errors = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      fs.unlinkSync(req.file.path); // cleanup temp file
      try {
        let processed = 0;
        let unassigned = 0;
        const skipped = [];
        const studentDocs = [];

        for (const row of rows) {
          const missing = REQUIRED_FIELDS.filter((f) => !row[f] && row[f] !== '0');
          if (missing.length > 0) {
            skipped.push({ student_id: row.student_id || 'unknown', missing });
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
            mentorId: req.user.role === 'mentor' ? req.user.mentorCode : (row.mentor_id || null),
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

          studentDocs.push(studentData);
        }

        // Generate unique batch ID
        const batchId = `batch_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Calculate risk for the batch
        const studentsWithRisk = await calculateRiskBatch(studentDocs);

        // Save all students
        for (let i = 0; i < studentDocs.length; i++) {
          const data = studentDocs[i];
          data.batchId = batchId; // Assign batch ID
          
          if (studentsWithRisk[i]) {
              data.riskScore = studentsWithRisk[i].riskScore;
              data.riskLevel = studentsWithRisk[i].riskLevel;
              data.mlInsights = studentsWithRisk[i].mlInsights;
          }

          if (!data.mentorId) unassigned++;

          await Student.findOneAndUpdate(
            { studentId: data.studentId },
            data,
            { upsert: true, returnDocument: 'after' }
          );

          processed++;
        }

        res.json({
          message: 'CSV processed',
          processed,
          unassigned,
          skipped,
          batchId, // Return batch ID to the frontend
        });
      } catch (err) {
        console.error('Upload processing error:', err);
        res.status(500).json({ message: 'Internal server error during processing', error: err.message });
      }
    })
    .on('error', (err) => {
      res.status(500).json({ message: 'CSV parsing failed', error: err.message });
    });
});

// POST /api/upload/counsellors
router.post('/counsellors', protect, requireRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const rows = [];
  const skipped = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      fs.unlinkSync(req.file.path);
      
      let processed = 0;
      
      for (const row of rows) {
        if (!row.email || !row.counsellor_code) {
          skipped.push({ email: row.email, missing: ['email or counsellor_code'] });
          continue;
        }

        const password = row.password || 'password123';
        const passwordHash = await bcrypt.hash(password, 10);
        
        const languages = row.languages ? row.languages.split(';').map(l => l.trim()) : [];
        
        await User.findOneAndUpdate(
          { username: row.email },
          {
            username: row.email,
            passwordHash,
            role: 'counsellor',
            counsellorCode: row.counsellor_code,
            specialization: row.specialization || '',
            phone: row.phone || '',
            languages
          },
          { upsert: true }
        );
        processed++;
      }
      
      res.json({ message: 'Counsellors CSV processed', processed, skipped });
    })
    .on('error', (err) => res.status(500).json({ message: 'CSV parsing failed', error: err.message }));
});

export default router;