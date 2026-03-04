import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { X } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const AdminUserManagement = () => {
  const [activeTab, setActiveTab] = useState('doctors');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    gender: '',
    role: 'doctor',
    country: '',
    county: '',
    city: '',
    address: '',
    birth_date: '',
    status: 'active',
    specialty: '',
    description: '',
    accreditation: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const getToken = () => localStorage.getItem('access_token');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const roleMap = {
        doctors: 'doctor',
        patients: 'patient',
        admins: 'administrator'
      };
      
      const response = await fetch(
        `${API_URL}/admin/users?user_type=${roleMap[activeTab]}`,
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      gender: '',
      role: activeTab === 'doctors' ? 'doctor' : activeTab === 'patients' ? 'patient' : 'administrator',
      country: '',
      county: '',
      city: '',
      address: '',
      birth_date: '',
      status: 'active',
      specialty: '',
      description: '',
      accreditation: '',
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      gender: user.gender || '',
      role: user.role,
      country: user.country || '',
      county: user.county || '',
      city: user.city || '',
      address: user.address || '',
      birth_date: user.birth_date ? user.birth_date.split('T')[0] : '',
      status: user.status || 'active',
      specialty: user.doctor?.specialty || '',
      description: user.role === 'doctor' ? (user.doctor?.description || '') : (user.patient?.description || ''),
      accreditation: user.doctor?.accreditation || '',
    });
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create user');
      }

      alert('User created successfully!');
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const updatePayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        country: formData.country,
        county: formData.county,
        city: formData.city,
        address: formData.address,
        birth_date: formData.birth_date,
        status: formData.status,
      };

      if (formData.role === 'doctor') {
        updatePayload.doctor = {
          specialty: formData.specialty,
          description: formData.description,
          accreditation: formData.accreditation,
        };
      } else if (formData.role === 'patient') {
        updatePayload.patient = {
          description: formData.description,
        };
      }

      const response = await fetch(`${API_URL}/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update user');
      }

      alert('User updated successfully!');
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete user');
      }

      alert('User deleted successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 rounded-xl">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage doctors, patients, and administrators
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-2">
              {[
                { key: 'doctors', icon: '👨‍⚕️', label: 'Doctors' },
                { key: 'patients', icon: '🏥', label: 'Patients' },
                { key: 'admins', icon: '⚙️', label: 'Admins' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    cursor-pointer flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg
                    font-semibold text-sm transition-all duration-200
                    ${activeTab === tab.key
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {activeTab === tab.key && (
                    <span className="bg-white text-blue-500 px-2 py-0.5 rounded-full text-xs font-bold">
                      {users.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg 
                         text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 
                         focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            {/* Create Button */}
            <button
              onClick={openCreateModal}
              className="cursor-pointer flex items-center justify-center gap-2 px-6 py-3 
                       bg-blue-500 rounded-lg text-white font-semibold shadow-md
                       hover:bg-blue-600 hover:shadow-lg transition-all"
            >
              <span className="text-xl font-bold">+</span>
              <span>
                Add New {activeTab === 'doctors' ? 'Doctor' : activeTab === 'patients' ? 'Patient' : 'Admin'}
              </span>
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="text-6xl mb-4 opacity-50">📭</span>
                <h3 className="text-xl font-bold text-gray-700 mb-2">No users found</h3>
                <p className="text-gray-500">Start by creating a new user</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                        Phone
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                        Gender
                      </th>
                      {activeTab === 'doctors' && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                          Specialty
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.profile_picture ? (
                              <img
                                src={user.profile_picture}
                                alt={`${user.first_name} ${user.last_name}`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                                            flex items-center justify-center text-white font-semibold text-sm">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </div>
                            )}
                            <span className="font-semibold text-gray-900">
                              {user.first_name} {user.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{user.email}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{user.phone || '-'}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{user.gender || '-'}</td>
                        {activeTab === 'doctors' && (
                          <td className="px-6 py-4 text-gray-600 text-sm">{user.doctor?.specialty || '-'}</td>
                        )}
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {user.city ? `${user.city}, ${user.county}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`
                              inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase
                              ${user.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : user.status === 'inactive'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-red-100 text-red-700'
                              }
                            `}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              title="Edit"
                              className="cursor-pointer w-9 h-9 flex items-center justify-center bg-gray-100 
                                       rounded-lg hover:bg-blue-100 transition-colors text-lg"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              title="Delete"
                              className="cursor-pointer w-9 h-9 flex items-center justify-center bg-gray-100 
                                       rounded-lg hover:bg-red-100 transition-colors text-lg"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal */}
          {showModal && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowModal(false)}
            >
              <div
                className="mt-24 bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between z-10">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalMode === 'create' ? 'Create New User' : 'Edit User'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="cursor-pointer w-9 h-9 flex items-center justify-center bg-gray-100 
                             rounded-lg text-gray-600 hover:bg-red-100 hover:text-red-600 
                             transition-all text-2xl"
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={modalMode === 'create' ? handleCreate : handleUpdate} className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase pb-2 border-b-2 border-gray-200">
                        Basic Information
                      </h3>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      {modalMode === 'create' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                            Password *
                          </label>
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            minLength="6"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                     focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          Gender
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          <option value="">Select...</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          Birth Date
                        </label>
                        <input
                          type="date"
                          name="birth_date"
                          value={formData.birth_date}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>

                    {/* Location & Role-Specific */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase pb-2 border-b-2 border-gray-200">
                        Location
                      </h3>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          County
                        </label>
                        <input
                          type="text"
                          name="county"
                          value={formData.county}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                          Address
                        </label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          rows="3"
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-y"
                        />
                      </div>

                      {/* Doctor-specific fields */}
                      {formData.role === 'doctor' && (
                        <>
                          <h3 className="text-sm font-semibold text-gray-700 uppercase pb-2 border-b-2 border-gray-200 mt-6">
                            Doctor Information
                          </h3>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                              Specialty
                            </label>
                            <input
                              type="text"
                              name="specialty"
                              value={formData.specialty}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                       focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                              Description
                            </label>
                            <textarea
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              rows="3"
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                       focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-y"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                              Accreditation
                            </label>
                            <input
                              type="text"
                              name="accreditation"
                              value={formData.accreditation}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                       focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                          </div>
                        </>
                      )}

                      {/* Patient-specific fields */}
                      {formData.role === 'patient' && (
                        <>
                          <h3 className="text-sm font-semibold text-gray-700 uppercase pb-2 border-b-2 border-gray-200 mt-6">
                            Patient Information
                          </h3>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                              Description
                            </label>
                            <textarea
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              rows="4"
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 
                                       focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-y"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="cursor-pointer px-6 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 
                               font-semibold hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cursor-pointer px-6 py-2.5 bg-blue-500 rounded-lg text-white 
                               font-semibold shadow-md hover:bg-blue-600 hover:shadow-lg transition-all"
                    >
                      {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUserManagement;