import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiClock, FiCheckCircle, FiUploadCloud } from 'react-icons/fi';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import UploadResourceModal from '../components/UploadResourceModal';

const STATUS_STYLES = {
  open: { bg: 'bg-red-50', text: 'text-red-700', icon: FiAlertTriangle },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', icon: FiClock },
  resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FiCheckCircle },
};
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };

export default function MentorEscalations() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [selectedEsc, setSelectedEsc] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/escalations')
      .then((res) => setEscalations(res.data.escalations))
      .catch(() => setError('Failed to load escalations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/escalations/${id}/status`, { status });
      setEscalations((prev) => prev.map((esc) => (esc._id === id ? { ...esc, status } : esc)));
      showToast('Status updated', 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const filtered = filter === 'All' ? escalations : escalations.filter((e) => e.status === filter);
  const openCount = escalations.filter((e) => e.status === 'open').length;

  return (
    <DashboardLayout  
      title="Counselling Cases"
      subtitle={user?.role === 'admin' ? 'All students flagged for mentor attention' : 'Your students flagged for attention'}
      headerIcon={FiAlertTriangle}
    >
      <div className="grid grid-cols-3 gap-4 mb-6 max-w-lg">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs font-medium text-slate-500 mb-1.5">Total</p>
          <p className="text-2xl font-semibold text-slate-900">{escalations.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs font-medium text-slate-500 mb-1.5">Open</p>
          <p className="text-2xl font-semibold text-red-600">{openCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs font-medium text-slate-500 mb-1.5">Resolved</p>
          <p className="text-2xl font-semibold text-emerald-600">
            {escalations.filter((e) => e.status === 'resolved').length}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {['All', 'open', 'in_progress', 'resolved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {f === 'All' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {loading && <p className="text-sm text-slate-500 py-16 text-center">Loading...</p>}
        {error && <p className="text-sm text-red-600 py-16 text-center">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-slate-400 py-16 text-center">No escalations to show.</p>
        )}

        {!loading && filtered.map((esc) => {
          const style = STATUS_STYLES[esc.status];
          const Icon = style.icon;
          return (
            <div
              key={esc._id}
              onClick={() => navigate(`/student/${esc.studentId}`)}
              className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center justify-between gap-4 mb-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 shrink-0 rounded-full ${style.bg} flex items-center justify-center`}>
                    <Icon size={15} className={style.text} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{esc.studentName}</p>
                    <p className="text-xs text-slate-400">
                      {esc.studentId} · {esc.reason.replace('_', ' ')}
                      {user?.role === 'admin' && (
                        <span className="text-slate-400"> · {esc.mentorName}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {new Date(esc.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEsc(esc);
                      setResourceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200 transition"
                    title="Share study or recovery resource with this student"
                  >
                    <FiUploadCloud size={13} />
                    <span className="hidden sm:inline">Share Resource</span>
                  </button>

                  <select
                    value={esc.status}
                    onChange={(e) => updateStatus(esc._id, e.target.value, e)}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs font-medium border-0 rounded-full px-3 py-1 ${style.bg} ${style.text} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {esc.summary && (
                <p className="text-sm text-slate-600 pl-11 mt-2">{esc.summary}</p>
              )}
            </div>
          );
        })}
      </div>

      <UploadResourceModal
        isOpen={resourceModalOpen}
        onClose={() => {
          setResourceModalOpen(false);
          setSelectedEsc(null);
        }}
        preselectedStudent={
          selectedEsc
            ? { studentId: selectedEsc.studentId, name: selectedEsc.studentName }
            : null
        }
        preselectedEscalationId={selectedEsc?._id}
      />
    </DashboardLayout>
  );
}