import mongoose from 'mongoose';

const riskSnapshotSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    riskScore: Number,
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    class: String,
    rollNo: String,
    college: { type: String, default: 'MET Institute of Engineering' },
    department: { type: String, required: true },

    mentorId: { type: String, default: null }, // null = unassigned bucket
    counsellorId: { type: String, default: null }, // matches User.counsellorCode
    batchId: { type: String, default: null }, // links to a specific CSV upload batch

    attendancePercent: { type: Number, default: 0 },
    feesDueDays: { type: Number, default: 0 },
    attemptsInSubjectX: { type: Number, default: 1 },

    lastTest1: Number,
    lastTest2: Number,
    lastTest3: Number,
    last3TestsAvg: { type: Number, default: 0 },
    previous3TestsAvg: { type: Number, default: 0 },

    email: String,
    phone: String,
    guardianContact: String,
    semester: String,

    // --- New ML Model Features ---
    age: { type: Number, default: 20 },
    gender: { type: Number, default: 1 }, // 0 = Female, 1 = Male
    attendance_percentage: { type: Number, default: 75.0 }, // (0-100)
    previous_semester_gpa: { type: Number, default: 7.0 }, // (0-10)
    backlogs: { type: Number, default: 0 },
    internal_marks_percentage: { type: Number, default: 70.0 }, // (0-100)
    assignment_completion_rate: { type: Number, default: 80.0 }, // (0-100)
    study_hours_per_week: { type: Number, default: 10 },
    failed_subjects: { type: Number, default: 0 },
    family_income: { type: Number, default: 300000 },
    distance_from_college_km: { type: Number, default: 10.0 },
    fee_payment_delay: { type: Number, default: 0 }, // 0 = on time, 1 = delayed
    scholarship: { type: Number, default: 0 }, // 0 = no, 1 = yes
    extracurricular_participation: { type: Number, default: 0 }, // 0 = no, 1 = yes
    // --- Cached ML Predictions ---
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Unknown'], default: 'Unknown' },
    mlInsights: { type: Object, default: {} },

    riskHistory: [riskSnapshotSchema],
  },
  { timestamps: true }
);

// Indexes for faster dashboard loading and sorting
studentSchema.index({ riskScore: -1 });
studentSchema.index({ mentorId: 1, riskScore: -1 });
studentSchema.index({ counsellorId: 1, riskScore: -1 });

export default mongoose.model('Student', studentSchema);