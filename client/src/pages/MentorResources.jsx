import { useState, useEffect } from 'react';
import {
  FiBookOpen,
  FiUploadCloud,
  FiFileText,
  FiDownload,
  FiTrash2,
  FiUsers,
  FiUser,
  FiSearch,
  FiFilter,
  FiExternalLink,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import UploadResourceModal from '../components/UploadResourceModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const CATEGORY_COLORS = {
  'Academic Notes': 'bg-blue-50 text-blue-700 border-blue-200',
  'Study Material': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Exam Preparation': 'bg-amber-50 text-amber-700 border-amber-200',
  'Attendance Recovery Plan': 'bg-rose-50 text-rose-700 border-rose-200',
  'Mental Health & Stress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Career & Skills': 'bg-purple-50 text-purple-700 border-purple-200',
  Other: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function MentorResources() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [targetFilter, setTargetFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/resources');
      setResources(res.data.resources || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resource? It will be permanently removed from Cloudinary.')) {
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/resources/${id}`);
      setResources((prev) => prev.filter((r) => r._id !== id));
      showToast('Resource deleted successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete resource', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered resources
  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.studentName && r.studentName.toLowerCase().includes(search.toLowerCase())) ||
      (r.studentId && r.studentId.toLowerCase().includes(search.toLowerCase())) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
    const matchesTarget = targetFilter === 'All' || r.targetType === targetFilter;

    return matchesSearch && matchesCategory && matchesTarget;
  });

  const totalAllStudents = resources.filter((r) => r.targetType === 'all').length;
  const totalSingleStudents = resources.filter((r) => r.targetType === 'single').length;

  const headerActions = (
    <button
      onClick={() => setModalOpen(true)}
      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition"
    >
      <FiUploadCloud size={16} />
      <span>Upload Resource</span>
    </button>
  );

  return (
    <DashboardLayout
      title="Study & Learning Resources"
      subtitle="Upload and manage study materials, guides, and recovery plans for your mentees"
      headerIcon={FiBookOpen}
      headerActions={headerActions}
    >
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Uploaded
          </p>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-slate-900">{resources.length}</p>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Cloudinary Powered
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Shared with All Students
          </p>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-indigo-600">{totalAllStudents}</p>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FiUsers size={16} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Personalized for Individuals
          </p>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-emerald-600">{totalSingleStudents}</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FiUser size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by title, student, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          {/* Target Filter */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="All">All Audiences</option>
            <option value="all">Broadcast (All Students)</option>
            <option value="single">Personalized (Single Student)</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Academic Notes">Academic Notes</option>
            <option value="Study Material">Study Material</option>
            <option value="Exam Preparation">Exam Preparation</option>
            <option value="Attendance Recovery Plan">Attendance Recovery</option>
            <option value="Mental Health & Stress">Mental Health</option>
            <option value="Career & Skills">Career & Skills</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Resources List / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading resources...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FiBookOpen size={28} />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">No resources found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            {search || categoryFilter !== 'All' || targetFilter !== 'All'
              ? 'Try changing your search or filter options.'
              : 'Upload your first study material, revision notes, or recovery guide for your mentees.'}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
          >
            <FiUploadCloud size={14} />
            <span>Upload First Resource</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
            const fileSizeMb = (item.fileSize / (1024 * 1024)).toFixed(2);
            return (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Category & Target */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${catStyle}`}>
                      {item.category}
                    </span>

                    {item.targetType === 'all' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        <FiUsers size={12} /> All Students
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 truncate max-w-[150px]">
                        <FiUser size={12} /> {item.studentName || item.studentId}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-800 mb-1.5 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {item.title}
                  </h4>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Meta Details */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mb-4">
                    <span className="flex items-center gap-1">
                      <FiFileText size={12} /> {item.fileFormat?.toUpperCase() || 'FILE'} · {fileSizeMb} MB
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FiClock size={12} /> {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition border border-indigo-100"
                  >
                    <FiDownload size={13} />
                    <span>View / Download</span>
                    <FiExternalLink size={11} className="opacity-70" />
                  </a>

                  <button
                    onClick={() => handleDelete(item._id)}
                    disabled={deletingId === item._id}
                    title="Delete resource"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition disabled:opacity-50"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Resource Modal */}
      <UploadResourceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(newResource) => {
          setResources((prev) => [newResource, ...prev]);
        }}
      />
    </DashboardLayout>
  );
}
