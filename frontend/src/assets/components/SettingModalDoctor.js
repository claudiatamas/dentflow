import React, { useState, useEffect } from "react";
import { X, Clock, CheckCircle } from "lucide-react";
import axios from "axios";

const DAYS = [
  { label: "Monday",    value: 0 },
  { label: "Tuesday",   value: 1 },
  { label: "Wednesday", value: 2 },
  { label: "Thursday",  value: 3 },
  { label: "Friday",    value: 4 },
  { label: "Saturday",  value: 5 },
  { label: "Sunday",    value: 6 },
];

const WEEKDAYS = [0, 1, 2, 3, 4];
const WEEKEND  = [5, 6];

const SettingModalDoctor = ({ isOpen, onClose, doctorId }) => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!isOpen) return;
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `http://localhost:8000/work-schedules?doctor_id=${doctorId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSchedule(res.data);
      } catch (err) {
        console.error("Error fetching schedule:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [isOpen, doctorId]);

  const getDayData = (dayValue) =>
    schedule.find(d => d.day_of_week === dayValue) || {};

  const isActive = (dayValue) => {
    const d = getDayData(dayValue);
    return !!(d.start_time && d.end_time);
  };

  const handleChange = (dayIndex, field, value) => {
    setSchedule(prev => {
      const existing = prev.find(d => d.day_of_week === dayIndex);
      if (existing) {
        return prev.map(d => d.day_of_week === dayIndex ? { ...d, [field]: value } : d);
      }
      return [...prev, { day_of_week: dayIndex, [field]: value }];
    });
  };

  const toggleDay = (dayValue) => {
    if (isActive(dayValue)) {
      // Clear times
      setSchedule(prev => prev.map(d =>
        d.day_of_week === dayValue ? { ...d, start_time: "", end_time: "" } : d
      ).filter(d => d.day_of_week !== dayValue || d.id));
    } else {
      // Set default times
      handleChange(dayValue, "start_time", "09:00");
      setTimeout(() => handleChange(dayValue, "end_time", "17:00"), 0);
    }
  };

  const applyWeekdays = () => {
    const src = getDayData(0);
    if (!src.start_time || !src.end_time) return;
    WEEKDAYS.forEach(d => {
      handleChange(d, "start_time", src.start_time);
      handleChange(d, "end_time",   src.end_time);
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      for (let day of schedule) {
        if (!day.start_time && !day.end_time) continue;
        if (day.id) {
          await axios.put(
            `http://localhost:8000/work-schedules/${day.id}`,
            { ...day },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          await axios.post(
            "http://localhost:8000/work-schedules",
            { ...day, doctor_id: doctorId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1000);
    } catch (err) {
      console.error("Error saving schedule:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = "px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all w-28";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1C398E]/8 flex items-center justify-center">
              <Clock size={15} className="text-[#1C398E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Work Schedule</h2>
              <p className="text-xs text-gray-400">Set your weekly availability</p>
            </div>
          </div>
          <button onClick={onClose}
            className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Quick action */}
              <button onClick={applyWeekdays}
                className="cursor-pointer w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium rounded-xl hover:bg-gray-100 transition-colors">
                Copy Monday hours to all weekdays
              </button>

              {/* Weekdays */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 pt-1">Weekdays</p>
                {DAYS.filter(d => WEEKDAYS.includes(d.value)).map(day => {
                  const active  = isActive(day.value);
                  const dayData = getDayData(day.value);
                  return (
                    <div key={day.value}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        active ? 'border-[#1C398E]/20 bg-[#1C398E]/[0.03]' : 'border-gray-100 bg-gray-50/50'
                      }`}>
                      {/* Toggle */}
                      <div className={`relative w-9 h-5 rounded-full cursor-pointer flex-shrink-0 transition-colors ${active ? 'bg-[#1C398E]' : 'bg-gray-200'}`}
                        onClick={() => toggleDay(day.value)}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-4' : ''}`} />
                      </div>
                      {/* Label */}
                      <span className={`text-sm font-semibold w-24 flex-shrink-0 ${active ? 'text-gray-800' : 'text-gray-400'}`}>
                        {day.label}
                      </span>
                      {/* Times */}
                      {active ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={dayData.start_time || ""}
                            onChange={e => handleChange(day.value, "start_time", e.target.value)}
                            className={inputCls} />
                          <span className="text-xs text-gray-400 font-bold">—</span>
                          <input type="time" value={dayData.end_time || ""}
                            onChange={e => handleChange(day.value, "end_time", e.target.value)}
                            className={inputCls} />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Off</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Weekend */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 pt-1">Weekend</p>
                {DAYS.filter(d => WEEKEND.includes(d.value)).map(day => {
                  const active  = isActive(day.value);
                  const dayData = getDayData(day.value);
                  return (
                    <div key={day.value}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        active ? 'border-[#1C398E]/20 bg-[#1C398E]/[0.03]' : 'border-gray-100 bg-gray-50/50'
                      }`}>
                      <div className={`relative w-9 h-5 rounded-full cursor-pointer flex-shrink-0 transition-colors ${active ? 'bg-[#1C398E]' : 'bg-gray-200'}`}
                        onClick={() => toggleDay(day.value)}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-4' : ''}`} />
                      </div>
                      <span className={`text-sm font-semibold w-24 flex-shrink-0 ${active ? 'text-gray-800' : 'text-gray-400'}`}>
                        {day.label}
                      </span>
                      {active ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={dayData.start_time || ""}
                            onChange={e => handleChange(day.value, "start_time", e.target.value)}
                            className={inputCls} />
                          <span className="text-xs text-gray-400 font-bold">—</span>
                          <input type="time" value={dayData.end_time || ""}
                            onChange={e => handleChange(day.value, "end_time", e.target.value)}
                            className={inputCls} />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Off</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Save */}
              <div className="pt-2">
                <button onClick={handleSave} disabled={saving || saved}
                  className={`cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    saved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#1C398E] text-white hover:bg-[#1C398E]/90'
                  } disabled:opacity-70`}>
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : saved ? (
                    <><CheckCircle size={15} /> Saved!</>
                  ) : (
                    'Save Schedule'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingModalDoctor;