import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiTrendingDown, FiAlertCircle, FiUser, FiMessageCircle, FiBookOpen, FiUploadCloud, FiDownload, FiFileText, FiPlus } from "react-icons/fi";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import RiskBadge from "../components/RiskBadge";
import RiskFactorBar from "../components/RiskFactorBar";
import NoteThread from "../components/NoteThread";
import RiskTrendChart from "../components/RiskTrendChart";
import UploadResourceModal from "../components/UploadResourceModal";

export default function StudentProfile() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [resources, setResources] = useState([]);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState("");

  const handleSendReport = async () => {
    setSendingReport(true);
    setReportSuccess("");
    setError("");
    try {
      const res = await api.post(`/reports/${studentId}/whatsapp`);
      const { guardianContact, reportText } = res.data;
      
      // Ensure number has country code for WhatsApp (defaulting to +91 for India)
      let phone = guardianContact;
      if (!phone.startsWith("+")) {
        phone = "+91" + phone;
      }
      
      // Open WhatsApp Click-to-Chat in a new tab
      const encodedText = encodeURIComponent(reportText);
      window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
      
      setReportSuccess("WhatsApp chat opened successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to prepare report");
    } finally {
      setSendingReport(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get(`/students/${studentId}`),
      api.get(`/notes/${studentId}`),
      api.get(`/resources/student/${studentId}`),
    ])
      .then(([studentRes, notesRes, resourcesRes]) => {
        setData(studentRes.data);
        setNotes(notesRes.data.notes);
        setResources(resourcesRes.data.resources || []);
      })
      .catch(() => setError("Failed to load student profile"))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <DashboardLayout title="Loading...">
        <p className="text-sm text-slate-500">Loading profile...</p>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout title="Error">
        <p className="text-sm text-red-600">{error}</p>
      </DashboardLayout>
    );
  }

  const { student, risk } = data;
  const canWrite = user?.role === "mentor" || user?.role === "admin";

  const headerActions = canWrite ? (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setResourceModalOpen(true)}
        className="flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
      >
        <FiUploadCloud size={15} />
        <span>Share Resource</span>
      </button>

      <button
        onClick={handleSendReport}
        disabled={sendingReport}
        className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition border border-emerald-200 disabled:opacity-50"
      >
        <FiMessageCircle size={15} />
        {sendingReport ? "Sending..." : "Message Guardian"}
      </button>
    </div>
  ) : null;

  return (
    <DashboardLayout
      title={`${student.firstName} ${student.lastName}`}
      subtitle={`${student.studentId} · ${student.class} · ${student.department}`}
      headerIcon={FiUser}
      headerActions={headerActions}
    >
      {reportSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-sm font-medium">{reportSuccess}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Risk overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Overall Risk
                </p>
                <p className="text-3xl font-semibold text-slate-900">
                  {(risk.riskScore * 100).toFixed(0)}%
                </p>
              </div>
              <RiskBadge level={risk.riskLevel} />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <p className="text-xs font-medium text-slate-500 mb-4">
                Risk Trend
              </p>
              <RiskTrendChart riskHistory={data.riskHistory} />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="text-xs font-medium text-slate-500 mb-4">
                AI Risk Factor Breakdown (SHAP Impact)
              </p>
              {risk.components?.top_factors?.map((factor, i) => (
                <RiskFactorBar key={i} factorKey={factor.feature} value={Math.abs(factor.impact)} />
              ))}
            </div>
          </div>

          {risk.topReasons?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
              <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1.5">
                <FiTrendingDown size={14} /> Key Reasons
              </p>
              <ul className="space-y-2">
                {risk.topReasons.map((r, i) => (
                  <li
                    key={i}
                    className="text-sm text-slate-700 flex items-start gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />
                    {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {risk.recommendations?.length > 0 && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 sm:p-6">
              <p className="text-xs font-medium text-indigo-700 mb-3 flex items-center gap-1.5">
                <FiAlertCircle size={14} /> Recommended Actions
              </p>
              <ul className="space-y-2">
                {risk.recommendations.map((r, i) => (
                  <li
                    key={i}
                    className="text-sm text-indigo-900 flex items-start gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-indigo-400 mt-2 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw data snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500 mb-4">Raw Data</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Attendance</p>
                <p className="font-medium text-slate-800">
                  {student.attendancePercent}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Fees Overdue</p>
                <p className="font-medium text-slate-800">
                  {student.feesDueDays} days
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">
                  Subject Attempts
                </p>
                <p className="font-medium text-slate-800">
                  {student.attemptsInSubjectX}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Recent Avg</p>
                <p className="font-medium text-slate-800">
                  {student.last3TestsAvg}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Previous Avg</p>
                <p className="font-medium text-slate-800">
                  {student.previous3TestsAvg}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Notes & Resources */}
        <div className="space-y-6 h-fit">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500 mb-4">
              Intervention Notes
            </p>
            <NoteThread
              studentId={studentId}
              notes={notes}
              canWrite={canWrite}
              onNoteAdded={(n) => setNotes([n, ...notes])}
              onNoteUpdated={(updated) =>
                setNotes(notes.map((n) => (n._id === updated._id ? updated : n)))
              }
              onNoteDeleted={(deletedId) =>
                setNotes(notes.filter((n) => n._id !== deletedId))
              }
            />
          </div>

          {/* Assigned Study Resources */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Assigned Resources ({resources.length})
                </p>
                <p className="text-[11px] text-slate-400">
                  Shared materials & recovery guides
                </p>
              </div>
              {canWrite && (
                <button
                  onClick={() => setResourceModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition"
                >
                  <FiPlus size={14} /> Add
                </button>
              )}
            </div>

            {resources.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No resources shared with this student yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {resources.map((item) => (
                  <div
                    key={item._id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-indigo-600">{item.category}</span>
                        <span>•</span>
                        <span>{item.targetType === 'single' ? 'Personalized' : 'All Students'}</span>
                      </p>
                    </div>
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Download Resource"
                    >
                      <FiDownload size={13} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <UploadResourceModal
        isOpen={resourceModalOpen}
        onClose={() => setResourceModalOpen(false)}
        preselectedStudent={{
          studentId: student.studentId,
          name: `${student.firstName} ${student.lastName}`,
        }}
        onSuccess={(newResource) => {
          setResources((prev) => [newResource, ...prev]);
        }}
      />
    </DashboardLayout>
  );
}
