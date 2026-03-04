import React from 'react';
import { FaBullseye, FaEye, FaHeart } from 'react-icons/fa';

const AboutUs = () => {
  return (
    <div className="w-full min-h-[80vh] flex flex-col md:flex-row">

      <div
        className="hidden md:block md:flex-1 h-64 md:h-auto bg-cover bg-center"
        style={{ backgroundImage: 'url("/images/about.jpg")' }}
      ></div>

   
      <div className="w-full md:flex-1 bg-white p-6 md:p-12 flex flex-col justify-center">
        <h2 className="text-4xl md:text-5xl font-semibold text-gray-800 mb-6 md:mb-8">
          About <span className="text-[#5AB2FF]">Dentflow</span>
        </h2>
        <p className="text-base md:text-lg text-gray-600 mb-10">
          At DentFlow, we’re committed to building digital tools that make dental care simpler, smarter, and more human. Our mission is to connect patients and dental professionals in ways that improve care, access, and experience.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="cursor-pointer p-6 rounded-xl bg-gray-50 hover:bg-gradient-to-br from-cyan-50 to-white transition-shadow-xl">
            <div className="text-[#5AB2FF] text-3xl mb-4">
              <FaBullseye />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-2">Mission</h4>
            <p className="text-sm text-gray-600">
              Connecting people and professionals through intuitive digital tools.
            </p>
          </div>

          <div className="cursor-pointer p-6 rounded-xl bg-gray-50 hover:bg-gradient-to-br from-cyan-50 to-white transition-shadow-xl">
            <div className="text-[#5AB2FF] text-3xl mb-4">
              <FaEye />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-2">Vision</h4>
            <p className="text-sm text-gray-600">
              Make personalized dental care easy to access and understand for all.
            </p>
          </div>

          <div className="cursor-pointer p-6 rounded-xl bg-gray-50 hover:bg-gradient-to-br from-cyan-50 to-white transition-shadow-xl">
            <div className="text-[#5AB2FF] text-3xl mb-4">
              <FaHeart />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-2">Values</h4>
            <p className="text-sm text-gray-600">
              We value simplicity, transparency, and meaningful innovation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
