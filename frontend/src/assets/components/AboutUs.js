import React, { useEffect, useRef, useState } from 'react';
import { FaBullseye, FaEye, FaHeart, FaUsers, FaStar, FaCalendarCheck } from 'react-icons/fa';

const stats = [
  { value: '5,000+', label: 'Patients served',      icon: FaUsers        },
  { value: '98%',    label: 'Satisfaction rate',     icon: FaStar         },
  { value: '12,000+',label: 'Appointments booked',   icon: FaCalendarCheck},
];

const pillars = [
  {
    icon: FaBullseye,
    title: 'Mission',
    color: 'from-sky-400 to-blue-500',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    text: 'Connecting patients and dental professionals through intuitive digital tools that remove friction from every touchpoint.',
  },
  {
    icon: FaEye,
    title: 'Vision',
    color: 'from-cyan-400 to-teal-500',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    text: 'A world where personalized dental care is effortlessly accessible — anywhere, anytime, for everyone.',
  },
  {
    icon: FaHeart,
    title: 'Values',
    color: 'from-blue-400 to-indigo-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'We build with simplicity, transparency, and a genuine belief that technology should feel human.',
  },
];

const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

const AboutUs = () => {
  const [sectionRef, inView] = useInView();

  return (
    <section id="about" ref={sectionRef} className="w-full bg-white overflow-hidden">

      {/* Top wave divider */}
      <div className="w-full overflow-hidden leading-none">
        <svg viewBox="0 0 1440 60" className="w-full h-12 fill-gray-50" preserveAspectRatio="none">
          <path d="M0,0 C360,60 1080,0 1440,60 L1440,0 Z" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">

        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
         
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-4 leading-tight">
            About Us
          </h2>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            At DentFlow, we're on a mission to modernize the dental experience — for patients who deserve simplicity and professionals who deserve better tools.
          </p>
        </div>

        {/* Main grid: image + pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20">

          {/* Image side */}
          <div className={`relative transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
              <img
                src="/images/about.jpg"
                alt="DentFlow team"
                className="w-full h-full object-cover"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C398E]/30 to-transparent" />
            </div>

      

            {/* Decorative dots */}
            <div className="absolute -top-4 -left-4 w-24 h-24 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle, #369cf7 1.5px, transparent 1.5px)', backgroundSize: '12px 12px' }} />
          </div>

          {/* Pillars side */}
          <div className={`space-y-5 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            {pillars.map(({ icon: Icon, title, color, bg, border, text }, i) => (
              <div
                key={title}
                className={`group flex gap-5 p-6 rounded-2xl border ${border} ${bg} hover:shadow-md transition-all duration-300 cursor-default`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="text-white" size={18} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-1">{title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom wave */}
      <div className="w-full overflow-hidden leading-none">
        <svg viewBox="0 0 1440 60" className="w-full h-12 fill-gray-50" preserveAspectRatio="none">
          <path d="M0,60 C360,0 1080,60 1440,0 L1440,60 Z" />
        </svg>
      </div>
    </section>
  );
};

export default AboutUs;