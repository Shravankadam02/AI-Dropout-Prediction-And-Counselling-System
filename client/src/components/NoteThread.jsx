import { useState } from 'react';
import { FiCheckCircle, FiCircle, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function NoteThread({ studentId, notes, onNoteAdded, onNoteUpdated, onNoteDeleted, canWrite }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/notes', { studentId, note: text });
      onNoteAdded(res.data.note);
      setText('');
      showToast('Note added', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add note', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (note) => {
    const newStatus = note.status === 'open' ? 'resolved' : 'open';
    try {
      const res = await api.patch(`/notes/${note._id}/status`, { status: newStatus });
      onNoteUpdated(res.data.note);
      showToast(newStatus === 'resolved' ? 'Marked as resolved' : 'Reopened', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update note', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/notes/${noteToDelete._id}`);
      if (onNoteDeleted) {
        onNoteDeleted(noteToDelete._id);
      }
      showToast('Note deleted permanently', 'success');
      setNoteToDelete(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete note', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {canWrite && (
        <form onSubmit={handleAdd} className="mb-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Log an intervention or update..."
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="mt-2 text-xs font-medium bg-indigo-600 text-white px-3.5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Adding...' : 'Add Note'}
          </button>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n._id} className="border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 transition-colors">
              <div className="flex justify-between items-start gap-3 mb-1.5">
                <p className="text-sm text-slate-700 flex-1 leading-relaxed whitespace-pre-wrap">{n.note}</p>
                {canWrite && (
                  <div className="flex items-center gap-1 shrink-0 -mt-0.5">
                    <button
                      onClick={() => toggleStatus(n)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title={n.status === 'open' ? 'Mark resolved' : 'Reopen'}
                    >
                      {n.status === 'resolved' ? (
                        <FiCheckCircle size={16} className="text-emerald-600" />
                      ) : (
                        <FiCircle size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => setNoteToDelete(n)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete note"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-400">
                  {n.mentorId?.username || 'Mentor'} · {new Date(n.createdAt).toLocaleDateString()}
                </span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    n.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {n.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <FiAlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Intervention Note</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs text-slate-600 max-h-28 overflow-y-auto leading-relaxed italic">
              "{noteToDelete.note}"
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to permanently remove this note from the student's records?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition shadow-sm shadow-rose-600/20"
              >
                {deleting ? 'Deleting...' : 'Delete Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}