import React, { useEffect, useState } from "react";
import { FiUser, FiMail, FiBriefcase, FiPhone, FiMapPin, FiCalendar, FiInfo, FiEdit, FiSave, FiX, FiTrash2, FiAlertTriangle } from "react-icons/fi";
import DashboardLayout from "../components/DashboardLayout";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("No access token found, please login.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/me", {
          headers: { Authorization: "Bearer " + token },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Unauthorized. Please login again.");
          } else {
            setError("Failed to fetch user data");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setUser(data);
        setFormData(data); 
      } catch (err) {
        setError("Network error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleEditToggle = () => {
    setSaveError(null);
    setFormData(user);  
    setEditing(!editing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDoctorInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      doctor: { ...prev.doctor, [name]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const token = localStorage.getItem("access_token");
    
    try {
      const formDataToSend = new FormData();
      
      if (formData.first_name) formDataToSend.append("first_name", formData.first_name);
      if (formData.last_name) formDataToSend.append("last_name", formData.last_name);
      if (formData.email) formDataToSend.append("email", formData.email);
      if (formData.phone) formDataToSend.append("phone", formData.phone);
      if (formData.gender) formDataToSend.append("gender", formData.gender);
      if (formData.country) formDataToSend.append("country", formData.country);
      if (formData.county) formDataToSend.append("county", formData.county);
      if (formData.city) formDataToSend.append("city", formData.city);
      if (formData.address) formDataToSend.append("address", formData.address);
      if (formData.birth_date) formDataToSend.append("birth_date", formData.birth_date);
      if (formData.status) formDataToSend.append("status", formData.status);
      
      if (formData.role === "doctor" && formData.doctor) {
        if (formData.doctor.specialty) formDataToSend.append("specialty", formData.doctor.specialty);
        if (formData.doctor.description) formDataToSend.append("description", formData.doctor.description);
        if (formData.doctor.accreditation) formDataToSend.append("accreditation", formData.doctor.accreditation);
      }
      
      if (selectedFile) {
        formDataToSend.append("profile_picture", selectedFile);
      }

      const response = await fetch("http://localhost:8000/me", {
        method: "PUT", 
        headers: {
          Authorization: "Bearer " + token,
        },
        body: formDataToSend,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setSaveError(errorData.detail || "Failed to save profile");
      } else {
        const userResponse = await fetch("http://localhost:8000/me", {
          headers: { Authorization: "Bearer " + token },
        });
        
        if (userResponse.ok) {
          const updatedUser = await userResponse.json();
          setUser(updatedUser);
          setFormData(updatedUser);
        }
        
        setEditing(false);
        setSelectedFile(null); 
      }
    } catch (err) {
      setSaveError("Network error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      return;
    }

    setDeleting(true);
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch("http://localhost:8000/me", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || "Failed to delete account");
      } else {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    } catch (err) {
      alert("Network error: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
        <div className="text-red-600 text-center font-semibold">{error}</div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
    <div className="min-h-screen   px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32"></div>
          <div className="px-8 py-6 pb-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white">
                  <img
                    src={selectedFile ? URL.createObjectURL(selectedFile) : (user.profile_picture || '/default-profile.png')}
                    alt="Profile"
                    className="object-cover w-full h-full"
                  />
                </div>
                {editing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg transition">
                    <FiEdit size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left mt-12">
                {editing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name || ""}
                        onChange={handleInputChange}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
                        placeholder="First Name"
                      />
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name || ""}
                        onChange={handleInputChange}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1"
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {user.first_name} {user.last_name}
                  </h1>
                )}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-gray-600 py-2">
                  <div className="flex items-center gap-2">
                    <FiMail className="text-blue-600" />
                    {editing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ""}
                        onChange={handleInputChange}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Email"
                      />
                    ) : (
                      <span>{user.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <FiBriefcase className="text-blue-600" />
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {capitalize(user.role)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!editing ? (
                  <button
                    onClick={handleEditToggle}
                    className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    <FiEdit /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md disabled:opacity-50"
                    >
                      <FiSave /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setSelectedFile(null);
                        setSaveError(null);
                      }}
                      disabled={saving}
                      className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition shadow-md"
                    >
                      <FiX /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            {saveError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {saveError}
              </div>
            )}
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
              icon={<FiPhone />}
              label="Phone"
              name="phone"
              value={formData.phone || ""}
              editing={editing}
              onChange={handleInputChange}
            />
            <InfoCard
              icon={<FiUser />}
              label="Gender"
              name="gender"
              value={formData.gender || ""}
              editing={editing}
              onChange={handleInputChange}
            />
            <InfoCard
              icon={<FiCalendar />}
              label="Birth Date"
              name="birth_date"
              value={formData.birth_date || ""}
              editing={editing}
              onChange={handleInputChange}
              type="date"
            />
        
          </div>

          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-6">Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
              icon={<FiMapPin />}
              label="Country"
              name="country"
              value={formData.country || ""}
              editing={editing}
              onChange={handleInputChange}
            />
            <InfoCard
              icon={<FiMapPin />}
              label="County"
              name="county"
              value={formData.county || ""}
              editing={editing}
              onChange={handleInputChange}
            />
            <InfoCard
              icon={<FiMapPin />}
              label="City"
              name="city"
              value={formData.city || ""}
              editing={editing}
              onChange={handleInputChange}
            />
            <InfoCard
              icon={<FiMapPin />}
              label="Address"
              name="address"
              value={formData.address || ""}
              editing={editing}
              onChange={handleInputChange}
            />
          </div>

          {formData.role === "doctor" && formData.doctor && (
            <>
              <h3 className="text-xl font-bold text-gray-900 mt-8 mb-6">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoCard
                  icon={<FiBriefcase />}
                  label="Specialty"
                  name="specialty"
                  value={formData.doctor.specialty || ""}
                  editing={editing}
                  onChange={handleDoctorInputChange}
                />
                <InfoCard
                  icon={<FiInfo />}
                  label="Accreditation"
                  name="accreditation"
                  value={formData.doctor.accreditation || ""}
                  editing={editing}
                  onChange={handleDoctorInputChange}
                />
                <div className="md:col-span-2">
                  <InfoCard
                    icon={<FiInfo />}
                    label="Description"
                    name="description"
                    value={formData.doctor.description || ""}
                    editing={editing}
                    onChange={handleDoctorInputChange}
                    textarea
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mt-6 border-2 border-red-200">
          <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
            <FiAlertTriangle /> Delete Account
          </h2>
          <p className="text-gray-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md"
          >
            <FiTrash2 /> Delete Account
          </button>
        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <FiAlertTriangle className="text-red-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Account</h2>
              </div>
              <p className="text-gray-600 mb-4">
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </p>
              <p className="text-gray-700 font-semibold mb-2">
                Type <span className="text-red-600 font-mono">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none mb-4"
                placeholder="Type DELETE"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div></DashboardLayout>
  );
};

const InfoCard = ({ icon, label, name, value, editing, onChange, type = "text", textarea = false }) => (
  <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
    <div className="flex items-start gap-3">
      <div className="text-blue-600 text-xl mt-1">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-blue-600 uppercase font-semibold tracking-wide mb-1">{label}</p>
        {editing ? (
          name === "gender" ? (
          <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        ) : textarea ? (
            <textarea
              name={name}
              value={value}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder={label}
              rows={3}
            />
          ) : (
            <input
              type={type}
              name={name}
              value={value}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder={label}
            />
          )
        ) : (
          <p className="text-gray-800 font-medium">
            {type === "date" ? formatDate(value) : capitalize(value) || "Not specified"}
          </p>
        )}
      </div>
    </div>

  </div>
  
);

const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "Not specified";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
};

export default Profile;