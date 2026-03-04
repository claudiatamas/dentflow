import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';

const AppointmentTypesModal = ({ isOpen, onClose }) => {
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#93C5FD',
    duration_minutes: 60,
    price: '',
  });

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

  useEffect(() => {
    if (isOpen) fetchAppointmentTypes();
  }, [isOpen]);

  const fetchAppointmentTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/appointment-types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch appointment types');
      const data = await response.json();
      setAppointmentTypes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const url = editingId
        ? `http://localhost:8000/appointment-types/${editingId}`
        : 'http://localhost:8000/appointment-types';
      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes) || 60,
        price: formData.price !== '' && formData.price !== null
          ? parseFloat(formData.price)
          : null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save appointment type');
      }

      await fetchAppointmentTypes();
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment type?')) return;
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/appointment-types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete appointment type');
      }
      await fetchAppointmentTypes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (type) => {
    setEditingId(type.id);
    setFormData({
      name: type.name,
      description: type.description || '',
      color: type.color,
      duration_minutes: type.duration_minutes || 60,
      price: type.price !== null && type.price !== undefined ? type.price : '',
    });
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#93C5FD', duration_minutes: 60, price: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="mt-12 bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">Manage Appointment Types</h2>
          <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Add / Edit Form */}
          {isAdding ? (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Appointment Type' : 'Add New Appointment Type'}
              </h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 shadow-md rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 shadow-md rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>

                {/* Duration + Price — side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_minutes}
                      onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                      className="w-full px-3 py-2 shadow-md rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (RON)
                      <span className="ml-1 text-gray-400 font-normal text-xs">optional</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                        RON
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                        placeholder="—"
                        className="w-full pl-12 pr-3 py-2 shadow-md rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color *</label>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map(colorOption => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: colorOption.value })}
                        className={`h-12 rounded-lg border-2 transition-all cursor-pointer ${
                          formData.color === colorOption.value
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-50 hover:border-blue-600'
                        }`}
                        style={{ backgroundColor: colorOption.value }}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="cursor-pointer flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {editingId ? 'Update' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="cursor-pointer flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="cursor-pointer w-full md:w-[270px] mb-6 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add New Appointment Type
            </button>
          )}

          {/* List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : appointmentTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No appointment types yet. Add your first one!
            </div>
          ) : (
            <div className="space-y-3">
              {appointmentTypes.map(type => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-4 bg-white shadow-md rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ backgroundColor: type.color }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800">{type.name}</h4>
                      {type.description && (
                        <p className="text-sm text-gray-600 mt-0.5 truncate">{type.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          ⏱ {type.duration_minutes} min
                        </span>
                        {type.price !== null && type.price !== undefined ? (
                          <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            {parseFloat(type.price).toFixed(2)} RON
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No price set</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => handleEdit(type)}
                      className="cursor-pointer p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="cursor-pointer p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
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

export default AppointmentTypesModal;