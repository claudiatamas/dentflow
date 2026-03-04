import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import axios from "axios";

const daysOfWeek = [
  { label: "Monday", value: 0 },
  { label: "Tuesday", value: 1 },
  { label: "Wednesday", value: 2 },
  { label: "Thursday", value: 3 },
  { label: "Friday", value: 4 },
  { label: "Saturday", value: 5 },
  { label: "Sunday", value: 6 },
];

const SettingModalDoctor = ({ isOpen, onClose, doctorId }) => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!isOpen) return;

    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:8000/work-schedules?doctor_id=${doctorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSchedule(res.data); // [{id, day_of_week, start_time, end_time}]
      } catch (err) {
        console.error("Error fetching schedule:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [isOpen, doctorId]);

  const handleChange = (dayIndex, field, value) => {
    setSchedule(prev => {
      const existing = prev.find(d => d.day_of_week === dayIndex);
      if (existing) {
        return prev.map(d =>
          d.day_of_week === dayIndex ? { ...d, [field]: value } : d
        );
      } else {
        return [...prev, { day_of_week: dayIndex, [field]: value }];
      }
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      for (let day of schedule) {
        if (!day.start_time && !day.end_time) continue; // ignora zilele goale

        if (day.id) {
          // update
          await axios.put(
            `http://localhost:8000/work-schedules/${day.id}`,
            { ...day },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          // create
          await axios.post(
            "http://localhost:8000/work-schedules",
            { ...day, doctor_id: doctorId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }
      onClose();
    } catch (err) {
      console.error("Error saving schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{
    backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">Settings - Work Schedule</h2>
          <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            daysOfWeek.map(day => {
              const dayData = schedule.find(d => d.day_of_week === day.value) || {};
              return (
                <div key={day.value} className="flex gap-2 items-center">
                  <span className="w-24">{day.label}</span>
                  <input
                    type="time"
                    value={dayData.start_time || ""}
                    onChange={e => handleChange(day.value, "start_time", e.target.value)}
                    className="px-2 py-1 border rounded"
                  />
                  <span>-</span>
                  <input
                    type="time"
                    value={dayData.end_time || ""}
                    onChange={e => handleChange(day.value, "end_time", e.target.value)}
                    className="px-2 py-1 border rounded"
                  />
                </div>
              );
            })
          )}

          <button
            onClick={handleSave}
            className="cursor-pointer w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingModalDoctor;
