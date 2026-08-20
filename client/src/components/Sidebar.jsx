import { NavLink } from 'react-router-dom';
import { FiUsers, FiGrid, FiUploadCloud, FiHeart, FiUserCheck, FiAlertTriangle, FiMessageCircle, FiX, FiBarChart2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = {
  mentor: [
    { to: '/mentor/analytics', label: 'Analytics', icon: FiGrid },
    { to: '/mentor', label: 'My Students', icon: FiUsers },
    { to: '/mentor/escalations', label: 'Escalations', icon: FiAlertTriangle },
    { to: '/upload', label: 'Upload Data', icon: FiUploadCloud },
    { to: '/admin/batch/latest', label: 'Recent Batch', icon: FiBarChart2 },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: FiGrid },
    { to: '/admin/batch/latest', label: 'Recent Batch', icon: FiBarChart2 },
    { to: '/upload', label: 'Upload Data', icon: FiUploadCloud },
    { to: '/admin/assignments', label: 'Assignments', icon: FiUserCheck },
    { to: '/mentor/escalations', label: 'Counselling Cases', icon: FiAlertTriangle },
  ],
  student: [
    { to: '/me', label: 'My Progress', icon: FiHeart },
    { to: '/counsellors', label: 'Find Counsellor', icon: FiUsers },
  ],
  counsellor: [
    { to: '/counsellor', label: 'My Students', icon: FiUsers },
    { to: '/mentor/escalations', label: 'Escalations', icon: FiAlertTriangle },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = NAV_ITEMS[user?.role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-60 h-[calc(100vh-4rem)] bg-slate-900 flex flex-col fixed left-0 top-16 z-40 transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 border-r border-slate-800`}
      >
        <div className="flex items-center justify-between px-5 py-3 lg:hidden border-b border-slate-800">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0">
            <FiX size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon size={16} className="opacity-80" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}