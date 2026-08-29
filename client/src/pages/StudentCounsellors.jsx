import { useState, useEffect } from 'react';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';
import { FiSearch, FiPhone, FiCheckCircle, FiMapPin } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function StudentCounsellors() {
  const [counsellors, setCounsellors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();
  const { user } = useAuth();
  const [assignedCounsellorId, setAssignedCounsellorId] = useState(null);
  const [selectedCounsellor, setSelectedCounsellor] = useState(null);

  useEffect(() => {
    fetchCounsellors();
    fetchMyProfile();
  }, []);

  const fetchCounsellors = async () => {
    try {
      const { data } = await api.get('/counsellors');
      setCounsellors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      if (!user?.studentId) return;
      const { data } = await api.get(`/students/${user.studentId}`);
      if (data.student.counsellorId) {
        setAssignedCounsellorId(data.student.counsellorId);
      }
    } catch (err) {
      console.error('Failed to load profile');
    }
  };

  const assignCounsellor = async (counsellorCode) => {
    try {
      await api.put(`/students/${user.studentId}/counsellor`, { counsellorCode });
      showToast('Counsellor assigned successfully!', 'success');
      setAssignedCounsellorId(counsellorCode);
      setSelectedCounsellor(null);
    } catch (err) {
      showToast('Failed to assign counsellor', 'error');
    }
  };

  const filtered = counsellors.filter(c => 
    c.username.toLowerCase().includes(search.toLowerCase()) || 
    (c.specialization && c.specialization.toLowerCase().includes(search.toLowerCase())) ||
    (c.location && c.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout title="Find a Counsellor" subtitle="Get professional help and guidance">
      <div className="max-w-6xl space-y-6">
        
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, specialization, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
          />
        </div>

        {loading ? (
           <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(c => (
              <div key={c._id} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col justify-between ${assignedCounsellorId === c.counsellorCode ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-slate-200'}`}>
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                      {c.username.charAt(0).toUpperCase()}
                    </div>
                    {assignedCounsellorId === c.counsellorCode && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <FiCheckCircle /> Assigned
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{c.username}</h3>
                  {c.specialization && <p className="text-sm font-medium text-indigo-600 mt-1">{c.specialization}</p>}
                  
                  <div className="mt-4 space-y-2">
                    {c.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <FiPhone size={14} className="text-slate-400" />
                        {c.phone}
                      </div>
                    )}
                    {c.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <FiMapPin size={14} className="text-slate-400" />
                        {c.location}
                      </div>
                    )}
                    {c.languages?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {c.languages.map(l => (
                          <span key={l} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-medium">{l}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  {assignedCounsellorId === c.counsellorCode ? (
                    <button disabled className="w-full py-2.5 bg-emerald-50 text-emerald-600 font-bold rounded-xl text-sm border border-emerald-200">
                      Current Counsellor
                    </button>
                  ) : (
                    <button 
                      onClick={() => setSelectedCounsellor(c.counsellorCode)}
                      className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 font-bold rounded-xl text-sm transition"
                    >
                      Request Help
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 font-medium">No counsellors found.</p>
          </div>
        )}

        {/* Confirmation Modal */}
        {selectedCounsellor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Request Counselling</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Are you sure you want to request help from this counsellor? They will receive access to your progress data and mentor notes.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedCounsellor(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => assignCounsellor(selectedCounsellor)}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-600/20"
                >
                  Yes, Request
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
