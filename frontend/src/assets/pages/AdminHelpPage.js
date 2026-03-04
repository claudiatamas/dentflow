import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Send, ChevronDown, Search,
  CheckCircle, Clock, AlertCircle, XCircle,
  Tag, MessageSquare, HelpCircle, Users, Filter,
  Zap, User
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const API = 'http://localhost:8000';

const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, options);
      if (!r.ok) {
        const e = await r.json().catch(() => ({ detail: 'Error' }));
        throw new Error(e.detail || `HTTP ${r.status}`);
      }
      return r.json();
    } catch (err) {
      if (i < retries - 1) await new Promise(res => setTimeout(res, 2 ** i * 1000));
      else throw err;
    }
  }
};

// ─── Config ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  open:        { label: 'Open',        icon: AlertCircle, cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  in_progress: { label: 'In Progress', icon: Clock,       cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  resolved:    { label: 'Resolved',    icon: CheckCircle, cls: 'bg-green-50 text-green-600 border-green-100' },
  closed:      { label: 'Closed',      icon: XCircle,     cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    cls: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-600',   dot: 'bg-amber-400' },
  high:   { label: 'High',   cls: 'bg-red-50 text-red-600',       dot: 'bg-red-500' },
};

const ALL_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const ALL_PRIORITIES = ['low', 'medium', 'high'];
const ALL_CATEGORIES = ['general', 'billing', 'technical', 'other'];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <Icon size={11} />{cfg.label}
    </span>
  );
};

const PriorityDot = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`} title={cfg.label} />;
};

const formatDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// ─── Ticket Detail Panel ──────────────────────────────────────
const TicketPanel = ({ ticket, token, onUpdated, currentUserId, onClose }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const messagesEndRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const data = await fetchWithRetry(`${API}/support-tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      onUpdated(data);
      setMessage('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setStatusLoading(true);
    try {
      const data = await fetchWithRetry(`${API}/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onUpdated(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const updatePriority = async (newPriority) => {
    try {
      const data = await fetchWithRetry(`${API}/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      onUpdated(data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const canReply = ticket.status !== 'closed' && ticket.status !== 'resolved';

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      {/* Panel Header */}
      <div className="p-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="font-semibold text-gray-800 text-base leading-tight truncate">{ticket.subject}</h2>
            <p className="text-xs text-gray-400 mt-0.5">#{ticket.id} · {formatDate(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Submitter */}
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gray-50 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User size={13} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{ticket.submitter_name}</p>
            <p className="text-xs text-gray-400 capitalize">{ticket.submitter_role}</p>
          </div>
          <span className="ml-auto text-xs text-gray-400 capitalize flex items-center gap-1">
            <Tag size={10} />{ticket.category}
          </span>
        </div>

        {/* Status + Priority controls */}
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1 font-medium">Status</p>
            <select
              value={ticket.status}
              onChange={e => updateStatus(e.target.value)}
              disabled={statusLoading}
              className="cursor-pointer w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1 font-medium">Priority</p>
            <select
              value={ticket.priority}
              onChange={e => updatePriority(e.target.value)}
              className="cursor-pointer w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ALL_PRIORITIES.map(p => (
                <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
        <p className="text-sm text-gray-700 leading-relaxed">{ticket.description}</p>
        {ticket.attachment_path && (
          <a
            href={`${API}/${ticket.attachment_path}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline"
          >
            📎 View attachment
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {ticket.messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No messages yet</div>
        ) : (
          ticket.messages.map(msg => {
            const isAdmin = msg.is_admin;
            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-400">
                    {isAdmin ? 'You (Support)' : msg.sender_name} · {formatDate(msg.created_at)}
                  </span>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isAdmin
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply */}
      {canReply ? (
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-end gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Reply to user... (Enter to send)"
              rows={2}
              className="flex-1 bg-transparent text-sm text-gray-800 resize-none focus:outline-none placeholder-gray-400"
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim() || sending}
              className="cursor-pointer p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400 flex-shrink-0">
          Ticket is {ticket.status} — no new messages allowed.
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Page ──────────────────────────────────────────
const AdminHelpPage = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('access_token');
    if (!t) { navigate('/login'); return; }
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(me => {
        if (me.role !== 'administrator') { navigate('/'); return; }
        setToken(t);
        setCurrentUserId(me.id);
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchWithRetry(`${API}/support-tickets/all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(data => setTickets(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleUpdated = updated => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelected(updated);
  };

  // Stats
  const stats = {
    total:      tickets.length,
    open:       tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:   tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  // Filter
  const filtered = tickets.filter(t => {
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) &&
        !t.submitter_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterRole && t.submitter_role !== filterRole) return false;
    return true;
  });

  const selectCls = "cursor-pointer text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <HelpCircle size={22} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Support Tickets</h1>
              <p className="text-sm text-gray-400">Manage and respond to user requests</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total',       value: stats.total,      color: 'text-gray-700',   bg: 'bg-gray-50',   icon: MessageSquare },
            { label: 'Open',        value: stats.open,       color: 'text-blue-600',   bg: 'bg-blue-50',   icon: AlertCircle  },
            { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600',  bg: 'bg-amber-50',  icon: Clock        },
            { label: 'Resolved',    value: stats.resolved,   color: 'text-green-600',  bg: 'bg-green-50',  icon: CheckCircle  },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.bg}`}><Icon size={17} className={s.color} /></div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subject or user..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selectCls}>
            <option value="">All Priorities</option>
            {ALL_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectCls}>
            <option value="">All Categories</option>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={selectCls}>
            <option value="">All Roles</option>
            <option value="doctor">Doctor</option>
            <option value="patient">Patient</option>
          </select>
          {(search || filterStatus || filterPriority || filterCategory || filterRole) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterCategory(''); setFilterRole(''); }}
              className="cursor-pointer text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Content — split view */}
        <div className={`flex gap-4 flex-1 min-h-0 ${selected ? 'overflow-hidden' : ''}`}>

          {/* Ticket list */}
          <div className={`flex flex-col gap-3 overflow-y-auto ${selected ? 'w-[45%] flex-shrink-0' : 'w-full'}`}>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : error ? (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                <HelpCircle size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No tickets found</p>
              </div>
            ) : (
              filtered.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className={`cursor-pointer bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all p-4 ${
                    selected?.id === ticket.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100 hover:border-blue-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <PriorityDot priority={ticket.priority} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={ticket.status} />
                        <span className="text-xs text-gray-400 capitalize">{ticket.category}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 truncate">{ticket.subject}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <User size={10} />
                        {ticket.submitter_name}
                        <span className="text-gray-300">·</span>
                        <span className="capitalize text-gray-400">{ticket.submitter_role}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{ticket.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                      {ticket.messages.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MessageSquare size={11} />{ticket.messages.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <TicketPanel
                ticket={selected}
                token={token}
                onUpdated={handleUpdated}
                currentUserId={currentUserId}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHelpPage;