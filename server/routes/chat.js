import express from 'express';
import axios from 'axios';
import Student from '../models/Student.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// POST /api/chat — proxies to the AI service, but builds studentContext server-side
// from the authenticated user's own record, not from client-supplied data
router.post('/', protect, requireRole('student'), async (req, res) => {
  try {
    const { message, chatSessionId } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'message is required' });
    }

    const student = await Student.findOne({ studentId: req.user.studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    const studentContext = {
      studentId: student.studentId,
      mentorId: student.mentorId,
      firstName: student.firstName,
      attendancePercent: student.attendancePercent,
      last3TestsAvg: student.last3TestsAvg,
      feesDueDays: student.feesDueDays,
    };

    const aiRes = await axios.post(
      `${AI_SERVICE_URL}/chat`,
      {
        message,
        studentContext,
        chatSessionId,
      },
      { timeout: 25000 }
    );

    res.json(aiRes.data);
  } catch (err) {
    res.status(500).json({ message: 'Chat request failed', error: err.message });
  }
});

// POST /api/chat/escalate — same proxy pattern for manual escalation
router.post('/escalate', protect, requireRole('student'), async (req, res) => {
  try {
    const { chatSessionId } = req.body;
    if (!chatSessionId) {
      return res.status(400).json({ message: 'chatSessionId is required' });
    }

    const student = await Student.findOne({ studentId: req.user.studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    const studentContext = {
      studentId: student.studentId,
      mentorId: student.mentorId,
    };

    const aiRes = await axios.post(
      `${AI_SERVICE_URL}/chat/escalate`,
      { chatSessionId, studentContext },
      { timeout: 25000 }
    );
    
    // Notify the mentor
    if (student.mentorId) {
      await Notification.create({
        recipientId: student.mentorId,
        title: 'New Student Escalation',
        message: `${student.firstName} ${student.lastName} escalated a chat and requested your help.`,
        type: 'warning',
        link: '/mentor/escalations'
      });
    }

    res.json(aiRes.data);
  } catch (err) {
    res.status(500).json({ message: 'Escalation request failed', error: err.message });
  }
});

export default router;