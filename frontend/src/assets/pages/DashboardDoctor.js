import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Clock, User, List, Edit,Table, Trash2, CheckCircle, XCircle, AlertCircle, Settings, Phone, Mail, FileText, MessageSquare } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import AppointmentTypesModal from '../components/AppointmentTypesModal';

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

// ── Modal shell ───────────────────────────────────────────────
const ModalShell = ({ isOpen, onClose, title, children, maxW = 'max-w-lg' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
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

// ── Field row for details modal ───────────────────────────────
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
const AppointmentDetailsModal = ({ isOpen, onClose, appointment, patient }) => (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Appointment Details">
        {appointment && (
            <div className="space-y-4">
                <DetailRow icon={AlertCircle} label="Status">
                    <StatusBadge status={appointment.status} />
                </DetailRow>
                <DetailRow icon={User} label="Patient">
                    <p className="text-sm font-semibold text-gray-800">{patient?.patientName}</p>
                </DetailRow>
                <DetailRow icon={Mail} label="Contact">
                    <p className="text-sm text-gray-700">{patient?.patientEmail}</p>
                    {patient?.patientPhone && <p className="text-xs text-gray-500">{patient.patientPhone}</p>}
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
                    <DetailRow icon={MessageSquare} label="Patient Message">
                        <p className="text-sm text-gray-700">{appointment.message}</p>
                    </DetailRow>
                )}
            </div>
        )}
    </ModalShell>
);

// ── Status Change Modal ───────────────────────────────────────
const StatusChangeModal = ({ isOpen, onClose, appointment, onSave }) => {
    const [selectedStatus, setSelectedStatus] = useState('pending');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (appointment) { setSelectedStatus(appointment.status || 'pending'); setMessage(''); }
    }, [appointment]);

    const statusOptions = [
        { value: 'pending',   label: 'Pending',   desc: 'Waiting for confirmation', color: 'amber' },
        { value: 'confirmed', label: 'Confirmed',  desc: 'Appointment is confirmed', color: 'emerald' },
        { value: 'cancelled', label: 'Cancelled',  desc: 'Appointment is cancelled', color: 'red' },
        { value: 'finalised', label: 'Finalised',  desc: 'Appointment completed',    color: 'blue' },
    ];

    const colorMap = { amber: 'border-amber-400 bg-amber-50', emerald: 'border-emerald-400 bg-emerald-50', red: 'border-red-400 bg-red-50', blue: 'border-blue-400 bg-blue-50' };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Change Appointment Status">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-xl">
                    <AlertCircle size={13} /> The patient will be notified of this change.
                </div>
                <div className="space-y-2">
                    {statusOptions.map(opt => (
                        <label key={opt.value}
                            className={`flex items-center gap-3 px-4 py-3 border-2 rounded-xl cursor-pointer transition-all ${
                                selectedStatus === opt.value ? colorMap[opt.color] : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}>
                            <input type="radio" name="status" value={opt.value} checked={selectedStatus === opt.value}
                                onChange={e => setSelectedStatus(e.target.value)} className="accent-[#1C398E]" />
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                                <p className="text-xs text-gray-400">{opt.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Message to Patient (Optional)</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 resize-none"
                        placeholder="Add a message for the patient..." />
                </div>
                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={() => onSave({ status: selectedStatus, message: message || undefined })}
                        className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition">
                        Update Status
                    </button>
                </div>
            </div>
        </ModalShell>
    );
};

// ── Edit Appointment Modal ────────────────────────────────────
const EditAppointmentModal = ({ isOpen, onClose, appointment, onSave }) => {
    const [editedDate, setEditedDate] = useState('');
    const [editedStartTime, setEditedStartTime] = useState('');
    const [editedEndTime, setEditedEndTime] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (appointment) {
            setEditedDate(appointment.appointment_date || '');
            setEditedStartTime(appointment.startTime || '');
            setEditedEndTime(appointment.endTime || '');
            setEditedDescription(appointment.description || '');
            setMessage('');
        }
    }, [appointment]);

    const handleSave = () => {
        if (editedStartTime && editedEndTime) {
            const start = new Date(`2000-01-01T${editedStartTime}`);
            const end = new Date(`2000-01-01T${editedEndTime}`);
            if (end <= start) { alert('End time must be after start time!'); return; }
        }
        onSave({
            appointment_date: editedDate,
            start_time: editedStartTime ? `${editedStartTime}:00` : undefined,
            end_time: editedEndTime ? `${editedEndTime}:00` : undefined,
            description: editedDescription,
            message: message || undefined,
            status: 'pending'
        });
    };

    const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all";
    const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2";

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Edit Appointment Details">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2.5 rounded-xl">
                    <AlertCircle size={13} /> A change request will be sent to the patient for confirmation.
                </div>
                <div>
                    <label className={labelCls}>Date <span className="text-red-400">*</span></label>
                    <input type="date" value={editedDate} onChange={e => setEditedDate(e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Start Time <span className="text-red-400">*</span></label>
                        <input type="time" value={editedStartTime} onChange={e => setEditedStartTime(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>End Time <span className="text-red-400">*</span></label>
                        <input type="time" value={editedEndTime} onChange={e => setEditedEndTime(e.target.value)} className={inputCls} />
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Notes</label>
                    <textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} rows={2}
                        className={`${inputCls} resize-none`} placeholder="Add any notes..." />
                </div>
                <div>
                    <label className={labelCls}>Message to Patient</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                        className={`${inputCls} resize-none`} placeholder="Explain why you're proposing these changes..." />
                </div>
                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={handleSave} disabled={!editedDate || !editedStartTime || !editedEndTime}
                        className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition disabled:opacity-40 disabled:cursor-not-allowed">
                        Send Changes
                    </button>
                </div>
            </div>
        </ModalShell>
    );
};

// ── All Appointments Modal ────────────────────────────────────
const AllAppointmentsModal = ({ isOpen, onClose, appointments, onEdit, onCancel, onStatusChange }) => {
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
                                <p className="text-xs text-gray-500 flex items-center gap-1"><User size={11} /> {appt.patientName}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Clock size={11} /> {appt.appointment_date} · {appt.startTime} – {appt.endTime}
                                </p>
                                {appt.patientPhone && <p className="text-xs text-gray-400 mt-0.5"><Phone size={11} className="inline mr-1" />{appt.patientPhone}</p>}
                                {appt.description && <p className="text-xs text-gray-400 mt-1 italic">{appt.description}</p>}
                            </div>
                            {appt.status !== 'cancelled' && appt.status !== 'finalised' && (
                                <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => onStatusChange(appt)} title="Change Status"
                                        className="cursor-pointer p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"><CheckCircle size={16} /></button>
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

    const handleSelect = () => {
        if (selectedDate) { onSelectWeek(new Date(selectedDate)); onClose(); }
    };

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
                    <button onClick={handleSelect} className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition">Select Week</button>
                </div>
            </div>
        </ModalShell>
    );
};

// ── Main Dashboard ────────────────────────────────────────────
const DashboardDoctor = () => {
    const navigate = useNavigate();
    const [appointments, setAppointments]   = useState([]);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [patients, setPatients]           = useState({});
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);

    const [isModalOpen, setIsModalOpen]                       = useState(false);
    const [selectedAppointment, setSelectedAppointment]       = useState(null);
    const [isAllAppointmentsModalOpen, setIsAllAppointmentsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen]               = useState(false);
    const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment]         = useState(null);
    const [statusChangingAppointment, setStatusChangingAppointment] = useState(null);
    const [isWeekPickerOpen, setIsWeekPickerOpen]             = useState(false);
    const [isTypesModalOpen, setIsTypesModalOpen]             = useState(false);

    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const [weekStart, setWeekStart] = useState(getMonday(new Date()));
    const timeSlots = ["8 am","9 am","10 am","11 am","12 pm","1 pm","2 pm","3 pm","4 pm","5 pm"];
    const baseHour = 8;

    const getDaysOfWeek = useCallback(() => {
        const days = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
            const shortDayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            const dayIndex = date.getDay();
            days.push({
                day: dayNames[dayIndex], shortDay: shortDayNames[dayIndex],
                date: date.getDate(), isToday: date.toDateString() === new Date().toDateString(),
                fullDate: date.toISOString().split('T')[0]
            });
        }
        return days;
    }, [weekStart]);

    const daysOfWeek = getDaysOfWeek();

    const mapAppointmentData = useCallback((serverAppt, types, patientMap) => {
        const type = types.find(t => t.id === serverAppt.appointment_type_id) || { name: 'Unknown', color: '#CCCCCC' };
        const patient = patientMap[serverAppt.patient_id];
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
        const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        return {
            ...serverAppt, type: type.name, color: type.color,
            patientName:  patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
            patientEmail: patient ? patient.email : 'N/A',
            patientPhone: patient ? patient.phone : 'N/A',
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
        const top    = (appt.startHour - baseHour) * baseHeight;
        const height = Math.max((appt.endHour - appt.startHour) * baseHeight - 4, 24);
        return { top: `${top}px`, height: `${height}px`, marginTop: '4px' };
    };

    const handleAppointmentClick = (appt) => {
        setSelectedAppointment({ appt, patient: { patientName: appt.patientName, patientEmail: appt.patientEmail, patientPhone: appt.patientPhone } });
        setIsModalOpen(true);
    };

    const handleEditAppointment = (appt) => { setEditingAppointment(appt); setIsEditModalOpen(true); setIsAllAppointmentsModalOpen(false); };
    const handleStatusChange    = (appt) => { setStatusChangingAppointment(appt); setIsStatusChangeModalOpen(true); setIsAllAppointmentsModalOpen(false); };

    const refreshAppointments = async () => {
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const appts    = await fetchWithRetry(`${API}/appointments`, { headers });
        const allTypes = await fetchWithRetry(`${API}/appointment-types`, { headers });
        setAppointments(appts.map(a => mapAppointmentData(a, allTypes, patients)).filter(Boolean));
        const usedTypeIds = [...new Set(appts.map(a => a.appointment_type_id))];
        setAppointmentTypes(allTypes.filter(t => usedTypeIds.includes(t.id)));
    };

    const handleSaveStatusChange = async (updates) => {
        try {
            const token = localStorage.getItem('access_token');
            await fetchWithRetry(`${API}/appointments/${statusChangingAppointment.id}`,
                { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
            await refreshAppointments();
            setIsStatusChangeModalOpen(false);
        } catch (err) { alert('Failed to update status.'); }
    };

    const handleSaveEdit = async (updates) => {
        try {
            const token = localStorage.getItem('access_token');
            await fetchWithRetry(`${API}/appointments/${editingAppointment.id}`,
                { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
            await refreshAppointments();
            setIsEditModalOpen(false);
        } catch (err) { alert('Failed to update appointment.'); }
    };

    const handleCancelAppointment = async (appt) => {
        if (!window.confirm(`Cancel appointment with ${appt.patientName} on ${appt.appointment_date}?`)) return;
        try {
            const token = localStorage.getItem('access_token');
            await fetchWithRetry(`${API}/appointments/${appt.id}`,
                { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
            await refreshAppointments();
        } catch (err) { alert('Failed to cancel appointment.'); }
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) { navigate('/login'); return; }
        const fetchAllData = async () => {
            setLoading(true); setError(null);
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            try {
                const appts    = await fetchWithRetry(`${API}/appointments`, { headers });
                const allTypes = await fetchWithRetry(`${API}/appointment-types`, { headers });
                const uniquePatientIds = [...new Set(appts.map(a => a.patient_id))];
                const patientMap = {};
                for (const patientId of uniquePatientIds) {
                    try { patientMap[patientId] = await fetchWithRetry(`${API}/patients/${patientId}`, { headers }); }
                    catch { patientMap[patientId] = { first_name: 'Unknown', last_name: 'Patient', email: 'N/A', phone: 'N/A' }; }
                }
                setPatients(patientMap);
                setAppointments(appts.map(a => mapAppointmentData(a, allTypes, patientMap)).filter(Boolean));
                const usedTypeIds = [...new Set(appts.map(a => a.appointment_type_id))];
                setAppointmentTypes(allTypes.filter(t => usedTypeIds.includes(t.id)));
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        fetchAllData();
    }, [navigate, mapAppointmentData]);

    const today            = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.appointment_date === today);
    const totalAppointments = appointments.length;
    const weekDates         = daysOfWeek.map(d => d.fullDate);
    const weekAppointments  = appointments.filter(a => weekDates.includes(a.appointment_date));
    const pendingCount      = appointments.filter(a => a.status === 'pending').length;
    const selectedWeekString = `${weekStart.getDate()}–${daysOfWeek[4].date} ${weekStart.toLocaleString('default', { month: 'long' })} ${weekStart.getFullYear()}`;

    const goToPreviousWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
    const goToNextWeek     = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

    return (
        <DashboardLayout>
            <AppointmentDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                appointment={selectedAppointment?.appt} patient={selectedAppointment?.patient} />
            <StatusChangeModal isOpen={isStatusChangeModalOpen} onClose={() => setIsStatusChangeModalOpen(false)}
                appointment={statusChangingAppointment} onSave={handleSaveStatusChange} />
            <EditAppointmentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}
                appointment={editingAppointment} onSave={handleSaveEdit} />
            <AllAppointmentsModal isOpen={isAllAppointmentsModalOpen} onClose={() => setIsAllAppointmentsModalOpen(false)}
                appointments={weekAppointments} onEdit={handleEditAppointment} onStatusChange={handleStatusChange} onCancel={handleCancelAppointment} />
            <WeekPickerModal isOpen={isWeekPickerOpen} onClose={() => setIsWeekPickerOpen(false)}
                onSelectWeek={d => setWeekStart(getMonday(d))} currentWeekStart={weekStart} />
            <AppointmentTypesModal isOpen={isTypesModalOpen} onClose={() => setIsTypesModalOpen(false)} />

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

                    {/* ── Left sidebar ── */}
                    <div className="space-y-4 lg:col-span-1">

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
                                                <p className="text-xs text-gray-500 truncate">{appt.patientName}</p>
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
                                    { label: 'Pending',   value: pendingCount,            cls: 'text-amber-600' },
                                    { label: 'Total',     value: totalAppointments,       cls: 'text-gray-800' },
                                ].map(row => (
                                    <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                                        <span className="text-xs text-gray-400">{row.label}</span>
                                        <span className={`text-sm font-bold ${row.cls}`}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate('/appointments_doctor')}
                                className="cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1C398E] text-white text-xs font-semibold hover:bg-[#1C398E]/90 transition-colors">
                                 All Appointments
                            </button>
                        </div>

                        {/* Types */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-[#1C398E]/8 flex items-center justify-center">
                                        <Settings size={14} className="text-[#1C398E]" />
                                    </div>
                                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Types</h2>
                                </div>
                                <button onClick={() => setIsTypesModalOpen(true)}
                                    className="cursor-pointer p-1.5 text-[#1C398E] hover:bg-[#1C398E]/8 rounded-lg transition-colors" title="Manage types">
                                    <Settings size={15} />
                                </button>
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
                                <h2 className="text-base font-bold text-gray-800">Weekly Schedule</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Week of {selectedWeekString}</p>
                            </div>
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
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-[56px_repeat(5,_1fr)] border-b border-gray-100 pb-3 mb-2">
                            <div />
                            {daysOfWeek.map((day, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-colors ${
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
                            {/* Time labels */}
                            <div>
                                {timeSlots.map((time, idx) => (
                                    <div key={idx} className="h-16 flex items-start justify-end pr-3 pt-1">
                                        <span className="text-xs text-gray-300 font-medium">{time}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Day columns */}
                            {daysOfWeek.map((day, dayIdx) => (
                                <div key={dayIdx} className={`relative border-l ${day.isToday ? 'border-[#1C398E]/20 bg-[#1C398E]/[0.02]' : 'border-gray-50'}`}>
                                    {timeSlots.map((_, timeIdx) => (
                                        <div key={timeIdx} className="h-16 border-t border-gray-50" />
                                    ))}
                                    {weekAppointments
                                        .filter(appt => appt.appointment_date === day.fullDate)
                                        .map(appt => {
                                            const style = getAppointmentStyle(appt);
                                            return (
                                                <div key={appt.id}
                                                    className={`absolute rounded-xl px-2 py-1.5 cursor-pointer transition-all hover:brightness-95 hover:shadow-md ${appt.status === 'cancelled' ? 'opacity-40' : ''}`}
                                                    style={{ ...style, backgroundColor: appt.color + 'dd', width: '88%', left: '6%', zIndex: 10 }}
                                                    onClick={() => handleAppointmentClick(appt)}>
                                                    <p className="font-bold text-xs text-gray-800 truncate leading-tight">{appt.type}</p>
                                                   
                                                    <div className="absolute top-1.5 right-1.5">
                                                        {appt.status === 'confirmed'  && <CheckCircle size={10} className="text-emerald-600" />}
                                                        {appt.status === 'cancelled'  && <XCircle     size={10} className="text-red-500" />}
                                                        {appt.status === 'pending'    && <AlertCircle size={10} className="text-amber-500" />}
                                                        {appt.status === 'finalised'  && <CheckCircle size={10} className="text-blue-500" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default DashboardDoctor;