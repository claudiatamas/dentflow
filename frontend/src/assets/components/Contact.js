import React, { useState } from "react";

const Contact = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "email") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailError(emailPattern.test(value) ? "" : "Please enter a valid email address.");
    }
  };

  const validateForm = () => {
    const { firstName, lastName, email, message } = formData;
    if (!firstName || !lastName || !email || !message) {
      setErrorMessage("All fields are required.");
      return false;
    }
    if (emailError) {
      setErrorMessage(emailError);
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSuccessMessage("Your message has been sent successfully!");
    setFormData({ firstName: "", lastName: "", email: "", message: "" });
    setEmailError("");
  };

  return (
    <div className="min-h-screen bg-white py-20 px-6 md:px-44 mt-10">
      <div className="grid grid-cols-1 md:grid-cols-2  items-stretch min-h-[600px]">
        {/* Formularul de contact */}
        <div className="bg-white p-8 rounded-l-xl shadow-xl flex flex-col justify-between h-full">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 text-[#1E2939]">Contact Us</h2>
            <p className="text-lg text-gray-600 mb-6">
              If you have any questions or inquiries, feel free to reach out. We’re happy to assist!
            </p>
            {successMessage && <p className="text-green-600">{successMessage}</p>}
            {errorMessage && <p className="text-red-600">{errorMessage}</p>}
          </div>

          <form className="space-y-6 mt-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {emailError && <p className="text-red-600">{emailError}</p>}
            <textarea
              name="message"
              placeholder="Message"
              rows="4"
              value={formData.message}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ></textarea>
            <button
              type="submit"
              className="w-full py-3 mt-4 rounded-lg bg-gradient-to-r from-[#52a1fa] to-[#00B2FF] text-white font-semibold focus:outline-none transition-all duration-300 transform hover:scale-105"
            >
              Send Message
            </button>
          </form>
        </div>

        {/* Harta Google */}
        <div className="w-full h-full rounded-r-xl overflow-hidden shadow-xl">
        <iframe
            title="DentFlow Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2703.229877961333!2d23.589860015622724!3d47.66029737918601!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47490f30b74c50a3%3A0x50c2b65df2024c46!2sStrada%20Nicolae%20Iorga%2C%20Baia%20Mare%2C%20Romania!5e0!3m2!1sen!2sro!4v1715095510891!5m2!1sen!2sro"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            />

        </div>
      </div>
    </div>
  );
};

export default Contact;
