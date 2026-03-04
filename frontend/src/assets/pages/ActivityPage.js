import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, Users, Calendar, Clock, DollarSign,
  Award, Activity, CheckCircle, XCircle, AlertCircle,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import PatientLayout from '../components/PatientLayout';

const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2 ** i * 1000));
      else throw error;
    }
  }
};

// ─── Palette ─────────────────────────────────────────────────
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// ─── Helpers ─────────────────────────────────────────────────
const getMonthLabel = (year, month) => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('default', { month: 'short', year: '2-digit' });
};

const last3Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
};

const formatRON = v => v != null ? `${parseFloat(v).toFixed(2)} RON` : '—';

// ─── Shared UI components ─────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'blue', trend }) => {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend != null && (
        <div className={`text-xs font-semibold flex items-center gap-0.5 mt-1 ${
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'
        }`}>
          {trend > 0 ? <ArrowUp size={12} /> : trend < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}{p.unit || ''}
        </p>
      ))}
    </div>
  );
};

const CustomTooltipPie = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: d } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700">{name}</p>
      <p className="text-gray-500">{value} appointments</p>
      {d.amount != null && <p className="text-green-600 font-medium">{formatRON(d.amount)}</p>}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// PATIENT ACTIVITY
// ═════════════════════════════════════════════════════════════
const PatientActivity = ({ appointments, appointmentTypes }) => {
  const months = last3Months();

  // 1. Visits per month
  const visitsByMonth = months.map(({ year, month }) => ({
    label: getMonthLabel(year, month),
    visits: appointments.filter(a => {
      const d = new Date(a.appointment_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }).length,
  }));

  // 2. Doctors interacted with
  const doctorMap = {};
  appointments.forEach(a => {
    const name = a.doctorName || 'Unknown';
    doctorMap[name] = (doctorMap[name] || 0) + 1;
  });
  const doctorList = Object.entries(doctorMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // 3. Pie chart tipuri
  const typeMap = {};
  appointments.forEach(a => {
    const name = a.type || 'Unknown';
    typeMap[name] = (typeMap[name] || 0) + 1;
  });
  const typePieData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  // 4. Cheltuieli
  const spent = appointments.reduce((sum, a) => {
    const type = appointmentTypes.find(t => t.id === a.appointment_type_id);
    return sum + (type?.price ? parseFloat(type.price) : 0);
  }, 0);

  const spentByType = {};
  appointments.forEach(a => {
    const type = appointmentTypes.find(t => t.id === a.appointment_type_id);
    if (!type?.price) return;
    const name = type.name;
    spentByType[name] = (spentByType[name] || 0) + parseFloat(type.price);
  });
  const spentPieData = Object.entries(spentByType).map(([name, amount]) => ({
    name,
    value: Math.round(amount * 100) / 100,
    amount,
  }));

  const spentByMonth = months.map(({ year, month }) => {
    const total = appointments
      .filter(a => {
        const d = new Date(a.appointment_date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      .reduce((sum, a) => {
        const type = appointmentTypes.find(t => t.id === a.appointment_type_id);
        return sum + (type?.price ? parseFloat(type.price) : 0);
      }, 0);
    return { label: getMonthLabel(year, month), total: Math.round(total * 100) / 100 };
  });

  // 5. Timeline
  const sortedAppts = [...appointments].sort(
    (a, b) => new Date(b.appointment_date) - new Date(a.appointment_date)
  );

  const statusIcon = s => {
    if (s === 'confirmed' || s === 'finalised') return <CheckCircle size={14} className="text-green-500" />;
    if (s === 'cancelled') return <XCircle size={14} className="text-red-400" />;
    return <AlertCircle size={14} className="text-amber-400" />;
  };

  const total = appointments.length;
  const completed = appointments.filter(a => a.status === 'finalised' || a.status === 'confirmed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total visits" value={total} sub="all time" color="blue" />
        <StatCard icon={CheckCircle} label="Completed" value={completed} sub={`${total ? Math.round(completed/total*100) : 0}% of total`} color="green" />
        <StatCard icon={XCircle} label="Cancelled" value={cancelled} color="red" />
        <StatCard icon={DollarSign} label="Total spent" value={spent > 0 ? `${spent.toFixed(2)} RON` : '—'} sub="with prices set" color="teal" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Visits per month" subtitle="Last 3 months">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={visitsByMonth} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipBar />} />
              <Bar dataKey="visits" name="Vizite" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Appointment types" subtitle="Distribution">
          {typePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {typePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltipPie />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              No appointments yet
            </div>
          )}
        </ChartCard>
      </div>

      {/* Cheltuieli */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Spending per month" subtitle="RON · last 3 months">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spentByMonth} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipBar />} formatter={v => [`${v} RON`]} />
              <Bar dataKey="total" name="Cheltuieli" fill="#10B981" radius={[6, 6, 0, 0]} unit=" RON" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Spending by type" subtitle="Cost distribution">
          {spentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={spentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {spentPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltipPie />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              No types with price set
            </div>
          )}
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctori */}
        <ChartCard title="Doctors you interacted with" subtitle="Sorted by number of visits">
          {doctorList.length > 0 ? (
            <div className="space-y-3">
              {doctorList.map((doc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})` }}
                  >
                    {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">Dr. {doc.name}</p>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(doc.count / doctorList[0].count) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-600 flex-shrink-0">{doc.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No interactions.</p>
          )}
        </ChartCard>

        {/* Timeline */}
        <ChartCard title="Appointment history" subtitle="Most recent">
          <div className="space-y-0 max-h-[280px] overflow-y-auto pr-1">
            {sortedAppts.length > 0 ? sortedAppts.slice(0, 15).map((appt, i) => {
              const type = appointmentTypes.find(t => t.id === appt.appointment_type_id);
              return (
                <div key={appt.id} className="flex gap-3 relative">
                  {/* line */}
                  {i < Math.min(sortedAppts.length, 15) - 1 && (
                    <div className="absolute left-[13px] top-7 bottom-0 w-px bg-gray-100" />
                  )}
                  <div className="mt-1.5 flex-shrink-0">{statusIcon(appt.status)}</div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">{appt.type}</p>
                      {type?.price && (
                        <span className="text-xs font-semibold text-green-600">{parseFloat(type.price).toFixed(2)} RON</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {appt.appointment_date} · Dr. {appt.doctorName}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-gray-400">No appointments.</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// DOCTOR ACTIVITY
// ═════════════════════════════════════════════════════════════
const DoctorActivity = ({ appointments, appointmentTypes }) => {
  const months = last3Months();

  // 1. New vs returning patients
  const patientFirstVisit = {};
  [...appointments]
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
    .forEach(a => {
      if (!patientFirstVisit[a.patient_id]) patientFirstVisit[a.patient_id] = a.appointment_date;
    });

  const monthRange = months.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`);
  let newPatients = 0, returningPatients = 0;
  appointments.forEach(a => {
    const ym = a.appointment_date?.slice(0, 7);
    if (!monthRange.includes(ym)) return;
    const first = patientFirstVisit[a.patient_id]?.slice(0, 7);
    if (first && monthRange.includes(first) && first === ym &&
        appointments.filter(x => x.patient_id === a.patient_id && x.appointment_date < a.appointment_date).length === 0) {
      newPatients++;
    } else {
      returningPatients++;
    }
  });
  const newVsReturning = [
    { name: 'New', value: newPatients },
    { name: 'Returning', value: returningPatients },
  ].filter(d => d.value > 0);

  // 2. Most common treatments (of tipurile de appointments folosite)
  const treatMap = {};
  appointments.forEach(a => {
    const name = a.type || 'Unknown';
    treatMap[name] = (treatMap[name] || 0) + 1;
  });
  const treatData = Object.entries(treatMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // 3. Rata de attendance
  const total3m = appointments.filter(a => {
    const ym = a.appointment_date?.slice(0, 7);
    return monthRange.includes(ym);
  });
  const present = total3m.filter(a => a.status === 'finalised' || a.status === 'confirmed').length;
  const absent = total3m.filter(a => a.status === 'cancelled').length;
  const attendanceRate = total3m.length > 0 ? Math.round((present / total3m.length) * 100) : 0;
  const attendanceData = [
    { name: 'Present', value: present },
    { name: 'Absent/Cancelled', value: absent },
  ].filter(d => d.value > 0);

  // 4. Top patients
  const patientVisits = {};
  const patientNames = {};
  appointments.forEach(a => {
    patientVisits[a.patient_id] = (patientVisits[a.patient_id] || 0) + 1;
    patientNames[a.patient_id] = a.patientName || 'Unknown';
  });
  const topPatients = Object.entries(patientVisits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ name: patientNames[id], count }));

  // 5. Revenue per month
  const revenueByMonth = months.map(({ year, month }) => {
    const total = appointments
      .filter(a => {
        const d = new Date(a.appointment_date);
        return (
          d.getFullYear() === year &&
          d.getMonth() + 1 === month &&
          (a.status === 'finalised' || a.status === 'confirmed')
        );
      })
      .reduce((sum, a) => {
        const type = appointmentTypes.find(t => t.id === a.appointment_type_id);
        return sum + (type?.price ? parseFloat(type.price) : 0);
      }, 0);
    return { label: getMonthLabel(year, month), total: Math.round(total * 100) / 100 };
  });

  const totalRevenue = revenueByMonth.reduce((s, m) => s + m.total, 0);
  const uniquePatients3m = new Set(total3m.map(a => a.patient_id)).size;
  const totalAppointments3m = total3m.length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Patients (3 months)" value={uniquePatients3m} color="blue" />
        <StatCard icon={Calendar} label="Appointments (3 months)" value={totalAppointments3m} color="purple" />
        <StatCard icon={Activity} label="Attendance rate" value={`${attendanceRate}%`} sub={`${present} of ${total3m.length}`} color="green" />
        <StatCard icon={DollarSign} label="Revenue (3 months)" value={totalRevenue > 0 ? `${totalRevenue.toFixed(0)} RON` : '—'} sub="finalised + confirmed" color="teal" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="New vs returning patients" subtitle="Last 3 months">
          {newVsReturning.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={newVsReturning} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  <Cell fill="#3B82F6" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip content={<CustomTooltipPie />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </ChartCard>

        <ChartCard title="Rata de attendance" subtitle="Present vs absent">
          {attendanceData.length > 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] gap-4">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#10B981" strokeWidth="3"
                    strokeDasharray={`${attendanceRate} ${100 - attendanceRate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">{attendanceRate}%</span>
                  <span className="text-xs text-gray-400">attendance</span>
                </div>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Present: {present}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Absent: {absent}</span>
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </ChartCard>

        <ChartCard title="Most common treatments" subtitle="Top types">
          {treatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={treatData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {treatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltipPie />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue per month" subtitle="RON · confirmed + finalised appointments">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByMonth} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipBar />} />
              <Bar dataKey="total" name="Venituri" fill="#3B82F6" radius={[6, 6, 0, 0]} unit=" RON" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top patients" subtitle="By number of visits">
          {topPatients.length > 0 ? (
            <div className="space-y-3 mt-1">
              {topPatients.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 text-center">
                    {i === 0 ? (
                      <Award size={16} className="text-amber-400 mx-auto" />
                    ) : (
                      <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                    )}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i+2) % COLORS.length]})` }}
                  >
                    {p.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(p.count / topPatients[0].count) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-600 flex-shrink-0">{p.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
const ActivityPage = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/login'); return; }

    const load = async () => {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      try {
        const me = await fetchWithRetry('http://localhost:8000/me', { headers });
        setRole(me.role);

        const appts = await fetchWithRetry('http://localhost:8000/appointments', { headers });

        // Fetch types — different endpoint for patient and doctor
        const typesUrl = me.role === 'patient'
          ? 'http://localhost:8000/appointment-types-patient'
          : 'http://localhost:8000/appointment-types';
        const types = await fetchWithRetry(typesUrl, { headers });
        setAppointmentTypes(types);

        if (me.role === 'doctor') {
          // Fetch patient names
          const uniquePatientIds = [...new Set(appts.map(a => a.patient_id))];
          const patientMap = {};
          await Promise.all(
            uniquePatientIds.map(async id => {
              try {
                const p = await fetchWithRetry(`http://localhost:8000/patients/${id}`, { headers });
                patientMap[id] = p;
              } catch {
                patientMap[id] = { first_name: 'Unknown', last_name: '' };
              }
            })
          );
          const mapped = appts.map(a => ({
            ...a,
            patientName: patientMap[a.patient_id]
              ? `${patientMap[a.patient_id].first_name} ${patientMap[a.patient_id].last_name}`.trim()
              : 'Unknown',
            type: types.find(t => t.id === a.appointment_type_id)?.name || 'Unknown',
          }));
          setAppointments(mapped);
        } else {
          // Patient: fetch doctor names
          const doctors = await fetchWithRetry('http://localhost:8000/doctors', { headers });
          const mapped = appts.map(a => {
            const doc = doctors.find(d => d.doctorId === a.doctor_id);
            return {
              ...a,
              doctorName: doc ? `${doc.first_name} ${doc.last_name}` : 'Unknown',
              type: types.find(t => t.id === a.appointment_type_id)?.name || 'Unknown',
            };
          });
          setAppointments(mapped);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const content = (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-50 rounded-xl">
            <TrendingUp size={22} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Activity</h1>
        </div>
        <p className="text-gray-400 text-sm ml-12">
          {role === 'doctor'
            ? 'Statistics & performance — last 3 months'
            : 'Your medical history & expenses'}
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && role === 'patient' && (
        <PatientActivity appointments={appointments} appointmentTypes={appointmentTypes} />
      )}
      {!loading && !error && role === 'doctor' && (
        <DoctorActivity appointments={appointments} appointmentTypes={appointmentTypes} />
      )}
    </div>
  );

  if (role === 'doctor') return <DashboardLayout>{content}</DashboardLayout>;
  return <PatientLayout>{content}</PatientLayout>;
};

export default ActivityPage;