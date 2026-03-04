import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, MapPin, Clock, User, List, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import PatientLayout from '../components/PatientLayout';
import { useNavigate } from 'react-router-dom';

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
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
            } else {
                throw new Error(`Fetch failed after ${retries} attempts: ${error.message}`);
            }
        }
    }
};

const StatusBadge = ({ status }) => {
    const statusConfig = {
        confirmed: { icon: <CheckCircle size={14} />, text: 'Confirmed', color: 'bg-green-100 text-green-700' },
        pending: { icon: <AlertCircle size={14} />, text: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
        cancelled: { icon: <XCircle size={14} />, text: 'Cancelled', color: 'bg-red-100 text-red-700' },
        finalised: { icon: <CheckCircle size={14} />, text: 'Finalised', color: 'bg-blue-100 text-blue-700' } // nou adăugat
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.icon}
            {config.text}
        </span>
    );
};

const AppointmentDetailsModal = ({ isOpen, onClose, appointment, doctor, type }) => {
    if (!isOpen || !appointment) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{
    backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Appointment Details</h2>
                    <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-start">
                        <div className="text-blue-600 mr-3 mt-1"><AlertCircle size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Status</p>
                            <StatusBadge status={appointment.status} />
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="text-blue-600 mr-3 mt-1"><User size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Doctor</p>
                            <p className="text-lg font-medium text-gray-800">{doctor.doctorName}</p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="text-blue-600 mr-3 mt-1"><MapPin size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Location</p>
                            <p className="text-lg font-medium text-gray-800">{doctor.doctorAddress}</p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="text-blue-600 mr-3 mt-1"><Calendar size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Date</p>
                            <p className="text-lg font-medium text-gray-800">{appointment.appointment_date}</p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="text-blue-600 mr-3 mt-1"><Clock size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Time</p>
                            <p className="text-lg font-medium text-gray-800">{appointment.startTime} - {appointment.endTime}</p>
                        </div>
                    </div>
                    {appointment.description && (
                        <div className="flex items-start">
                            <div className="text-blue-600 mr-3 mt-1">📝</div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Notes</p>
                                <p className="text-lg font-medium text-gray-800">{appointment.description}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EditAppointmentModal = ({ isOpen, onClose, appointment, onSave }) => {
    const [editedDate, setEditedDate] = useState('');
    const [editedStartTime, setEditedStartTime] = useState('');
    const [editedEndTime, setEditedEndTime] = useState('');
    const [editedMessage, setEditedMessage] = useState('');

    useEffect(() => {
        if (appointment) {
            setEditedDate(appointment.appointment_date || '');
            setEditedStartTime(appointment.startTime || '');
            setEditedEndTime(appointment.endTime || '');
            setEditedMessage(appointment.message || '');
        }
    }, [appointment]);

    const handleSave = () => {

        if (editedStartTime && editedEndTime) {
            const start = new Date(`2000-01-01T${editedStartTime}`);
            const end = new Date(`2000-01-01T${editedEndTime}`);
            
            if (end <= start) {
                alert('End time must be after start time!');
                return;
            }
        }

        onSave({
            appointment_date: editedDate,
            start_time: editedStartTime ? `${editedStartTime}:00` : undefined,
            end_time: editedEndTime ? `${editedEndTime}:00` : undefined,
            message: editedMessage
        });
    };

    if (!isOpen || !appointment) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{
    backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Request Appointment Change</h2>
                    <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800">
                            <AlertCircle size={16} className="inline mr-1" />
                            Request a new date and time. The doctor will need to confirm the changes.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={editedDate}
                            onChange={(e) => setEditedDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={editedStartTime}
                                onChange={(e) => setEditedStartTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={editedEndTime}
                                onChange={(e) => setEditedEndTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message to Doctor (Optional)
                        </label>
                        <textarea
                            value={editedMessage}
                            onChange={(e) => setEditedMessage(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Explain why you need to change the appointment time..."
                        />
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="cursor-pointer px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!editedDate || !editedStartTime || !editedEndTime}
                            className="cursor-pointer px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            Request Change
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AllAppointmentsModal = ({ isOpen, onClose, appointments, appointmentTypes, onEdit, onCancel }) => {
    if (!isOpen) return null;

    const sortedAppointments = [...appointments].sort((a, b) => {
        const dateA = new Date(`${a.appointment_date}T${a.startTime}`);
        const dateB = new Date(`${b.appointment_date}T${b.startTime}`);
        return dateB - dateA;
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{
    backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">All Appointments</h2>
                    <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    {sortedAppointments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No appointments found.</p>
                    ) : (
                        <div className="space-y-3">
                            {sortedAppointments.map((appt) => (
                                <div key={appt.id} className="shadow-lg rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: appt.color }}></div>
                                                <h3 className="font-semibold text-gray-800">{appt.type}</h3>
                                                <StatusBadge status={appt.status} />
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                <User size={14} className="inline mr-1" />
                                                Dr. {appt.doctorName}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <Calendar size={14} className="inline mr-1" />
                                                {appt.appointment_date} at {appt.startTime} - {appt.endTime}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <MapPin size={14} className="inline mr-1" />
                                                {appt.doctorAddress}
                                            </p>
                                            {appt.description && (
                                                <p className="text-sm text-gray-500 mt-2 italic">Note: {appt.description}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            {appt.status !== 'cancelled' && (
                                                <>
                                                    <button
                                                        onClick={() => onEdit(appt)}
                                                        className="cursor-pointer p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => onCancel(appt)}
                                                        className="cursor-pointer p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const WeekPickerModal = ({ isOpen, onClose, onSelectWeek, currentWeekStart }) => {
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        if (currentWeekStart) {
            setSelectedDate(currentWeekStart.toISOString().split('T')[0]);
        }
    }, [currentWeekStart]);

    const handleSelect = () => {
        if (selectedDate) {
            const date = new Date(selectedDate);
            onSelectWeek(date);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{
    backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Select Week</h2>
                    <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Choose any date in the week</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="cursor-pointer px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSelect}
                        className="cursor-pointer px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
                    >
                        Select Week
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardPatient = () => {
    const navigate = useNavigate();
    const [userToken, setUserToken] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isAllAppointmentsModalOpen, setIsAllAppointmentsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState(null);
    const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);

    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const [weekStart, setWeekStart] = useState(getMonday(new Date()));

    const timeSlots = ["8 am","9 am", "10 am", "11 am", "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm"];
    const baseHour = 8;

    const getDaysOfWeek = useCallback(() => {
        const days = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const dayIndex = date.getDay();
            days.push({
                day: dayNames[dayIndex],
                shortDay: shortDayNames[dayIndex],
                date: date.getDate(),
                isToday: date.toDateString() === new Date().toDateString(),
                fullDate: date.toISOString().split('T')[0]
            });
        }
        return days;
    }, [weekStart]);

    const daysOfWeek = getDaysOfWeek();

    const mapAppointmentData = useCallback((serverAppt, types, docList) => {
        const type = types.find(t => t.id === serverAppt.appointment_type_id) || { name: 'Unknown', color: '#CCCCCC' };
        const doctor = docList.find(d => d.doctorId === serverAppt.doctor_id);
        
        let dateOnly;
        if (typeof serverAppt.appointment_date === 'string') {
            if (serverAppt.appointment_date.includes('T')) {
                dateOnly = serverAppt.appointment_date.split('T')[0];
            } else {
                dateOnly = serverAppt.appointment_date.split(' ')[0];
            }
        } else {
            const appointmentDate = new Date(serverAppt.appointment_date);
            dateOnly = appointmentDate.toISOString().split('T')[0];
        }
        
        let startTimeStr = serverAppt.start_time;
        let endTimeStr = serverAppt.end_time;
        
        if (typeof startTimeStr !== 'string') {
            const startDate = new Date(startTimeStr);
            startTimeStr = startDate.toTimeString().substring(0, 8);
        }
        if (typeof endTimeStr !== 'string') {
            const endDate = new Date(endTimeStr);
            endTimeStr = endDate.toTimeString().substring(0, 8);
        }
        
        const startDate = new Date(`${dateOnly}T${startTimeStr}`);
        const endDate = new Date(`${dateOnly}T${endTimeStr}`);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error("Invalid date/time parsing for appointment:", serverAppt);
            return null;
        }

        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        return {
            ...serverAppt,
            type: type.name,
            color: type.color,
            doctorName: doctor ? `${doctor.first_name} ${doctor.last_name}` : 'N/A',
            doctorAddress: doctor ? `${doctor.address}, ${doctor.city}` : 'N/A',
            dayOfWeek: dayNames[startDate.getDay()],
            appointment_date: dateOnly,
            startTime: startTimeStr.substring(0, 5),
            endTime: endTimeStr.substring(0, 5),
            startHour: startDate.getHours() + startDate.getMinutes() / 60,
            endHour: endDate.getHours() + endDate.getMinutes() / 60
        };
    }, []);

    const getAppointmentStyle = (appt) => {
        const start = appt.startHour;
        const end = appt.endHour;
        const baseHeight = window.innerWidth < 640 ? 48 : 64;
        const top = (start - baseHour) * baseHeight;
        const height = Math.max((end - start) * baseHeight - 4, 24);
        return { top: `${top}px`, height: `${height}px`, marginTop: "4px" };
    };

    const handleAppointmentClick = (appt) => {
        const type = appointmentTypes.find(t => t.id === appt.appointment_type_id) || { type: appt.type, color: appt.color };
        const doctor = { doctorName: appt.doctorName, doctorAddress: appt.doctorAddress };
        setSelectedAppointment({ appt, doctor, type });
        setIsModalOpen(true);
    };

    const handleEditAppointment = (appt) => {
        setEditingAppointment(appt);
        setIsEditModalOpen(true);
        setIsAllAppointmentsModalOpen(false);
    };

    const handleSaveEdit = async (updates) => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            
           await fetchWithRetry(
            `http://localhost:8000/appointments/${editingAppointment.id}/patient-request`,
            {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updates)
            });

            await refreshAppointments();
            setIsEditModalOpen(false);
            alert("Appointment updated successfully!");
        } catch (err) {
            console.error("Error updating appointment:", err);
            alert("Failed to update appointment. Please try again.");
        }
    };

    const handleCancelAppointment = async (appt) => {
        if (!window.confirm(`Are you sure you want to cancel the appointment with Dr. ${appt.doctorName} on ${appt.appointment_date}?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            
            await fetchWithRetry(`http://localhost:8000/appointments/${appt.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: 'cancelled' })
            });

            await refreshAppointments();
            alert("Appointment cancelled successfully! The doctor will be notified.");
        } catch (err) {
            console.error("Error cancelling appointment:", err);
            alert("Failed to cancel appointment. Please try again.");
        }
    };

    const refreshAppointments = async () => {
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        
        const appts = await fetchWithRetry('http://localhost:8000/appointments', { headers });
        const allTypes = await fetchWithRetry('http://localhost:8000/appointment-types-patient', { headers });
        
        const mappedAppts = appts.map(apt => mapAppointmentData(apt, allTypes, doctors)).filter(a => a !== null);
        setAppointments(mappedAppts);
        
        const usedTypeIds = [...new Set(appts.map(apt => apt.appointment_type_id))];
        const usedTypes = allTypes.filter(type => usedTypeIds.includes(type.id));
        setAppointmentTypes(usedTypes);
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }
        setUserToken(token);
        
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            
            try {
                const doctorList = await fetchWithRetry('http://localhost:8000/doctors', { headers });
                setDoctors(doctorList);

                const appts = await fetchWithRetry('http://localhost:8000/appointments', { headers });
                const allTypes = await fetchWithRetry('http://localhost:8000/appointment-types-patient', { headers });
                
                const mappedAppts = appts.map(appt => mapAppointmentData(appt, allTypes, doctorList)).filter(a => a !== null);
                setAppointments(mappedAppts);
                
                const usedTypeIds = [...new Set(appts.map(appt => appt.appointment_type_id))];
                const usedTypes = allTypes.filter(type => usedTypeIds.includes(type.id));
                setAppointmentTypes(usedTypes);
            } catch (err) {
                setError(err.message);
                console.error("Error fetching patient dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchAllData();
        }
    }, [navigate, mapAppointmentData]);

    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(appt => appt.appointment_date === today);
    const totalAppointments = appointments.length;
    const weekDates = daysOfWeek.map(d => d.fullDate);
    const weekAppointments = appointments.filter(appt => weekDates.includes(appt.appointment_date));
    const selectedWeekString = `${weekStart.getDate()}-${daysOfWeek[4].date} ${weekStart.toLocaleString('default', { month: 'long' })} ${weekStart.getFullYear()}`;

    const goToPreviousWeek = () => {
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() - 7);
        setWeekStart(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() + 7);
        setWeekStart(newDate);
    };

    const handleSelectWeek = (date) => {
        setWeekStart(getMonday(date));
    };

    return (
        <PatientLayout>
            <AppointmentDetailsModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                appointment={selectedAppointment?.appt} 
                doctor={selectedAppointment?.doctor} 
                type={selectedAppointment?.type}
            />

            <EditAppointmentModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                appointment={editingAppointment}
                onSave={handleSaveEdit}
            />

            <AllAppointmentsModal
                isOpen={isAllAppointmentsModalOpen}
                onClose={() => setIsAllAppointmentsModalOpen(false)}
                appointments={appointments}
                appointmentTypes={appointmentTypes}
                onEdit={handleEditAppointment}
                onCancel={handleCancelAppointment}
            />

            <WeekPickerModal
                isOpen={isWeekPickerOpen}
                onClose={() => setIsWeekPickerOpen(false)}
                onSelectWeek={handleSelectWeek}
                currentWeekStart={weekStart}
            />

           

            {loading && <div className="text-center py-8 text-blue-600">Loading appointments...</div>}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">Error: {error}</div>}
            
            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="col-span-1 space-y-6 lg:col-span-1">
                        <div className="bg-white rounded-xl p-6 shadow-md w-full">
                            <h2 className="text-xl font-semibold mb-4 text-gray-700">Your Appointments Today</h2>
                            <ul className="space-y-2">
                                {todayAppointments.length > 0 ? (
                                    todayAppointments.map((appt) => (
                                        <li 
                                            key={appt.id} 
                                            className="text-gray-700 text-sm p-2 rounded-lg cursor-pointer hover:shadow-inner transition-shadow"
                                            style={{ backgroundColor: appt.color + '60' }}
                                            onClick={() => handleAppointmentClick(appt)}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium">{appt.startTime}</span>
                                                <StatusBadge status={appt.status} />
                                            </div>
                                            <div className="text-xs">Dr. {appt.doctorName} ({appt.type})</div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-gray-500 text-sm">No appointments today.</li>
                                )}
                            </ul>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-md w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-700">Total Appointments</h2>
                                <button
                                    onClick={() => setIsAllAppointmentsModalOpen(true)}
                                    className="cursor-pointer p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View all"
                                >
                                    <List size={20} />
                                </button>
                            </div>
                            <div className="space-y-2 text-gray-600">
                                <div>Selected Week: <span className="font-bold text-gray-800">{weekAppointments.length}</span></div>
                                <div>Total: <span className="font-bold text-gray-800">{totalAppointments}</span></div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-md">
                            <h2 className="text-lg font-semibold mb-3 text-gray-700">My Types</h2>
                            <div className="space-y-2">
                                {appointmentTypes.length > 0 ? (
                                    appointmentTypes.map((type) => (
                                        <div key={type.id} className="flex items-center">
                                            <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: type.color }}></div>
                                            <span className="text-sm text-gray-700">{type.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-500">No types yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 lg:col-span-3 bg-white rounded-xl p-6 shadow-md">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-700">My Appointments</h2>
                                <p className="text-gray-500 text-sm">Week of {selectedWeekString}</p>
                            </div>
                            <button 
                                onClick={() => navigate("/view_doctors")}
                                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-blue-700 transition"
                            >
                                <Plus size={16} />
                                <span>New Appointment</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <button onClick={goToPreviousWeek} className="text-gray-500 hover:text-gray-700">
                                <ChevronLeft />
                            </button>
                            <button
                                onClick={() => setIsWeekPickerOpen(true)}
                                className="flex items-center bg-gray-100 rounded-full px-3 py-1 hover:bg-gray-200 transition cursor-pointer"
                            >
                                <Calendar size={16} className="mr-2 text-blue-500" />
                                <span className="text-gray-700 text-sm">{selectedWeekString}</span>
                            </button>
                            <button onClick={goToNextWeek} className="text-gray-500 hover:text-gray-700">
                                <ChevronRight />
                            </button>
                        </div>

                        <div className="grid grid-cols-[70px_repeat(5,_1fr)] px-4 border-b pb-2 mb-4">
                            <div></div>
                            {daysOfWeek.map((day, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${day.isToday ? "bg-blue-500 text-white" : "bg-gray-100"}`}>
                                        <span className="text-sm font-medium">{day.date}</span>
                                    </div>
                                    <p className={`font-medium text-sm ${day.isToday ? "text-blue-500" : "text-gray-700"}`}>{day.shortDay}</p>
                                    <p className="text-gray-500 text-xs">
                                        {weekAppointments.filter(appt => appt.appointment_date === day.fullDate).length}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-[80px_repeat(5,_1fr)] gap-1 overflow-x-auto pb-6">
                            <div className="pr-2">
                                {timeSlots.map((time, idx) => (
                                    <div key={idx} className="h-16 flex items-center justify-end pr-2 text-gray-500 text-sm">
                                        {time}
                                    </div>
                                ))}
                            </div>

                            {daysOfWeek.map((day, dayIdx) => (
                                <div key={dayIdx} className="relative">
                                    {timeSlots.map((_, timeIdx) => (
                                        <div key={timeIdx} className="h-16 border-t border-gray-100"></div>
                                    ))}
                                    {weekAppointments
                                        .filter(appt => appt.appointment_date === day.fullDate)
                                        .map((appt) => {
                                            const apptStyle = getAppointmentStyle(appt);
                                            return (
                                                <div
                                                    key={appt.id}
                                                    className={`absolute p-2 rounded-md shadow-md cursor-pointer hover:shadow-lg transition text-gray-800 ${appt.status === 'cancelled' ? 'opacity-50' : ''}`}
                                                    style={{ ...apptStyle, backgroundColor: appt.color, width: "90%", left: "5%", zIndex: 10 }}
                                                    onClick={() => handleAppointmentClick(appt)}
                                                >
                                                    <p className="font-semibold text-xs truncate">{appt.type}</p>
                                                   
                                                    {appt.status === 'confirmed' && (
                                                        <CheckCircle size={12} className="absolute top-1 right-1 text-green-600" />
                                                    )}

                                                    {appt.status === 'cancelled' && (
                                                        <XCircle size={12} className="absolute top-1 right-1 text-red-600" />
                                                    )}

                                                    {appt.status === 'pending' && (
                                                        <AlertCircle size={12} className="absolute top-1 right-1 text-yellow-600" />
                                                    )}

                                                    {appt.status === 'finalised' && (
                                                        <CheckCircle size={12} className="absolute top-1 right-1 text-blue-600" />
                                                    )}

                                                </div>
                                            );
                                        })}
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