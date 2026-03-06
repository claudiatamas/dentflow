import React, { useState, useRef, useEffect } from 'react';
import {
  Users, Settings, HelpCircle, FileText, Megaphone, BarChart2, Star, User, LogOut,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import NotificationBell from './NotificationBell';

const API = 'http://localhost:8000';

// ── Shared Avatar Component ───────────────────────────────────
const Avatar = ({ user, size = 'w-7 h-7' }) => {
  const [imgError, setImgError] = useState(false);
  const src = user?.profile_picture || null;
  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
    : null;

  if (src && !imgError) {
    return (
      <img src={src} alt="Profile" onError={() => setImgError(true)}
        className={`${size} rounded-full object-cover`} />
    );
  }
  if (initials) {
    return (
      <div className={`${size} rounded-full bg-[#1C398E] flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
        {initials}
      </div>
    );
  }
  return (
    <img src="/images/user.jpg" alt="User profile" className={`${size} rounded-full object-cover`} />
  );
};

const AdminLayout = ({ children }) => {
  const [menuOpen, setMenuOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const dropdownRef                   = useRef();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCurrentUser(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  const navLinks = [
    { to: '/dashboard_admin', icon: BarChart2, label: 'Activity'          },
    { to: '/admin_users',     icon: Users,     label: 'Users'             },
    { to: '/help_admin',      icon: HelpCircle,label: 'Support Requests'  },
    { to: '/adminblog',       icon: Megaphone, label: 'Blog'              },
    { to: '/app_feedback',       icon: Star,      label: 'Reviews'           },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f8fc] via-blue-100 to-indigo-200 relative">

      {/* Top Nav */}
      <div className="fixed top-0 left-0 w-full p-4 px-6 flex justify-between items-center bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center space-x-12">
          <button onClick={() => setMenuOpen(!menuOpen)} className="cursor-pointer block md:hidden text-gray-600 z-40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <a href="/dashboard_admin">
            <img src="images/logo.png" alt="Logo" className="cursor-pointer w-auto h-12 object-contain" />
          </a>
        </div>

        <div className="flex items-center space-x-3 bg-white/90 shadow-md p-2 md:p-3 rounded-3xl z-30">
          <NotificationBell />
        

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setProfileOpen(!profileOpen)} className="cursor-pointer focus:outline-none">
              <Avatar user={currentUser} size="w-7 h-7" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg py-1.5 z-50 border border-gray-100">
                {currentUser && (
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{currentUser.first_name} {currentUser.last_name}</p>
                    <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
                  </div>
                )}
                <button onClick={() => { setProfileOpen(false); window.location.href = '/profile_admin'; }}
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors">
                  <User size={15} /> Profile
                </button>
                <button onClick={handleLogout}
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full text-left transition-colors">
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed top-0 left-0 w-full h-full bg-white z-40 transform transition-transform duration-300 ease-in-out md:hidden ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mt-24 flex flex-col items-start pt-10 px-10 space-y-6">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link key={label} to={to} className="w-full">
              <button className="flex items-center space-x-4 p-3 bg-white text-gray-600 shadow-md rounded-xl w-full hover:bg-[#1C398E] hover:text-white cursor-pointer">
                <Icon className="w-5 h-5" /><span className="text-sm font-medium">{label}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar + Main Content */}
      <div className="flex">
        <div className="hidden md:flex fixed top-0 left-0 h-full w-20 flex-col items-center py-10 space-y-6 bg-white/80 backdrop-blur-md shadow-lg z-40">
          {navLinks.map(({ to, icon: Icon }, idx) => (
            <Link key={to + idx} to={to}>
              <button className={`cursor-pointer ${idx === 0 ? 'mt-20' : ''} p-4 rounded-3xl bg-white text-gray-500 shadow-md hover:bg-[#1C398E] hover:text-white`}>
                <Icon className="w-5 h-5" />
              </button>
            </Link>
          ))}
        </div>
        <div className="flex-1 py-10 px-6 z-10 mt-24 md:ml-24">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;