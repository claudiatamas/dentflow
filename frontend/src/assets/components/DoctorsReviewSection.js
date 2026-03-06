import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, User } from 'lucide-react';

const API = 'http://localhost:8000';

// ── Star display (read-only) ──────────────────────────────────
const StarDisplay = ({ value, size = 14 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={size}
        className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
    ))}
  </div>
);

// ── Rating Summary badge ──────────────────────────────────────
export const RatingSummaryBadge = ({ doctorId }) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch(`${API}/doctor-reviews/${doctorId}/summary`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => {});
  }, [doctorId]);

  if (!summary || summary.total_reviews === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <StarDisplay value={summary.average_stars} size={12} />
      <span className="text-xs font-bold text-gray-700">{summary.average_stars}</span>
      <span className="text-xs text-gray-400">({summary.total_reviews})</span>
    </div>
  );
};

// ── Full reviews list (for ActivityPage) ─────────────────────
const DoctorReviewsSection = () => {
  const [reviews, setReviews]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/my-reviews`, { headers }).then(r => r.json()),
      fetch(`${API}/me`, { headers })
        .then(r => r.json())
        .then(me => fetch(`${API}/doctor-reviews/${me.id}/summary`).then(r => r.json())),
    ])
      .then(([reviewsData, summaryData]) => {
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setSummary(summaryData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Star size={14} className="text-amber-400 fill-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Patient Reviews</p>
            <p className="text-xs text-gray-400">What your patients say</p>
          </div>
        </div>

        {/* Summary badge */}
        {summary && summary.total_reviews > 0 && (
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-gray-800">{summary.average_stars}</span>
              <Star size={16} className="text-amber-400 fill-amber-400" />
            </div>
            <span className="text-xs text-gray-400">{summary.total_reviews} review{summary.total_reviews !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Star breakdown */}
      {summary && summary.total_reviews > 0 && (
        <div className="mb-5 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
          <StarDisplay value={summary.average_stars} size={20} />
          <p className="text-xs text-gray-500 mt-1">Average rating from {summary.total_reviews} patient{summary.total_reviews !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No reviews yet</p>
          <p className="text-xs text-gray-300 mt-1">Reviews will appear after completing appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#1C398E]/8 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-[#1C398E]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{review.patient_name || 'Patient'}</p>
                    <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                <StarDisplay value={review.stars} size={13} />
              </div>
              {review.message && (
                <p className="text-sm text-gray-600 leading-relaxed pl-10">{review.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorReviewsSection;