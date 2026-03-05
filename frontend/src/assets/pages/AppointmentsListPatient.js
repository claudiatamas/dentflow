import React, { useState, useEffect, useCallback } from 'react';
import PatientLayout from '../components/PatientLayout';
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

// ── Doctor detail modal ───────────────────────────────────────
const DoctorModal = ({ doctor, onClose }) => {
  if (!doctor) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-5">
          {doctor.profile_picture ? (
            <img src={doctor.profile_picture} alt=""
              className="w-14 h-14 rounded-full object-cover ring-2 ring-[#1C398E]/20" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#1C398E]/10 flex items-center justify-center">
              <Stethoscope size={24} className="text-[#1C398E]" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">
              Dr. {doctor.first_name} {doctor.last_name}
            </h3>
            <p className="text-sm text-[#1C398E] font-medium">{doctor.specialty || 'General'}</p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          {doctor.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail size={14} className="text-[#1C398E]" />
              <span>{doctor.email}</span>
            </div>
          )}
          {doctor.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone size={14} className="text-[#1C398E]" />
              <span>{doctor.phone}</span>
            </div>
          )}
          {doctor.accreditation && (
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircle size={14} className="text-[#1C398E]" />
              <span>{doctor.accreditation}</span>
            </div>
          )}
          {doctor.city && (
            <p className="text-gray-500">
              {[doctor.city, doctor.county, doctor.country].filter(Boolean).join(', ')}
            </p>
          )}
          {doctor.description && (
            <p className="text-gray-500 italic text-xs mt-2">"{doctor.description}"</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer mt-5 w-full py-2.5 rounded-xl bg-[#1C398E] text-white text-sm font-medium hover:bg-[#1C398E]/90 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ── Appointment card ──────────────────────────────────────────
const AppointmentCard = ({ appt, onViewDoctor }) => {
  const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const isPast = new Date(appt.appointment_date) < new Date();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
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

      {/* Doctor */}
      <button
        onClick={() => onViewDoctor(appt._doctor)}
        className="cursor-pointer flex items-center gap-3 w-full mb-4 p-3 rounded-xl bg-gray-50 hover:bg-[#1C398E]/5 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-[#1C398E]/10 flex items-center justify-center flex-shrink-0">
          <Stethoscope size={14} className="text-[#1C398E]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400">Doctor</p>
          <p className="text-sm font-medium text-gray-700 truncate">
            {appt._doctor
              ? `Dr. ${appt._doctor.first_name} ${appt._doctor.last_name}`
              : '—'}
          </p>
          {appt._doctor?.specialty && (
            <p className="text-xs text-[#1C398E]">{appt._doctor.specialty}</p>
          )}
        </div>
        <ChevronDown size={14} className="text-gray-400 ml-auto rotate-[-90deg]" />
      </button>

      {/* Description / message */}
      {appt.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2 italic">"{appt.description}"</p>
      )}
      {appt.message && (
        <p className="text-xs text-gray-400 line-clamp-1">💬 {appt.message}</p>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────
const AppointmentsListPatient = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [doctorModal, setDoctorModal]   = useState(null);

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

      // Fetch all doctors to build a map doctorId → doctor info
      const doctorsRes = await fetch(`${API}/doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const doctorsList = doctorsRes.ok ? await doctorsRes.json() : [];
      // doctorsList items have { doctorId, first_name, last_name, specialty, ... }
      const doctorMap = {};
      doctorsList.forEach(d => { doctorMap[d.doctorId] = d; });

      // Attach doctor info to each appointment
      const enriched = data.map(a => ({
        ...a,
        _doctor: doctorMap[a.doctor_id] || null,
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

  // Filter + search
  const filtered = appointments.filter(a => {
    const matchesFilter = activeFilter === 'all' || a.status === activeFilter;
    const doctorName = a._doctor
      ? `${a._doctor.first_name} ${a._doctor.last_name}`.toLowerCase()
      : '';
    const matchesSearch = search === '' ||
      doctorName.includes(search.toLowerCase()) ||
      (a._doctor?.specialty || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(search.toLowerCase()) ||
      formatDate(a.appointment_date).toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <PatientLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[#1C398E] flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Appointments</h1>
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
              placeholder="Search by doctor, specialty, date..."
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
                onViewDoctor={(doc) => setDoctorModal(doc)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Doctor modal */}
      {doctorModal && (
        <DoctorModal
          doctor={doctorModal}
          onClose={() => setDoctorModal(null)}
        />
      )}
    </PatientLayout>
  );
};

export default AppointmentsListPatient;