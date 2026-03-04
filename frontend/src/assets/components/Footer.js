import React from "react";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-[#16181a] text-white pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4 md:gap-0 text-center md:text-left">
          <div className="text-3xl font-bold text-gray-200">
            Dentflow
          </div>
          <div className="text-sm text-white max-w-md">
            <p>Helping professionals and patients communicate effortlessly.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
          <div>
            <h4 className="font-semibold text-lg text-gray-300 mb-6">Company</h4>
            <ul>
              <li><a href="#" className="text-white hover:text-white transition">About Us</a></li>
              <li><a href="#" className="text-white hover:text-white transition">Careers</a></li>
              <li><a href="#" className="text-white hover:text-white transition">Press</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg text-gray-300 mb-6">Services</h4>
            <ul>
              <li><a href="#" className="text-white hover:text-white transition">Dental Tools</a></li>
              <li><a href="#" className="text-white hover:text-white transition">Patient Portal</a></li>
              <li><a href="#" className="text-white hover:text-white transition">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg text-gray-300 mb-6">Quick Links</h4>
            <ul>
              <li><a href="#" className="text-white hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="text-white hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg text-gray-300 mb-6">Follow Us</h4>
            <div className="flex space-x-8">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FaFacebookF size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FaTwitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FaLinkedinIn size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FaInstagram size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>&copy; 2025 Dentflow. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
