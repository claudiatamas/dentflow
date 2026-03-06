import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";

const API = "http://localhost:8000";

const StarDisplay = ({ value }) => (
  <div className="flex gap-0.5 justify-center">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={18}
        className={i <= value ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
    ))}
  </div>
);

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch(`${API}/app-feedback/public`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.length > 0) setFeedbacks(data); })
      .catch(() => {});
  }, []);

  const totalGroups = Math.ceil(feedbacks.length / 3);

  useEffect(() => {
    if (feedbacks.length <= 3) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex(prev => {
          const nextGroup = Math.floor(prev / 3) + 1;
          return nextGroup >= totalGroups ? 0 : nextGroup * 3;
        });
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [feedbacks, totalGroups]);

  const goToGroup = (groupIndex) => {
    setVisible(false);
    setTimeout(() => { setCurrentIndex(groupIndex * 3); setVisible(true); }, 400);
  };

  // Afișează doar cât există, max 3
  const current = feedbacks.slice(currentIndex, currentIndex + 3);

  if (feedbacks.length === 0) return null;

  return (
    <section className="py-20 bg-gray-50 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-800">What Our Clients Say</h2>
      </div>

      <div
        className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}
      >
        {current.map((feedback, index) => (
          <div key={feedback.id || index}
            className="w-full bg-white rounded-2xl shadow-xl p-6 transform transition-all duration-500 hover:scale-105">
            <p className="text-gray-600 text-lg italic mb-4">{`"${feedback.message}"`}</p>
            <div className="mb-4">
              <StarDisplay value={feedback.stars} />
            </div>
            <div className="text-right font-semibold text-gray-800">{feedback.user_name}</div>
          </div>
        ))}
      </div>

      {/* Dots — doar dacă sunt mai mult de 3 */}
      {feedbacks.length > 3 && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: totalGroups }).map((_, i) => (
            <button key={i} onClick={() => goToGroup(i)}
              className={`cursor-pointer h-2 rounded-full transition-all duration-300 ${
                Math.floor(currentIndex / 3) === i ? "bg-[#1C398E] w-5" : "bg-gray-300 w-2"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Feedback;