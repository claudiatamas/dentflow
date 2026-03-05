import React, { useState, useEffect } from 'react';
import { FaArrowRight, FaBars, FaTimes } from 'react-icons/fa';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible]   = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setIsMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navItems = [
    { label: 'Home',     action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: 'Services', action: () => scrollTo('features') },
    { label: 'Blog',     action: () => scrollTo('blog')     },
    { label: 'About us', action: () => scrollTo('about')    },
    { label: 'Contact',  action: () => scrollTo('contact')  },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}
    >
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">

        {/* Logo + Nav on the left */}
        <div className="flex items-center gap-24">
          <a href="/" className="transform transition-all duration-300 hover:scale-105 flex-shrink-0">
            <img src="/images/logo.png" alt="Dentflow Logo" className="h-12 w-auto" />
          </a>

          <nav className="hidden lg:block">
            <ul className="flex space-x-9 list-none">
              {navItems.map(({ label, action }) => (
                <li key={label}>
                  <button
                    onClick={action}
                    className="cursor-pointer text-md text-[#1e2226] font-medium relative group transition-colors duration-200 hover:text-[#369cf7] bg-transparent border-none outline-none"
                  >
                    {label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#369cf7] rounded-full transition-all duration-300 group-hover:w-full" />
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* CTA */}
        <div className="hidden lg:block">
          <a
            href="/login"
            className="border-2 border-[#1e2226] px-5 py-2 rounded-full flex items-center gap-2 hover:bg-[#1e2226] hover:text-white transition-all duration-300 transform hover:scale-105 text-sm font-medium"
          >
            Get Started <FaArrowRight size={12} />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden flex items-center text-gray-700 focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} bg-white border-t border-gray-100`}>
        <ul className="flex flex-col items-center py-6 space-y-5">
          {navItems.map(({ label, action }) => (
            <li key={label}>
              <button
                onClick={action}
                className="cursor-pointer text-lg text-[#1e2226] font-medium hover:text-[#369cf7] transition-colors bg-transparent border-none outline-none"
              >
                {label}
              </button>
            </li>
          ))}
          <li className="pt-2">
            <a
              href="/login"
              className="border-2 border-[#1e2226] px-5 py-2 rounded-full flex items-center gap-2 hover:bg-[#1e2226] hover:text-white transition-all duration-300 text-sm font-medium"
            >
              Get Started <FaArrowRight size={12} />
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
};

export default Navbar;