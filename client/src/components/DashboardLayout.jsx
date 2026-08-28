import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiLogOut, FiChevronDown, FiUser, FiBell, FiCheck, FiInfo } from 'react-icons/fi';
import { FaGraduationCap } from 'react-icons/fa';
import Sidebar from './Sidebar';
import ChatWidget from './ChatWidget';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function DashboardLayout({ title, subtitle, headerIcon: HeaderIcon, headerActions, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const { user, logout } = useAuth();
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      api.get('/notifications').then(res => {
        setNotifications(res.data);
      }).catch(console.error);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, read: true } : n));
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const initials = (user?.username || '?')
    .split(/[.\s@]/)[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white lg:hidden shrink-0"
          >
            <FiMenu size={22} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 shrink-0 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center justify-center">
              <FaGraduationCap size={18} />
            </div>
            <span className="text-sm font-semibold text-white hidden sm:block tracking-wide">
              AI Dropout Prediction and Counselling System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative text-slate-400 hover:text-white transition p-1"
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                      <FiBell className="mx-auto mb-2 opacity-50" size={24} />
                      No notifications yet
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map(n => (
                        <div 
                          key={n._id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`p-4 hover:bg-slate-50 transition cursor-pointer flex gap-3 ${!n.read ? 'bg-indigo-50/30' : ''}`}
                        >
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${!n.read ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {n.type === 'warning' ? <FiInfo size={14} /> : <FiBell size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm mb-0.5 ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium uppercase tracking-wider">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="w-2 h-2 shrink-0 rounded-full bg-indigo-500 mt-1.5"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 hover:bg-slate-800 p-1.5 rounded-lg transition text-white"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium capitalize">{user?.role}</p>
            </div>
            <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <FiChevronDown size={14} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                <p className="text-xs font-medium text-slate-800 truncate">{user?.username}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.role} Account</p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-slate-50 flex items-center gap-2 transition"
              >
                <FiLogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:ml-60 flex flex-col min-h-[calc(100vh-4rem)]">
          <div className="bg-slate-50 px-6 sm:px-10 pt-6 sm:pt-8 pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                {HeaderIcon && <HeaderIcon className="text-indigo-600 shrink-0" size={26} />}
                <h1 className="text-2xl sm:text-[1.6rem] font-bold text-slate-900 tracking-tight">{title}</h1>
              </div>
              {subtitle && <p className="mt-1.5 text-sm text-slate-500 font-medium">{subtitle}</p>}
            </div>
            {headerActions && (
              <div className="flex items-center gap-3">
                {headerActions}
              </div>
            )}
          </div>
          <main className="px-6 sm:px-10 pt-2 sm:pt-3 pb-8 flex-1">{children}</main>
        </div>
      </div>
      {user?.role === 'student' && <ChatWidget />}
    </div>
  );
}   