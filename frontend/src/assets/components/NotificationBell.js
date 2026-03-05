import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, X, CheckCheck, Calendar, MessageCircle,
  FileText, Star, Package, Ticket, Users, Clock
} from 'lucide-react';

const API = 'http://localhost:8000';
const POLL_INTERVAL = 30_000;

// ── Notification type config ──────────────────────────────────
const TYPE_CONFIG = {
  appointment_status: {
    icon: Calendar,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  appointment_reminder: {
    icon: Clock,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  new_message: {
    icon: MessageCircle,
    color: 'text-green-500',
    bg: 'bg-green-50',
    route: () => `/chat_users`,
  },
  feedback_request: {
    icon: Star,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    route: () => null,
  },
  medical_record_updated: {
    icon: FileText,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    route: () => `/medical_records`,
  },
  ticket_update: {
    icon: Ticket,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
    route: () => `/help_user`,
  },
  low_stock: {
    icon: Package,
    color: 'text-red-500',
    bg: 'bg-red-50',
    route: () => `/stock`,
  },
  new_ticket: {
    icon: Ticket,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    route: () => `/help_admin`,
  },
  weekly_signup_summary: {
    icon: Users,
    color: 'text-teal-500',
    bg: 'bg-teal-50',
    route: () => `/admin_users`,
  },
};

const DEFAULT_CONFIG = {
  icon: Bell,
  color: 'text-gray-500',
  bg: 'bg-gray-50',
  route: () => null,
};

// ── Relative time formatter ────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ── Single notification item ───────────────────────────────────
const NotifItem = ({ notif, onRead, onDelete, onNavigate, userRole }) => {
  const cfg = TYPE_CONFIG[notif.type] || DEFAULT_CONFIG;
  const Icon = cfg.icon;

  // Route bazat pe rol pentru appointment
  let route;
  if (notif.type === 'appointment_status' || notif.type === 'appointment_reminder') {
    route = userRole === 'patient' ? '/appointments_patient' : '/appointments_doctor';
  } else {
    route = cfg.route ? cfg.route(notif.entity_id) : null;
  }

  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id);
    if (route) onNavigate(route);
  };

  return (
    <div
      className={`group relative flex gap-3 px-4 py-3 transition-colors cursor-pointer ${
        notif.is_read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
      }`}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg.bg}`}>
        <Icon size={16} className={cfg.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <p className={`text-sm leading-snug ${notif.is_read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
          {notif.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
      </div>

      {/* Unread dot */}
      {!notif.is_read && (
        <span className="absolute right-10 top-4 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}

      {/* Delete button */}
      <button
        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
        title="Remove"
      >
        <X size={12} className="text-gray-400" />
      </button>
    </div>
  );
};

// ── Main NotificationBell component ───────────────────────────
const NotificationBell = () => {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifs]    = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [userRole, setUserRole]       = useState(null);
  const panelRef                      = useRef();

  const token = localStorage.getItem('access_token');
  const headers = { Authorization: `Bearer ${token}` };

  // ── Fetch user role once on mount ─────────────────────────
  useEffect(() => {
    if (!token) return;
    const fetchRole = async () => {
      try {
        const res = await fetch(`${API}/me`, { headers });
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role);
        }
      } catch (_) {}
    };
    fetchRole();
  }, [token]);

  // ── Fetch unread count (lightweight, runs every 30s) ──────
  const fetchCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/notifications/unread-count`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch (_) {}
  }, [token]);

  // ── Fetch full notification list (only when panel opens) ──
  const fetchNotifs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/notifications?limit=30`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  // ── Polling ────────────────────────────────────────────────
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchCount]);

  // ── Open panel → load notifications ───────────────────────
  useEffect(() => {
    if (open) fetchNotifs();
  }, [open, fetchNotifs]);

  // ── Close on outside click ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ────────────────────────────────────────────────
  const markRead = async (id) => {
    await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotif = async (id) => {
    await fetch(`${API}/notifications/${id}`, { method: 'DELETE', headers });
    const removed = notifications.find(n => n.id === id);
    setNotifs(prev => prev.filter(n => n.id !== id));
    if (removed && !removed.is_read) setUnreadCount(c => Math.max(0, c - 1));
  };

  const navigateTo = (route) => {
    setOpen(false);
    window.location.href = route;
  };

  const unread = notifications.filter(n => !n.is_read);
  const read   = notifications.filter(n =>  n.is_read);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        className="cursor-pointer relative p-1 rounded-full hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="absolute right-0 mt-3 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden flex flex-col max-h-[520px]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="cursor-pointer flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  <span>All read</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Bell size={22} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">You're all caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No notifications yet.</p>
              </div>
            ) : (
              <>
                {unread.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">New</p>
                    </div>
                    {unread.map(n => (
                      <NotifItem
                        key={n.id}
                        notif={n}
                        onRead={markRead}
                        onDelete={deleteNotif}
                        onNavigate={navigateTo}
                        userRole={userRole}
                      />
                    ))}
                  </>
                )}

                {read.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 border-t">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Earlier</p>
                    </div>
                    {read.map(n => (
                      <NotifItem
                        key={n.id}
                        notif={n}
                        onRead={markRead}
                        onDelete={deleteNotif}
                        onNavigate={navigateTo}
                        userRole={userRole}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <p className="text-xs text-gray-400 text-center">
                Showing last {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;