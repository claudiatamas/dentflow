import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react';

const colorOptions = [
  { name: 'Blue',   value: '#93C5FD' },
  { name: 'Green',  value: '#86EFAC' },
  { name: 'Yellow', value: '#FDE047' },
  { name: 'Purple', value: '#D8B4FE' },
  { name: 'Pink',   value: '#F9A8D4' },
  { name: 'Orange', value: '#FDBA74' },
  { name: 'Red',    value: '#FCA5A5' },
  { name: 'Teal',   value: '#5EEAD4' },
  { name: 'Indigo', value: '#A5B4FC' },
  { name: 'Lime',   value: '#BEF264' },
];

const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all";
const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5";

const AppointmentTypesModal = ({ isOpen, onClose }) => {
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '', description: '', color: '#93C5FD', duration_minutes: 60, price: '',
  });

  useEffect(() => { if (isOpen) fetchTypes(); }, [isOpen]);

  const fetchTypes = async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/appointment-types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch appointment types');
      setAppointmentTypes(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const url    = editingId ? `http://localhost:8000/appointment-types/${editingId}` : 'http://localhost:8000/appointment-types';
      const method = editingId ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes) || 60,
        price: formData.price !== '' && formData.price !== null ? parseFloat(formData.price) : null,
      };
      const res = await fetch(url, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed to save'); }
      await fetchTypes();
      resetForm();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/appointment-types/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed to delete'); }
      await fetchTypes();
      setDeletingId(null);
    } catch (err) { setError(err.message); setDeletingId(null); }
  };

  const handleEdit = (type) => {
    setEditingId(type.id);
    setFormData({
      name: type.name, description: type.description || '',
      color: type.color, duration_minutes: type.duration_minutes || 60,
      price: type.price !== null && type.price !== undefined ? type.price : '',
    });
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#93C5FD', duration_minutes: 60, price: '' });
    setIsAdding(false); setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mt-10"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1C398E]/8 flex items-center justify-center">
              <CheckCircle size={15} className="text-[#1C398E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Appointment Types</h2>
              <p className="text-xs text-gray-400">Manage your visit categories</p>
            </div>
          </div>
          <button onClick={onClose}
            className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Form or Add button ── */}
          <div className={`flex-shrink-0 overflow-y-auto px-6 py-5 space-y-4 transition-all duration-300 ${isAdding ? 'w-80 border-r border-gray-100' : 'w-full'}`}>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                <AlertCircle size={14} className="flex-shrink-0" /> {error}
              </div>
            )}

            {isAdding ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700">
                  {editingId ? 'Edit Type' : 'New Appointment Type'}
                </h3>

                <div>
                  <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.name} required
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={inputCls} placeholder="e.g. Cleaning, Check-up..." />
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <textarea value={formData.description} rows={2}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className={`${inputCls} resize-none`} placeholder="Optional description..." />
                </div>

                <div>
                  <label className={labelCls}>Duration (min) <span className="text-red-400">*</span></label>
                  <input type="number" min="1" value={formData.duration_minutes} required
                    onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Price <span className="text-gray-300 font-normal normal-case tracking-normal">(RON, optional)</span></label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">RON</span>
                    <input type="number" min="0" step="0.01" value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="—" className={`${inputCls} pl-12`} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Color <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setFormData({ ...formData, color: opt.value })}
                        title={opt.name}
                        className={`cursor-pointer h-9 rounded-xl border-2 transition-all ${
                          formData.color === opt.value
                            ? 'border-[#1C398E] ring-2 ring-[#1C398E]/30 scale-110'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: opt.value }} />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={resetForm}
                    className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                    Cancel
                  </button>
                  <button type="submit"
                    className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition">
                    {editingId ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button onClick={() => setIsAdding(true)}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold rounded-xl hover:border-[#1C398E]/40 hover:text-[#1C398E] transition-all">
                  <Plus size={15} /> Add New Type
                </button>

                {deletingId && (
                  <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs text-red-700 font-medium">Delete this type?</p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setDeletingId(null)}
                        className="cursor-pointer px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition">
                        Cancel
                      </button>
                      <button onClick={() => handleDelete(deletingId)}
                        className="cursor-pointer px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition">
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : appointmentTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle size={28} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-400">No types yet. Add your first one above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appointmentTypes.map(type => (
                      <div key={type.id}
                        className={`flex items-center gap-3 p-4 border rounded-xl transition-all ${
                          deletingId === type.id ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}>
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 shadow-sm" style={{ backgroundColor: type.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 leading-tight">{type.name}</p>
                          {type.description && <p className="text-xs text-gray-400 truncate mt-0.5">{type.description}</p>}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={10} /> {type.duration_minutes} min
                            </span>
                            {type.price !== null && type.price !== undefined ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                                {parseFloat(type.price).toFixed(2)} RON
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300 italic">No price</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleEdit(type)}
                            className="cursor-pointer p-1.5 text-[#1C398E] hover:bg-[#1C398E]/8 rounded-lg transition">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => setDeletingId(type.id)}
                            className="cursor-pointer p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT: List (only visible when form is open) ── */}
          {isAdding && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2">

              {deletingId && (
                <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-100 rounded-xl mb-3">
                  <p className="text-xs text-red-700 font-medium">Delete this type?</p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setDeletingId(null)}
                      className="cursor-pointer px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button onClick={() => handleDelete(deletingId)}
                      className="cursor-pointer px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition">
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : appointmentTypes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No types yet.</p>
                </div>
              ) : (
                appointmentTypes.map(type => (
                  <div key={type.id}
                    className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${
                      deletingId === type.id ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}>
                    <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: type.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{type.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={10} /> {type.duration_minutes} min
                        </span>
                        {type.price !== null && type.price !== undefined ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                            {parseFloat(type.price).toFixed(2)} RON
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(type)}
                        className="cursor-pointer p-1.5 text-[#1C398E] hover:bg-[#1C398E]/8 rounded-lg transition">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeletingId(type.id)}
                        className="cursor-pointer p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AppointmentTypesModal;