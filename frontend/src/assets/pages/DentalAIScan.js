import React, { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Upload, X, Scan, AlertTriangle, CheckCircle, Info, Sparkles, Camera, ZoomIn } from 'lucide-react';

// ── Mock AI Results ───────────────────────────────────────────
const MOCK_RESULTS = [
    {
        id: 1,
        condition: 'Tartru dentar',
        severity: 'moderate',
        confidence: 87,
        description: 'Depuneri mineralizate detectate în zona incisivilor inferiori. Se recomandă detartraj profesional.',
        tooth: 'Incisivi inferiori (31, 32, 41, 42)',
        icon: '🦷',
    },
    {
        id: 2,
        condition: 'Retracție gingivală ușoară',
        severity: 'mild',
        confidence: 72,
        description: 'Linia gingiei pare ușor retrasă în zona caninilor. Monitorizare periodică recomandată.',
        tooth: 'Canini superiori (13, 23)',
        icon: '🔍',
    },
    {
        id: 3,
        condition: 'Igiena orală generală',
        severity: 'good',
        confidence: 94,
        description: 'Nu s-au detectat carii vizibile sau alte afecțiuni majore în zonele analizate.',
        tooth: 'General',
        icon: '✅',
    },
];

const SEVERITY_CONFIG = {
    good:     { label: 'Sănătos',   color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', dot: '#10b981' },
    mild:     { label: 'Ușor',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)', dot: '#f59e0b' },
    moderate: { label: 'Moderat',   color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',  dot: '#ef4444' },
    severe:   { label: 'Sever',     color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)', dot: '#7c3aed' },
};

// ── Scan Animation ────────────────────────────────────────────
const ScanOverlay = ({ active }) => {
    if (!active) return null;
    return (
        <div style={{
            position: 'absolute', inset: 0, borderRadius: '16px', overflow: 'hidden',
            background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}>
            {/* Scan line */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: '2px',
                background: 'linear-gradient(90deg, transparent, #00e5ff, #00e5ff, transparent)',
                animation: 'scanLine 2s ease-in-out infinite',
                boxShadow: '0 0 12px 3px rgba(0,229,255,0.6)',
            }} />
            {/* Corner brackets */}
            {[['top:12px;left:12px', 'top left'], ['top:12px;right:12px', 'top right'], ['bottom:12px;left:12px', 'bottom left'], ['bottom:12px;right:12px', 'bottom right']].map(([pos], i) => (
                <div key={i} style={{
                    position: 'absolute',
                    ...(pos.includes('top:') ? { top: 12 } : { bottom: 12 }),
                    ...(pos.includes('left:') ? { left: 12 } : { right: 12 }),
                    width: 28, height: 28,
                    borderTop: pos.includes('top') ? '2px solid #00e5ff' : 'none',
                    borderBottom: pos.includes('bottom') ? '2px solid #00e5ff' : 'none',
                    borderLeft: pos.includes('left:') ? '2px solid #00e5ff' : 'none',
                    borderRight: pos.includes('right') ? '2px solid #00e5ff' : 'none',
                }} />
            ))}
            <div style={{ color: '#00e5ff', fontSize: '13px', fontFamily: 'monospace', letterSpacing: '0.15em', marginTop: 12, textShadow: '0 0 8px #00e5ff' }}>
                SE ANALIZEAZĂ...
            </div>
        </div>
    );
};

// ── Result Card ───────────────────────────────────────────────
const ResultCard = ({ result, delay }) => {
    const cfg = SEVERITY_CONFIG[result.severity];
    return (
        <div style={{
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: '16px', padding: '18px 20px',
            animation: `fadeSlideUp 0.5s ease both`,
            animationDelay: `${delay}ms`,
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{result.icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a2e', fontFamily: "'Outfit', sans-serif" }}>
                            {result.condition}
                        </span>
                        <span style={{
                            fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                            borderRadius: 999, color: cfg.color,
                            background: `${cfg.color}18`, border: `1px solid ${cfg.border}`,
                            letterSpacing: '0.05em',
                        }}>
                            {cfg.label}
                        </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5, marginBottom: 8 }}>
                        {result.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                            📍 {result.tooth}
                        </span>
                        {/* Confidence bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '11px', color: '#aaa' }}>Certitudine</span>
                            <div style={{ width: 60, height: 5, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: `${result.confidence}%`, height: '100%', background: cfg.color, borderRadius: 999 }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color }}>{result.confidence}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────
const DentalAIScan = ({ onBack }) => {
    const [dragOver, setDragOver] = useState(false);
    const [image, setImage]       = useState(null);
    const [scanning, setScanning] = useState(false);
    const [results, setResults]   = useState(null);
    const [zoomed, setZoomed]     = useState(false);
    const inputRef = useRef();

    const handleFile = useCallback((file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        setImage(url);
        setResults(null);
    }, []);

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleAnalyze = () => {
        if (!image) return;
        setScanning(true);
        setResults(null);
        setTimeout(() => {
            setScanning(false);
            setResults(MOCK_RESULTS);
        }, 3200);
    };

    const handleReset = () => { setImage(null); setResults(null); setScanning(false); };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0fdf4 100%)', fontFamily: "'Outfit', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                @keyframes scanLine {
                    0%   { top: 10%; }
                    50%  { top: 85%; }
                    100% { top: 10%; }
                }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse-ring {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(28,57,142,0.25); }
                    50%       { box-shadow: 0 0 0 10px rgba(28,57,142,0); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .upload-zone:hover { border-color: #1C398E !important; background: rgba(28,57,142,0.04) !important; }
                .scan-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(28,57,142,0.35) !important; }
                .scan-btn:active:not(:disabled) { transform: translateY(0); }
            `}</style>

            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid #e9ecf0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <button onClick={onBack || (() => window.history.back())}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', color: '#374151', fontSize: 13, fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s' }}>
                    <ArrowLeft size={14} /> Înapoi
                </button>
                <div style={{ width: 1, height: 28, background: '#e9ecf0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #1C398E, #3b6fd4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Scan size={16} color="white" />
                    </div>
                    <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>Analiză Dentară AI</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1, marginTop: 2 }}>Diagnostic vizual asistat de inteligență artificială</p>
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '5px 12px' }}>
                    <AlertTriangle size={12} color="#d97706" />
                    <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Nu înlocuiește consultul medical</span>
                </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>

                {/* Hero heading */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(28,57,142,0.07)', border: '1px solid rgba(28,57,142,0.15)', borderRadius: 999, padding: '5px 14px', marginBottom: 16 }}>
                        <Sparkles size={13} color="#1C398E" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1C398E', letterSpacing: '0.06em' }}>POWERED BY AI</span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.15, margin: 0, marginBottom: 10 }}>
                        Încarcă o fotografie cu <br />
                        <span style={{ background: 'linear-gradient(90deg, #1C398E, #3b82f6, #1C398E)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite' }}>
                            dinții tăi
                        </span>
                    </h1>
                    <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
                        AI-ul nostru analizează imaginea și detectează posibile afecțiuni dentare în câteva secunde.
                    </p>
                </div>

                {/* Main grid */}
                <div style={{ display: 'grid', gridTemplateColumns: results ? '1fr 1fr' : '1fr', gap: 24, transition: 'all 0.4s' }}>

                    {/* Left — Upload + Preview */}
                    <div>
                        {!image ? (
                            /* Drop zone */
                            <div className="upload-zone"
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragOver ? '#1C398E' : '#d1d5db'}`,
                                    borderRadius: 20, background: dragOver ? 'rgba(28,57,142,0.04)' : 'white',
                                    padding: '60px 32px', textAlign: 'center', cursor: 'pointer',
                                    transition: 'all 0.2s', boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                                }}>
                                <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => handleFile(e.target.files[0])} />
                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(28,57,142,0.1), rgba(59,130,246,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'pulse-ring 2.5s ease infinite' }}>
                                    <Upload size={28} color="#1C398E" />
                                </div>
                                <p style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>Trage imaginea aici</p>
                                <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>sau apasă pentru a selecta fișierul</p>
                                <div style={{ display: 'inline-flex', gap: 8 }}>
                                    {['JPG', 'PNG', 'WEBP', 'HEIC'].map(fmt => (
                                        <span key={fmt} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px' }}>{fmt}</span>
                                    ))}
                                </div>
                                <div style={{ marginTop: 28, padding: '14px 20px', background: 'linear-gradient(135deg, #f0f4ff, #eff6ff)', borderRadius: 14, textAlign: 'left', border: '1px solid rgba(28,57,142,0.1)' }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1C398E', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Camera size={13} /> Sfaturi pentru o fotografie bună
                                    </p>
                                    {['Fotografie frontală cu gura deschisă', 'Lumină naturală sau lumină bună artificială', 'Imagine clară, fără blur', 'Includeți cât mai mulți dinți vizibili'].map((tip, i) => (
                                        <p key={i} style={{ fontSize: 11, color: '#4b5563', margin: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: '#1C398E', fontWeight: 700 }}>·</span> {tip}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Image preview */
                            <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', border: '1px solid #e9ecf0' }}>
                                <div style={{ position: 'relative' }}>
                                    <img src={image} alt="Preview" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                                        onClick={() => setZoomed(true)} />
                                    <ScanOverlay active={scanning} />
                                    {/* Remove btn */}
                                    {!scanning && (
                                        <button onClick={handleReset}
                                            style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                            <X size={15} color="white" />
                                        </button>
                                    )}
                                    {/* Zoom hint */}
                                    {!scanning && (
                                        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '4px 10px', backdropFilter: 'blur(4px)' }}>
                                            <ZoomIn size={11} color="white" />
                                            <span style={{ fontSize: 11, color: 'white' }}>Click pentru mărire</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '16px 20px' }}>
                                    {!results && !scanning && (
                                        <button className="scan-btn" onClick={handleAnalyze}
                                            style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg, #1C398E, #2d5be3)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(28,57,142,0.3)' }}>
                                            <Scan size={17} />
                                            Analizează imaginea cu AI
                                        </button>
                                    )}
                                    {scanning && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 0' }}>
                                            <div style={{ width: 20, height: 20, border: '2.5px solid #1C398E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                                            <span style={{ fontSize: 14, color: '#1C398E', fontWeight: 600 }}>Analiza în curs...</span>
                                        </div>
                                    )}
                                    {results && !scanning && (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={handleReset} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                Imagine nouă
                                            </button>
                                            <button onClick={handleAnalyze} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(28,57,142,0.08)', border: '1px solid rgba(28,57,142,0.2)', color: '#1C398E', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                Re-analizează
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle size={18} color="white" />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Rezultate analiză</p>
                                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{results.length} observații identificate</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {results.map((r, i) => <ResultCard key={r.id} result={r} delay={i * 120} />)}
                                </div>

                                {/* Disclaimer */}
                                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <Info size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <p style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5, margin: 0 }}>
                                        <strong>Atenție:</strong> Acest diagnostic este orientativ și nu înlocuiește consultul unui medic stomatolog. Programează o consultație pentru evaluare profesională.
                                    </p>
                                </div>

                                {/* CTA */}
                                <button style={{ width: '100%', marginTop: 14, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #1C398E, #2d5be3)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}>
                                    Programează consultație 📅
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* How it works */}
                {!image && (
                    <div style={{ marginTop: 40 }}>
                        <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>Cum funcționează</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            {[
                                { step: '01', title: 'Încarci fotografia', desc: 'O imagine clară cu dinții tăi, din față.', icon: '📸' },
                                { step: '02', title: 'AI analizează', desc: 'Modelul detectează afecțiuni în câteva secunde.', icon: '🤖' },
                                { step: '03', title: 'Primești raportul', desc: 'Rezultate detaliate și recomandări.', icon: '📋' },
                            ].map(s => (
                                <div key={s.step} style={{ background: 'white', borderRadius: 16, padding: '20px', textAlign: 'center', border: '1px solid #e9ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <span style={{ fontSize: 28 }}>{s.icon}</span>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#1C398E', letterSpacing: '0.15em', margin: '10px 0 4px', opacity: 0.5 }}>PASUL {s.step}</div>
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
                <div onClick={() => setZoomed(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 20 }}>
                    <img src={image} alt="Zoom" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16, objectFit: 'contain' }} />
                </div>
            )}
        </div>
    );
};

export default DentalAIScan;