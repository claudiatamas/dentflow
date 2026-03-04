import React, { useState, useRef, useEffect } from 'react';
import {
    Calendar, Users, BookOpen, Settings, MessageCircle, Activity, HelpCircle, User, LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ProfileDropdown = () => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token'); 
        window.location.href = '/login';   
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <img
                src="/images/user.jpg"
                alt="User profile"
                className="cursor-pointer w-6 h-6 rounded-full object-cover"
                onClick={() => setOpen(!open)}
            />

            {open && (
                <div className=" absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-2 z-50">
                    <button
                        onClick={() => {
                            setOpen(false);
                            window.location.href = '/profile_patient'; 
                        }}
                        className="cursor-pointer flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                        <User className="w-5 h-5" />
                        <span>Profile</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="cursor-pointer flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Log out</span>
                    </button>
                </div>
            )}
        </div>
    );
};

const PatientLayout = ({ children }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f5f8fc] via-blue-100 to-indigo-200 relative">
            
            {/* Fixed Top Navigation */}
            <div className="fixed top-0 left-0 w-full p-4 px-6 flex justify-between items-center bg-white/80 backdrop-blur-md z-50">
                <div className="flex items-center space-x-12">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="cursor-pointer block md:hidden text-gray-600 z-40"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <a href="/dashboard_patient">
                        <img src="images/logo.png" alt="Logo" className="cursor-pointer w-auto h-12 object-contain" />
                    </a>

                </div>

                {/* Right side icons */}
                <div className="flex items-center space-x-4 bg-white/90 shadow-md p-2 md:p-3 rounded-3xl z-30">
                    <button className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="cursor-pointer h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
                    </button>
                    <ProfileDropdown />
                </div>
            </div>

            {/* Mobile Sidebar */}
            <div className={`fixed top-0 left-0 w-full h-full bg-white z-40 transform transition-transform duration-300 ease-in-out md:hidden ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="mt-24 flex flex-col items-start pt-10 px-10 space-y-6">
                    <Link to={'/dashboard_patient'} className='w-full'>
                    <button className="flex items-center space-x-4 p-3 bg-white/90 text-gray-600 shadow-md rounded-xl w-full hover:bg-[#1C398E] hover:text-white cursor-pointer">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm font-medium">Calendar</span>
                    </button></Link>
                    <Link to={'/chat_users'} className='w-full'>
                    <button className="flex items-center space-x-4 p-3 bg-white text-gray-600 shadow-md rounded-xl w-full hover:bg-[#1C398E] hover:text-white cursor-pointer">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Messages</span>
                    </button></Link>
                    <Link to={'/medical_records'} className='w-full'>
                    <button className="flex items-center space-x-4 p-3 bg-white text-gray-600 shadow-md rounded-xl w-full hover:bg-[#1C398E] hover:text-white cursor-pointer">
                        <BookOpen className="w-5 h-5" />
                        <span className="text-sm font-medium">Records</span>
                    </button></Link>
                    <Link to={'/view_doctors'} className='w-full'>
                    <button className="flex items-center space-x-4 p-3 bg-white text-gray-600 shadow-md rounded-xl w-full hover:bg-[#1C398E] hover:text-white cursor-pointer">
                        <Users className="w-5 h-5" />
                        <span className="text-sm font-medium">Doctors</span>
                    </button></Link>

                    <Link to={'/activity_user'} className='w-full'>
                    <button className="flex items-center space-x-4 p-3 bg-white text-gray-600 shadow-md rounded-xl w-full hover:bg-[#1C398E] hover:text-white cursor-pointer">
                        <Activity className="w-5 h-5" />
                        <span className="text-sm font-medium">Activity</span>
                    </button></Link>
                    
                    <Link to={'/help_user'} className='w-full'>
                    <button className="flex items-center space-x-4 p-3 bg-white text-gray-600 shadow-md rounded-xl w-full hover:bg-[#1C398E] hover:text-white cursor-pointer">
                        <HelpCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Help</span>
                    </button></Link>
                </div>
            </div>

            {/* Desktop Sidebar + Main Content */}
            <div className="flex">
                {/* Fixed Desktop Sidebar */}
                <div className="hidden md:flex fixed top-0 left-0 h-full w-20 flex-col items-center py-10 space-y-6 bg-white/80 backdrop-blur-md shadow-lg z-40">
                    <Link to={'/dashboard_patient'}>
                    <button className="cursor-pointer mt-20 p-4 rounded-3xl bg-white/90 text-gray-500 shadow-md hover:bg-[#1C398E] hover:text-white">
                        <Calendar className="w-5 h-5" />
                    </button></Link>
                    <Link to={'/chat_users'}>
                    <button className="cursor-pointer p-4 rounded-3xl bg-white text-gray-500 shadow-md hover:bg-[#1C398E] hover:text-white ">
                        <MessageCircle className="w-5 h-5" />
                    </button></Link>
                     <Link to={'/medical_records'}>
                    <button className="cursor-pointer p-4 rounded-3xl bg-white text-gray-500 shadow-md hover:bg-[#1C398E] hover:text-white">
                        <BookOpen className="w-5 h-5" />
                    </button></Link>
                    <Link to={'/view_doctors'}>
                    <button className="cursor-pointer p-4 rounded-3xl bg-white text-gray-500 shadow-md hover:bg-[#1C398E] hover:text-white">
                        <Users className="w-5 h-5" />
                    </button></Link>
                    <Link to={'/activity_user'}>
                    <button className="cursor-pointer p-4 rounded-3xl bg-white text-gray-500 shadow-md hover:bg-[#1C398E] hover:text-white">
                        <Activity className="w-5 h-5" />
                    </button></Link>
                   
                    <Link to={'/help_user'}>
                    <button className="cursor-pointer p-4 rounded-3xl bg-white text-gray-500 shadow-md mt-60 hover:bg-[#1C398E] hover:text-white">
                        <HelpCircle className="w-5 h-5" />
                    </button></Link>
                </div>

                {/* Main Content */}
                <div className="flex-1 py-10 px-6 z-10 mt-24 md:ml-24">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PatientLayout;