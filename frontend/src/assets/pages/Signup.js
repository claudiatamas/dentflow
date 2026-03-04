import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    birth_date: '',
    gender: '',
  });

  const navigate = useNavigate();

  // Handle all input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Account created successfully!');
        navigate('/login');
      } else {
        const errorData = await response.json();
        alert(`Signup failed: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left form section */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between px-6 sm:px-16 py-8 bg-white">
          <div className="mb-2">
            <Link to="/" className="inline-block transition-transform duration-300 hover:scale-105">
              <img src="/images/logo.png" alt="Dentflow Logo" className="h-12 w-auto" />
            </Link>
          </div>

          <div className="flex flex-col justify-center flex-1 max-w-lg w-[90%] sm:w-[80%] mx-4 sm:mx-16 mt-12 sm:mt-2">
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-800 mb-4">Create an account</h2>
            <p className="text-sm sm:text-lg text-gray-600 mb-10">
              Register to simplify your dental care experience.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                  placeholder="you@example.com"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="flex gap-6">
                  <label className="text-sm flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={formData.role === 'patient'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Patient
                  </label>
                  <label className="text-sm flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="doctor"
                      checked={formData.role === 'doctor'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Doctor
                  </label>
                </div>
              </div>

              {/* Birth date and Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    id="birth_date"
                    name="birth_date"
                    type="date"
                    required
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  className="cursor-pointer w-full bg-[#4ba8fa] hover:bg-[#0d68b8] text-white text-lg py-3 rounded-xl transition duration-300"
                >
                  Sign Up
                </button>
              </div>

              <p className="text-sm text-center text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-[#4ba8fa] hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Right image section */}
        <div className="hidden lg:flex w-1/2 p-8">
          <div className="w-full h-full rounded-xl shadow-md overflow-hidden">
            <img
              src="/images/header2.jpg"
              alt="Dentflow visual"
              className="w-full h-[761px] object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
