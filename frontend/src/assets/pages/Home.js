import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Features from '../components/Features';
import BlogSection from '../components/BlogSection';
import AboutUs from '../components/AboutUs';
import Contact from '../components/Contact';
import Feedback from '../components/Feedback';
import { FaArrowRight } from 'react-icons/fa';  

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex justify-center items-center mt-0 sm:mt-8 mx-0 sm:mx-10 mb-32">
        <div className="flex w-full h-full gap-6 sm:gap-8 flex-col lg:flex-row">
        
          {/* Main content */}
          <div className="w-full h-[740px] sm:h-[680px] lg:w-7/12 bg-gradient-to-bl from-cyan-100 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-10 rounded-none sm:rounded-xl shadow-md flex flex-col justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            <h1 className="text-4xl sm:text-5xl mb-4 sm:mb-6 mx-4 sm:mx-10">
              Start Your <span className="text-[#369cf7]">Journey</span> to Smarter Dental Care with <span className="text-[#369cf7] font-handwriting text-5xl sm:text-7xl">Dentflow</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 mx-4 sm:mx-10">
            A smart platform designed for both patients and dental professionals — to book appointments, manage care, and stay connected.
            </p>

            <a
              href="/login"
              className="flex items-center gap-2 bg-[#369cf7] mx-4 sm:mx-10 text-white px-6 sm:px-10 py-3 rounded-full w-fit hover:bg-[#0d68b8] transition duration-300"
            >
              Make an appointment <FaArrowRight />
            </a>
          </div>

          {/* Second content */}
          <div 
            className="hidden h-[680px] lg:w-5/12 lg:flex bg-cover bg-center rounded-xl shadow-md"
            style={{ backgroundImage: 'url(/images/header.jpg)' }}
          >
          </div>
        </div>
      </main>
      <Features/>
      <BlogSection/>
      <AboutUs/>
      <Feedback/>
      <Contact/>
      <Footer />
   
    </div>
  );
};

export default Home;
