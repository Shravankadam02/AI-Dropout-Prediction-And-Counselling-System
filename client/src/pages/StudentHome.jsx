import { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiHeart, FiTrendingUp, FiMessageCircle, FiCalendar, FiDownload, FiBookOpen, FiMic } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import ProgressRing from '../components/ProgressRing';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function evaluateStudentStatusAndRecommendations(student, risk) {
  const attendance = student?.attendancePercent ?? 0;
  const lastAvg = student?.last3TestsAvg ?? 0;
  const prevAvg = student?.previous3TestsAvg ?? 0;
  const feesDue = student?.feesDueDays ?? 0;
  const attempts = student?.attemptsInSubjectX ?? 1;
  const scoreImproved = lastAvg >= prevAvg;
  const riskLevel = risk?.riskLevel || 'Low';
  const riskScore = risk?.riskScore ?? 0;

  const isCriticallyLowAttendance = attendance < 60;
  const isWarningAttendance = attendance >= 60 && attendance < 75;
  const isGoodAttendance = attendance >= 75;

  const isLowScore = lastAvg < 50;
  const scoreDroppedSignificantly = prevAvg - lastAvg >= 8;
  const hasSubjectBacklogs = attempts > 1;
  const hasFeesOverdue = feesDue > 0;
  const isHighFeeOverdue = feesDue > 30;

  const isHighMLRisk = riskLevel === 'High' || riskScore >= 0.7;
  const isMediumMLRisk = riskLevel === 'Medium' || (riskScore >= 0.4 && riskScore < 0.7);

  // Determine overall status
  let status = {
    level: 'good',
    title: "You're doing great, keep it up!",
    message: "Your attendance and scores are consistently on track. Keep up the excellent work.",
    badge: "Good Standing"
  };

  if (isCriticallyLowAttendance || isHighMLRisk || (isLowScore && hasSubjectBacklogs)) {
    status.level = 'critical';
    status.title = "Let's get you back on track";
    status.badge = "Immediate Attention";

    if (isCriticallyLowAttendance) {
      status.message = `Your attendance is currently at ${attendance}%, which needs immediate attention. Try to attend upcoming classes consistently and reach out to your mentor for guidance.`;
    } else if (isLowScore) {
      status.message = `Your recent test performance (${lastAvg}%) needs immediate attention. Connect with your mentor and teachers for extra academic support.`;
    } else {
      status.message = "Multiple academic indicators require urgent attention. Your mentor is ready to help you get back on track.";
    }
  } else if (isWarningAttendance || isMediumMLRisk || scoreDroppedSignificantly || isLowScore || hasFeesOverdue || hasSubjectBacklogs) {
    status.level = 'warning';
    status.title = "A few things to work on";
    status.badge = "Needs Attention";

    if (isWarningAttendance) {
      status.message = `Your attendance is currently ${attendance}%, which is below the recommended 75% threshold. Focusing on regular attendance will help you get back on track.`;
    } else if (scoreDroppedSignificantly) {
      status.message = `Your recent test average has dipped slightly. Small, steady improvements and revision can make a huge difference.`;
    } else if (hasFeesOverdue) {
      status.message = `You have outstanding fee payments (${feesDue} days overdue). Please connect with administration to resolve this promptly.`;
    } else {
      status.message = "Some areas need your attention. Small, steady improvements can make a huge difference.";
    }
  } else if (isGoodAttendance && !isLowScore && !isHighFeeOverdue && !isHighMLRisk) {
    status.level = 'good';
    status.title = "You're doing great, keep it up!";
    status.message = "Your attendance and academic scores are consistently on track. Keep up the excellent work!";
    status.badge = "Good Standing";
  }

  // Generate dynamic, prioritized recommendations
  const recommendations = [];

  // 1. Attendance Recommendation (Highest priority if low)
  if (isCriticallyLowAttendance) {
    recommendations.push(
      `Your attendance is currently ${attendance}%, which needs immediate attention. Try to attend upcoming classes consistently and consider speaking with your mentor about any difficulties affecting your attendance.`
    );
  } else if (isWarningAttendance) {
    recommendations.push(
      `Your attendance is currently ${attendance}%. Aim to attend all upcoming lectures to bring your attendance above the 75% requirement.`
    );
  } else {
    recommendations.push(
      `Maintain your strong attendance consistency (${attendance}%) throughout the upcoming semester modules.`
    );
  }

  // 2. Academic Performance Recommendation
  if (hasSubjectBacklogs) {
    recommendations.push(
      `You have ${attempts} attempts recorded in challenging subjects. Consider joining peer tutoring or attending faculty doubt-clearing sessions.`
    );
  } else if (isLowScore) {
    recommendations.push(
      `Your recent test average is ${lastAvg}%. Dedicate focused study hours and reach out to course instructors for help in difficult topics.`
    );
  } else if (scoreDroppedSignificantly) {
    recommendations.push(
      `Your recent test average (${lastAvg}%) dipped compared to earlier tests (${prevAvg}%). Review weak areas before the next evaluation.`
    );
  } else if (lastAvg >= 75 && scoreImproved) {
    recommendations.push(
      `Great academic progress! Your recent test average (${lastAvg}%) is improving. Maintain this momentum for upcoming assessments.`
    );
  } else {
    recommendations.push(
      `Keep up your regular study habits and revision schedule to stay prepared for upcoming assessments.`
    );
  }

  // 3. Fee Status Recommendation
  if (hasFeesOverdue) {
    recommendations.push(
      `Fee payment is pending for ${feesDue} day${feesDue > 1 ? 's' : ''}. Check with the accounts department to explore installment or scholarship options.`
    );
  }

  // 4. Mentor / Guidance Recommendation
  if (isCriticallyLowAttendance || isHighMLRisk || hasSubjectBacklogs) {
    recommendations.push(
      "Schedule a one-on-one session with your mentor to build a personalized study and attendance recovery plan."
    );
  }

  return { status, recommendations: [...new Set(recommendations)], scoreImproved };
}

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
  const { status, recommendations, scoreImproved } = evaluateStudentStatusAndRecommendations(student, risk);

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

  const attendanceRingColor = student.attendancePercent >= 75 
    ? '#4f46e5' 
    : student.attendancePercent >= 60 
      ? '#D97706' 
      : '#e11d48';

  const attendanceTextColor = student.attendancePercent >= 75 
    ? 'text-slate-800' 
    : student.attendancePercent >= 60 
      ? 'text-amber-600' 
      : 'text-rose-600';

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
            {recommendations?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <FiHeart className="text-rose-500" /> AI Recommendations
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        status.level === 'critical' && i === 0 
                          ? 'bg-rose-100 text-rose-600' 
                          : status.level === 'warning' && i === 0 
                            ? 'bg-amber-100 text-amber-600' 
                            : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {status.level === 'critical' && i === 0 ? (
                          <FiAlertCircle size={14} />
                        ) : (
                          <FiCheckCircle size={14} />
                        )}
                      </div>
                      <span className="text-sm text-slate-700 font-medium leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Status Report Banner */}
            <div className={`relative rounded-2xl p-8 sm:p-10 text-white overflow-hidden shadow-xl ${
              status.level === 'critical'
                ? 'bg-gradient-to-r from-slate-900 via-rose-950 to-indigo-950 shadow-rose-950/20'
                : status.level === 'warning'
                  ? 'bg-gradient-to-r from-slate-900 via-amber-950 to-indigo-950 shadow-amber-950/20'
                  : 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 shadow-indigo-900/10'
            }`}>
              <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 ${
                status.level === 'critical'
                  ? 'bg-rose-500/20'
                  : status.level === 'warning'
                    ? 'bg-amber-500/20'
                    : 'bg-indigo-500/20'
              }`} />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <p className="text-indigo-200 text-xs font-bold mb-2 tracking-widest uppercase">AI Status Report</p>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">{status.title}</h2>
                  <p className="text-indigo-100 max-w-lg leading-relaxed text-sm sm:text-base">{status.message}</p>
                </div>
                {status.badge && (
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shrink-0 text-sm font-semibold tracking-wide backdrop-blur-md ${
                    status.level === 'good'
                      ? 'bg-white/10 border-white/20 text-white'
                      : status.level === 'warning'
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                        : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                  }`}>
                    {status.level === 'good' ? (
                      <FiCheckCircle className="text-emerald-400" size={18} />
                    ) : (
                      <FiAlertCircle className={status.level === 'warning' ? 'text-amber-300' : 'text-rose-400'} size={18} />
                    )}
                    <span>{status.badge}</span>
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
                  <p className={`text-3xl font-bold tracking-tight ${attendanceTextColor}`}>
                    {student.attendancePercent}%
                  </p>
                </div>
                <ProgressRing value={student.attendancePercent} label="" color={attendanceRingColor} />
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