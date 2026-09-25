import express from 'express';
import multer from 'multer';
import Resource from '../models/Resource.js';
import Student from '../models/Student.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const router = express.Router();

// Configure multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
});

// GET /api/resources/status — Check if Cloudinary is configured
router.get('/status', protect, (req, res) => {
  res.json({
    configured: isCloudinaryConfigured(),
  });
});

// POST /api/resources/upload — Mentor or Admin uploads resource for student(s)
router.post('/upload', protect, requireRole('mentor', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select a file to upload' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        message: 'Cloudinary credentials are not configured in server/.env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
        code: 'CLOUDINARY_NOT_CONFIGURED',
      });
    }

    const {
      title,
      description = '',
      category = 'Study Material',
      targetType = 'all', // 'all' or 'single'
      studentId = null,
      escalationId = null,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Resource title is required' });
    }

    let targetStudentName = '';
    const mentorCode = req.user.mentorCode || req.user.username;
    const mentorName = req.user.username || 'Mentor';

    // Validate single target student if chosen
    if (targetType === 'single') {
      if (!studentId) {
        return res.status(400).json({ message: 'studentId is required when targeting an individual student' });
      }

      const student = await Student.findOne({ studentId });
      if (!student) {
        return res.status(404).json({ message: `Student with ID ${studentId} not found` });
      }

      // Check if student is assigned to this mentor (if not admin)
      if (req.user.role === 'mentor' && student.mentorId !== mentorCode) {
        return res.status(403).json({ message: 'This student is not assigned to you' });
      }

      targetStudentName = `${student.firstName} ${student.lastName}`.trim();
    }

    // Determine safe file extension/format
    const originalName = req.file.originalname;
    const extension = originalName.includes('.')
      ? originalName.split('.').pop().toLowerCase()
      : 'bin';

    // Upload to Cloudinary
    const cloudResult = await uploadToCloudinary(req.file.buffer, {
      public_id: `${Date.now()}_${originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      resource_type: 'auto',
    });

    // Save to database
    const resource = await Resource.create({
      title: title.trim(),
      description: description.trim(),
      category,
      fileUrl: cloudResult.secure_url || cloudResult.url,
      publicId: cloudResult.public_id,
      originalName,
      fileSize: req.file.size,
      fileFormat: extension,
      mentorId: mentorCode,
      mentorName,
      targetType,
      studentId: targetType === 'single' ? studentId : null,
      studentName: targetStudentName,
      escalationId: escalationId || null,
    });

    // Send notifications to student(s)
    try {
      if (targetType === 'single') {
        await Notification.create({
          recipientId: studentId,
          title: 'New Study Resource Shared',
          message: `Mentor ${mentorName} shared a new resource: "${title.trim()}"`,
          type: 'info',
          link: '/resources',
        });
      } else {
        // Find all assigned students to notify them
        const assignedStudents = await Student.find({ mentorId: mentorCode }).select('studentId');
        if (assignedStudents.length > 0) {
          const notifications = assignedStudents.map((s) => ({
            recipientId: s.studentId,
            title: 'New Learning Resource Available',
            message: `Mentor ${mentorName} posted a new resource for your batch: "${title.trim()}"`,
            type: 'info',
            link: '/resources',
          }));
          await Notification.insertMany(notifications);
        }
      }
    } catch (notifErr) {
      console.warn('Failed to send resource notification:', notifErr.message);
    }

    res.status(201).json({
      message: 'Resource uploaded successfully',
      resource,
    });
  } catch (err) {
    console.error('Resource upload error:', err);
    res.status(500).json({
      message: err.message || 'Failed to upload resource',
      error: err.message,
    });
  }
});

// GET /api/resources — List resources based on user role
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      const student = await Student.findOne({ studentId: req.user.studentId });
      const mentorId = student ? student.mentorId : null;

      query = {
        $or: [
          { targetType: 'single', studentId: req.user.studentId },
          ...(mentorId ? [{ targetType: 'all', mentorId }] : []),
        ],
      };
    } else if (req.user.role === 'mentor') {
      const mentorCode = req.user.mentorCode || req.user.username;
      query.mentorId = mentorCode;

      if (req.query.studentId) {
        query = {
          mentorId: mentorCode,
          $or: [
            { studentId: req.query.studentId },
            { targetType: 'all' },
          ],
        };
      }

      if (req.query.targetType) {
        query.targetType = req.query.targetType;
      }
    }

    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }

    const resources = await Resource.find(query).sort({ createdAt: -1 });

    res.json({
      count: resources.length,
      resources,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/resources/student/:studentId — All resources applicable to a student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Role checks
    if (req.user.role === 'student' && req.user.studentId !== studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'mentor' && student.mentorId !== req.user.mentorCode) {
      return res.status(403).json({ message: 'Not your assigned student' });
    }

    const query = {
      $or: [
        { targetType: 'single', studentId },
        ...(student.mentorId ? [{ targetType: 'all', mentorId: student.mentorId }] : []),
      ],
    };

    const resources = await Resource.find(query).sort({ createdAt: -1 });

    res.json({
      count: resources.length,
      resources,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/resources/:id — Delete resource
router.delete('/:id', protect, requireRole('mentor', 'admin'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Only the mentor who uploaded it or an admin can delete it
    if (req.user.role === 'mentor' && resource.mentorId !== (req.user.mentorCode || req.user.username)) {
      return res.status(403).json({ message: 'You can only delete resources uploaded by yourself' });
    }

    // Try deleting from Cloudinary
    if (resource.publicId) {
      await deleteFromCloudinary(resource.publicId);
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.json({ message: 'Resource deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
