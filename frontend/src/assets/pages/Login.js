import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === 'email') setEmail(value);
    if (id === 'password') setPassword(value);
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);

      const user = jwtDecode(data.access_token);
      console.log('Logged in user:', user);
      console.log('User role:', user.role);

      const redirectUrl = data.redirect;
      if (redirectUrl) {
        setTimeout(() => {
            navigate(redirectUrl);
          }, 100);

      } else {
        throw new Error('No redirect URL provided');
      }
      console.log('Login response data:', data);
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(error.message);
    }

    
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between px-6 sm:px-16 py-8 bg-white">
          {/* Logo */}
          <div className="mb-4">
            <Link to="/" className="inline-block transition-transform duration-300 hover:scale-105 mx-0 sm:mx-10">
              <img src="/images/logo.png" alt="Dentflow Logo" className="h-12 w-auto" />
            </Link>
          </div>

          {/* Login Form */}
          <div className="flex flex-col justify-center flex-1 max-w-lg w-[90%] sm:w-[80%] mx-4 sm:mx-16 mt-20 sm:mt-2">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-800 mb-6">Hello, <br></br> Let's get started.</h2>
            <p className="text-lg text-gray-600 mb-16">Log in to manage your dental appointments and more.</p>

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ba8fa] focus:border-[#4ba8fa] transition"
                  placeholder="you@example.com"
                  value={email}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ba8fa] focus:border-[#4ba8fa] transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={handleInputChange}
                />
              </div>

              {/* Error message */}
              {errorMessage && <p className="text-red-600 text-sm mt-2">{errorMessage}</p>}

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="cursor-pointer w-full bg-[#4ba8fa] hover:bg-[#0d68b8] text-white text-lg py-3 rounded-xl transition duration-300"
                >
                  Log In
                </button>
              </div>

              <p className="text-sm text-center text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="text-[#4ba8fa] hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Right Side - Image */}
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

export default Login;