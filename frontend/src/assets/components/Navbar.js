import React, { useState, useEffect } from 'react';  
import { FaArrowRight, FaBars, FaTimes } from 'react-icons/fa';  


const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);  

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={`p-4 navbar ${isVisible ? 'opacity-100 transition-opacity duration-1000' : 'opacity-0'}`}>
      <div className="container mx-auto flex justify-between items-center">
    
        <div className="flex items-center transform transition-all duration-300 hover:scale-105">
          <a href="/">
            <img src="/images/logo.png" alt="Dentflow Logo" className="h-12 w-auto" />
          </a>
        </div>

        {/* Desktop Menu */}
        <nav className="ml-[-30%] hidden lg:block">
          <ul className="flex space-x-8 list-none">
            <li>
              <a 
                href="/" 
                className="text-lg text-[#1e2226] font-medium transition-all duration-300 hover:text-blue-500 hover:-translate-y-1"
              >
                Home
              </a>
            </li>
            <li>
              <a 
                href="/services" 
                className="text-lg text-[#1e2226] font-medium hover:scale-110 transition-transform duration-200 hover:text-blue-500"
              >
                Our services
              </a>
            </li>
            <li>
              <a 
                href="/blog" 
                className=" text-lg text-[#1e2226] font-medium hover:scale-110 transition-transform duration-200 hover:text-blue-500"
              >
                Blog
              </a>
            </li>
            <li>
              <a 
                href="/about" 
                className="text-lg text-[#1e2226] font-medium hover:scale-110 transition-transform duration-200 hover:text-blue-500"
              >
                About us
              </a>
            </li>
            <li>
              <a 
                href="/contact" 
                className="text-lg text-[#1e2226] font-medium transform transition-all duration-300 hover:scale-110 hover:text-blue-500"
              >
                Contact
              </a>
            </li>
          </ul>
        </nav>


        <div className="lg:block hidden">
          <a 
            href="/login" 
            className="border-2 border-black px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-black hover:text-white transition duration-300 transform hover:scale-105"
          >
            <span>Get Started</span>
            <FaArrowRight />
          </a>
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center" onClick={toggleMenu}>
          {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden navbar ${isMenuOpen ? 'block' : 'hidden'} bg-white p-4`}>
        <ul className="space-y-4 flex flex-col items-center">
          <li>
            <a 
              href="/" 
              className="text-lg text-[#1e2226] font-medium transform transition-all duration-300 hover:scale-110 hover:text-blue-500"
            >
              Home
            </a>
          </li>
          <li>
            <a 
              href="/services" 
              className="text-lg text-[#1e2226] font-medium transform transition-all duration-300 hover:scale-110 hover:text-blue-500"
            >
              Our services
            </a>
          </li>
          <li>
            <a 
              href="/about" 
              className="text-lg text-[#1e2226] font-medium transform transition-all duration-300 hover:scale-110 hover:text-blue-500"
            >
              About us
            </a>
          </li>
          <li>
            <a 
              href="/blog" 
              className="text-lg text-[#1e2226] font-medium transform transition-all duration-300 hover:scale-110 hover:text-blue-500"
            >
              Blog
            </a>
          </li>
          <li>
            <a 
              href="/contact" 
              className="text-lg text-[#1e2226] font-medium transform transition-all duration-300 hover:scale-110 hover:text-blue-500"
            >
              Contact
            </a>
          </li>
        </ul>

        {isMenuOpen && (
          <div className="flex flex-col items-center space-y-4 mt-4">
            <a 
              href="/login" 
              className="border-2 border-black px-4 py-2 rounded-full text-black flex items-center space-x-2 hover:bg-black hover:text-white transition duration-300 transform hover:scale-105"
            >
              <span>Get Started</span>
              <FaArrowRight />
            </a>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
