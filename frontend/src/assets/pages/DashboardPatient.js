import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, MapPin, Clock,Table, User, List, Edit, Trash2, CheckCircle, XCircle, AlertCircle, FileText, MessageSquare, Scan } from 'lucide-react';
import PatientLayout from '../components/PatientLayout';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:8000';

const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response' }));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
            else throw new Error(`Fetch failed after ${retries} attempts: ${error.message}`);
        }
    }
};

// ── Status Badge ──────────────────────────────────────────────
const STATUS = {
    confirmed: { icon: CheckCircle, label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending:   { icon: AlertCircle, label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    cancelled: { icon: XCircle,     label: 'Cancelled', cls: 'bg-red-50 text-red-600 border-red-200' },
    finalised: { icon: CheckCircle, label: 'Finalised', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS[status] || STATUS.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${cfg.cls}`}>
            <Icon size={11} /> {cfg.label}
        </span>
    );
};

// ── Modal Shell ───────────────────────────────────────────────
const ModalShell = ({ isOpen, onClose, title, children, maxW = 'max-w-lg' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-base font-semibold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
};

// ── Detail Row ────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#1C398E]/8 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon size={14} className="text-[#1C398E]" />
        </div>
        <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
            {children}
        </div>
    </div>
);

// ── Appointment Details Modal ─────────────────────────────────
const AppointmentDetailsModal = ({ isOpen, onClose, appointment, doctor }) => (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Appointment Details">
        {appointment && (
            <div className="space-y-4">
                <DetailRow icon={AlertCircle} label="Status">
                    <StatusBadge status={appointment.status} />
                </DetailRow>
                <DetailRow icon={User} label="Doctor">
                    <p className="text-sm font-semibold text-gray-800">Dr. {doctor?.doctorName}</p>
                </DetailRow>
                <DetailRow icon={MapPin} label="Location">
                    <p className="text-sm text-gray-700">{doctor?.doctorAddress}</p>
                </DetailRow>
                <DetailRow icon={Calendar} label="Date">
                    <p className="text-sm font-semibold text-gray-800">{appointment.appointment_date}</p>
                </DetailRow>
                <DetailRow icon={Clock} label="Time">
                    <p className="text-sm font-semibold text-gray-800">{appointment.startTime} – {appointment.endTime}</p>
                </DetailRow>
                {appointment.description && (
                    <DetailRow icon={FileText} label="Notes">
                        <p className="text-sm text-gray-700">{appointment.description}</p>
                    </DetailRow>
                )}
                {appointment.message && (
                    <DetailRow icon={MessageSquare} label="Message">
                        <p className="text-sm text-gray-700">{appointment.message}</p>
                    </DetailRow>
                )}
            </div>
        )}
    </ModalShell>
);

// ── Edit Appointment Modal ────────────────────────────────────
const EditAppointmentModal = ({ isOpen, onClose, appointment, onSave }) => {
    const [editedDate, setEditedDate]       = useState('');
    const [editedMessage, setEditedMessage] = useState('');
    const [slots, setSlots]                 = useState([]);
    const [selectedSlot, setSelectedSlot]   = useState(null);
    const [loadingSlots, setLoadingSlots]   = useState(false);
    const [slotsError, setSlotsError]       = useState(null);

    useEffect(() => {
        if (appointment) {
            setEditedDate(appointment.appointment_date || '');
            setEditedMessage(appointment.message || '');
            setSelectedSlot(null);
            setSlots([]);
            setSlotsError(null);
        }
    }, [appointment]);

    useEffect(() => {
        if (!editedDate || !appointment) return;
        const fetchSlots = async () => {
            setLoadingSlots(true);
            setSlotsError(null);
            setSelectedSlot(null);
            setSlots([]);
            try {
                const token = localStorage.getItem('access_token');
                const params = new URLSearchParams({
                    doctor_id:              appointment.doctor_id,
                    date:                   editedDate,
                    duration_minutes:       appointment.duration_minutes || 30,
                    exclude_appointment_id: appointment.id,
                });
                const res = await fetch(`${API}/appointments/available-slots?${params}`,
                    { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) throw new Error('Failed to load slots');
                const data = await res.json();
                setSlots(data.slots || []);
                if ((data.slots || []).length === 0) setSlotsError(data.message || 'No available slots on this day.');
            } catch { setSlotsError('Could not load available slots.'); }
            setLoadingSlots(false);
        };
        fetchSlots();
    }, [editedDate, appointment]);

    const handleSave = () => {
        if (!selectedSlot) return;
        onSave({
            appointment_date: editedDate,
            start_time:       `${selectedSlot.start_time}:00`,
            end_time:         `${selectedSlot.end_time}:00`,
            message:          editedMessage,
        });
    };

    const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all";
    const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2";

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Request Appointment Change">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-xl">
                    <AlertCircle size={13} /> Select a new date and slot. The doctor will confirm the change.
                </div>

                <div>
                    <label className={labelCls}>New Date <span className="text-red-400">*</span></label>
                    <input type="date" value={editedDate} min={new Date().toISOString().split('T')[0]}
                        onChange={e => setEditedDate(e.target.value)} className={inputCls} />
                </div>

                {editedDate && (
                    <div>
                        <label className={labelCls}>Available Slots <span className="text-red-400">*</span></label>
                        {loadingSlots ? (
                            <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
                                <div className="w-4 h-4 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
                                Loading slots...
                            </div>
                        ) : slotsError ? (
                            <div className="text-center py-5 bg-gray-50 rounded-xl">
                                <Clock size={22} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm text-gray-400">{slotsError}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                {slots.map(slot => {
                                    const isSelected = selectedSlot?.start_time === slot.start_time;
                                    return (
                                        <button key={slot.start_time} onClick={() => setSelectedSlot(slot)}
                                            className={`cursor-pointer py-2.5 px-2 rounded-xl text-sm font-medium border transition-all ${
                                                isSelected
                                                    ? 'bg-[#1C398E] text-white border-[#1C398E] shadow-sm'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#1C398E]/40 hover:bg-[#1C398E]/5'
                                            }`}>
                                            {slot.start_time}
                                            <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                                                → {slot.end_time}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {selectedSlot && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-[#1C398E] bg-[#1C398E]/5 px-3 py-2 rounded-lg">
                                <CheckCircle size={14} />
                                <span>Selected: <strong>{selectedSlot.start_time} – {selectedSlot.end_time}</strong></span>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className={labelCls}>Message to Doctor (Optional)</label>
                    <textarea value={editedMessage} onChange={e => setEditedMessage(e.target.value)} rows={3}
                        className={`${inputCls} resize-none`}
                        placeholder="Explain why you need to change the appointment..." />
                </div>

                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={handleSave} disabled={!editedDate || !selectedSlot}
                        className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition disabled:opacity-40 disabled:cursor-not-allowed">
                        Request Change
                    </button>
                </div>
            </div>
        </ModalShell>
    );
};

// ── All Appointments Modal ────────────────────────────────────
const AllAppointmentsModal = ({ isOpen, onClose, appointments, onEdit, onCancel }) => {
    const sorted = [...appointments].sort((a, b) =>
        new Date(`${b.appointment_date}T${b.startTime}`) - new Date(`${a.appointment_date}T${a.startTime}`)
    );

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title={`This Week's Appointments (${appointments.length})`} maxW="max-w-2xl">
            {sorted.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-gray-300">
                    <Calendar size={36} className="mb-2" />
                    <p className="text-sm text-gray-400">No appointments this week.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {sorted.map(appt => (
                        <div key={appt.id} className="flex items-start gap-3 p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition bg-white">
                            <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: appt.color }} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-800">{appt.type}</span>
                                    <StatusBadge status={appt.status} />
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1"><User size={11} /> Dr. {appt.doctorName}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Clock size={11} /> {appt.appointment_date} · {appt.startTime} – {appt.endTime}
                                </p>
                                {appt.doctorAddress && (
                                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                        <MapPin size={11} /> {appt.doctorAddress}
                                    </p>
                                )}
                                {appt.description && <p className="text-xs text-gray-400 mt-1 italic">{appt.description}</p>}
                            </div>
                            {appt.status !== 'cancelled' && appt.status !== 'finalised' && (
                                <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => onEdit(appt)} title="Edit"
                                        className="cursor-pointer p-1.5 text-[#1C398E] hover:bg-[#1C398E]/8 rounded-lg transition"><Edit size={16} /></button>
                                    <button onClick={() => onCancel(appt)} title="Cancel"
                                        className="cursor-pointer p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </ModalShell>
    );
};

// ── Week Picker Modal ─────────────────────────────────────────
const WeekPickerModal = ({ isOpen, onClose, onSelectWeek, currentWeekStart }) => {
    const [selectedDate, setSelectedDate] = useState('');
    useEffect(() => {
        if (currentWeekStart) setSelectedDate(currentWeekStart.toISOString().split('T')[0]);
    }, [currentWeekStart]);

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Select Week" maxW="max-w-sm">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Choose any date in the week</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30" />
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={() => { if (selectedDate) { onSelectWeek(new Date(selectedDate)); onClose(); } }}
                        className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition">
                        Select Week
                    </button>
                </div>
            </div>
        </ModalShell>
    );
};

// ── Main Component ────────────────────────────────────────────
const DashboardPatient = () => {
    const navigate = useNavigate();
    const [appointments, setAppointments]         = useState([]);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [doctors, setDoctors]                   = useState([]);
    const [loading, setLoading]                   = useState(true);
    const [error, setError]                       = useState(null);

    const [isModalOpen, setIsModalOpen]                           = useState(false);
    const [selectedAppointment, setSelectedAppointment]           = useState(null);
    const [isAllAppointmentsModalOpen, setIsAllAppointmentsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen]                   = useState(false);
    const [editingAppointment, setEditingAppointment]             = useState(null);
    const [isWeekPickerOpen, setIsWeekPickerOpen]                 = useState(false);

    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const [weekStart, setWeekStart] = useState(getMonday(new Date()));
    const timeSlots = ['8 am','9 am','10 am','11 am','12 pm','1 pm','2 pm','3 pm','4 pm','5 pm'];
    const baseHour  = 8;

    const getDaysOfWeek = useCallback(() => {
        const days = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dayNames      = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            const shortDayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const dayIndex = date.getDay();
            days.push({
                day: dayNames[dayIndex], shortDay: shortDayNames[dayIndex],
                date: date.getDate(), isToday: date.toDateString() === new Date().toDateString(),
                fullDate: date.toISOString().split('T')[0],
            });
        }
        return days;
    }, [weekStart]);

    const daysOfWeek = getDaysOfWeek();

    const mapAppointmentData = useCallback((serverAppt, types, docList) => {
        const type   = types.find(t => t.id === serverAppt.appointment_type_id) || { name: 'Unknown', color: '#CCCCCC' };
        const doctor = docList.find(d => d.doctorId === serverAppt.doctor_id);
        let dateOnly;
        if (typeof serverAppt.appointment_date === 'string') {
            dateOnly = serverAppt.appointment_date.includes('T')
                ? serverAppt.appointment_date.split('T')[0]
                : serverAppt.appointment_date.split(' ')[0];
        } else {
            dateOnly = new Date(serverAppt.appointment_date).toISOString().split('T')[0];
        }
        let startTimeStr = serverAppt.start_time;
        let endTimeStr   = serverAppt.end_time;
        if (typeof startTimeStr !== 'string') startTimeStr = new Date(startTimeStr).toTimeString().substring(0, 8);
        if (typeof endTimeStr   !== 'string') endTimeStr   = new Date(endTimeStr).toTimeString().substring(0, 8);
        const startDate = new Date(`${dateOnly}T${startTimeStr}`);
        const endDate   = new Date(`${dateOnly}T${endTimeStr}`);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
        const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        return {
            ...serverAppt, type: type.name, color: type.color,
            doctorName:    doctor ? `${doctor.first_name} ${doctor.last_name}` : 'N/A',
            doctorAddress: doctor ? `${doctor.address}, ${doctor.city}` : 'N/A',
            dayOfWeek: dayNames[startDate.getDay()],
            appointment_date: dateOnly,
            startTime: startTimeStr.substring(0, 5),
            endTime:   endTimeStr.substring(0, 5),
            startHour: startDate.getHours() + startDate.getMinutes() / 60,
            endHour:   endDate.getHours()   + endDate.getMinutes()   / 60,
        };
    }, []);

    const getAppointmentStyle = (appt) => {
        const baseHeight = window.innerWidth < 640 ? 48 : 64;
        return {
            top:       `${(appt.startHour - baseHour) * baseHeight}px`,
            height:    `${Math.max((appt.endHour - appt.startHour) * baseHeight - 4, 24)}px`,
            marginTop: '4px',
        };
    };

    const handleAppointmentClick = (appt) => {
        setSelectedAppointment({ appt, doctor: { doctorName: appt.doctorName, doctorAddress: appt.doctorAddress } });
        setIsModalOpen(true);
    };

    const handleEditAppointment = (appt) => {
        setEditingAppointment(appt);
        setIsEditModalOpen(true);
        setIsAllAppointmentsModalOpen(false);
    };

    const handleSaveEdit = async (updates) => {
        try {
            const token   = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
            await fetchWithRetry(`${API}/appointments/${editingAppointment.id}/patient-request`,
                { method: 'PATCH', headers, body: JSON.stringify(updates) });
            await refreshAppointments();
            setIsEditModalOpen(false);
        } catch { alert('Failed to update appointment.'); }
    };

    const handleCancelAppointment = async (appt) => {
        if (!window.confirm(`Cancel appointment with Dr. ${appt.doctorName} on ${appt.appointment_date}?`)) return;
        try {
            const token   = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
            await fetchWithRetry(`${API}/appointments/${appt.id}`,
                { method: 'PATCH', headers, body: JSON.stringify({ status: 'cancelled' }) });
            await refreshAppointments();
        } catch { alert('Failed to cancel appointment.'); }
    };

    const refreshAppointments = async () => {
        const token   = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const appts    = await fetchWithRetry(`${API}/appointments`, { headers });
        const allTypes = await fetchWithRetry(`${API}/appointment-types-patient`, { headers });
        setAppointments(appts.map(a => mapAppointmentData(a, allTypes, doctors)).filter(Boolean));
        const usedIds = [...new Set(appts.map(a => a.appointment_type_id))];
        setAppointmentTypes(allTypes.filter(t => usedIds.includes(t.id)));
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) { navigate('/login'); return; }
        const fetchAllData = async () => {
            setLoading(true); setError(null);
            const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
            try {
                const doctorList = await fetchWithRetry(`${API}/doctors`, { headers });
                setDoctors(doctorList);
                const appts    = await fetchWithRetry(`${API}/appointments`, { headers });
                const allTypes = await fetchWithRetry(`${API}/appointment-types-patient`, { headers });
                setAppointments(appts.map(a => mapAppointmentData(a, allTypes, doctorList)).filter(Boolean));
                const usedIds = [...new Set(appts.map(a => a.appointment_type_id))];
                setAppointmentTypes(allTypes.filter(t => usedIds.includes(t.id)));
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        fetchAllData();
    }, [navigate, mapAppointmentData]);

    const today             = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.appointment_date === today);
    const totalAppointments = appointments.length;
    const weekDates         = daysOfWeek.map(d => d.fullDate);
    const weekAppointments  = appointments.filter(a => weekDates.includes(a.appointment_date));
    const selectedWeekString = `${weekStart.getDate()}–${daysOfWeek[4].date} ${weekStart.toLocaleString('default', { month: 'long' })} ${weekStart.getFullYear()}`;

    const goToPreviousWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
    const goToNextWeek     = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

    return (
        <PatientLayout>
            
            <AppointmentDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                appointment={selectedAppointment?.appt} doctor={selectedAppointment?.doctor} />
            <EditAppointmentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}
                appointment={editingAppointment} onSave={handleSaveEdit} />
            <AllAppointmentsModal isOpen={isAllAppointmentsModalOpen} onClose={() => setIsAllAppointmentsModalOpen(false)}
                appointments={weekAppointments} onEdit={handleEditAppointment} onCancel={handleCancelAppointment} />
            <WeekPickerModal isOpen={isWeekPickerOpen} onClose={() => setIsWeekPickerOpen(false)}
                onSelectWeek={d => setWeekStart(getMonday(d))} currentWeekStart={weekStart} />

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl mb-4">
                    <AlertCircle size={15} /> {error}
                </div>
            )}

            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                    
                    {/* ── Sidebar ── */}
                    <div className="space-y-4 lg:col-span-1">

                       {/* ── AI Dental Scan CTA ── */}
                        <div
                            onClick={() => navigate('/dental_scan')}
                            className="cursor-pointer relative overflow-hidden rounded-2xl p-5 shadow-sm group"
                            style={{
                                background: 'linear-gradient(135deg, #1C398E 0%, #1e4db7 60%, #3b82f6 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            {/* Decorative glow blob */}
                            <div style={{
                                position: 'absolute', top: -20, right: -20,
                                width: 90, height: 90, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.08)',
                                transition: 'transform 0.3s',
                            }} className="group-hover:scale-125" />
                            <div style={{
                                position: 'absolute', bottom: -10, left: -10,
                                width: 60, height: 60, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.05)',
                            }} />

                            <div className="relative z-10">
                                {/* Icon + badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
                                        <Scan size={20} color="white" />
                                    </div>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', letterSpacing: '0.06em' }}>
                                        ✨ NEW
                                    </span>
                                </div>

                                {/* Text */}
                                <p className="text-sm font-bold text-white mb-1 leading-tight">
                                    AI Dental Analysis
                                </p>
                                <p className="text-xs leading-relaxed mb-4"
                                    style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    Upload a photo and the AI will detect possible dental conditions.
                                </p>

                                {/* CTA row */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                        Try it now
                                        <span style={{
                                            display: 'inline-block', transition: 'transform 0.2s',
                                        }} className="group-hover:translate-x-1">→</span>
                                    </span>
                                   
                                </div>
                            </div>
                        </div>
                                                {/* Today */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-[#1C398E]/8 flex items-center justify-center">
                                    <Calendar size={14} className="text-[#1C398E]" />
                                </div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Today</h2>
                            </div>
                            {todayAppointments.length === 0 ? (
                                <p className="text-xs text-gray-300 text-center py-4">No appointments today</p>
                            ) : (
                                <div className="space-y-2">
                                    {todayAppointments.map(appt => (
                                        <div key={appt.id} onClick={() => handleAppointmentClick(appt)}
                                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors border border-gray-100">
                                            <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: appt.color }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-xs font-bold text-gray-700">{appt.startTime}</span>
                                                    <StatusBadge status={appt.status} />
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">Dr. {appt.doctorName}</p>
                                                <p className="text-xs text-gray-400 truncate">{appt.type}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-[#1C398E]/8 flex items-center justify-center">
                                        <Table size={14} className="text-[#1C398E]" />
                                    </div>
                                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Stats</h2>
                                </div>
                                <button onClick={() => setIsAllAppointmentsModalOpen(true)}
                                    className="cursor-pointer p-1.5 text-[#1C398E] hover:bg-[#1C398E]/8 rounded-lg transition-colors" title="This week's list">
                                    <List size={15} />
                                </button>
                            </div>
                            <div className="space-y-2.5 mb-4">
                                {[
                                    { label: 'This week', value: weekAppointments.length, cls: 'text-gray-800' },
                                    { label: 'Total',     value: totalAppointments,       cls: 'text-gray-800' },
                                ].map(row => (
                                    <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                                        <span className="text-xs text-gray-400">{row.label}</span>
                                        <span className={`text-sm font-bold ${row.cls}`}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate('/appointments_patient')}
                                className="cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1C398E] text-white text-xs font-semibold hover:bg-[#1C398E]/90 transition-colors">
                                 All Appointments
                            </button>
                        </div>

                        {/* Types */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-[#1C398E]/8 flex items-center justify-center">
                                    <AlertCircle size={14} className="text-[#1C398E]" />
                                </div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">My Types</h2>
                            </div>
                            {appointmentTypes.length === 0 ? (
                                <p className="text-xs text-gray-300 text-center py-2">No types yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {appointmentTypes.map(type => (
                                        <div key={type.id} className="flex items-center gap-2.5">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
                                            <span className="text-xs text-gray-600 truncate">{type.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Calendar ── */}
                    <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-base font-bold text-gray-800">My Appointments</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Week of {selectedWeekString}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <button onClick={goToPreviousWeek}
                                        className="cursor-pointer p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button onClick={() => setIsWeekPickerOpen(true)}
                                        className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition text-xs font-medium text-gray-600">
                                        <Calendar size={13} className="text-[#1C398E]" /> {selectedWeekString}
                                    </button>
                                    <button onClick={goToNextWeek}
                                        className="cursor-pointer p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                                <button onClick={() => navigate('/view_doctors')}
                                    className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-[#1C398E] text-white text-xs font-semibold rounded-xl hover:bg-[#1C398E]/90 transition shadow-sm">
                                    <Plus size={13} /> New
                                </button>
                            </div>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-[56px_repeat(5,_1fr)] border-b border-gray-100 pb-3 mb-2">
                            <div />
                            {daysOfWeek.map((day, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                                        day.isToday ? 'bg-[#1C398E] text-white' : 'text-gray-700'
                                    }`}>
                                        {day.date}
                                    </div>
                                    <p className={`text-xs font-semibold ${day.isToday ? 'text-[#1C398E]' : 'text-gray-400'}`}>{day.shortDay}</p>
                                    <span className={`text-xs font-bold tabular-nums ${
                                        weekAppointments.filter(a => a.appointment_date === day.fullDate).length > 0
                                            ? 'text-[#1C398E]' : 'text-gray-200'
                                    }`}>
                                        {weekAppointments.filter(a => a.appointment_date === day.fullDate).length || '·'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Time grid */}
                        <div className="grid grid-cols-[56px_repeat(5,_1fr)] overflow-x-auto pb-2">
                            <div>
                                {timeSlots.map((time, idx) => (
                                    <div key={idx} className="h-16 flex items-start justify-end pr-3 pt-1">
                                        <span className="text-xs text-gray-300 font-medium">{time}</span>
                                    </div>
                                ))}
                            </div>
                            {daysOfWeek.map((day, dayIdx) => (
                                <div key={dayIdx} className={`relative border-l ${day.isToday ? 'border-[#1C398E]/20 bg-[#1C398E]/[0.02]' : 'border-gray-50'}`}>
                                    {timeSlots.map((_, timeIdx) => (
                                        <div key={timeIdx} className="h-16 border-t border-gray-50" />
                                    ))}
                                    {weekAppointments
                                        .filter(a => a.appointment_date === day.fullDate)
                                        .map(appt => (
                                            <div key={appt.id}
                                                className={`absolute rounded-xl px-2 py-1.5 cursor-pointer transition-all hover:brightness-95 hover:shadow-md ${appt.status === 'cancelled' ? 'opacity-40' : ''}`}
                                                style={{ ...getAppointmentStyle(appt), backgroundColor: appt.color + 'dd', width: '88%', left: '6%', zIndex: 10 }}
                                                onClick={() => handleAppointmentClick(appt)}>
                                                <p className="font-bold text-xs text-gray-800 truncate leading-tight">{appt.type}</p>
                                             
                                                <div className="absolute top-1.5 right-1.5">
                                                    {appt.status === 'confirmed' && <CheckCircle size={10} className="text-emerald-600" />}
                                                    {appt.status === 'cancelled' && <XCircle     size={10} className="text-red-500" />}
                                                    {appt.status === 'pending'   && <AlertCircle size={10} className="text-amber-500" />}
                                                    {appt.status === 'finalised' && <CheckCircle size={10} className="text-blue-500" />}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </PatientLayout>
    );
};

export default DashboardPatient;