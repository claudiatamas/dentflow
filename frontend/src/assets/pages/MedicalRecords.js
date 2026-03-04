import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    Plus, ChevronRight, ChevronDown, User, Droplets, AlertCircle,
    Activity, FileText, Pill, Paperclip, Trash2, Upload, X,
    Edit3, Save, XCircle, Download, Eye, Calendar, DollarSign,
    Clock, CheckCircle, Loader2, Search, Stethoscope
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import PatientLayout from '../components/PatientLayout';

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
};

const normalizeDate = (ts) => {
    if (!ts) return '';
    const normalized = ts.includes('T') && !ts.endsWith('Z') ? ts + 'Z' : ts;
    return new Date(normalized).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ─────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────
const Avatar = ({ src, firstName, lastName, size = 'md' }) => {
    const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    if (src) return <img src={src} alt="" className={`${sizes[size]} rounded-full object-cover flex-shrink-0`} />;
    return (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-400 to-[#1C398E] flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-semibold">{initials || '?'}</span>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const config = {
        completed:   { label: 'Completed',   cls: 'bg-green-100 text-green-700',  icon: <CheckCircle size={11} /> },
        in_progress: { label: 'In Progress', cls: 'bg-yellow-100 text-yellow-700', icon: <Clock size={11} /> },
        planned:     { label: 'Planned',     cls: 'bg-blue-100 text-blue-700',    icon: <Calendar size={11} /> },
    };
    const c = config[status] || config.completed;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
            {c.icon}{c.label}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────
// Document Type Badge
// ─────────────────────────────────────────────────────────────
const DocTypeBadge = ({ type }) => {
    const config = {
        xray:         { label: 'X-Ray',        cls: 'bg-violet-100 text-violet-700' },
        scan:         { label: 'Scan',          cls: 'bg-cyan-100 text-cyan-700' },
        prescription: { label: 'Prescription',  cls: 'bg-orange-100 text-orange-700' },
        report:       { label: 'Report',        cls: 'bg-teal-100 text-teal-700' },
        other:        { label: 'Other',         cls: 'bg-gray-100 text-gray-600' },
    };
    const c = config[type] || config.other;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>{c.label}</span>;
};

// ─────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, count, onAdd, isDoctor, addLabel }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <span className="text-[#1C398E]">{icon}</span>
            <h3 className="font-semibold text-gray-800">{title}</h3>
            {count > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">{count}</span>
            )}
        </div>
        {isDoctor && onAdd && (
            <button
                onClick={onAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C398E] text-white text-xs font-medium rounded-xl hover:bg-blue-800 transition-colors cursor-pointer"
            >
                <Plus size={14} /> {addLabel || 'Add'}
            </button>
        )}
    </div>
);

// ─────────────────────────────────────────────────────────────
// Modal wrapper
// ─────────────────────────────────────────────────────────────
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
};

const InputField = ({ label, required, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
    </div>
);

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer";

// ─────────────────────────────────────────────────────────────
// New Record Modal (doctor creates a record for a patient)
// ─────────────────────────────────────────────────────────────
const NewRecordModal = ({ isOpen, onClose, onSave }) => {
    const [patients, setPatients] = useState([]);
    const [form, setForm] = useState({ patient_id: '', blood_type: '', allergies: '', chronic_conditions: '', notes: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        axios.get('http://localhost:8000/doctor/appointment-patients', { headers: getHeaders() })
            .then(res => setPatients(res.data))
            .catch(() => {});
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!form.patient_id) return;
        setLoading(true);
        const body = { patient_id: parseInt(form.patient_id) };
        if (form.blood_type)          body.blood_type = form.blood_type;
        if (form.allergies)           body.allergies = form.allergies;
        if (form.chronic_conditions)  body.chronic_conditions = form.chronic_conditions;
        if (form.notes)               body.notes = form.notes;
        try {
            const res = await axios.post('http://localhost:8000/medical-records', body, {
                headers: { ...getHeaders(), 'Content-Type': 'application/json' }
            });
            onSave(res.data);
            onClose();
            setForm({ patient_id: '', blood_type: '', allergies: '', chronic_conditions: '', notes: '' });
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Medical Record">
            <div className="space-y-4">
                <InputField label="Patient" required>
                    <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className={inputCls}>
                        <option value="">Select patient...</option>
                        {patients.map(p => (
                            <option key={p.id} value={p.patient_id}>{p.first_name} {p.last_name}</option>
                        ))}
                    </select>
                </InputField>
                <InputField label="Blood Type">
                    <select value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })} className={inputCls}>
                        <option value="">Unknown</option>
                        {['A+','A-','B+','B-','AB+','AB-','0+','0-'].map(bt => <option key={bt}>{bt}</option>)}
                    </select>
                </InputField>
                <InputField label="Allergies">
                    <textarea value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} rows={2} placeholder="e.g. Penicillin, Latex..." className={inputCls} />
                </InputField>
                <InputField label="Chronic Conditions">
                    <textarea value={form.chronic_conditions} onChange={e => setForm({ ...form, chronic_conditions: e.target.value })} rows={2} placeholder="e.g. Diabetes, Hypertension..." className={inputCls} />
                </InputField>
                <InputField label="General Notes">
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} />
                </InputField>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
                    <button onClick={handleSubmit} disabled={!form.patient_id || loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C398E] rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 cursor-pointer">
                        {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Create Record'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────
// Add Treatment Modal
// ─────────────────────────────────────────────────────────────
const AddTreatmentModal = ({ isOpen, onClose, recordId, onSave }) => {
    const [form, setForm] = useState({ tooth_number: '', procedure_name: '', description: '', cost: '', treatment_date: new Date().toISOString().split('T')[0], status_field: 'completed' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!form.procedure_name || !form.treatment_date) return;
        setLoading(true);
        const body = {
            procedure_name: form.procedure_name,
            treatment_date: form.treatment_date,
            status: form.status_field,
        };
        if (form.tooth_number)  body.tooth_number = form.tooth_number;
        if (form.description)   body.description = form.description;
        if (form.cost !== '')   body.cost = parseFloat(form.cost);
        try {
            const res = await axios.post(`http://localhost:8000/medical-records/${recordId}/treatments`, body, {
                headers: { ...getHeaders(), 'Content-Type': 'application/json' }
            });
            onSave(res.data);
            onClose();
            setForm({ tooth_number: '', procedure_name: '', description: '', cost: '', treatment_date: new Date().toISOString().split('T')[0], status_field: 'completed' });
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to add treatment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Treatment">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Tooth Number">
                        <input type="text" value={form.tooth_number} onChange={e => setForm({ ...form, tooth_number: e.target.value })} placeholder="e.g. 16, 21-22" className={inputCls} />
                    </InputField>
                    <InputField label="Date" required>
                        <input type="date" value={form.treatment_date} onChange={e => setForm({ ...form, treatment_date: e.target.value })} className={inputCls} />
                    </InputField>
                </div>
                <InputField label="Procedure" required>
                    <input type="text" value={form.procedure_name} onChange={e => setForm({ ...form, procedure_name: e.target.value })} placeholder="e.g. Composite filling, Extraction..." className={inputCls} />
                </InputField>
                <InputField label="Description">
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} />
                </InputField>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Cost (RON)">
                        <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0.00" className={inputCls} />
                    </InputField>
                    <InputField label="Status">
                        <select value={form.status_field} onChange={e => setForm({ ...form, status_field: e.target.value })} className={inputCls}>
                            <option value="completed">Completed</option>
                            <option value="in_progress">In Progress</option>
                            <option value="planned">Planned</option>
                        </select>
                    </InputField>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
                    <button onClick={handleSubmit} disabled={!form.procedure_name || loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C398E] rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 cursor-pointer">
                        {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Add Treatment'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────
// Add Prescription Modal
// ─────────────────────────────────────────────────────────────
const AddPrescriptionModal = ({ isOpen, onClose, recordId, onSave }) => {
    const [form, setForm] = useState({ medication_name: '', dosage: '', frequency: '', duration: '', notes: '', prescribed_date: new Date().toISOString().split('T')[0] });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!form.medication_name) return;
        setLoading(true);
        const body = {
            medication_name: form.medication_name,
            prescribed_date: form.prescribed_date,
        };
        if (form.dosage)     body.dosage = form.dosage;
        if (form.frequency)  body.frequency = form.frequency;
        if (form.duration)   body.duration = form.duration;
        if (form.notes)      body.notes = form.notes;
        try {
            const res = await axios.post(`http://localhost:8000/medical-records/${recordId}/prescriptions`, body, {
                headers: { ...getHeaders(), 'Content-Type': 'application/json' }
            });
            onSave(res.data);
            onClose();
            setForm({ medication_name: '', dosage: '', frequency: '', duration: '', notes: '', prescribed_date: new Date().toISOString().split('T')[0] });
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to add prescription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Prescription">
            <div className="space-y-4">
                <InputField label="Medication" required>
                    <input type="text" value={form.medication_name} onChange={e => setForm({ ...form, medication_name: e.target.value })} placeholder="e.g. Amoxicillin, Ibuprofen..." className={inputCls} />
                </InputField>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Dosage">
                        <input type="text" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg" className={inputCls} />
                    </InputField>
                    <InputField label="Frequency">
                        <input type="text" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} placeholder="e.g. 3x/day" className={inputCls} />
                    </InputField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Duration">
                        <input type="text" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 7 days" className={inputCls} />
                    </InputField>
                    <InputField label="Date">
                        <input type="date" value={form.prescribed_date} onChange={e => setForm({ ...form, prescribed_date: e.target.value })} className={inputCls} />
                    </InputField>
                </div>
                <InputField label="Notes">
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional instructions..." className={inputCls} />
                </InputField>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
                    <button onClick={handleSubmit} disabled={!form.medication_name || loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C398E] rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 cursor-pointer">
                        {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Add Prescription'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────
// Upload Document Modal
// ─────────────────────────────────────────────────────────────
const UploadDocumentModal = ({ isOpen, onClose, recordId, onSave }) => {
    const [form, setForm] = useState({ document_type: 'other', description: '' });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef();

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('document_type', form.document_type);
        if (form.description) fd.append('description', form.description);
        try {
            const res = await axios.post(`http://localhost:8000/medical-records/${recordId}/documents`, fd, { headers: getHeaders() });
            onSave(res.data);
            onClose();
            setFile(null);
            setForm({ document_type: 'other', description: '' });
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to upload document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Upload Document">
            <div className="space-y-4">
                <InputField label="Document Type">
                    <select value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })} className={inputCls}>
                        <option value="xray">X-Ray</option>
                        <option value="scan">Scan / CT</option>
                        <option value="prescription">Prescription</option>
                        <option value="report">Report</option>
                        <option value="other">Other</option>
                    </select>
                </InputField>

                {/* File drop zone */}
                <div
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
                >
                    <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" className="hidden" onChange={e => setFile(e.target.files[0])} />
                    {file ? (
                        <div className="flex items-center justify-center gap-2 text-blue-700">
                            <FileText size={20} />
                            <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                            <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-gray-400 hover:text-red-500 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">Click to upload or drag & drop</p>
                            <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB</p>
                        </>
                    )}
                </div>

                <InputField label="Description">
                    <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Upper molar X-Ray" className={inputCls} />
                </InputField>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
                    <button onClick={handleSubmit} disabled={!file || loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C398E] rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 cursor-pointer">
                        {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Upload'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────────────────────
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title = 'Delete', message = 'Are you sure? This action cannot be undone.' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertCircle size={24} className="text-red-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
                    <p className="text-sm text-gray-400 mb-6">{message}</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
                        <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Edit General Info Panel (inline, doctor only)
// ─────────────────────────────────────────────────────────────
const GeneralInfoCard = ({ record, isDoctor, onUpdate }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ blood_type: record.blood_type || '', allergies: record.allergies || '', chronic_conditions: record.chronic_conditions || '', notes: record.notes || '' });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const body = {
            blood_type:         form.blood_type || null,
            allergies:          form.allergies || null,
            chronic_conditions: form.chronic_conditions || null,
            notes:              form.notes || null,
        };
        try {
            const res = await axios.put(`http://localhost:8000/medical-records/${record.id}`, body, {
                headers: { ...getHeaders(), 'Content-Type': 'application/json' }
            });
            onUpdate(res.data);
            setEditing(false);
        } catch {
            alert('Failed to update record');
        } finally {
            setLoading(false);
        }
    };

    const bloodTypeColor = {
        'A+': 'bg-red-100 text-red-700', 'A-': 'bg-red-100 text-red-700',
        'B+': 'bg-orange-100 text-orange-700', 'B-': 'bg-orange-100 text-orange-700',
        'AB+': 'bg-purple-100 text-purple-700', 'AB-': 'bg-purple-100 text-purple-700',
        '0+': 'bg-blue-100 text-blue-700', '0-': 'bg-blue-100 text-blue-700',
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Droplets size={18} className="text-[#1C398E]" />
                    <h3 className="font-semibold text-gray-800">General Information</h3>
                </div>
                {isDoctor && !editing && (
                    <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-[#1C398E] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                        <Edit3 size={16} />
                    </button>
                )}
                {isDoctor && editing && (
                    <div className="flex gap-2">
                        <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"><XCircle size={16} /></button>
                        <button onClick={handleSave} disabled={loading} className="p-1.5 text-[#1C398E] hover:bg-blue-50 rounded-lg cursor-pointer">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        </button>
                    </div>
                )}
            </div>

            {!editing ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-32 flex-shrink-0">Blood Type</span>
                        {record.blood_type
                            ? <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${bloodTypeColor[record.blood_type] || 'bg-gray-100 text-gray-700'}`}>{record.blood_type}</span>
                            : <span className="text-sm text-gray-400 italic">Not recorded</span>
                        }
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-sm text-gray-500 w-32 flex-shrink-0">Allergies</span>
                        <span className="text-sm text-gray-800">{record.allergies || <span className="text-gray-400 italic">None recorded</span>}</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-sm text-gray-500 w-32 flex-shrink-0">Conditions</span>
                        <span className="text-sm text-gray-800">{record.chronic_conditions || <span className="text-gray-400 italic">None recorded</span>}</span>
                    </div>
                    {record.notes && (
                        <div className="flex items-start gap-3">
                            <span className="text-sm text-gray-500 w-32 flex-shrink-0">Notes</span>
                            <span className="text-sm text-gray-800">{record.notes}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                        <span className="text-xs text-gray-400">Last updated: {normalizeDate(record.updated_at)}</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <InputField label="Blood Type">
                        <select value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })} className={inputCls}>
                            <option value="">Unknown</option>
                            {['A+','A-','B+','B-','AB+','AB-','0+','0-'].map(bt => <option key={bt}>{bt}</option>)}
                        </select>
                    </InputField>
                    <InputField label="Allergies">
                        <textarea value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} rows={2} className={inputCls} />
                    </InputField>
                    <InputField label="Chronic Conditions">
                        <textarea value={form.chronic_conditions} onChange={e => setForm({ ...form, chronic_conditions: e.target.value })} rows={2} className={inputCls} />
                    </InputField>
                    <InputField label="Notes">
                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} />
                    </InputField>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Record Detail View (full record expanded)
// ─────────────────────────────────────────────────────────────
const RecordDetail = ({ record, isDoctor, onBack, onRecordUpdate }) => {
    const [activeTab, setActiveTab] = useState('treatments');
    const [localRecord, setLocalRecord] = useState(record);
    const [treatmentModal, setTreatmentModal] = useState(false);
    const [prescriptionModal, setPrescriptionModal] = useState(false);
    const [documentModal, setDocumentModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, type: null, id: null });

    const tabs = [
        { id: 'treatments',   label: 'Treatments',   icon: <Activity size={15} />,  count: localRecord.treatments.length },
        { id: 'prescriptions',label: 'Prescriptions',icon: <Pill size={15} />,       count: localRecord.prescriptions.length },
        { id: 'documents',    label: 'Documents',    icon: <Paperclip size={15} />,  count: localRecord.documents.length },
    ];

    const handleDelete = async () => {
        const { type, id } = deleteModal;
        try {
            await axios.delete(`http://localhost:8000/medical-records/${type}/${id}`, { headers: getHeaders() });
            setLocalRecord(prev => ({
                ...prev,
                treatments:    type === 'treatments'    ? prev.treatments.filter(t => t.id !== id)    : prev.treatments,
                prescriptions: type === 'prescriptions' ? prev.prescriptions.filter(p => p.id !== id) : prev.prescriptions,
                documents:     type === 'documents'     ? prev.documents.filter(d => d.id !== id)     : prev.documents,
            }));
            setDeleteModal({ open: false, type: null, id: null });
        } catch { alert('Failed to delete'); }
    };

    return (
        <div className="space-y-5">
            {/* Back + header */}
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 text-gray-500 hover:text-[#1C398E] hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">
                    <ChevronRight size={20} className="rotate-180" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <Avatar src={isDoctor ? localRecord.patient_picture : null} firstName={isDoctor ? localRecord.patient_name.split(' ')[0] : localRecord.doctor_name.split(' ')[0]} lastName={isDoctor ? localRecord.patient_name.split(' ')[1] : localRecord.doctor_name.split(' ')[1]} size="lg" />
                    <div>
                        <p className="font-semibold text-gray-800 text-lg">{isDoctor ? localRecord.patient_name : `Dr. ${localRecord.doctor_name}`}</p>
                        {!isDoctor && localRecord.doctor_specialty && <p className="text-sm text-gray-400">{localRecord.doctor_specialty}</p>}
                        <p className="text-xs text-gray-400">Record created {normalizeDate(localRecord.created_at)}</p>
                    </div>
                </div>
            </div>

            {/* General Info */}
            <GeneralInfoCard record={localRecord} isDoctor={isDoctor} onUpdate={(r) => { setLocalRecord(r); onRecordUpdate(r); }} />

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === tab.id ? 'text-[#1C398E] border-b-2 border-[#1C398E]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${activeTab === tab.id ? 'bg-blue-100 text-[#1C398E]' : 'bg-gray-100 text-gray-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {/* Treatments */}
                    {activeTab === 'treatments' && (
                        <>
                            <SectionHeader icon={<Activity size={18} />} title="Treatment History" count={localRecord.treatments.length} isDoctor={isDoctor} onAdd={() => setTreatmentModal(true)} addLabel="Add Treatment" />
                            {localRecord.treatments.length === 0
                                ? <p className="text-sm text-gray-400 text-center py-8">No treatments recorded yet.</p>
                                : (
                                    <div className="space-y-3">
                                        {localRecord.treatments.map(t => (
                                            <div key={t.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-[#1C398E]">{t.tooth_number || '—'}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-medium text-gray-800 text-sm">{t.procedure_name}</p>
                                                        <StatusBadge status={t.status} />
                                                    </div>
                                                    {t.description && <p className="text-xs text-gray-500 mb-1">{t.description}</p>}
                                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                                        <span className="flex items-center gap-1"><Calendar size={11} />{normalizeDate(t.treatment_date)}</span>
                                                        {t.cost && <span className="flex items-center gap-1"><DollarSign size={11} />{t.cost} RON</span>}
                                                    </div>
                                                </div>
                                                {isDoctor && (
                                                    <button onClick={() => setDeleteModal({ open: true, type: 'treatments', id: t.id })} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all cursor-pointer">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </>
                    )}

                    {/* Prescriptions */}
                    {activeTab === 'prescriptions' && (
                        <>
                            <SectionHeader icon={<Pill size={18} />} title="Prescriptions" count={localRecord.prescriptions.length} isDoctor={isDoctor} onAdd={() => setPrescriptionModal(true)} addLabel="Add Prescription" />
                            {localRecord.prescriptions.length === 0
                                ? <p className="text-sm text-gray-400 text-center py-8">No prescriptions recorded yet.</p>
                                : (
                                    <div className="space-y-3">
                                        {localRecord.prescriptions.map(p => (
                                            <div key={p.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                                    <Pill size={18} className="text-orange-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 text-sm mb-1">{p.medication_name}</p>
                                                    <div className="flex flex-wrap gap-2 mb-1">
                                                        {p.dosage && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{p.dosage}</span>}
                                                        {p.frequency && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{p.frequency}</span>}
                                                        {p.duration && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{p.duration}</span>}
                                                    </div>
                                                    {p.notes && <p className="text-xs text-gray-500 mb-1">{p.notes}</p>}
                                                    <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={11} />{normalizeDate(p.prescribed_date)}</span>
                                                </div>
                                                {isDoctor && (
                                                    <button onClick={() => setDeleteModal({ open: true, type: 'prescriptions', id: p.id })} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all cursor-pointer">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </>
                    )}

                    {/* Documents */}
                    {activeTab === 'documents' && (
                        <>
                            <SectionHeader icon={<Paperclip size={18} />} title="Documents & Files" count={localRecord.documents.length} isDoctor={isDoctor} onAdd={() => setDocumentModal(true)} addLabel="Upload" />
                            {localRecord.documents.length === 0
                                ? <p className="text-sm text-gray-400 text-center py-8">No documents uploaded yet.</p>
                                : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {localRecord.documents.map(d => (
                                            <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                                    {d.file_type === 'image'
                                                        ? <Eye size={18} className="text-violet-600" />
                                                        : <FileText size={18} className="text-violet-600" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{d.file_name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <DocTypeBadge type={d.document_type} />
                                                        {d.file_size && <span className="text-xs text-gray-400">{formatFileSize(d.file_size)}</span>}
                                                    </div>
                                                    {d.description && <p className="text-xs text-gray-500 truncate mt-0.5">{d.description}</p>}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <a href={d.file_url} target="_blank" rel="noopener noreferrer" download className="p-1.5 text-gray-400 hover:text-[#1C398E] transition-colors">
                                                        <Download size={15} />
                                                    </a>
                                                    {isDoctor && (
                                                        <button onClick={() => setDeleteModal({ open: true, type: 'documents', id: d.id })} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all cursor-pointer">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddTreatmentModal isOpen={treatmentModal} onClose={() => setTreatmentModal(false)} recordId={localRecord.id}
                onSave={t => setLocalRecord(prev => ({ ...prev, treatments: [t, ...prev.treatments] }))} />
            <AddPrescriptionModal isOpen={prescriptionModal} onClose={() => setPrescriptionModal(false)} recordId={localRecord.id}
                onSave={p => setLocalRecord(prev => ({ ...prev, prescriptions: [p, ...prev.prescriptions] }))} />
            <UploadDocumentModal isOpen={documentModal} onClose={() => setDocumentModal(false)} recordId={localRecord.id}
                onSave={d => setLocalRecord(prev => ({ ...prev, documents: [d, ...prev.documents] }))} />
            <DeleteConfirmModal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, type: null, id: null })} onConfirm={handleDelete} />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Records List View
// ─────────────────────────────────────────────────────────────
const RecordsList = ({ records, isDoctor, onSelect, onNewRecord }) => {
    const [search, setSearch] = useState('');

    const filtered = records.filter(r => {
        const name = isDoctor ? r.patient_name : r.doctor_name;
        return name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="space-y-5">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Medical Records</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{isDoctor ? `${records.length} patient records` : `Records from ${records.length} doctor${records.length !== 1 ? 's' : ''}`}</p>
                </div>
                {isDoctor && (
                    <button onClick={onNewRecord} className="flex items-center gap-2 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-blue-800 transition-colors shadow-sm cursor-pointer">
                        <Plus size={16} /> New Record
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute  left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={isDoctor ? 'Search by patient name...' : 'Search by doctor name...'}
                    className="width-[600px] pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
            </div>

            {/* Cards */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Stethoscope size={48} className="mb-3 opacity-20" />
                    <p className="font-medium text-gray-500">No records found</p>
                    {isDoctor && !search && <p className="text-sm mt-1">Create a record for one of your patients.</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(record => {
                        const name = isDoctor ? record.patient_name : `Dr. ${record.doctor_name}`;
                        const [firstName, ...rest] = name.split(' ');
                        const lastName = rest.join(' ');
                        return (
                            <div
                                key={record.id}
                                onClick={() => onSelect(record)}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                            >
                                <div className="flex items-start gap-3 mb-4">
                                    <Avatar src={isDoctor ? record.patient_picture : null} firstName={firstName} lastName={lastName} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">{name}</p>
                                        {!isDoctor && record.doctor_specialty && <p className="text-xs text-gray-400">{record.doctor_specialty}</p>}
                                        {record.blood_type && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{record.blood_type}</span>
                                        )}
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-[#1C398E] transition-colors flex-shrink-0 mt-1" />
                                </div>

                                {/* Quick stats */}
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-gray-800">{record.treatments.length}</p>
                                        <p className="text-xs text-gray-400">Treatments</p>
                                    </div>
                                    <div className="text-center border-x border-gray-100">
                                        <p className="text-lg font-bold text-gray-800">{record.prescriptions.length}</p>
                                        <p className="text-xs text-gray-400">Prescriptions</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-gray-800">{record.documents.length}</p>
                                        <p className="text-xs text-gray-400">Documents</p>
                                    </div>
                                </div>

                                {/* Allergies warning */}
                                {record.allergies && (
                                    <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                        <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
                                        <p className="text-xs text-amber-700 truncate">{record.allergies}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
const MedicalRecords = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newRecordModal, setNewRecordModal] = useState(false);

    useEffect(() => {
        axios.get('http://localhost:8000/me', { headers: getHeaders() })
            .then(res => setCurrentUser(res.data))
            .catch(() => {});
    }, []);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/medical-records', { headers: getHeaders() });
            setRecords(res.data);
        } catch (err) {
            console.error('Failed to fetch records:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const isDoctor = currentUser?.role === 'doctor';
    const Layout = isDoctor ? DashboardLayout : PatientLayout;

    const handleRecordUpdate = (updated) => {
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    };

    return (
        <Layout>
            <NewRecordModal
                isOpen={newRecordModal}
                onClose={() => setNewRecordModal(false)}
                onSave={(r) => { setRecords(prev => [r, ...prev]); setSelectedRecord(r); }}
            />

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 size={32} className="animate-spin text-[#1C398E]" />
                </div>
            ) : selectedRecord ? (
                <RecordDetail
                    record={selectedRecord}
                    isDoctor={isDoctor}
                    onBack={() => setSelectedRecord(null)}
                    onRecordUpdate={handleRecordUpdate}
                />
            ) : (
                <RecordsList
                    records={records}
                    isDoctor={isDoctor}
                    onSelect={setSelectedRecord}
                    onNewRecord={() => setNewRecordModal(true)}
                />
            )}
        </Layout>
    );
};

export default MedicalRecords;