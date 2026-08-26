import { useEffect, useState } from 'react';
import { FiCheckCircle, FiHeart, FiTrendingUp, FiMessageCircle, FiCalendar, FiDownload, FiBookOpen, FiMic } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import ProgressRing from '../components/ProgressRing';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ENCOURAGEMENT = {
  Low: { title: "You're doing great, keep it up!", message: "Your attendance and scores are consistently on track. Keep up the excellent work." },
  Medium: { title: "A few things to work on", message: "Some areas need your attention. Small, steady improvements can make a huge difference." },
  High: { title: "Let's get you back on track", message: "Your mentor is ready to help. Reaching out early makes the biggest difference to your success." },
};

export default function StudentHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.studentId) return;
    api.get(`/students/${user.studentId}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load your profile'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <DashboardLayout title="My Progress"><p className="text-sm text-slate-500">Loading...</p></DashboardLayout>;
  if (error || !data) return <DashboardLayout title="My Progress"><p className="text-sm text-red-600">{error}</p></DashboardLayout>;

  const { student, risk } = data;
  const tone = ENCOURAGEMENT[risk.riskLevel] || ENCOURAGEMENT.Low;
  const scoreImproved = student.last3TestsAvg >= student.previous3TestsAvg;

  const chartData = {
    labels: ['Previous Tests', 'Recent Tests'],
    datasets: [
      {
        label: 'Average Score (%)',
        data: [student.previous3TestsAvg, student.last3TestsAvg],
        backgroundColor: [
          'rgba(99, 102, 241, 0.4)', // indigo-500/40
          'rgba(99, 102, 241, 0.9)', // indigo-500/90
        ],
        borderRadius: 8,
        barThickness: 50,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 13 },
        bodyFont: { size: 14, weight: 'bold' },
        displayColors: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: '#f1f5f9' },
        border: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#475569', font: { size: 13, weight: '600' } }
      }
    }
  };

  return (
    <DashboardLayout 
      title={`Welcome back, ${student.firstName}!`} 
      subtitle="Here is your personal progress overview."
      headerIcon={FiTrendingUp}
    >
      <div className="max-w-6xl space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Analytics) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Chart Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Performance Trend</h3>
                  <p className="text-sm text-slate-500 mt-1">Comparing your recent test averages.</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${scoreImproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {scoreImproved ? '+ Improving' : '- Needs Focus'}
                </div>
              </div>
              <div className="h-72 w-full">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* AI Tips */}
            {risk.recommendations?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <FiHeart className="text-rose-500" /> AI Recommendations
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {risk.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <FiCheckCircle size={14} />
                      </div>
                      <span className="text-sm text-slate-700 font-medium leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Status Report Banner */}
            <div className="relative bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl p-8 sm:p-10 text-white overflow-hidden shadow-xl shadow-indigo-900/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <p className="text-indigo-200 text-xs font-bold mb-2 tracking-widest uppercase">AI Status Report</p>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">{tone.title}</h2>
                  <p className="text-indigo-100 max-w-lg leading-relaxed text-sm sm:text-base">{tone.message}</p>
                </div>
                {student.attendancePercent >= 75 && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/20 shrink-0">
                    <FiCheckCircle className="text-emerald-400" size={18} />
                    <span className="text-sm font-semibold tracking-wide">Good Standing</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Widgets) */}
          <div className="space-y-6">
            
            {/* AI Chat Widget */}
            <button
              onClick={() => window.dispatchEvent(new Event('open-chat-widget'))}
              className="group block w-full text-left relative bg-gradient-to-b from-indigo-50 to-white rounded-2xl border border-indigo-100 p-6 sm:p-8 shadow-lg shadow-indigo-100/50 hover:shadow-indigo-200/50 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-600/10 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                    <FiMessageCircle size={24} />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    <FiMic size={12} className="text-indigo-600" /> Voice & Text
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Talk to your AI Mentor</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 font-medium">
                  Speak or text 24/7 to get personalized study guidance, discuss stress, and get real-time answers.
                </p>
                <div className="flex items-center text-sm font-bold text-indigo-600">
                  Start Voice & Text Chat <span className="ml-1.5 group-hover:translate-x-1.5 transition-transform">→</span>
                </div>
              </div>
            </button>

            {/* Stats Overview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Attendance</p>
                  <p className={`text-3xl font-bold tracking-tight ${student.attendancePercent >= 75 ? 'text-slate-800' : 'text-amber-600'}`}>
                    {student.attendancePercent}%
                  </p>
                </div>
                <ProgressRing value={student.attendancePercent} label="" color={student.attendancePercent >= 75 ? '#4f46e5' : '#D97706'} />
              </div>
              <div className="h-px w-full bg-slate-100" />
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Fee Status</p>
                <p className={`text-lg font-bold ${student.feesDueDays === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {student.feesDueDays === 0 ? 'Fully Paid' : `${student.feesDueDays} days overdue`}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 text-left transition border border-transparent hover:border-slate-200 group">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                    <FiCalendar size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Schedule Meeting</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">With human mentor</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 text-left transition border border-transparent hover:border-slate-200 group">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <FiDownload size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Download Report</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Latest progress card</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 text-left transition border border-transparent hover:border-slate-200 group">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                    <FiBookOpen size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Study Resources</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">View assignments</p>
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}