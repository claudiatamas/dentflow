import React, { useEffect, useState } from "react";

const feedbacks = [
  {
    name: "John Doe",
    text: "DentFlow a schimbat modul în care gestionez programările. Este foarte ușor de utilizat și îmi economisește timp.",
  },
  {
    name: "Maria Popescu",
    text: "Sunt foarte mulțumită de tratamentele primite prin DentFlow. Platforma este intuitivă și îmi place că pot vizualiza istoricul meu medical.",
  },
  {
    name: "Andrei Ionescu",
    text: "Cel mai bun instrument pentru gestionarea cabinetului! Recomand tuturor celor care vor să îmbunătățească fluxul de pacienți.",
  },
  {
    name: "Elena Gheorghiu",
    text: "Mi-a plăcut mult să pot comunica ușor cu medicul meu și să urmăresc progresul tratamentului meu.",
  },
  {
    name: "Mihai Dănuț",
    text: "Un serviciu excelent, care m-a ajutat să îmi organizez programările și să urmăresc evoluția tratamentelor.",
  },
];

const Feedback = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFeedbacks, setCurrentFeedbacks] = useState([
    feedbacks[0],
    feedbacks[1],
    feedbacks[2],
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 3) % feedbacks.length;
        setCurrentFeedbacks([
          feedbacks[nextIndex],
          feedbacks[(nextIndex + 1) % feedbacks.length],
          feedbacks[(nextIndex + 2) % feedbacks.length],
        ]);
        return nextIndex;
      });
    }, 5000); 

    return () => clearInterval(interval); 
  }, []);

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <svg
        key={index}
        xmlns="http://www.w3.org/2000/svg"
        fill="#FFD700" 
        viewBox="0 0 24 24"
        width="20"
        height="20"
        className="inline-block"
      >
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    ));
  };

  return (
    <section className="py-38 bg-gray-50 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-800">What Our Clients Say</h2>
      </div>

      <div className="mx-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
        {currentFeedbacks.map((feedback, index) => (
          <div
            key={index}
            className="cursor-pointer w-full bg-white rounded-lg shadow-xl p-6 transform transition-all duration-500 hover:scale-105"
          >
            <p className="text-gray-600 text-lg italic mb-4">{`"${feedback.text}"`}</p>
            <div className="mb-4 flex justify-center">
              {renderStars()}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-right font-semibold text-gray-800">{feedback.name}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Feedback;
