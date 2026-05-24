import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
    Upload, X, Trash2, ZoomIn, Eye, EyeOff,
    Calendar, Hash, FileImage, Plus, Loader2, AlertCircle
} from 'lucide-react';

const API     = 'http://localhost:8000';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

const XRAY_TYPES = [
    { value: 'panoramic',     label: 'Panoramică'    },
    { value: 'periapical',    label: 'Periapicală'   },
    { value: 'bitewing',      label: 'Bitewing'      },
    { value: 'occlusal',      label: 'Ocluzală'      },
    { value: 'cephalometric', label: 'Cefalometrică' },
    { value: 'cbct',          label: 'CBCT / CT'     },
    { value: 'other',         label: 'Altă'          },
];

const TYPE_CONFIG = {
    panoramic:     { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    periapical:    { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    bitewing:      { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    occlusal:      { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
    cephalometric: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    cbct:          { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    other:         { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ro-RO', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ── Upload Modal ──────────────────────────────────────────────
const UploadXRayModal = ({ isOpen, onClose, recordId, onSave }) => {
    const [file, setFile]         = useState(null);
    const [preview, setPreview]   = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading]   = useState(false);
    const [form, setForm]         = useState({
        xray_type:    'panoramic',
        tooth_number: '',
        title:        '',
        notes:        '',
        taken_date:   '',
    });
    const fileRef = useRef();

    if (!isOpen) return null;

    const handleFile = (f) => {
        if (!f || !f.type.startsWith('image/')) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
        if (!form.title) setForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('file',         file);
        fd.append('xray_type',    form.xray_type);
        fd.append('title',        form.title);
        fd.append('notes',        form.notes);
        if (form.tooth_number) fd.append('tooth_number', form.tooth_number);
        if (form.taken_date)   fd.append('taken_date',   form.taken_date);
        try {
            const res = await axios.post(
                `${API}/medical-records/${recordId}/xrays`,
                fd,
                { headers: getHeaders() }
            );
            onSave(res.data);
            onClose();
            setFile(null); setPreview(null);
            setForm({ xray_type: 'panoramic', tooth_number: '', title: '', notes: '', taken_date: '' });
        } catch (err) {
            alert(err.response?.data?.detail || 'Upload failed.');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = {
        width: '100%', padding: '8px 12px', fontSize: 13,
        border: '1px solid #e5e7eb', borderRadius: 10,
        outline: 'none', fontFamily: 'inherit',
        background: 'white', color: '#1a1a2e',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white', borderRadius: 24, width: '100%', maxWidth: 560,
                    maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
                    animation: 'slideUp 0.25s ease',
                }}
                onClick={e => e.stopPropagation()}
            >
                <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #1C398E, #3b6fd4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileImage size={16} color="white" />
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Upload X-Ray</span>
                    </div>
                    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <X size={15} />
                    </button>
                </div>

                <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Drop zone / Preview */}
                    {!preview ? (
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragOver ? '#1C398E' : '#d1d5db'}`,
                                borderRadius: 16, padding: '36px 24px', textAlign: 'center',
                                cursor: 'pointer', transition: 'all 0.2s',
                                background: dragOver ? 'rgba(28,57,142,0.04)' : '#fafafa',
                            }}
                        >
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(28,57,142,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <Upload size={22} color="#1C398E" />
                            </div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', margin: '0 0 4px' }}>Drag X-Ray image here</p>
                            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>JPG, PNG, WEBP — max 15MB</p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                            <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                            <button
                                onClick={() => { setFile(null); setPreview(null); }}
                                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={13} color="white" />
                            </button>
                            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '4px 10px' }}>
                                <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>{file?.name} · {formatSize(file?.size)}</span>
                            </div>
                        </div>
                    )}

                    {/* Tip radiografie */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Tip radiografie <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {XRAY_TYPES.map(t => {
                                const cfg     = TYPE_CONFIG[t.value];
                                const selected = form.xray_type === t.value;
                                return (
                                    <button
                                        key={t.value}
                                        onClick={() => setForm(f => ({ ...f, xray_type: t.value }))}
                                        style={{
                                            padding: '7px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                                            border: `1.5px solid ${selected ? cfg.color : '#e5e7eb'}`,
                                            background: selected ? cfg.bg : 'white',
                                            color: selected ? cfg.color : '#6b7280',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title + tooth */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Titlu</label>
                            <input
                                type="text" value={form.title} placeholder="ex: Radiografie panoramică 2026"
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                style={inputCls}
                            />
                        </div>
                        <div style={{ width: 110 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Dinte nr.</label>
                            <input
                                type="text" value={form.tooth_number} placeholder="ex: 16, 21"
                                onChange={e => setForm(f => ({ ...f, tooth_number: e.target.value }))}
                                style={inputCls}
                            />
                        </div>
                    </div>

                    {/* Date + notes */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Data realizării</label>
                            <input
                                type="date" value={form.taken_date}
                                onChange={e => setForm(f => ({ ...f, taken_date: e.target.value }))}
                                style={inputCls}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Note</label>
                            <input
                                type="text" value={form.notes} placeholder="Observații..."
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                style={inputCls}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                        <button
                            onClick={onClose}
                            style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            Anulează
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!file || loading}
                            style={{
                                flex: 2, padding: '11px', borderRadius: 12, border: 'none',
                                background: file ? 'linear-gradient(135deg, #1C398E, #2d5be3)' : '#e5e7eb',
                                color: file ? 'white' : '#9ca3af',
                                fontSize: 13, fontWeight: 700, cursor: file ? 'pointer' : 'not-allowed',
                                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                boxShadow: file ? '0 4px 14px rgba(28,57,142,0.3)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
                            {loading ? 'Se încarcă...' : 'Salvează X-Ray'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Lightbox ──────────────────────────────────────────────────
const Lightbox = ({ src, onClose }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
    >
        <button
            onClick={onClose}
            style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
        >
            <X size={20} />
        </button>
        <img
            src={src}
            alt="X-Ray"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}
        />
    </div>
);

// ── XRay Card ─────────────────────────────────────────────────
const XRayCard = ({ xray, isDoctor, onDelete }) => {
    const [showImage, setShowImage]  = useState(false);
    const [lightbox,  setLightbox]   = useState(false);
    const cfg = TYPE_CONFIG[xray.xray_type] || TYPE_CONFIG.other;
    const typeLabel = XRAY_TYPES.find(t => t.value === xray.xray_type)?.label || 'Altă';

    return (
        <>
            {lightbox && <Lightbox src={`${API}/${xray.file_path}`} onClose={() => setLightbox(false)} />}

            <div style={{
                background: 'white', borderRadius: 16,
                border: '1px solid #f0f4f8', overflow: 'hidden',
                transition: 'all 0.2s',
            }}>
                {/* Image area */}
                <div style={{ position: 'relative', background: '#0f172a', minHeight: 160, overflow: 'hidden' }}>
                    {showImage ? (
                        <>
                            <img
                                src={`${API}/${xray.file_path}`}
                                alt={xray.title || 'X-Ray'}
                                style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', cursor: 'zoom-in', filter: 'grayscale(20%)' }}
                                onClick={() => setLightbox(true)}
                            />
                            <button
                                onClick={() => setShowImage(false)}
                                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Ascunde imagine"
                            >
                                <EyeOff size={13} color="white" />
                            </button>
                            <button
                                onClick={() => setLightbox(true)}
                                style={{ position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Mărește"
                            >
                                <ZoomIn size={13} color="white" />
                            </button>
                        </>
                    ) : (
                        <div
                            style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}
                            onClick={() => setShowImage(true)}
                        >
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Eye size={20} color="rgba(255,255,255,0.5)" />
                            </div>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, fontWeight: 500 }}>
                                Apasă pentru a vedea radiografia
                            </p>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3, marginBottom: 4 }}>
                                {xray.title || 'X-Ray fără titlu'}
                            </p>
                            <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                                letterSpacing: '0.05em',
                            }}>
                                {typeLabel.toUpperCase()}
                            </span>
                        </div>
                        {isDoctor && (
                            <button
                                onClick={() => onDelete(xray.id)}
                                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8 }}
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {xray.tooth_number && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Hash size={12} color="#9ca3af" />
                                <span style={{ fontSize: 12, color: '#374151' }}>Dinte {xray.tooth_number}</span>
                            </div>
                        )}
                        {xray.taken_date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={12} color="#9ca3af" />
                                <span style={{ fontSize: 12, color: '#374151' }}>{formatDate(xray.taken_date)}</span>
                            </div>
                        )}
                        {xray.notes && (
                            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                                {xray.notes}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

// ── XRayTab (drop-in în RecordDetail) ────────────────────────
const XRayTab = ({ recordId, initialXrays = [], isDoctor }) => {
    const [xrays,      setXrays]      = useState(initialXrays);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [deleting,   setDeleting]   = useState(null);

    const handleSave = (newXray) => {
        setXrays(prev => [newXray, ...prev]);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Ștergi această radiografie? Acțiunea nu poate fi anulată.')) return;
        setDeleting(id);
        try {
            await axios.delete(`${API}/medical-records/xrays/${id}`, { headers: getHeaders() });
            setXrays(prev => prev.filter(x => x.id !== id));
        } catch {
            alert('Eroare la ștergere.');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <>
            <UploadXRayModal
                isOpen={uploadOpen}
                onClose={() => setUploadOpen(false)}
                recordId={recordId}
                onSave={handleSave}
            />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileImage size={18} color="#1C398E" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Radiografii</span>
                    {xrays.length > 0 && (
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#eff6ff', color: '#1C398E', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {xrays.length}
                        </span>
                    )}
                </div>
                {isDoctor && (
                    <button
                        onClick={() => setUploadOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 12,
                            background: 'linear-gradient(135deg, #1C398E, #2d5be3)',
                            border: 'none', color: 'white', fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: '0 3px 10px rgba(28,57,142,0.25)',
                        }}
                    >
                        <Plus size={14} /> Adaugă radiografie
                    </button>
                )}
            </div>

            {/* Grid */}
            {xrays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9ca3af' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <FileImage size={28} color="#cbd5e1" />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b', margin: 0 }}>
                        Nicio radiografie adăugată
                    </p>
                    {isDoctor && (
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>
                            Apasă „Adaugă radiografie" pentru a încărca prima.
                        </p>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 14,
                }}>
                    {xrays.map(x => (
                        <div key={x.id} style={{ opacity: deleting === x.id ? 0.4 : 1, pointerEvents: deleting === x.id ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                            <XRayCard xray={x} isDoctor={isDoctor} onDelete={handleDelete} />
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default XRayTab;