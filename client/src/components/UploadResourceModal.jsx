import { useState, useEffect, useRef } from 'react';
import { FiX, FiUploadCloud, FiFile, FiCheck, FiAlertCircle, FiUsers, FiUser } from 'react-icons/fi';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  'Academic Notes',
  'Study Material',
  'Exam Preparation',
  'Attendance Recovery Plan',
  'Mental Health & Stress',
  'Career & Skills',
  'Other',
];

export default function UploadResourceModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedStudent = null, // { studentId, name } if opened from a student's profile
  preselectedEscalationId = null,
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Study Material');
  const [targetType, setTargetType] = useState(preselectedStudent ? 'single' : 'all');
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudent?.studentId || '');
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Fetch mentor's assigned students if no preselected student
  useEffect(() => {
    if (isOpen) {
      if (preselectedStudent) {
        setTargetType('single');
        setSelectedStudentId(preselectedStudent.studentId);
      }
      api.get('/students')
        .then((res) => setAssignedStudents(res.data.students || []))
        .catch(() => {});
    }
  }, [isOpen, preselectedStudent]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      if (!title) {
        // Auto-fill title from filename
        const nameWithoutExt = e.target.files[0].name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
      if (!title) {
        const nameWithoutExt = e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title for the resource');
      return;
    }
    if (targetType === 'single' && !selectedStudentId) {
      setError('Please select a student');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('targetType', targetType);
      if (targetType === 'single') {
        formData.append('studentId', selectedStudentId);
      }
      if (preselectedEscalationId) {
        formData.append('escalationId', preselectedEscalationId);
      }

      const res = await api.post('/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Resource uploaded successfully!', 'success');
      if (onSuccess) onSuccess(res.data.resource);
      handleClose();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to upload resource';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setTitle('');
    setDescription('');
    setCategory('Study Material');
    setFile(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <FiUploadCloud size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Upload Learning Resource</h3>
              <p className="text-xs text-slate-500">Share study materials, guides, or recovery plans via Cloudinary</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <FiAlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Upload Failed</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* File Dropzone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Document / File <span className="text-rose-500">*</span>
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3 text-emerald-700">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <FiFile size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-emerald-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change file
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <FiUploadCloud size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs font-semibold text-slate-700">
                    Click to browse or drag and drop your file
                  </p>
                  <p className="text-[11px] text-slate-400">
                    PDF, Word, PowerPoint, Images, or Notes (Up to 25MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Audience <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                  targetType === 'all'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    targetType === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <FiUsers size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold">All Assigned Students</p>
                  <p className="text-[11px] text-slate-500">Broadcast to all your mentees</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('single')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition ${
                  targetType === 'single'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    targetType === 'single' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <FiUser size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold">Specific Student</p>
                  <p className="text-[11px] text-slate-500">Individual or Escalation follow-up</p>
                </div>
              </button>
            </div>
          </div>

          {/* Student Select dropdown if single target */}
          {targetType === 'single' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Student <span className="text-rose-500">*</span>
              </label>
              {preselectedStudent ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {preselectedStudent.name || preselectedStudent.firstName}{' '}
                    {preselectedStudent.lastName || ''} ({preselectedStudent.studentId})
                  </span>
                  <span className="text-[11px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Selected
                  </span>
                </div>
              ) : (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose an assigned student --</option>
                  {assignedStudents.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.firstName} {s.lastName} ({s.studentId}) · {s.class || s.department}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Resource Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Resource Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 3 Engineering Math Revision Notes & Solutions"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Instructions / Notes for Student(s)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Focus on questions 4 through 9 before Friday's re-test."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading to Cloudinary...
                </>
              ) : (
                <>
                  <FiUploadCloud size={14} />
                  Upload & Share Resource
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
