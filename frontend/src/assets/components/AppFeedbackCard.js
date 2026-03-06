import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, X, CheckCircle } from 'lucide-react';

const API = 'http://localhost:8000';

// ── Modal ─────────────────────────────────────────────────────
const FeedbackAppModal = ({ isOpen, onClose }) => {
  const [stars, setStars]     = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState(null);

  // Load existing feedback when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API}/app-feedback/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStars(data.stars);
          setMessage(data.message || '');
        }
      } catch { /* no existing feedback */ }
    };
    fetch_();
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!stars) { setError('Please select a rating.'); return; }
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/app-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stars, message }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed to submit'); }
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null); setSaved(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <MessageSquare size={13} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Rate Dentflow</p>
              <p className="text-xs text-gray-400">Help us improve</p>
            </div>
          </div>
          <button onClick={handleClose}
            className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {saved ? (
            <div className="flex flex-col items-center py-4 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-gray-800">Thank you for your feedback!</p>
            </div>
          ) : (
            <>
              {/* Stars */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your rating</p>
                <div className="flex gap-1.5 items-center">
                  {[1,2,3,4,5].map(i => (
                    <button key={i}
                      onClick={() => setStars(i)}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      className="cursor-pointer transition-transform hover:scale-110 focus:outline-none">
                      <Star size={28} className={`transition-colors ${
                        i <= (hovered || stars) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'
                      }`} />
                    </button>
                  ))}
                  {stars > 0 && (
                    <span className="ml-1 text-xs text-gray-400">
                      {['','Poor','Fair','Good','Very good','Excellent'][stars]}
                    </span>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Message <span className="text-gray-300 font-normal normal-case tracking-normal">(optional)</span>
                </p>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                  placeholder="What could we improve?"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all" />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-2">
                <button onClick={handleClose}
                  className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition disabled:opacity-60">
                  {loading ? 'Sending...' : 'Send feedback'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Buton mic în profil ───────────────────────────────────────
const AppFeedbackCard = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <MessageSquare size={13} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Rate Dentflow</p>
            <p className="text-xs text-gray-400">Share your experience with the platform</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)}
          className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-[#1C398E] text-white text-xs font-semibold rounded-xl hover:bg-[#1C398E]/90 transition flex-shrink-0">
          <Star size={12} /> Leave feedback
        </button>
      </div>

      <FeedbackAppModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default AppFeedbackCard;