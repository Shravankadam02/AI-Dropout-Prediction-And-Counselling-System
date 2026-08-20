import { useState } from 'react';
import { FiUploadCloud, FiCheckCircle, FiAlertTriangle, FiFile, FiUsers, FiUserPlus } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

export default function UploadStudents() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      setError('Please select a .csv file');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    
    const endpoint = activeTab === 'students' ? '/upload' : '/upload/counsellors';

    try {
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFile(null);
    setResult(null);
    setError('');
  };

  return (
    <DashboardLayout 
      title="Upload Data" 
      subtitle="Import bulk records securely into the system"
      headerIcon={FiUploadCloud}
    >
      <div className="max-w-2xl">
        
        {user?.role === 'admin' && (
          <div className="flex items-center gap-4 border-b border-slate-200 mb-6 pb-2">
            <button 
              onClick={() => handleTabChange('students')} 
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition ${activeTab === 'students' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FiUsers /> Students CSV
            </button>
            <button 
              onClick={() => handleTabChange('counsellors')} 
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition ${activeTab === 'counsellors' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FiUserPlus /> Counsellors CSV
            </button>
          </div>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition ${
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white'
          }`}
        >
          {file ? (
            <div className="flex flex-col items-center">
              <FiFile size={28} className="text-indigo-500 mb-2" />
              <p className="text-sm font-medium text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={() => setFile(null)}
                className="text-xs text-slate-500 hover:text-slate-800 mt-3 underline"
              >
                Choose a different file
              </button>
            </div>
          ) : (
            <>
              <FiUploadCloud size={28} className="text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                Drag and drop your {activeTab === 'students' ? 'Student' : 'Counsellor'} CSV file here
              </p>
              <p className="text-xs text-slate-400 mb-4">or</p>
              <label className="inline-block text-xs font-medium bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg cursor-pointer hover:border-slate-400 transition">
                Browse Files
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </label>
            </>
          )}
        </div>

        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {uploading ? 'Processing...' : 'Upload and Process'}
          </button>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-start gap-2.5">
            <FiAlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FiCheckCircle size={18} className="text-emerald-600" />
              <p className="text-sm font-semibold text-slate-800">Upload complete</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-lg font-semibold text-emerald-700">{result.processed}</p>
                <p className="text-[11px] text-emerald-600">Processed</p>
              </div>
              {result.unassigned !== undefined && (
                <div className="bg-amber-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-amber-700">{result.unassigned}</p>
                  <p className="text-[11px] text-amber-600">Unassigned</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-lg font-semibold text-slate-700">{result.skipped?.length || 0}</p>
                <p className="text-[11px] text-slate-500">Skipped</p>
              </div>
            </div>

            {result.skipped?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Skipped rows (missing required fields)</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {result.skipped.map((s, i) => (
                    <div key={i} className="text-xs bg-slate-50 rounded-md px-2.5 py-1.5">
                      <span className="font-medium text-slate-700">{s.student_id || s.email}</span>
                      <span className="text-slate-400"> — missing: {s.missing.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {result.batchId && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <button
                  onClick={() => window.location.href = `/admin/batch/${result.batchId}`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-6 rounded-lg transition"
                >
                  View Batch Analytics
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-800 mb-1">CSV Format Requirements</p>
          {activeTab === 'students' ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              Required columns: <code>student_id</code>, <code>attendance_percent</code>, <code>fees_due_days</code>, <code>attempts_in_subject_x</code>,
              <code>last_3_tests_avg</code>, <code>previous_3_tests_avg</code>. Optional: first_name, last_name, mentor_id.
              {user?.role === 'mentor' && <span className="text-indigo-600 font-semibold block mt-1">Note: Since you are a Mentor, all students uploaded in this CSV will be automatically assigned to you.</span>}
            </p>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">
              Required columns: <code>email</code>, <code>counsellor_code</code>. 
              Optional columns: <code>password</code>, <code>specialization</code>, <code>phone</code>, <code>languages</code> (separated by semicolon).
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}