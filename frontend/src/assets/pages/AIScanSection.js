import React, { useState } from 'react';
import { X, Eye, EyeOff, Sparkles, ChevronRight, ChevronLeft, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const API = 'http://localhost:8000';

const getImageUrl = (path) => {
    if (!path) return '';
    return `${API}/${path}`;
};

const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ro-RO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const SEV = {
    severe:   { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Severe'   },
    moderate: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Moderate' },
    mild:     { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Mild'     },
    info:     { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Info'     },
    good:     { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', label: 'Not Found'  },
};

const getSeverityIcon = (severity) => {
    if (severity === 'severe')   return <AlertCircle size={10} />;
    if (severity === 'moderate') return <Activity size={10} />;
    if (severity === 'mild')     return <Clock size={10} />;
    return <CheckCircle size={10} />;
};

const MODEL_SHORT = { MobileNetV2: 'MobileNet', ResNet50: 'ResNet', CustomCNN: 'CNN' };

const CARDS_PER_PAGE = 4;

// ── Scan summary card ─────────────────────────────────────────
const ScanCard = ({ scan, onClick }) => {
    const hasConditions  = scan.results?.some(r => r.condition !== 'No Detected Conditions');
    const topResult      = scan.results?.[0];
    const cfg            = SEV[topResult?.severity] || SEV.info;
    const conditionCount = scan.results?.filter(r => r.condition !== 'No Detected Conditions').length || 0;

    return (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                border: '1px solid #f0f0f0',
                borderRadius: 18,
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = '#e0e7ff';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#f0f0f0';
            }}
        >
            {/* Accent stripe top */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: hasConditions
                    ? `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`
                    : 'linear-gradient(90deg, #059669, #34d399)',
                borderRadius: '18px 18px 0 0',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: hasConditions ? cfg.bg : '#f0fdf4',
                        border: `1px solid ${hasConditions ? cfg.border : '#bbf7d0'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                    }}>
                        {topResult?.icon || '🦷'}
                    </div>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: 0, lineHeight: 1.2 }}>
                            {hasConditions ? topResult?.condition : 'No Conditions Detected'}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, marginTop: 2 }}>
                            {formatDate(scan.created_at)}
                        </p>
                    </div>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
            </div>

            {/* Condition pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {!hasConditions ? (
                    <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                        background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        <CheckCircle size={10} /> Not Found
                    </span>
                ) : (
                    scan.results
                        ?.filter(r => r.condition !== 'No Detected Conditions')
                        .slice(0, 3)
                        .map((r, i) => {
                            const s = SEV[r.severity] || SEV.mild;
                            return (
                                <span key={i} style={{
                                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                                    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    {getSeverityIcon(r.severity)} {r.condition}
                                </span>
                            );
                        })
                )}
                {conditionCount > 3 && (
                    <span style={{ fontSize: 11, color: '#9ca3af', padding: '3px 8px' }}>
                        +{conditionCount - 3} more
                    </span>
                )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '2px 8px', borderRadius: 6,
                    background: scan.scan_mode === 'ensemble'
                        ? 'rgba(99,102,241,0.08)' : 'rgba(59,130,246,0.08)',
                    color: scan.scan_mode === 'ensemble' ? '#4f46e5' : '#2563eb',
                    border: scan.scan_mode === 'ensemble'
                        ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(59,130,246,0.2)',
                }}>
                    {scan.scan_mode === 'ensemble' ? 'ENSEMBLE' : 'STANDARD'}
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {conditionCount} finding{conditionCount !== 1 ? 's' : ''}
                </span>
            </div>
        </div>
    );
};

// ── Full Report Modal ─────────────────────────────────────────
const ScanReportModal = ({ scan, onClose }) => {
    const [showImage, setShowImage] = useState(false);

    if (!scan) return null;

    const hasConditions  = scan.results?.some(r => r.condition !== 'No Detected Conditions');
    const conditionCount = scan.results?.filter(r => r.condition !== 'No Detected Conditions').length || 0;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(15,23,42,0.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
                .report-scroll::-webkit-scrollbar { width: 4px; }
                .report-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
                .report-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
            `}</style>

            <div
                style={{
                    background: 'white', borderRadius: 24,
                    width: '100%', maxWidth: 620, maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                    animation: 'slideUp 0.3s ease',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: 'linear-gradient(135deg, #1C398E, #3b6fd4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Sparkles size={14} color="white" />
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                AI Scan Report
                            </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                            {formatDate(scan.created_at)}&nbsp;·&nbsp;
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{scan.model_used}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 10, border: '1px solid #e2e8f0',
                            background: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="report-scroll" style={{ overflowY: 'auto', flex: 1 }}>

                    {/* Summary banner */}
                    <div style={{
                        margin: '20px 24px 0',
                        padding: '16px 20px', borderRadius: 16,
                        background: hasConditions
                            ? 'linear-gradient(135deg, #fef2f2, #fff7ed)'
                            : 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                        border: `1px solid ${hasConditions ? '#fecaca' : '#bbf7d0'}`,
                        display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                            background: hasConditions ? '#fef2f2' : '#f0fdf4',
                            border: `1px solid ${hasConditions ? '#fca5a5' : '#86efac'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                        }}>
                            {hasConditions ? '⚠️' : '✅'}
                        </div>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                {hasConditions
                                    ? `${conditionCount} condition${conditionCount !== 1 ? 's' : ''} detected`
                                    : 'No conditions detected'}
                            </p>
                            <p style={{ fontSize: 12, color: '#64748b', margin: 0, marginTop: 2 }}>
                                {hasConditions
                                    ? 'Please review the findings below and consider scheduling a consultation.'
                                    : 'The AI analysis did not detect any supported dental conditions.'}
                            </p>
                        </div>
                    </div>

                    {/* Image */}
                    <div style={{ margin: '16px 24px 0' }}>
                        {!showImage ? (
                            <button
                                onClick={() => setShowImage(true)}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: 14,
                                    border: '1.5px dashed #cbd5e1', background: '#f8fafc',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600,
                                }}
                            >
                                <Eye size={15} /> View scan image
                            </button>
                        ) : (
                            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <img
                                    src={getImageUrl(scan.image_path)}
                                    alt="Dental scan"
                                    style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
                                />
                                <button
                                    onClick={() => setShowImage(false)}
                                    style={{
                                        position: 'absolute', top: 10, right: 10,
                                        width: 30, height: 30, borderRadius: 8,
                                        background: 'rgba(0,0,0,0.55)', border: 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <EyeOff size={14} color="white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Result cards */}
                    <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {scan.results?.map((r, i) => {
                            const cfg       = SEV[r.severity] || SEV.info;
                            const isHealthy = r.condition === 'No Detected Conditions';
                            const hasModels = r.detected_by && r.detected_by.length > 0;

                            return (
                                <div key={i} style={{
                                    borderRadius: 16,
                                    border: `1px solid ${cfg.border}`,
                                    background: cfg.bg,
                                    overflow: 'hidden',
                                    animation: `slideUp 0.35s ease ${i * 80}ms both`,
                                }}>
                                    <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{r.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{r.condition}</span>
                                                {!isHealthy && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                                        background: `${cfg.color}18`, color: cfg.color,
                                                        border: `1px solid ${cfg.border}`,
                                                        display: 'flex', alignItems: 'center', gap: 3,
                                                    }}>
                                                        {getSeverityIcon(r.severity)} {cfg.label.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!isHealthy && (
                                            <span style={{ fontSize: 15, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
                                                {r.confidence}%
                                            </span>
                                        )}
                                    </div>

                                    {!isHealthy && (
                                        <div style={{ padding: '0 16px 10px' }}>
                                            <div style={{ height: 4, background: `${cfg.color}20`, borderRadius: 99, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 99,
                                                    background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                                                    width: `${r.confidence}%`, transition: 'width 0.8s ease',
                                                }} />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ padding: '0 16px 12px' }}>
                                        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                                            {r.description}
                                        </p>
                                    </div>

                                    {hasModels && (
                                        <div style={{
                                            padding: '8px 16px',
                                            borderTop: `1px solid ${cfg.border}`,
                                            display: 'flex', flexWrap: 'wrap', gap: 6,
                                        }}>
                                            {r.detected_by.map(m => (
                                                <div key={m.model} style={{
                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                    padding: '3px 8px', borderRadius: 8,
                                                    background: m.detected ? `${cfg.color}12` : 'rgba(148,163,184,0.1)',
                                                    border: `1px solid ${m.detected ? cfg.border : 'rgba(148,163,184,0.2)'}`,
                                                }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: m.detected ? cfg.color : '#94a3b8' }}>
                                                        {MODEL_SHORT[m.model] || m.model}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: m.detected ? cfg.color : '#94a3b8' }}>
                                                        {m.confidence}%
                                                    </span>
                                                    <span style={{ fontSize: 9, color: m.detected ? cfg.color : '#cbd5e1' }}>
                                                        {m.detected ? '✓' : '–'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {r.recommendation && (
                                        <div style={{
                                            margin: '0 16px 14px', padding: '10px 12px', borderRadius: 10,
                                            background: 'rgba(255,255,255,0.7)',
                                            border: `1px solid ${cfg.border}`,
                                            display: 'flex', gap: 8, alignItems: 'flex-start',
                                        }}>
                                            <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
                                            <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.5, margin: 0 }}>
                                                {r.recommendation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Disclaimer */}
                    <div style={{
                        margin: '0 24px 24px', padding: '12px 16px', borderRadius: 12,
                        background: '#fffbeb', border: '1px solid #fde68a',
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                        <AlertCircle size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5, margin: 0 }}>
                            <strong>Notice:</strong> This analysis is indicative only and does not replace a professional dental consultation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Main AIScanSection with pagination ────────────────────────
const AIScanSection = ({ scans }) => {
    const [selectedScan, setSelectedScan] = useState(null);
    const [page, setPage]                 = useState(0);

    if (!scans || scans.length === 0) return null;

    const totalPages     = Math.ceil(scans.length / CARDS_PER_PAGE);
    const paginated      = scans.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);
    const totalFindings  = scans.filter(s => s.results?.some(r => r.condition !== 'No Detected Conditions')).length;
    const healthyScans   = scans.length - totalFindings;

    const goNext = () => setPage(p => Math.min(p + 1, totalPages - 1));
    const goPrev = () => setPage(p => Math.max(p - 1, 0));

    return (
        <>
            {selectedScan && (
                <ScanReportModal scan={selectedScan} onClose={() => setSelectedScan(null)} />
            )}

            <div style={{ marginBottom: 32 }}>

                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 10,
                            background: 'linear-gradient(135deg, #1C398E, #3b6fd4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Sparkles size={16} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                AI Scan History
                            </h2>
                            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                                {scans.length} scan{scans.length !== 1 ? 's' : ''} · click any card for full report
                            </p>
                        </div>
                    </div>

                    {/* Stats + pagination controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Quick stats */}
                        {[
                            { label: 'Total',    value: scans.length,  color: '#1C398E', bg: 'rgba(28,57,142,0.07)'  },
                            { label: 'Findings', value: totalFindings, color: '#dc2626', bg: 'rgba(220,38,38,0.07)'  },
                            { label: 'Not Found',  value: healthyScans,  color: '#059669', bg: 'rgba(5,150,105,0.07)'  },
                        ].map(stat => (
                            <div key={stat.label} style={{
                                padding: '5px 12px', borderRadius: 10,
                                background: stat.bg, textAlign: 'center',
                            }}>
                                <p style={{ fontSize: 15, fontWeight: 800, color: stat.color, margin: 0, lineHeight: 1 }}>
                                    {stat.value}
                                </p>
                                <p style={{ fontSize: 10, color: stat.color, margin: 0, marginTop: 1, fontWeight: 600, opacity: 0.7 }}>
                                    {stat.label}
                                </p>
                            </div>
                        ))}

                        {/* Pagination — only show if more than one page */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                    onClick={goPrev}
                                    disabled={page === 0}
                                    style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        border: '1px solid #e5e7eb', background: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: page === 0 ? 'not-allowed' : 'pointer',
                                        opacity: page === 0 ? 0.35 : 1,
                                        transition: 'all 0.15s',
                                        color: '#374151',
                                    }}
                                    onMouseEnter={e => { if (page !== 0) e.currentTarget.style.background = '#f3f4f6'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, minWidth: 40, textAlign: 'center' }}>
                                    {page + 1} / {totalPages}
                                </span>

                                <button
                                    onClick={goNext}
                                    disabled={page === totalPages - 1}
                                    style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        border: '1px solid #e5e7eb', background: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                                        opacity: page === totalPages - 1 ? 0.35 : 1,
                                        transition: 'all 0.15s',
                                        color: '#374151',
                                    }}
                                    onMouseEnter={e => { if (page !== totalPages - 1) e.currentTarget.style.background = '#f3f4f6'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cards grid — always 4 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                }}>
                    {paginated.map(scan => (
                        <ScanCard key={scan.id} scan={scan} onClick={() => setSelectedScan(scan)} />
                    ))}
                </div>

                {/* Dot indicators */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i)}
                                style={{
                                    width: i === page ? 20 : 6,
                                    height: 6, borderRadius: 99, border: 'none', cursor: 'pointer',
                                    background: i === page ? '#1C398E' : '#d1d5db',
                                    transition: 'all 0.2s ease',
                                    padding: 0,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default AIScanSection;