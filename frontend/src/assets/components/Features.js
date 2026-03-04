import React from 'react';
import {
  FaCalendarCheck,
  FaFolderOpen,
  FaTooth,
  FaChartBar,
  FaCommentDots,
  FaRobot,
  FaUserMd,
  FaBlog
} from 'react-icons/fa';

const features = [
  {
    title: 'Online Appointments',
    description: 'Book and manage dental visits with just a few taps. Available 24/7 for all users.',
    icon: <FaCalendarCheck />,
  },
  {
    title: 'Medical File Access',
    description: 'Full access to treatments, diagnostics, and x-rays. Keep track of everything in one place.',
    icon: <FaFolderOpen />,
  },
  {
    title: 'Smart Treatment Plans',
    description: 'Digital plans, updated by your dentist and tracked by you. Stay on top of your progress.',
    icon: <FaTooth />,
  },
  {
    title: 'Feedback & Statistics',
    description: 'Smart reporting tools for clinics and patients. See what’s working and what needs attention.',
    icon: <FaChartBar />,
  },
  {
    title: 'Instant Messaging',
    description: 'Secure chat between patient and doctor for quick updates. Communicate with ease.',
    icon: <FaCommentDots />,
  },
  {
    title: 'AI Diagnostics',
    description: 'AI-supported image analysis to assist doctors. Smart insights that improve accuracy.',
    icon: <FaRobot />,
  },
  
];

const Features = () => {
  return (
    <section className="py-4 sm:py-16 bg-white px-2 sm:px-4 mb-20">
  <div className="text-center mb-16">
    <h2 className="text-4xl sm:text-5xl font-bold text-gray-800">Explore Our Features</h2>
    <p className="mt-4 text-lg text-gray-600">
      Dentflow brings together smart tools to revolutionize dental care for everyone.
    </p>
  </div>

  <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
    {features.map((feature, index) => (
      <div
        key={index}
        className="cursor-pointer bg-white rounded-2xl shadow-md p-6 w-full sm:w-[340px] lg:w-[360px] min-h-[300px] flex flex-col transition transform hover:-translate-y-1 hover:shadow-xl hover:bg-gradient-to-br hover:from-cyan-100 hover:to-blue-100"
      >
        <div className="w-14 h-14 rounded-full bg-[#4ba8fa1a] flex items-center justify-center text-[#4ba8fa] text-3xl mb-4">
          {feature.icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
        <p className="text-gray-600 text-sm">{feature.description}</p>
      </div>
    ))}
  </div>
</section>

  );
};

export default Features;
