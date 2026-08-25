import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true }, // username or studentId or mentorCode
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'success', 'error'], default: 'info' },
  read: { type: Boolean, default: false },
  link: { type: String, default: null }, // URL path to navigate to
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
