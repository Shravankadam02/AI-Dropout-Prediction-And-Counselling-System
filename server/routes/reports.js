import express from 'express';
import Student from '../models/Student.js';
import Escalation from '../models/Escalation.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

// POST /api/reports/:studentId/whatsapp
// Mock endpoint to simulate sending a WhatsApp report to a guardian
router.post('/:studentId/whatsapp', protect, requireRole('mentor', 'admin'), async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.guardianContact) {
      return res.status(400).json({ message: 'No guardian contact (phone number) found for this student.' });
    }

    // Fetch recent escalations for context
    const escalations = await Escalation.find({ studentId: student.studentId })
      .sort({ createdAt: -1 })
      .limit(2);
      
    let notesSection = '';
    if (escalations.length > 0) {
      notesSection = '\n\nAI Counselor Notes (Recent Escalations):\n';
      escalations.forEach((esc, idx) => {
        notesSection += `${idx + 1}. ${esc.summary}\n`;
      });
    }

    // In a real hackathon project, this is where you would call the Twilio WhatsApp API.
    // e.g. twilioClient.messages.create({ from: 'whatsapp:+14155238886', to: `whatsapp:${student.guardianContact}`, body: reportText })
    const reportText = `Dear Parent/Guardian,\n\nThis is a scheduled update regarding ${student.firstName} ${student.lastName}'s academic progress. Current attendance: ${student.attendancePercent}%.${notesSection}\n\nPlease connect with the college mentor for a detailed overview.\n\n- AI Counseling System`;

    console.log(`\n[TWILIO MOCK] Sending WhatsApp Message to: ${student.guardianContact}`);
    console.log(`[TWILIO MOCK] Message Body:\n${reportText}\n`);

    // For the free click-to-chat implementation, we send the text back to the client
    // so the browser can open WhatsApp Web.
    res.json({ 
      message: `WhatsApp report ready for ${student.guardianContact}`,
      guardianContact: student.guardianContact,
      reportText: reportText
    });
  } catch (err) {
    console.error('Error preparing WhatsApp report:', err);
    res.status(500).json({ message: 'Failed to prepare WhatsApp report', error: err.message });
  }
});

export default router;
