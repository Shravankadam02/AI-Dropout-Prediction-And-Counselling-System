import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: [
        'Academic Notes',
        'Study Material',
        'Exam Preparation',
        'Attendance Recovery Plan',
        'Mental Health & Stress',
        'Career & Skills',
        'Other',
      ],
      default: 'Study Material',
    },
    fileUrl: { type: String, required: true },
    publicId: { type: String, default: null },
    originalName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    fileFormat: { type: String, default: '' },

    // Mentor who uploaded
    mentorId: { type: String, required: true, index: true }, // matches User.mentorCode or User._id
    mentorName: { type: String, default: 'Mentor' },

    // Target audience:
    // 'all' = all students assigned to this mentor
    // 'single' = specific student
    targetType: {
      type: String,
      enum: ['all', 'single'],
      default: 'all',
      index: true,
    },
    studentId: { type: String, default: null, index: true }, // used when targetType === 'single'
    studentName: { type: String, default: '' },

    // Optional link to an escalation
    escalationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Escalation',
      default: null,
    },
  },
  { timestamps: true }
);

resourceSchema.index({ mentorId: 1, createdAt: -1 });
resourceSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.model('Resource', resourceSchema);
