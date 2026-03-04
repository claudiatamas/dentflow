import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, MessageCircle, FileText, Megaphone,
  Calendar, UserCheck, AlertCircle, TrendingUp,
  CheckCircle, Clock, XCircle, Stethoscope
} from 'lucide-react';

const API = 'http://localhost:8000';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const STATUS_COLORS = {
  open:        '#3B82F6',
  in_progress: '#F59E0B',
  resolved:    '#10B981',
  closed:      '#9CA3AF',
  pending:     '#F59E0B',
  confirmed:   '#10B981',
  cancelled:   '#EF4444',
  finalised:   '#8B5CF6',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color = 'blue' }) => {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    pink:   'bg-pink-50 text-pink-600',
    teal:   'bg-teal-50 text-teal-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-3 rounded-xl flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const TICKET_STATUS = {
  open:        { label: 'Open',        cls: 'bg-blue-50 text-blue-600 border-blue-100',   icon: AlertCircle  },
  in_progress: { label: 'In Progress', cls: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock        },
  resolved:    { label: 'Resolved',    cls: 'bg-green-50 text-green-600 border-green-100', icon: CheckCircle  },
  closed:      { label: 'Closed',      cls: 'bg-gray-100 text-gray-500 border-gray-200',   icon: XCircle      },
};

const StatusBadge = ({ status }) => {
  const cfg = TICKET_STATUS[status] || TICKET_STATUS.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <Icon size={10} />{cfg.label}
    </span>
  );
};

const formatDate = iso => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/login'); return; }

    fetch(`${API}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => setStats(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout>
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
        Error loading stats: {error}
      </div>
    </AdminLayout>
  );

  const t = stats?.totals || {};

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}       label="Total Users"       value={t.users}        sub={`${t.doctors} doctors · ${t.patients} patients`} color="blue"   />
          <StatCard icon={Calendar}    label="Appointments"      value={t.appointments} sub="all time"                                         color="purple" />
          <StatCard icon={MessageCircle} label="Support Tickets" value={t.tickets}      sub={`${t.open_tickets} open`}                         color="amber"  />
          <StatCard icon={Megaphone}   label="Blog Posts"        value={t.blogs}        sub={`${t.active_blogs} active`}                       color="pink"   />
        </div>

        {/* ── Row 1: User growth + Appointments per month ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="User Growth" subtitle="New registrations · last 6 months">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.user_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="users" name="Users" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Appointments per Month" subtitle="Last 6 months">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.appts_per_month} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="appointments" name="Appointments" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Row 2: Tickets status + Doctors vs Patients + Appts by status ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard title="Support Ticket Status" subtitle="Distribution">
            {stats.tickets_by_status.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.tickets_by_status} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="status">
                    {stats.tickets_by_status.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No tickets yet</div>
            )}
          </ChartCard>

          <ChartCard title="Doctors vs Patients" subtitle="User role distribution">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.user_role_split} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="count" nameKey="role">
                  <Cell fill="#3B82F6" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Appointments by Status" subtitle="All time">
            {stats.appts_by_status.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.appts_by_status} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="status">
                    {stats.appts_by_status.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No appointments yet</div>
            )}
          </ChartCard>
        </div>

        {/* ── Row 3: Appointments by specialty + Blog posts per month ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Appointments by Specialty" subtitle="All time · top specialties">
            {stats.appts_by_specialty.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.appts_by_specialty} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="specialty" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Appointments" fill="#06B6D4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data</div>
            )}
          </ChartCard>

          <ChartCard title="Blog Posts per Month" subtitle="Last 6 months">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.blogs_per_month} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="posts" name="Posts" fill="#EC4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Row 4: Recent tickets + Recent users ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Recent Support Tickets" subtitle="Last 5 submitted">
            <div className="space-y-3">
              {stats.recent_tickets.length > 0 ? stats.recent_tickets.map(ticket => (
                <div key={ticket.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ticket.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ticket.submitter_name} · <span className="capitalize">{ticket.submitter_role}</span> · {formatDate(ticket.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No tickets yet</p>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Recent Registrations" subtitle="Last 5 users">
            <div className="space-y-3">
              {stats.recent_users.length > 0 ? stats.recent_users.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                    user.role === 'doctor' ? 'bg-blue-50 text-blue-600' :
                    user.role === 'patient' ? 'bg-green-50 text-green-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {user.role}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No users yet</p>
              )}
            </div>
          </ChartCard>
        </div>

      </div>
    </AdminLayout>
  );
};

export default DashboardAdmin;