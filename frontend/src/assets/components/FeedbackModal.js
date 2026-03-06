import React, { useState } from 'react';
import { X, Star, CheckCircle } from 'lucide-react';

const API = 'http://localhost:8000';

const FeedbackModal = ({ isOpen, onClose, appointmentId, doctorName }) => {
  const [stars, setStars]       = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSubmit = async () => {
    if (!stars) { setError('Please select a rating.'); return; }
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/doctor-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appointment_id: appointmentId, stars, message }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to submit review');
      }
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setStars(0); setMessage(''); onClose(); }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star size={15} className="text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Rate your appointment</h2>
              {doctorName && <p className="text-xs text-gray-400">{doctorName}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {success ? (
            <div className="flex flex-col items-center py-4 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>
              <p className="text-base font-bold text-gray-800">Thank you for your feedback!</p>
              <p className="text-sm text-gray-400">Your review has been submitted.</p>
            </div>
          ) : (
            <>
              {/* Stars */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your rating</p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i}
                      onClick={() => setStars(i)}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      className="cursor-pointer transition-transform hover:scale-110 focus:outline-none">
                      <Star
                        size={36}
                        className={`transition-colors ${
                          i <= (hovered || stars)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-200 fill-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {stars > 0 && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][stars]}
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Message <span className="text-gray-300 font-normal normal-case tracking-normal">(optional)</span>
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Share your experience..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={onClose}
                  className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                  Skip
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition disabled:opacity-60">
                  {loading ? 'Submitting...' : 'Submit review'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;