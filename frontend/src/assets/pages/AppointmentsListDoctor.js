import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  Calendar, Clock, User, ChevronDown, CheckCircle,
  XCircle, Search, Filter, Loader2, AlertCircle,
  Stethoscope, Phone, Mail, RefreshCw
} from 'lucide-react';

const API = 'http://localhost:8000';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-400',
  },
  finalised: {
    label: 'Finalised',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
  },
};

const FILTERS = ['all', 'pending', 'confirmed', 'cancelled', 'finalised'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  return timeStr.slice(0, 5);
}

// ── Patient detail modal ──────────────────────────────────────
const PatientModal = ({ patientId, onClose, token }) => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`${API}/patients/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setPatient(await res.json());
      } catch (_) {}
      setLoading(false);
    };
    fetchPatient();
  }, [patientId, token]);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[#1C398E]" size={28} />
          </div>
        ) : patient ? (
          <>
            <div className="flex items-center gap-4 mb-5">
              {patient.profile_picture ? (
                <img src={patient.profile_picture} alt=""
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-[#1C398E]/20" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#1C398E]/10 flex items-center justify-center">
                  <User size={24} className="text-[#1C398E]" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-800 text-lg">
                  {patient.first_name} {patient.last_name}
                </h3>
                <p className="text-sm text-gray-400">{patient.gender || '—'}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {patient.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={14} className="text-[#1C398E]" />
                  <span>{patient.email}</span>
                </div>
              )}
              {patient.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} className="text-[#1C398E]" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.birth_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={14} className="text-[#1C398E]" />
                  <span>Born: {formatDate(patient.birth_date)}</span>
                </div>
              )}
              {patient.city && (
                <p className="text-gray-500">{[patient.city, patient.county, patient.country].filter(Boolean).join(', ')}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer mt-5 w-full py-2.5 rounded-xl bg-[#1C398E] text-white text-sm font-medium hover:bg-[#1C398E]/90 transition-colors"
            >
              Close
            </button>
          </>
        ) : (
          <p className="text-center text-gray-500 py-6">Patient info not available.</p>
        )}
      </div>
    </div>
  );
};

// ── Appointment card ──────────────────────────────────────────
const AppointmentCard = ({ appt, onStatusChange, onViewPatient, updating }) => {
  const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const isPast = new Date(appt.appointment_date) < new Date();
  const patientName = appt._patientName || null;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200 ${updating ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          {isPast && appt.status === 'confirmed' && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Past</span>
          )}
        </div>
        {appt.appointment_type_name && (
          <span className="text-xs text-[#1C398E] bg-[#1C398E]/8 px-2.5 py-1 rounded-full font-medium">
            {appt.appointment_type_name}
          </span>
        )}
      </div>

      {/* Date & time */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar size={15} className="text-[#1C398E]" />
          <span className="text-sm font-medium">{formatDate(appt.appointment_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock size={15} className="text-[#1C398E]" />
          <span className="text-sm">{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</span>
        </div>
      </div>

      {/* Patient */}
      <button
        onClick={() => onViewPatient(appt.patient_id)}
        className="cursor-pointer flex items-center gap-3 w-full mb-4 p-3 rounded-xl bg-gray-50 hover:bg-[#1C398E]/5 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-[#1C398E]/10 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-[#1C398E]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400">Patient</p>
          <p className="text-sm font-medium text-gray-700 truncate">
            {patientName || `ID #${appt.patient_id}`}
          </p>
        </div>
        <ChevronDown size={14} className="text-gray-400 ml-auto rotate-[-90deg]" />
      </button>

      {/* Description */}
      {appt.description && (
        <p className="text-xs text-gray-500 mb-4 line-clamp-2 italic">"{appt.description}"</p>
      )}

      {/* Action buttons */}
      {appt.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(appt.id, 'confirmed')}
            className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
          >
            <CheckCircle size={15} />
            Confirm
          </button>
          <button
            onClick={() => onStatusChange(appt.id, 'cancelled')}
            className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-colors border border-red-100"
          >
            <XCircle size={15} />
            Cancel
          </button>
        </div>
      )}

      {appt.status === 'confirmed' && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(appt.id, 'finalised')}
            className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1C398E] hover:bg-[#1C398E]/90 text-white text-sm font-medium transition-colors"
          >
            <CheckCircle size={15} />
            Mark as Finalised
          </button>
          <button
            onClick={() => onStatusChange(appt.id, 'cancelled')}
            className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-colors border border-red-100"
          >
            <XCircle size={15} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────
const AppointmentsListDoctor = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [updatingId, setUpdatingId]     = useState(null);
  const [patientModal, setPatientModal] = useState(null);

  const token = localStorage.getItem('access_token');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load appointments');
      const data = await res.json();

      // Fetch patient names for all unique patient IDs
      const uniquePatientIds = [...new Set(data.map(a => a.patient_id))];
      const patientMap = {};
      await Promise.all(
        uniquePatientIds.map(async (pid) => {
          try {
            const pRes = await fetch(`${API}/patients/${pid}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (pRes.ok) {
              const p = await pRes.json();
              patientMap[pid] = `${p.first_name} ${p.last_name}`;
            }
          } catch (_) {}
        })
      );

      // Attach patient name to each appointment
      const enriched = data.map(a => ({
        ...a,
        _patientName: patientMap[a.patient_id] || null,
      }));

      // Sort: pending first, then by date desc
      enriched.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return new Date(b.appointment_date) - new Date(a.appointment_date);
      });

      setAppointments(enriched);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    setUpdatingId(appointmentId);
    try {
      const res = await fetch(`${API}/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: updated.status } : a)
      );
    } catch (_) {
      alert('Failed to update appointment status.');
    }
    setUpdatingId(null);
  };

  // Filter + search
  const filtered = appointments.filter(a => {
    const matchesFilter = activeFilter === 'all' || a.status === activeFilter;
    const matchesSearch = search === '' ||
      (a._patientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(search.toLowerCase()) ||
      formatDate(a.appointment_date).toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Counts per status
  const counts = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[#1C398E] flex items-center justify-center">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
              <p className="text-sm text-gray-400">{appointments.length} total</p>
            </div>
          </div>
        </div>

        {/* Search + refresh */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, date, description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/20 focus:border-[#1C398E]/40 bg-white"
            />
          </div>
          <button
            onClick={fetchAppointments}
            className="cursor-pointer p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className="text-gray-500" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => {
            const cfg = STATUS_CONFIG[f];
            const count = f === 'all' ? appointments.length : (counts[f] || 0);
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`cursor-pointer flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-[#1C398E] text-white border-[#1C398E] shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1C398E]/30 hover:text-[#1C398E]'
                }`}
              >
                {f === 'all' ? (
                  <Filter size={13} />
                ) : (
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : cfg.dot}`} />
                )}
                <span className="capitalize">{f}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#1C398E] mb-3" size={32} />
            <p className="text-gray-400 text-sm">Loading appointments...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="text-red-400 mb-3" size={32} />
            <p className="text-gray-600 font-medium mb-1">Failed to load</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <button
              onClick={fetchAppointments}
              className="cursor-pointer px-4 py-2 rounded-xl bg-[#1C398E] text-white text-sm hover:bg-[#1C398E]/90"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Calendar size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No appointments found</p>
            <p className="text-gray-400 text-sm">
              {activeFilter !== 'all' ? `No ${activeFilter} appointments` : 'No appointments yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(appt => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onStatusChange={handleStatusChange}
                onViewPatient={(id) => setPatientModal(id)}
                updating={updatingId === appt.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Patient modal */}
      {patientModal && (
        <PatientModal
          patientId={patientModal}
          token={token}
          onClose={() => setPatientModal(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default AppointmentsListDoctor;