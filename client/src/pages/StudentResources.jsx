import { useState, useEffect } from 'react';
import {
  FiBookOpen,
  FiFileText,
  FiDownload,
  FiExternalLink,
  FiSearch,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiLayers,
} from 'react-icons/fi';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
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

export default function StudentResources() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    setLoading(true);
    api.get('/resources')
      .then((res) => {
        setResources(res.data.resources || []);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load study resources');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase())) ||
      (r.mentorName && r.mentorName.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const personalizedCount = resources.filter((r) => r.targetType === 'single').length;

  return (
    <DashboardLayout
      title="Study Resources & Guides"
      subtitle="Learning materials, practice questions, and recovery notes provided by your mentor"
      headerIcon={FiBookOpen}
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 mb-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 mb-1">
            <FiCheckCircle size={12} /> Curated for Your Success
          </div>
          <h2 className="text-xl font-bold tracking-tight">Your Learning Vault</h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Access high-yield exam material, personalized assignments, and recovery guides shared directly by your mentor to keep you on track.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/10 text-center">
            <p className="text-xs text-slate-300 font-medium">Available Resources</p>
            <p className="text-2xl font-bold">{resources.length}</p>
          </div>
          {personalizedCount > 0 && (
            <div className="bg-emerald-500/20 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-emerald-400/20 text-center">
              <p className="text-xs text-emerald-300 font-medium">Directly for You</p>
              <p className="text-2xl font-bold text-emerald-300">{personalizedCount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search resources by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

      {/* Resources Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading your study resources...
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
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || categoryFilter !== 'All'
              ? 'Try adjusting your search query or category filter.'
              : 'Your mentor has not uploaded any study materials yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
            const isPersonalized = item.targetType === 'single';
            const fileSizeMb = (item.fileSize / (1024 * 1024)).toFixed(2);

            return (
              <div
                key={item._id}
                className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                  isPersonalized ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${catStyle}`}>
                      {item.category}
                    </span>

                    {isPersonalized ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                        <FiUser size={12} /> Directly for You
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                        Class Resource
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 mb-1.5 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {item.title}
                  </h4>

                  {item.description && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-3">
                      <p className="text-[11px] font-medium text-slate-600 line-clamp-3 leading-relaxed">
                        <span className="font-semibold text-slate-700">Mentor Note: </span>
                        {item.description}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mb-4">
                    <span className="flex items-center gap-1">
                      <FiFileText size={12} /> {item.fileFormat?.toUpperCase() || 'DOC'} · {fileSizeMb} MB
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FiClock size={12} /> {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/20"
                  >
                    <FiDownload size={14} />
                    <span>Download / Open Resource</span>
                    <FiExternalLink size={12} className="opacity-80" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
