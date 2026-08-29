import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true }, // can be email or real name now
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'mentor', 'student', 'counsellor'],
      required: true,
    },
    studentId: { type: String, default: null },  // only for role: 'student'
    mentorCode: { type: String, default: null },  // only for role: 'mentor'
    counsellorCode: { type: String, default: null }, // only for role: 'counsellor'
    specialization: { type: String, default: null }, // e.g. "Academic Stress", "Career"
    languages: { type: [String], default: [] }, // e.g. ["English", "Hindi"]
    phone: { type: String, default: null }, // Contact number for students to see
    location: { type: String, default: null }, // e.g. "Gangapur Road", "CIDCO"
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);