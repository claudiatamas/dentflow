import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, AlertCircle } from 'lucide-react';
import axios from 'axios';

const MakeAppointmentModal = ({ isOpen, onClose, patientId, initialDoctorId }) => {
  const [doctors, setDoctors] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [workSchedule, setWorkSchedule] = useState(null);
  const [busySlots, setBusySlots] = useState([]);
  const [freeSlots, setFreeSlots] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [selectedType, setSelectedType] = useState(null);

  const [formData, setFormData] = useState({
    doctor_id: '',
    appointment_type_id: '',
    appointment_date: '',
    start_time: '',
    end_time: '',
    message: '',
  });

  const [error, setError] = useState(null);

  // Load doctors
  useEffect(() => {
    if (!isOpen) return;
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.get('http://localhost:8000/doctors', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDoctors(res.data);
      } catch {
        setError('Failed to load doctors');
      }
    };
    fetchDoctors();
  }, [isOpen]);

  // Preselect doctor
  useEffect(() => {
    if (initialDoctorId) {
      setFormData(prev => ({ ...prev, doctor_id: initialDoctorId }));
    }
  }, [initialDoctorId]);

  // Load appointment types for selected doctor
  useEffect(() => {
    if (!formData.doctor_id) return;
    const fetchAppointmentTypes = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.get(
          `http://localhost:8000/appointment-types-by-doctor/${formData.doctor_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAppointmentTypes(res.data);
      } catch {
        setError('Failed to load appointment types');
      }
    };
    fetchAppointmentTypes();
  }, [formData.doctor_id]);

  // Update selected type info when appointment type changes
  useEffect(() => {
    const type = appointmentTypes.find(
      t => t.id.toString() === formData.appointment_type_id
    );
    setSelectedType(type || null);
    setSelectedDuration(type ? type.duration_minutes : 0);
  }, [formData.appointment_type_id, appointmentTypes]);

  // Load work schedule + busy slots for selected date
  useEffect(() => {
    if (!formData.doctor_id || !formData.appointment_date) return;
    const fetchWorkData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.get(
          `http://localhost:8000/work-schedules/${formData.doctor_id}/${formData.appointment_date}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const { workHours, busySlots } = res.data;
        setWorkSchedule(workHours);
        setBusySlots(busySlots);
        generateFreeSlots(workHours, busySlots, selectedDuration);
      } catch {
        setError('Doctor has no schedule for this day.');
        setWorkSchedule(null);
        setBusySlots([]);
        setFreeSlots([]);
      }
    };
    fetchWorkData();
  }, [formData.doctor_id, formData.appointment_date, selectedDuration]);

  const generateFreeSlots = (workHours, busy, duration) => {
    if (!workHours || !duration) return;
    const toMinutes = t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toTime = mins => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    const slots = [];
    const startMin = toMinutes(workHours.start);
    const endMin = toMinutes(workHours.end);
    const sortedBusy = busy
      .map(s => ({ start: toMinutes(s.start), end: toMinutes(s.end) }))
      .sort((a, b) => a.start - b.start);
    let cursor = startMin;
    for (let i = 0; i <= sortedBusy.length; i++) {
      const busyStart = i < sortedBusy.length ? sortedBusy[i].start : endMin;
      while (cursor + duration <= busyStart) {
        slots.push({ start: toTime(cursor), end: toTime(cursor + duration) });
        cursor += duration;
      }
      if (i < sortedBusy.length) {
        cursor = Math.max(cursor, sortedBusy[i].end);
      }
    }
    setFreeSlots(slots);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.start_time) return;
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        'http://localhost:8000/appointments',
        { ...formData, patient_id: patientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onClose();
    } catch {
      setError('Failed to create appointment');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="mt-16 bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Make Appointment</h2>
          <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          {error && <p className="text-red-600 mb-3">{error}</p>}

          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Doctor */}
            <div>
              <label className="block mb-1 text-sm font-medium">Doctor *</label>
              <select
                value={formData.doctor_id}
                onChange={e =>
                  setFormData({ ...formData, doctor_id: e.target.value, appointment_type_id: '', start_time: '', end_time: '' })
                }
                className="cursor-pointer w-full shadow-md px-4 py-3 rounded"
                required
              >
                <option value="">Select doctor</option>
                {doctors.map(doc => (
                  <option key={doc.doctorId} value={doc.doctorId}>
                    Dr. {doc.first_name} {doc.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Appointment Type */}
            <div>
              <label className="block mb-1 text-sm font-medium">Appointment Type *</label>
              <select
                value={formData.appointment_type_id}
                onChange={e =>
                  setFormData({ ...formData, appointment_type_id: e.target.value, start_time: '', end_time: '' })
                }
                className="cursor-pointer w-full shadow-md px-4 py-3 rounded"
                required
              >
                <option value="">Select type</option>
                {appointmentTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} — {type.duration_minutes} min
                    {type.price !== null && type.price !== undefined
                      ? ` — ${parseFloat(type.price).toFixed(2)} RON`
                      : ''}
                  </option>
                ))}
              </select>

              {/* Price + duration info banner */}
              {selectedType && (
                <div className="mt-2 flex items-center gap-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-1.5 text-blue-700 text-sm">
                    <Clock size={15} />
                    <span className="font-medium">{selectedType.duration_minutes} min</span>
                  </div>
                  <div className="w-px h-4 bg-blue-200" />
                  {selectedType.price !== null && selectedType.price !== undefined ? (
                    <div className="flex items-center gap-1.5 text-green-700 text-sm">
                      <DollarSign size={15} />
                      <span className="font-semibold">{parseFloat(selectedType.price).toFixed(2)} RON</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <DollarSign size={15} />
                      <span>Price not set</span>
                    </div>
                  )}
                  {selectedType.description && (
                    <>
                      <div className="w-px h-4 bg-blue-200" />
                      <p className="text-blue-600 text-xs truncate">{selectedType.description}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block mb-1 text-sm font-medium">Date *</label>
              <input
                type="date"
                value={formData.appointment_date}
                onChange={e =>
                  setFormData({ ...formData, appointment_date: e.target.value, start_time: '', end_time: '' })
                }
                className="w-full shadow-md px-4 py-3 rounded"
                required
              />
            </div>

            {/* Free Slots */}
            {workSchedule && freeSlots.length > 0 && (
              <div className="bg-blue-50 p-3 rounded border">
                <p className="text-sm font-medium mb-2 text-blue-900">Available Slots:</p>
                <div className="flex flex-wrap gap-2">
                  {freeSlots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`cursor-pointer px-3 py-1 rounded text-sm ${
                        formData.start_time === slot.start
                          ? 'bg-blue-700 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, start_time: slot.start, end_time: slot.end })
                      }
                    >
                      {slot.start} - {slot.end}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {workSchedule && freeSlots.length === 0 && (
              <p className="text-red-600 text-sm font-medium">
                No available slots for this day.
              </p>
            )}

            {/* Message */}
            <div>
              <label className="block mb-1 text-sm font-medium">Message</label>
              <textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                className="w-full shadow-md px-4 py-3 rounded"
                rows="3"
              />
            </div>

            {/* Summary before booking */}
            {formData.start_time && selectedType && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-green-800 mb-2">Booking Summary</p>
                <div className="flex justify-between text-sm text-green-700">
                  <span>Type</span>
                  <span className="font-medium">{selectedType.name}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700">
                  <span>Date</span>
                  <span className="font-medium">{formData.appointment_date}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700">
                  <span>Time</span>
                  <span className="font-medium">{formData.start_time} – {formData.end_time}</span>
                </div>
                {selectedType.price !== null && selectedType.price !== undefined && (
                  <>
                    <div className="border-t border-green-200 my-2" />
                    <div className="flex justify-between text-sm font-bold text-green-800">
                      <span>Estimated cost</span>
                      <span>{parseFloat(selectedType.price).toFixed(2)} RON</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              className="cursor-pointer w-full bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700"
              disabled={!formData.start_time}
            >
              Book Appointment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MakeAppointmentModal;