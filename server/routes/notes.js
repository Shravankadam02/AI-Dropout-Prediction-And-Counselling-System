import express from 'express';
import Note from '../models/Note.js';
import Student from '../models/Student.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

// POST /api/notes — create a new intervention note
router.post('/', protect, requireRole('mentor', 'admin'), async (req, res) => {
  try {
    const { studentId, note } = req.body;

    if (!studentId || !note) {
      return res.status(400).json({ message: 'studentId and note are required' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Mentor can only add notes for their own assigned students
    if (req.user.role === 'mentor' && student.mentorId !== req.user.mentorCode) {
      return res.status(403).json({ message: 'Not your assigned student' });
    }

    const newNote = await Note.create({
      studentId,
      mentorId: req.user.id, // stores the User's Mongo _id who wrote it
      note,
      status: 'open',
    });

    res.status(201).json({ message: 'Note added', note: newNote });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/notes/:studentId — full note timeline for a student
router.get('/:studentId', protect, async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

      if (req.user.role === 'mentor' && student.mentorId !== req.user.mentorCode) {
      return res.status(403).json({ message: 'Not your assigned student' });
    }
    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Notes are visible to mentors and admins only' });
    }

    const notes = await Note.find({ studentId: req.params.studentId })
      .populate('mentorId', 'username')
      .sort({ createdAt: -1 }); // most recent first

    res.json({ count: notes.length, notes });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/notes/:noteId/status — toggle open/resolved
router.patch('/:noteId/status', protect, requireRole('mentor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'resolved'].includes(status)) {
      return res.status(400).json({ message: "status must be 'open' or 'resolved'" });
    }

    const note = await Note.findById(req.params.noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Mentor can only update notes for their own students
    if (req.user.role === 'mentor') {
      const student = await Student.findOne({ studentId: note.studentId });
      if (!student || student.mentorId !== req.user.mentorCode) {
        return res.status(403).json({ message: 'Not your assigned student' });
      }
    }

    note.status = status;
    await note.save();

    res.json({ message: 'Note updated', note });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/notes/:noteId — delete an intervention note
router.delete('/:noteId', protect, requireRole('mentor', 'admin'), async (req, res) => {
  try {
    const note = await Note.findById(req.params.noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Mentor can only delete notes for their own assigned students
    if (req.user.role === 'mentor') {
      const student = await Student.findOne({ studentId: note.studentId });
      if (!student || student.mentorId !== req.user.mentorCode) {
        return res.status(403).json({ message: 'Not authorized to delete this note' });
      }
    }

    await Note.findByIdAndDelete(req.params.noteId);

    res.json({ message: 'Note deleted', noteId: req.params.noteId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;