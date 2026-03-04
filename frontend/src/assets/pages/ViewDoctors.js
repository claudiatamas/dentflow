import React, { useEffect, useState } from "react";
import axios from "axios";
import PatientLayout from "../components/PatientLayout";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import MakeAppointmentModal from "../components/MakeAppointmentModal";
import { useNavigate } from "react-router-dom";

const ViewDoctors = () => {
  const navigate = useNavigate(); 
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const doctorsPerPage = 10;
  
  

  const [filters, setFilters] = useState({
    specialty: "",
    gender: "",
    country: "",
    county: "",
    city: "",
    ageRanges: []
  });
  const [showMakeAppointmentModal, setShowMakeAppointmentModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);


  const handleBookAppointment = (doctor) => {
    setSelectedDoctor(doctor);
    setShowMakeAppointmentModal(true);
  };

  // Age range options
  const ageRangeOptions = [
    { label: "25-35", min: 25, max: 35 },
    { label: "35-45", min: 35, max: 45 },
    { label: "45-55", min: 45, max: 55 },
    { label: "55-65", min: 55, max: 65 },
    { label: "65+", min: 65, max: 150 }
  ];


  const [filterOptions, setFilterOptions] = useState({
    specialties: [],
    countries: [],
    counties: [],
    cities: []
  });


  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;

    
  };
  
useEffect(() => {
  const fetchUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login'); 
      return;  
    }

    try {
      const response = await fetch('http://localhost:8000/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!response.ok) {
        localStorage.removeItem('access_token');
        navigate('/login');
        return;
      }

      const data = await response.json();
      setCurrentUser(data); 
    } catch (error) {
      console.error('Fetch error:', error);
      localStorage.removeItem('access_token');
      navigate('/login');
    }
  };

  fetchUser();
}, [navigate]);


  // Fetch doctors from API
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await axios.get("http://localhost:8000/doctors", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        
        
        const doctorsWithAge = response.data.map(doctor => ({
          ...doctor,
          age: calculateAge(doctor.date_of_birth)
        }));
        
        setDoctors(doctorsWithAge);
        setFilteredDoctors(doctorsWithAge);
        
        
        const specialties = [...new Set(response.data.map(d => d.specialty).filter(Boolean))];
        const countries = [...new Set(response.data.map(d => d.country).filter(Boolean))];
        const counties = [...new Set(response.data.map(d => d.county).filter(Boolean))];
        const cities = [...new Set(response.data.map(d => d.city).filter(Boolean))];
        
        setFilterOptions({ specialties, countries, counties, cities });
      } catch (error) {
        console.error("Error fetching doctors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Apply search and filters
  useEffect(() => {
    let result = [...doctors];

    // Search filter
    if (searchTerm) {
      result = result.filter(doctor => 
        `${doctor.first_name} ${doctor.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Advanced filters
    if (filters.specialty) {
      result = result.filter(d => d.specialty === filters.specialty);
    }
    if (filters.gender) {
      result = result.filter(d => d.gender === filters.gender);
    }
    if (filters.country) {
      result = result.filter(d => d.country === filters.country);
    }
    if (filters.county) {
      result = result.filter(d => d.county === filters.county);
    }
    if (filters.city) {
      result = result.filter(d => d.city === filters.city);
    }
    
    // Age range filter
    if (filters.ageRanges.length > 0) {
      result = result.filter(doctor => {
        if (!doctor.age) return false;
        return filters.ageRanges.some(range => 
          doctor.age >= range.min && doctor.age <= range.max
        );
      });
    }

    setFilteredDoctors(result);
    setCurrentPage(1); 
  }, [searchTerm, filters, doctors]);

 

  const resetFilters = () => {
    setFilters({
      specialty: "",
      gender: "",
      country: "",
      county: "",
      city: "",
      ageRanges: []
    });
  };

  const applyFilters = () => {
    setShowFilterModal(false);
  };

  const toggleAgeRange = (range) => {
    setFilters(prev => {
      const isSelected = prev.ageRanges.some(r => r.label === range.label);
      if (isSelected) {
        return {
          ...prev,
          ageRanges: prev.ageRanges.filter(r => r.label !== range.label)
        };
      } else {
        return {
          ...prev,
          ageRanges: [...prev.ageRanges, range]
        };
      }
    });
  };

  const activeFilterCount = 
    (filters.specialty ? 1 : 0) +
    (filters.gender ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.county ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.ageRanges.length > 0 ? 1 : 0);

  // Pagination calculations
  const indexOfLastDoctor = currentPage * doctorsPerPage;
  const indexOfFirstDoctor = indexOfLastDoctor - doctorsPerPage;
  const currentDoctors = filteredDoctors.slice(indexOfFirstDoctor, indexOfLastDoctor);
  const totalPages = Math.ceil(filteredDoctors.length / doctorsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <PatientLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading doctors...</p>
          </div>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      <div className="min-h-screen rounded-lg bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 ">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Find the Right Doctor
            </h1>
            <p className="text-gray-600">Discover and book appointments with top specialists</p>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search doctor, specialty, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-[300px] pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilterModal(true)}
                className="cursor-pointer relative flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700  transition-all shadow-md hover:shadow-lg"
              >
                <Filter className="w-5 h-5" />
                <span className="font-medium">Advanced Filters</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.specialty && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Specialty: {filters.specialty}
                    <button
                      onClick={() => setFilters({...filters, specialty: ""})}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.gender && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Gender: {filters.gender === 'male' ? 'Male' : 'Female'}
                    <button
                      onClick={() => setFilters({...filters, gender: ""})}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.country && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Country: {filters.country}
                    <button
                      onClick={() => setFilters({...filters, country: ""})}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.county && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    County: {filters.county}
                    <button
                      onClick={() => setFilters({...filters, county: ""})}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.city && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    City: {filters.city}
                    <button
                      onClick={() => setFilters({...filters, city: ""})}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.ageRanges.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Age: {filters.ageRanges.map(r => r.label).join(', ')}
                    <button
                      onClick={() => setFilters({...filters, ageRanges: []})}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={resetFilters}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {indexOfFirstDoctor + 1}-{Math.min(indexOfLastDoctor, filteredDoctors.length)} of {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'}
            </p>
          </div>

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className="mb-6 bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col"
              >
                {/* Doctor Image */}
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                  {doctor.profile_picture ? (
                    <img
                      src={doctor.profile_picture}
                      alt={`${doctor.first_name} ${doctor.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-6xl font-bold text-gray-300">
                        {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                      </div>
                    </div>
                  )}
                  {doctor.specialty && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-blue-600">
                      {doctor.specialty}
                    </div>
                  )}
                </div>

                {/* Doctor Info */}
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h2>
                  
                  {doctor.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {doctor.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4 flex-1">
                    {doctor.email && (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="text-blue-600">📧</span> {doctor.email}
                      </p>
                    )}
                    {doctor.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="text-blue-600">📞</span> {doctor.phone}
                      </p>
                    )}
                    {(doctor.address || doctor.city || doctor.county || doctor.country) && (
                      <p className="text-sm text-gray-500 flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">📍</span>
                        <span>
                          {[doctor.address, doctor.city, doctor.county, doctor.country]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </p>
                    )}
                    {doctor.gender && (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="text-blue-600">👤</span>
                        {doctor.gender === 'male' ? 'Male' : doctor.gender === 'female' ? 'Female' : doctor.gender}
                      </p>
                    )}
                    {doctor.age && (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="text-blue-600">🎂</span>
                        {doctor.age} years old
                      </p>
                    )}
                  </div>

                  {doctor.accreditation && (
                    <div className="mb-4 p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-700 font-medium">
                        ✓ {doctor.accreditation}
                      </p>
                    </div>
                  )}

                  {/* Book Button */}
                 <button
                      onClick={() => handleBookAppointment(doctor)}
                      className="cursor-pointer w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700  transition-all shadow-md hover:shadow-lg mt-auto"
                    >
                      Book Appointment
                    </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300'
                }`}
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex gap-2">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`cursor-pointer w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === pageNumber
                            ? 'bg-blue-600  text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return (
                      <span key={pageNumber} className="w-10 h-10 flex items-center justify-center text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300'
                }`}
              >
                Next
              </button>
            </div>
          )}

          {filteredDoctors.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No doctors found
              </h3>
              <p className="text-gray-600 mb-4">
                Try modifying your search criteria or filters
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  resetFilters();
                }}
                className="cursor-pointer px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Reset search
              </button>
            </div>
          )}
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="mt-24 bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Advanced Filters</h2>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="cursor-pointer w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Specialty */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Specialty
                  </label>
                  <select
                    value={filters.specialty}
                    onChange={(e) => setFilters({...filters, specialty: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All specialties</option>
                    {filterOptions.specialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={filters.gender}
                    onChange={(e) => setFilters({...filters, gender: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {/* Age Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Age Range
                  </label>
                  <div className="space-y-2">
                    {ageRangeOptions.map((range) => (
                      <label
                        key={range.label}
                        className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-blue-300 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.ageRanges.some(r => r.label === range.label)}
                          onChange={() => toggleAgeRange(range)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700 font-medium">{range.label} years</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Country */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={filters.country}
                      onChange={(e) => setFilters({...filters, country: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">All</option>
                      {filterOptions.countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  {/* County */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      County
                    </label>
                    <select
                      value={filters.county}
                      onChange={(e) => setFilters({...filters, county: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">All</option>
                      {filterOptions.counties.map(county => (
                        <option key={county} value={county}>{county}</option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City
                    </label>
                    <select
                      value={filters.city}
                      onChange={(e) => setFilters({...filters, city: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">All</option>
                      {filterOptions.cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-4">
                <button
                  onClick={resetFilters}
                  className="cursor-pointer flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={applyFilters}
                  className="cursor-pointer flex-1 px-6 py-3 bg-blue-600  text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

     {showMakeAppointmentModal && (
      <MakeAppointmentModal
        isOpen={showMakeAppointmentModal}
        onClose={() => setShowMakeAppointmentModal(false)}
        initialDoctorId={selectedDoctor.doctorId} 
        patientId={currentUser?.id}
      />
      )}
    </PatientLayout>

    
  );
};

export default ViewDoctors;