import express from 'express';
import Student from '../models/Student.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { calculateRisk, calculateRiskBatch, getTopReasons, generateRecommendations } from '../services/riskCalculator.js';

const router = express.Router();

// GET /api/students — list, scoped by role, sorted highest risk first
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // Mentor only sees their own assigned students
    if (req.user.role === 'mentor') {
      query.mentorId = req.user.mentorCode; 
    }
    // Counsellor only sees their own assigned students
    if (req.user.role === 'counsellor') {
      query.counsellorId = req.user.counsellorCode;
    }

    // Optional filters from query params
    if (req.query.class) query.class = req.query.class;
    if (req.query.department) query.department = req.query.department;
    if (req.query.college) query.college = req.query.college;

    const students = await Student.find(query).select('-riskHistory').sort({ riskScore: -1 });

    res.json({ count: students.length, students });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/students/predict-all — Trigger batch prediction and save to DB
router.post('/predict-all', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'mentor') query.mentorId = req.user.mentorCode; 
    if (req.user.role === 'counsellor') query.counsellorId = req.user.counsellorCode;

    const students = await Student.find(query);
    const withRisk = await calculateRiskBatch(students);

    // Save predictions to database
    for (const studentData of withRisk) {
      await Student.updateOne(
        { studentId: studentData.studentId },
        { 
          $set: { 
            riskScore: studentData.riskScore,
            riskLevel: studentData.riskLevel,
            mlInsights: studentData.mlInsights
          },
          $push: {
            riskHistory: { riskScore: studentData.riskScore, riskLevel: studentData.riskLevel }
          }
        }
      );
    }

    res.json({ message: 'Batch prediction complete', count: withRisk.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/students/export — admin only, download current data as CSV
router.get('/export/csv', protect, requireRole('admin'), async (req, res) => {
  try {
    const students = await Student.find({});

    const headers = [
      'student_id', 'first_name', 'last_name', 'class', 'roll_no', 'department', 'college',
      'mentor_id', 'attendance_percent', 'fees_due_days', 'attempts_in_subject_x',
      'last_test_1', 'last_test_2', 'last_test_3', 'last_3_tests_avg', 'previous_3_tests_avg',
      'email', 'phone', 'guardian_contact', 'semester',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const rows = students.map((s) => [
      s.studentId, s.firstName, s.lastName, s.class, s.rollNo, s.department, s.college,
      s.mentorId || '', s.attendancePercent, s.feesDueDays, s.attemptsInSubjectX,
      s.lastTest1 ?? '', s.lastTest2 ?? '', s.lastTest3 ?? '', s.last3TestsAvg, s.previous3TestsAvg,
      s.email || '', s.phone || '', s.guardianContact || '', s.semester || '',
    ].map(escapeCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="students_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/students/:id — full detail with explainability
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Mentor can only view their own students
    if (req.user.role === 'mentor' && student.mentorId !== req.user.mentorCode) {
      return res.status(403).json({ message: 'Not your assigned student' });
    }

    // Counsellor can only view their own students
    if (req.user.role === 'counsellor' && student.counsellorId !== req.user.counsellorCode) {
      return res.status(403).json({ message: 'Not your assigned student' });
    }

    // Student can only view themselves
    if (req.user.role === 'student' && req.user.studentId !== student.studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const riskScore = student.riskScore;
    const riskLevel = student.riskLevel;
    const mlInsights = student.mlInsights;

    const topReasons = getTopReasons(mlInsights);
    const recommendations = generateRecommendations(riskLevel, mlInsights, student);

    res.json({
      student: {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        class: student.class,
        department: student.department,
        college: student.college,
        mentorId: student.mentorId,
        counsellorId: student.counsellorId,
        attendancePercent: student.attendancePercent,
        feesDueDays: student.feesDueDays,
        attemptsInSubjectX: student.attemptsInSubjectX,
        last3TestsAvg: student.last3TestsAvg,
        previous3TestsAvg: student.previous3TestsAvg,
        lastTest1: student.lastTest1,
        lastTest2: student.lastTest2,
        lastTest3: student.lastTest3,
      },
      risk: { riskScore, riskLevel, components: mlInsights, topReasons, recommendations },
      riskHistory: student.riskHistory,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/students/:id/mentor — admin only, reassign a student's mentor
router.patch('/:id/mentor', protect, requireRole('admin'), async (req, res) => {
  try {
    const { mentorCode } = req.body; // pass null/empty string to unassign

    const student = await Student.findOneAndUpdate(
      { studentId: req.params.id },
      { mentorId: mentorCode || null },
      { returnDocument: 'after' }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (mentorCode) {
      await Notification.create({
        recipientId: mentorCode,
        title: 'New Student Assigned',
        message: `${student.firstName} ${student.lastName} has been assigned to you.`,
        type: 'info',
        link: `/student/${student.studentId}`
      });
    }

    res.json({ message: 'Mentor updated', student });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/students/:id/counsellor — allow a student to request a counsellor
router.put('/:id/counsellor', protect, async (req, res) => {
  try {
    const { counsellorCode } = req.body; 

    // Only the student themselves or an admin can assign a counsellor
    if (req.user.role !== 'admin' && req.user.studentId !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const student = await Student.findOneAndUpdate(
      { studentId: req.params.id },
      { counsellorId: counsellorCode },
      { returnDocument: 'after' }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Counsellor assigned successfully', student });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;