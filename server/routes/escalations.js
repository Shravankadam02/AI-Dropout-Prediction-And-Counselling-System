import express from 'express';
import Escalation from '../models/Escalation.js';
import Student from '../models/Student.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/escalations
router.get('/', protect, requireRole('mentor', 'admin', 'counsellor'), async (req, res) => {
  try {
    let escalations = await Escalation.find({}).sort({ createdAt: -1 });

    if (req.user.role === 'mentor') {
      escalations = escalations.filter((e) => e.mentorId === req.user.mentorCode);
    } else if (req.user.role === 'counsellor') {
      const myStudents = await Student.find({ counsellorId: req.user.counsellorCode }).select('-riskHistory');
      const myStudentIds = myStudents.map(s => s.studentId);
      escalations = escalations.filter(e => myStudentIds.includes(e.studentId));
    }

    const studentIds = [...new Set(escalations.map((e) => e.studentId))];
    const students = await Student.find({ studentId: { $in: studentIds } }).select('-riskHistory');
    const studentMap = Object.fromEntries(students.map((s) => [s.studentId, s]));

    // Look up mentor usernames from their codes, so the UI can show a real name/email
    const mentorCodes = [...new Set(escalations.map((e) => e.mentorId).filter(Boolean))];
    const mentors = await User.find({ mentorCode: { $in: mentorCodes } }).select('username mentorCode');
    const mentorMap = Object.fromEntries(mentors.map((m) => [m.mentorCode, m.username]));

    const enriched = escalations.map((e) => ({
      _id: e._id,
      studentId: e.studentId,
      studentName: studentMap[e.studentId]
        ? `${studentMap[e.studentId].firstName} ${studentMap[e.studentId].lastName}`
        : 'Unknown',
      mentorId: e.mentorId,
      mentorName: e.mentorId ? (mentorMap[e.mentorId] || e.mentorId) : 'Unassigned',
      reason: e.reason,
      summary: e.summary,
      status: e.status,
      createdAt: e.createdAt,
    }));

    res.json({ count: enriched.length, escalations: enriched });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/escalations/:id/status
router.patch('/:id/status', protect, requireRole('mentor', 'admin', 'counsellor'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const escalation = await Escalation.findById(req.params.id);
    if (!escalation) {
      return res.status(404).json({ message: 'Escalation not found' });
    }

    if (req.user.role === 'mentor' && escalation.mentorId !== req.user.mentorCode) {
      return res.status(403).json({ message: 'Not your assigned student' });
    }

    if (req.user.role === 'counsellor') {
      const student = await Student.findOne({ studentId: escalation.studentId });
      if (!student || student.counsellorId !== req.user.counsellorCode) {
        return res.status(403).json({ message: 'Not your assigned student' });
      }
    }

    escalation.status = status;
    await escalation.save();

    res.json({ message: 'Status updated', escalation });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;