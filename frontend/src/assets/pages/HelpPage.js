import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, Send, Paperclip, ChevronRight,
  CheckCircle, Clock, AlertCircle, XCircle,
  Tag, Zap, MessageSquare, HelpCircle
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import PatientLayout from '../components/PatientLayout';

const API = 'http://localhost:8000';

const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, options);
      if (!r.ok) {
        const e = await r.json().catch(() => ({ detail: 'Error' }));
        throw new Error(e.detail || `HTTP ${r.status}`);
      }
      if (r.status === 204) return null;
      return r.json();
    } catch (err) {
      if (i < retries - 1) await new Promise(res => setTimeout(res, 2 ** i * 1000));
      else throw err;
    }
  }
};

// ─── Config ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  open:        { label: 'Open',        icon: AlertCircle,   cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  in_progress: { label: 'In Progress', icon: Clock,         cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  resolved:    { label: 'Resolved',    icon: CheckCircle,   cls: 'bg-green-50 text-green-600 border-green-100' },
  closed:      { label: 'Closed',      icon: XCircle,       cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    cls: 'bg-gray-100 text-gray-500' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-600' },
  high:   { label: 'High',   cls: 'bg-red-50 text-red-600' },
};

const CATEGORIES = ['general', 'billing', 'technical', 'other'];
const PRIORITIES = ['low', 'medium', 'high'];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const formatDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// ─── New Ticket Modal ─────────────────────────────────────────
const NewTicketModal = ({ isOpen, onClose, onCreated, token }) => {
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'medium' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('subject', form.subject);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('priority', form.priority);
      if (file) fd.append('attachment', file);

      const data = await fetchWithRetry(`${API}/support-tickets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      onCreated(data);
      setForm({ subject: '', description: '', category: 'general', priority: 'medium' });
      setFile(null);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">New Support Ticket</h2>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief description of your issue"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Please describe your issue in detail..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="cursor-pointer w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="cursor-pointer w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* File attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Attachment <span className="text-gray-400 font-normal">(optional)</span></label>
            <div
              className="flex items-center gap-3 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">{file ? file.name : 'Click to attach a file'}</span>
              {file && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="ml-auto cursor-pointer text-gray-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0] || null)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Ticket Detail Modal ──────────────────────────────────────
const TicketDetailModal = ({ ticket, isOpen, onClose, token, onUpdated, currentUserId }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!isOpen || !ticket) return null;

  const canReply = ticket.status !== 'closed' && ticket.status !== 'resolved';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="text-xs text-gray-400 capitalize">{ticket.category}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 truncate">{ticket.subject}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Opened {formatDate(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={22} /></button>
        </div>

        {/* Description */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed">{ticket.description}</p>
          {ticket.attachment_path && (
            <a
              href={`${API}/${ticket.attachment_path}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:underline"
            >
              <Paperclip size={12} /> View attachment
            </a>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          {ticket.messages.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No replies yet. Our support team will respond shortly.
            </div>
          ) : (
            ticket.messages.map(msg => {
              const isOwn = msg.user_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className="flex items-center gap-2">
                      {!isOwn && (
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">
                            {msg.sender_name?.charAt(0) || 'A'}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-gray-400">
                        {msg.is_admin ? 'Support Team' : msg.sender_name} · {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isOwn
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

        {/* Reply input */}
        {canReply ? (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-end gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Write a message... (Enter to send)"
                rows={2}
                className="flex-1 bg-transparent text-sm text-gray-800 resize-none focus:outline-none placeholder-gray-400"
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || loading}
                className="cursor-pointer p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-gray-100 text-center text-sm text-gray-400">
            This ticket is {ticket.status}. You cannot send new messages.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main HelpPage ────────────────────────────────────────────
const HelpPageContent = ({ token, userId, role }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchWithRetry(`${API}/support-tickets/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreated = ticket => setTickets(prev => [ticket, ...prev]);

  const handleUpdated = updated => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTicket(updated);
  };

  const open   = tickets.filter(t => t.status === 'open').length;
  const active = tickets.filter(t => t.status === 'in_progress').length;
  const done   = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-50 rounded-xl">
              <HelpCircle size={22} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Help & Support</h1>
          </div>
          <p className="text-sm text-gray-400 ml-12">Submit a ticket and our team will get back to you</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={17} /> New Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Open', value: open,   color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'In Progress', value: active, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Resolved', value: done,   color: 'text-green-600', bg: 'bg-green-50'  },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <MessageSquare size={18} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</p>}

      {/* Ticket list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <HelpCircle size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tickets yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a new ticket if you need help</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="cursor-pointer bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <span className="text-xs text-gray-400 capitalize flex items-center gap-1">
                    <Tag size={10} />{ticket.category}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800 truncate">{ticket.subject}</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{ticket.description}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(ticket.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {ticket.messages.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MessageSquare size={13} /> {ticket.messages.length}
                  </span>
                )}
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      <NewTicketModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onCreated={handleCreated}
        token={token}
      />

      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        token={token}
        onUpdated={handleUpdated}
        currentUserId={userId}
      />
    </div>
  );
};

// ─── Wrapper with layout ──────────────────────────────────────
const HelpPage = () => {
  const navigate = useNavigate();
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/login'); return; }
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(me => setAuth({ token, userId: me.id, role: me.role }))
      .catch(() => navigate('/login'));
  }, [navigate]);

  if (!auth) return null;

  const inner = <HelpPageContent token={auth.token} userId={auth.userId} role={auth.role} />;

  if (auth.role === 'doctor') return <DashboardLayout>{inner}</DashboardLayout>;
  return <PatientLayout>{inner}</PatientLayout>;
};

export default HelpPage;