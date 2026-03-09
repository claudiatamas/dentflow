import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Upload, X, Scan, AlertTriangle, CheckCircle, Info, Sparkles, Camera, ZoomIn, Loader2, RefreshCw, Layers } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000';

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
});

// ── Severity config ───────────────────────────────────────────
const SEVERITY_CONFIG = {
    good:     { label: 'Healthy',  color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
    mild:     { label: 'Mild',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
    moderate: { label: 'Moderate', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'  },
    severe:   { label: 'Severe',   color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
};

// ── Model short labels ────────────────────────────────────────
const MODEL_SHORT = {
    'MobileNetV2': 'MobileNet',
    'ResNet50':    'ResNet',
    'CustomCNN':   'CNN',
};

// ── Scan line overlay ─────────────────────────────────────────
const ScanOverlay = ({ active }) => {
    if (!active) return null;
    return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '16px', overflow: 'hidden', background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #00e5ff, #00e5ff, transparent)', animation: 'scanLine 2s ease-in-out infinite', boxShadow: '0 0 12px 3px rgba(0,229,255,0.6)' }} />
            {['tl','tr','bl','br'].map((pos) => (
                <div key={pos} style={{
                    position: 'absolute',
                    ...(pos.includes('t') ? { top: 12 } : { bottom: 12 }),
                    ...(pos.includes('l') ? { left: 12 } : { right: 12 }),
                    width: 28, height: 28,
                    borderTop:    pos.includes('t') ? '2px solid #00e5ff' : 'none',
                    borderBottom: pos.includes('b') ? '2px solid #00e5ff' : 'none',
                    borderLeft:   pos.includes('l') ? '2px solid #00e5ff' : 'none',
                    borderRight:  pos.includes('r') ? '2px solid #00e5ff' : 'none',
                }} />
            ))}
            <div style={{ color: '#00e5ff', fontSize: '13px', fontFamily: 'monospace', letterSpacing: '0.15em', marginTop: 12, textShadow: '0 0 8px #00e5ff' }}>
                ANALYZING...
            </div>
        </div>
    );
};

// ── Result Card ───────────────────────────────────────────────
const ResultCard = ({ result, delay }) => {
    const cfg = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.mild;
    const hasModels = result.detected_by && result.detected_by.length > 0;

    return (
        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '16px', padding: '18px 20px', animation: 'fadeSlideUp 0.5s ease both', animationDelay: `${delay}ms` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{result.icon}</span>
                <div style={{ flex: 1 }}>
                    {/* Title + severity badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a2e', fontFamily: "'Outfit', sans-serif" }}>
                            {result.condition}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 999, color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.border}`, letterSpacing: '0.05em' }}>
                            {cfg.label}
                        </span>
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5, marginBottom: 8 }}>{result.description}</p>

                    {/* Avg confidence bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: hasModels ? 10 : 8 }}>
                        <span style={{ fontSize: '11px', color: '#aaa' }}>{hasModels ? 'Avg' : 'Confidence'}</span>
                        <div style={{ width: 70, height: 5, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${result.confidence}%`, height: '100%', background: cfg.color, borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color }}>{result.confidence}%</span>
                    </div>

                    {/* Per-model pills — only present in ensemble mode */}
                    {hasModels && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                            {result.detected_by.map(m => {
                                const label = MODEL_SHORT[m.model] || m.model;
                                return (
                                    <div key={m.model} style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '4px 10px', borderRadius: 8,
                                        background: m.detected ? `${cfg.color}15` : 'rgba(156,163,175,0.1)',
                                        border: `1px solid ${m.detected ? cfg.border : 'rgba(156,163,175,0.25)'}`,
                                    }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: m.detected ? cfg.color : '#9ca3af', letterSpacing: '0.04em' }}>
                                            {label}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: m.detected ? cfg.color : '#9ca3af' }}>
                                            {m.confidence}%
                                        </span>
                                        <span style={{ fontSize: '10px', color: m.detected ? cfg.color : '#d1d5db' }}>
                                            {m.detected ? '✓' : '–'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Recommendation */}
                    {result.recommendation && (
                        <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 12, flexShrink: 0 }}>💡</span>
                            <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.5, margin: 0 }}>{result.recommendation}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// ── WebcamModal ───────────────────────────────────────────────
const WebcamModal = ({ onCapture, onClose }) => {
    const videoRef   = useRef();
    const canvasRef  = useRef();
    const streamRef  = useRef();
    const [ready, setReady]     = useState(false);
    const [error, setError]     = useState(null);
    const [flash, setFlash]     = useState(false);

    useEffect(() => {
        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
                        setReady(true);
                    };
                }
            } catch (err) {
                setError('Could not access camera. Please allow camera permissions and try again.');
            }
        };
        start();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], `dental-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            onCapture(file);
        }, 'image/jpeg', 0.92);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={onClose}>
            <div style={{ background: '#0f172a', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 600, boxShadow: '0 25px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ready ? '#10b981' : '#f59e0b', boxShadow: ready ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: "'Outfit', sans-serif" }}>
                            {ready ? 'Camera ready' : error ? 'Camera error' : 'Starting camera...'}
                        </span>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
                    {error ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <AlertTriangle size={32} color="#ef4444" />
                            <p style={{ fontSize: 13, color: '#f87171', textAlign: 'center', maxWidth: 320, lineHeight: 1.5, margin: 0, fontFamily: "'Outfit', sans-serif" }}>{error}</p>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
                            {flash && <div style={{ position: 'absolute', inset: 0, background: 'white', opacity: 0.7, pointerEvents: 'none' }} />}
                            {ready && ['tl','tr','bl','br'].map(pos => (
                                <div key={pos} style={{
                                    position: 'absolute',
                                    ...(pos.includes('t') ? { top: 16 } : { bottom: 16 }),
                                    ...(pos.includes('l') ? { left: 16 } : { right: 16 }),
                                    width: 24, height: 24,
                                    borderTop:    pos.includes('t') ? '2.5px solid #00e5ff' : 'none',
                                    borderBottom: pos.includes('b') ? '2.5px solid #00e5ff' : 'none',
                                    borderLeft:   pos.includes('l') ? '2.5px solid #00e5ff' : 'none',
                                    borderRight:  pos.includes('r') ? '2.5px solid #00e5ff' : 'none',
                                    opacity: 0.8,
                                }} />
                            ))}
                            {ready && (
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 180, height: 220, border: '2px dashed rgba(0,229,255,0.4)', borderRadius: '50%', pointerEvents: 'none' }} />
                            )}
                            {ready && (
                                <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: '5px 14px', backdropFilter: 'blur(4px)' }}>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: "'Outfit', sans-serif" }}>
                                        Position your teeth inside the oval
                                    </span>
                                </div>
                            )}
                            {!ready && !error && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                                </div>
                            )}
                        </>
                    )}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#0f172a' }}>
                    <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancel
                    </button>
                    <button onClick={handleCapture} disabled={!ready}
                        style={{ padding: '10px 32px', borderRadius: 12, background: ready ? 'linear-gradient(135deg, #1C398E, #2d5be3)' : 'rgba(255,255,255,0.1)', border: 'none', color: ready ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, boxShadow: ready ? '0 4px 16px rgba(28,57,142,0.4)' : 'none', transition: 'all 0.2s' }}>
                        <Camera size={15} /> Capture photo
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main ──────────────────────────────────────────────────────
const DentalAIScan = ({ onBack }) => {
    const [dragOver, setDragOver]     = useState(false);
    const [image, setImage]           = useState(null);
    const [imageFile, setImageFile]   = useState(null);
    const [scanning, setScanning]     = useState(false);
    const [results, setResults]       = useState(null);
    const [error, setError]           = useState(null);
    const [zoomed, setZoomed]         = useState(false);
    const [modelUsed, setModelUsed]   = useState(null);
    const [useEnsemble, setUseEnsemble] = useState(false);
    const [webcamOpen, setWebcamOpen]   = useState(false);
    const inputRef  = useRef();
    const cameraRef = useRef();

    const handleFile = useCallback((file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setImage(URL.createObjectURL(file));
        setImageFile(file);
        setResults(null);
        setError(null);
        setModelUsed(null);
    }, []);

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleAnalyze = async () => {
        if (!imageFile) return;
        setScanning(true);
        setResults(null);
        setError(null);

        const formData = new FormData();
        formData.append('file', imageFile);

        const endpoint = useEnsemble ? '/ai/scan/ensemble' : '/ai/scan';

        try {
            const res = await axios.post(`${API}${endpoint}`, formData, {
                headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' },
            });
            setResults(res.data.results);
            setModelUsed(res.data.model_used);
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Analysis failed. Please try again.';
            setError(msg);
        } finally {
            setScanning(false);
        }
    };

    const handleCameraCapture = (file) => {
        setWebcamOpen(false);
        handleFile(file);
    };

    const handleReset = () => {
        setImage(null); setImageFile(null);
        setResults(null); setError(null);
        setScanning(false); setModelUsed(null);
    };

    return (
        <>{webcamOpen && <WebcamModal onCapture={handleCameraCapture} onClose={() => setWebcamOpen(false)} />}
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0fdf4 100%)', fontFamily: "'Outfit', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                @keyframes scanLine { 0% { top: 10%; } 50% { top: 85%; } 100% { top: 10%; } }
                @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse-ring { 0%, 100% { box-shadow: 0 0 0 0 rgba(28,57,142,0.25); } 50% { box-shadow: 0 0 0 10px rgba(28,57,142,0); } }
                @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .upload-zone:hover { border-color: #1C398E !important; background: rgba(28,57,142,0.04) !important; }
                .scan-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(28,57,142,0.35) !important; }
            `}</style>

            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid #e9ecf0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <button onClick={onBack || (() => window.history.back())}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', color: '#374151', fontSize: 13, fontFamily: 'inherit', fontWeight: 500 }}>
                    <ArrowLeft size={14} /> Back
                </button>
                <div style={{ width: 1, height: 28, background: '#e9ecf0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #1C398E, #3b6fd4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Scan size={16} color="white" />
                    </div>
                    <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>AI Dental Scan</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1, marginTop: 2 }}>AI-assisted visual dental diagnostic</p>
                    </div>
                </div>

                {/* Ensemble toggle */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 14px' }}>
                        <Layers size={13} color="#6b7280" />
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Ensemble</span>
                        <div onClick={() => setUseEnsemble(v => !v)}
                            style={{ width: 36, height: 20, borderRadius: 999, background: useEnsemble ? '#1C398E' : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <div style={{ position: 'absolute', top: 2, left: useEnsemble ? 18 : 2, width: 16, height: 16, background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '5px 12px' }}>
                        <AlertTriangle size={12} color="#d97706" />
                        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Does not replace medical consultation</span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>

                {/* Heading */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(28,57,142,0.07)', border: '1px solid rgba(28,57,142,0.15)', borderRadius: 999, padding: '5px 14px', marginBottom: 16 }}>
                        <Sparkles size={13} color="#1C398E" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1C398E', letterSpacing: '0.06em' }}>
                            {useEnsemble ? 'ENSEMBLE MODE — 3 MODELS' : 'POWERED BY MOBILENETV2'}
                        </span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.15, margin: 0, marginBottom: 10 }}>
                        Upload a photo of <br />
                        <span style={{ background: 'linear-gradient(90deg, #1C398E, #3b82f6, #1C398E)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite' }}>
                            your teeth
                        </span>
                    </h1>
                    <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
                        Our AI detects {' '}
                        <strong style={{ color: '#1C398E' }}>Calculus, Caries, Gingivitis, Hypodontia, Mouth Ulcers</strong>
                        {' '} and <strong style={{ color: '#1C398E' }}>Tooth Discoloration</strong>.
                    </p>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: results ? '1fr 1fr' : '1fr', gap: 24 }}>

                    {/* Left — Upload / Preview */}
                    <div>
                        {!image ? (
                            <div className="upload-zone"
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                                style={{ border: `2px dashed ${dragOver ? '#1C398E' : '#d1d5db'}`, borderRadius: 20, background: dragOver ? 'rgba(28,57,142,0.04)' : 'white', padding: '60px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
                                <input ref={inputRef}  type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(28,57,142,0.1), rgba(59,130,246,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'pulse-ring 2.5s ease infinite' }}>
                                    <Upload size={28} color="#1C398E" />
                                </div>
                                <p style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>Drag your image here</p>
                                <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>or click to select a file</p>
                                <div style={{ display: 'inline-flex', gap: 8, marginBottom: 16 }}>
                                    {['JPG', 'PNG', 'WEBP', 'HEIC'].map(fmt => (
                                        <span key={fmt} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px' }}>{fmt}</span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => inputRef.current?.click()}
                                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, background: 'rgba(28,57,142,0.08)', border: '1.5px solid rgba(28,57,142,0.2)', color: '#1C398E', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                                    >
                                        <Upload size={14} /> Choose file
                                    </button>
                                    <button
                                        onClick={() => setWebcamOpen(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #1C398E, #2d5be3)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(28,57,142,0.3)', transition: 'all 0.15s' }}
                                    >
                                        <Camera size={14} /> Take photo
                                    </button>
                                </div>
                                <div style={{ marginTop: 28, padding: '14px 20px', background: 'linear-gradient(135deg, #f0f4ff, #eff6ff)', borderRadius: 14, textAlign: 'left', border: '1px solid rgba(28,57,142,0.1)' }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1C398E', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Camera size={13} /> Tips for a good photo
                                    </p>
                                    {['Front-facing photo with mouth open', 'Natural or good artificial lighting', 'Clear image, no blur', 'Include as many visible teeth as possible'].map((tip, i) => (
                                        <p key={i} style={{ fontSize: 11, color: '#4b5563', margin: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: '#1C398E', fontWeight: 700 }}>·</span> {tip}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', border: '1px solid #e9ecf0' }}>
                                <div style={{ position: 'relative' }}>
                                    <img src={image} alt="Preview" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} onClick={() => setZoomed(true)} />
                                    <ScanOverlay active={scanning} />
                                    {!scanning && (
                                        <button onClick={handleReset} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <X size={15} color="white" />
                                        </button>
                                    )}
                                    {!scanning && (
                                        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '4px 10px' }}>
                                            <ZoomIn size={11} color="white" />
                                            <span style={{ fontSize: 11, color: 'white' }}>Click to zoom</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '16px 20px' }}>
                                    {error && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 12 }}>
                                            <AlertTriangle size={14} color="#ef4444" />
                                            <span style={{ fontSize: 12, color: '#dc2626' }}>{error}</span>
                                        </div>
                                    )}
                                    {!results && !scanning && (
                                        <button className="scan-btn" onClick={handleAnalyze}
                                            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg, #1C398E, #2d5be3)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(28,57,142,0.3)' }}>
                                            <Scan size={17} />
                                            {useEnsemble ? 'Analyze with Ensemble (3 models)' : 'Analyze with AI'}
                                        </button>
                                    )}
                                    {scanning && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 0' }}>
                                            <div style={{ width: 20, height: 20, border: '2.5px solid #1C398E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                                            <span style={{ fontSize: 14, color: '#1C398E', fontWeight: 600 }}>
                                                {useEnsemble ? 'Running 3 models...' : 'Analysis in progress...'}
                                            </span>
                                        </div>
                                    )}
                                    {results && !scanning && (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={handleReset} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                New image
                                            </button>
                                            <button onClick={handleAnalyze} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(28,57,142,0.08)', border: '1px solid rgba(28,57,142,0.2)', color: '#1C398E', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                <RefreshCw size={13} /> Re-analyze
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right — Results */}
                    {results && (
                        <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
                            <div style={{ background: 'white', borderRadius: 20, padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e9ecf0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle size={18} color="white" />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Analysis Results</p>
                                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                                            {results.length === 1 && results[0].severity === 'good'
                                                ? 'No issues detected'
                                                : `${results.length} finding${results.length !== 1 ? 's' : ''} detected`}
                                        </p>
                                    </div>
                                </div>

                                {modelUsed && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(28,57,142,0.07)', border: '1px solid rgba(28,57,142,0.15)', borderRadius: 8, padding: '3px 10px', marginBottom: 16 }}>
                                        <Layers size={11} color="#1C398E" />
                                        <span style={{ fontSize: 11, color: '#1C398E', fontWeight: 600 }}>{modelUsed}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                                    {results.map((r, i) => <ResultCard key={i} result={r} delay={i * 120} />)}
                                </div>

                                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <Info size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <p style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5, margin: 0 }}>
                                        <strong>Notice:</strong> This analysis is indicative only and does not replace a consultation with a dentist. Please schedule an appointment for a professional evaluation.
                                    </p>
                                </div>

                                <button
                                    onClick={() => window.location.href = '/view_doctors'}
                                    style={{ width: '100%', marginTop: 14, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #1C398E, #2d5be3)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Book a consultation 📅
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* How it works */}
                {!image && (
                    <div style={{ marginTop: 40 }}>
                        <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>How it works</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            {[
                                { step: '01', title: 'Upload your photo', desc: 'A clear front-facing image of your teeth.', icon: '' },
                                { step: '02', title: 'AI analyzes', desc: 'MobileNetV2 detects conditions in seconds.', icon: '' },
                                { step: '03', title: 'Get your report', desc: 'Detailed results with recommendations.', icon: '' },
                            ].map(s => (
                                <div key={s.step} style={{ background: 'white', borderRadius: 16, padding: '20px', textAlign: 'center', border: '1px solid #e9ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <span style={{ fontSize: 28 }}>{s.icon}</span>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#1C398E', letterSpacing: '0.15em', margin: '10px 0 4px', opacity: 0.5 }}>STEP {s.step}</div>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>{s.title}</p>
                                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Zoom modal */}
            {zoomed && (
                <div onClick={() => setZoomed(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 20 }}>
                    <img src={image} alt="Zoom" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16, objectFit: 'contain' }} />
                </div>
            )}
        </div>
    </>
    );
};

export default DentalAIScan;