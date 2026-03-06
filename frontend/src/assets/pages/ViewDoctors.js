import React, { useEffect, useState } from "react";
import axios from "axios";
import PatientLayout from "../components/PatientLayout";
import { Search, Filter, X, MapPin, Phone, Mail, User, ChevronLeft, ChevronRight, AlertCircle, Star } from "lucide-react";
import MakeAppointmentModal from "../components/MakeAppointmentModal";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000";


// ── Modal Shell ───────────────────────────────────────────────
const ModalShell = ({ isOpen, onClose, title, children, maxW = 'max-w-xl' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-base font-semibold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
};

// ── Star display ──────────────────────────────────────────────
const StarDisplay = ({ value, size = 12 }) => (
    <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
            <Star key={i} size={size}
                className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
        ))}
    </div>
);

// ── Reviews Modal ─────────────────────────────────────────────
const ReviewsModal = ({ isOpen, onClose, doctor }) => {
    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        
        if (!isOpen || !doctor) return;
        setLoading(true);
        Promise.all([
            fetch(`${API}/doctor-reviews/${doctor.doctorId}`).then(r => r.json()),
            fetch(`${API}/doctor-reviews/${doctor.doctorId}/summary`).then(r => r.json()),
        ])
            .then(([r, s]) => { setReviews(Array.isArray(r) ? r : []); setSummary(s); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isOpen, doctor]);

    const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <ModalShell isOpen={isOpen} onClose={onClose}
            title={`Reviews — Dr. ${doctor?.first_name} ${doctor?.last_name}`}
            maxW="max-w-lg">

            {/* Summary */}
            {summary && summary.total_reviews > 0 && (
                <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-xl mb-5">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-gray-800">{summary.average_stars}</p>
                        <StarDisplay value={summary.average_stars} size={14} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-700">Overall rating</p>
                        <p className="text-xs text-gray-400">{summary.total_reviews} review{summary.total_reviews !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-10">
                    <Star size={28} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No reviews yet for this doctor.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reviews.map(r => (
                        <div key={r.id} className="p-4 border border-gray-100 rounded-xl">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{r.patient_name || 'Patient'}</p>
                                    <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                                </div>
                                <StarDisplay value={r.stars} size={12} />
                            </div>
                            {r.message && <p className="text-sm text-gray-600 leading-relaxed">{r.message}</p>}
                        </div>
                    ))}
                </div>
            )}
        </ModalShell>
    );
};

// ── Rating Badge (inline on card) ─────────────────────────────
const RatingBadge = ({ doctorUserId, onSeeReviews }) => {
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        fetch(`${API}/doctor-reviews/${doctorUserId}/summary`)
            .then(r => r.json())
            .then(setSummary)
            .catch(() => {});
    }, [doctorUserId]);

    if (!summary) return null;

    if (summary.total_reviews === 0) return (
        <p className="text-xs text-gray-300 italic">No reviews yet</p>
    );

    return (
        <div className="flex items-center gap-2">
            <StarDisplay value={summary.average_stars} size={12} />
            <span className="text-xs font-bold text-gray-700">{summary.average_stars}</span>
            <button onClick={e => { e.stopPropagation(); onSeeReviews(); }}
                className="cursor-pointer text-xs text-[#1C398E] font-semibold hover:underline ml-auto">
                See reviews ({summary.total_reviews})
            </button>
        </div>
    );
};

const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all appearance-none";
const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2";

const ViewDoctors = () => {
    const navigate = useNavigate();
    const [doctors, setDoctors]                 = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [error, setError]                     = useState(null);
    const [searchTerm, setSearchTerm]           = useState("");
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [currentPage, setCurrentPage]         = useState(1);
    const [currentUser, setCurrentUser]         = useState(null);
    const doctorsPerPage = 12;

    const [filters, setFilters]       = useState({ specialty: "", gender: "", country: "", county: "", city: "", ageRanges: [] });
    const [showMakeAppointmentModal, setShowMakeAppointmentModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor]   = useState(null);
    const [filterOptions, setFilterOptions]     = useState({ specialties: [], countries: [], counties: [], cities: [] });
    const [reviewsDoctor, setReviewsDoctor]     = useState(null); // doctor whose reviews modal is open

    const ageRangeOptions = [
        { label: "25–35", min: 25, max: 35 },
        { label: "35–45", min: 35, max: 45 },
        { label: "45–55", min: 45, max: 55 },
        { label: "55–65", min: 55, max: 65 },
        { label: "65+",   min: 65, max: 150 },
    ];

    const calculateAge = (dob) => {
        if (!dob) return null;
        const today = new Date(), birth = new Date(dob);
        let age = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
        return age;
    };

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) { navigate('/login'); return; }
            try {
                const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) { localStorage.removeItem('access_token'); navigate('/login'); return; }
                setCurrentUser(await res.json());
            } catch { localStorage.removeItem('access_token'); navigate('/login'); }
        };
        fetchUser();
    }, [navigate]);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const res = await axios.get(`${API}/doctors`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
                });
                console.log("Doctor object:", res.data[0]);
                const withAge = res.data.map(d => ({ ...d, age: calculateAge(d.date_of_birth) }));
                setDoctors(withAge);
                setFilteredDoctors(withAge);
                setFilterOptions({
                    specialties: [...new Set(res.data.map(d => d.specialty).filter(Boolean))],
                    countries:   [...new Set(res.data.map(d => d.country).filter(Boolean))],
                    counties:    [...new Set(res.data.map(d => d.county).filter(Boolean))],
                    cities:      [...new Set(res.data.map(d => d.city).filter(Boolean))],
                });
            } catch {
                setError("Could not load doctors. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    useEffect(() => {
        let result = [...doctors];
        if (searchTerm) result = result.filter(d =>
            `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.city?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filters.specialty) result = result.filter(d => d.specialty === filters.specialty);
        if (filters.gender)    result = result.filter(d => d.gender === filters.gender);
        if (filters.country)   result = result.filter(d => d.country === filters.country);
        if (filters.county)    result = result.filter(d => d.county === filters.county);
        if (filters.city)      result = result.filter(d => d.city === filters.city);
        if (filters.ageRanges.length > 0)
            result = result.filter(d => d.age && filters.ageRanges.some(r => d.age >= r.min && d.age <= r.max));
        setFilteredDoctors(result);
        setCurrentPage(1);
    }, [searchTerm, filters, doctors]);

    const resetFilters = () => setFilters({ specialty: "", gender: "", country: "", county: "", city: "", ageRanges: [] });
    const toggleAgeRange = (range) => setFilters(prev => {
        const exists = prev.ageRanges.some(r => r.label === range.label);
        return { ...prev, ageRanges: exists ? prev.ageRanges.filter(r => r.label !== range.label) : [...prev.ageRanges, range] };
    });

    const activeFilterCount =
        (filters.specialty ? 1 : 0) + (filters.gender ? 1 : 0) + (filters.country ? 1 : 0) +
        (filters.county ? 1 : 0) + (filters.city ? 1 : 0) + (filters.ageRanges.length > 0 ? 1 : 0);

    const indexOfLast    = currentPage * doctorsPerPage;
    const indexOfFirst   = indexOfLast - doctorsPerPage;
    const currentDoctors = filteredDoctors.slice(indexOfFirst, indexOfLast);
    const totalPages     = Math.ceil(filteredDoctors.length / doctorsPerPage);
    const paginate       = (page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    const FilterPill = ({ label, onRemove }) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1C398E]/8 text-[#1C398E] border border-[#1C398E]/20 rounded-lg text-xs font-semibold">
            {label}
            <button onClick={onRemove} className="cursor-pointer hover:bg-[#1C398E]/15 rounded p-0.5 transition-colors"><X size={11} /></button>
        </span>
    );

    if (loading) return (
        <PatientLayout>
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
            </div>
        </PatientLayout>
    );

    return (
        <PatientLayout>
            {/* Filter Modal */}
            <ModalShell isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Advanced Filters">
                <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Specialty</label>
                            <select value={filters.specialty} onChange={e => setFilters({ ...filters, specialty: e.target.value })} className={inputCls}>
                                <option value="">All specialties</option>
                                {filterOptions.specialties.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Gender</label>
                            <select value={filters.gender} onChange={e => setFilters({ ...filters, gender: e.target.value })} className={inputCls}>
                                <option value="">All</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Country</label>
                            <select value={filters.country} onChange={e => setFilters({ ...filters, country: e.target.value })} className={inputCls}>
                                <option value="">All</option>
                                {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>County</label>
                            <select value={filters.county} onChange={e => setFilters({ ...filters, county: e.target.value })} className={inputCls}>
                                <option value="">All</option>
                                {filterOptions.counties.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelCls}>City</label>
                            <select value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} className={inputCls}>
                                <option value="">All</option>
                                {filterOptions.cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Age Range</label>
                        <div className="flex flex-wrap gap-2">
                            {ageRangeOptions.map(range => {
                                const selected = filters.ageRanges.some(r => r.label === range.label);
                                return (
                                    <button key={range.label} onClick={() => toggleAgeRange(range)}
                                        className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                                            selected ? 'bg-[#1C398E] text-white border-[#1C398E]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#1C398E]/40'
                                        }`}>
                                        {range.label} yrs
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button onClick={resetFilters} className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">Reset</button>
                        <button onClick={() => setShowFilterModal(false)} className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition">Apply Filters</button>
                    </div>
                </div>
            </ModalShell>

            {/* Reviews Modal */}
            <ReviewsModal
                isOpen={!!reviewsDoctor}
                onClose={() => setReviewsDoctor(null)}
                doctor={reviewsDoctor}
            />

            <div className="space-y-5">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Find a Doctor</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Discover and book appointments with top specialists</p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                        <AlertCircle size={15} /> {error}
                    </div>
                )}

                <div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by name, specialty, city..."
                                className="w-[300px] pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all" />
                        </div>
                        <button onClick={() => setShowFilterModal(true)}
                            className="cursor-pointer relative flex items-center gap-2 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition shadow-sm flex-shrink-0">
                            <Filter size={14} /> Filters
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
                            )}
                        </button>
                    </div>

                    {activeFilterCount > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                            {filters.specialty && <FilterPill label={`Specialty: ${filters.specialty}`} onRemove={() => setFilters({ ...filters, specialty: "" })} />}
                            {filters.gender    && <FilterPill label={`Gender: ${filters.gender === 'male' ? 'Male' : 'Female'}`} onRemove={() => setFilters({ ...filters, gender: "" })} />}
                            {filters.country   && <FilterPill label={`Country: ${filters.country}`} onRemove={() => setFilters({ ...filters, country: "" })} />}
                            {filters.county    && <FilterPill label={`County: ${filters.county}`} onRemove={() => setFilters({ ...filters, county: "" })} />}
                            {filters.city      && <FilterPill label={`City: ${filters.city}`} onRemove={() => setFilters({ ...filters, city: "" })} />}
                            {filters.ageRanges.length > 0 && <FilterPill label={`Age: ${filters.ageRanges.map(r => r.label).join(', ')}`} onRemove={() => setFilters({ ...filters, ageRanges: [] })} />}
                            <button onClick={resetFilters} className="cursor-pointer text-xs text-red-500 font-semibold hover:text-red-600 transition-colors">Clear all</button>
                        </div>
                    )}
                </div>

                <p className="text-xs text-gray-400 font-medium">
                    Showing {Math.min(indexOfFirst + 1, filteredDoctors.length)}–{Math.min(indexOfLast, filteredDoctors.length)} of {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'}
                </p>

                {currentDoctors.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center py-16 text-center">
                        <Search size={36} className="text-gray-200 mb-3" />
                        <h3 className="text-base font-bold text-gray-700 mb-1">No doctors found</h3>
                        <p className="text-sm text-gray-400 mb-4">Try adjusting your search or filters</p>
                        <button onClick={() => { setSearchTerm(""); resetFilters(); }}
                            className="cursor-pointer px-5 py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition">
                            Reset search
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {currentDoctors.map(doctor => (
                            <div key={doctor.id}
                                className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-300 flex flex-col group">

                                {/* Photo */}
                                <div className="relative h-48 bg-gradient-to-br from-[#1C398E]/8 to-blue-50 flex-shrink-0 overflow-hidden">
                                    {doctor.profile_picture ? (
                                        <img src={doctor.profile_picture} alt={`${doctor.first_name} ${doctor.last_name}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="w-20 h-20 rounded-2xl bg-[#1C398E]/10 flex items-center justify-center">
                                                <span className="text-2xl font-bold text-[#1C398E]/40">
                                                    {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {doctor.specialty && (
                                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-bold text-[#1C398E] rounded-lg shadow-sm border border-[#1C398E]/10">
                                            {doctor.specialty}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-5 flex flex-col flex-1">
                                    <h2 className="text-base font-bold text-gray-800 mb-1">
                                        Dr. {doctor.first_name} {doctor.last_name}
                                    </h2>

                                    {/* ── Rating badge ── */}
                                    <div className="mb-3">
                                        <RatingBadge
                                            doctorUserId={doctor.doctorId}
                                            onSeeReviews={() => setReviewsDoctor(doctor)}
                                        />
                                    </div>

                                    {doctor.description && (
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{doctor.description}</p>
                                    )}

                                    <div className="space-y-1.5 flex-1 mb-4">
                                        {doctor.email && (
                                            <p className="flex items-center gap-2 text-xs text-gray-500">
                                                <Mail size={12} className="text-[#1C398E] flex-shrink-0" />
                                                <span className="truncate">{doctor.email}</span>
                                            </p>
                                        )}
                                        {doctor.phone && (
                                            <p className="flex items-center gap-2 text-xs text-gray-500">
                                                <Phone size={12} className="text-[#1C398E] flex-shrink-0" /> {doctor.phone}
                                            </p>
                                        )}
                                        {(doctor.city || doctor.county || doctor.country) && (
                                            <p className="flex items-start gap-2 text-xs text-gray-500">
                                                <MapPin size={12} className="text-[#1C398E] flex-shrink-0 mt-0.5" />
                                                <span>{[doctor.city, doctor.county, doctor.country].filter(Boolean).join(', ')}</span>
                                            </p>
                                        )}
                                        {doctor.gender && (
                                            <p className="flex items-center gap-2 text-xs text-gray-500">
                                                <User size={12} className="text-[#1C398E] flex-shrink-0" />
                                                {doctor.gender === 'male' ? 'Male' : doctor.gender === 'female' ? 'Female' : doctor.gender}
                                                {doctor.age ? `, ${doctor.age} yrs` : ''}
                                            </p>
                                        )}
                                    </div>

                                    {doctor.accreditation && (
                                        <div className="mb-3 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                                            <span className="font-bold">✓</span> {doctor.accreditation}
                                        </div>
                                    )}

                                    <button onClick={() => { setSelectedDoctor(doctor); setShowMakeAppointmentModal(true); }}
                                        className="cursor-pointer w-full py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition-all mt-auto">
                                        Book Appointment
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-4">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}
                            className="cursor-pointer p-2 border border-gray-200 rounded-xl text-gray-500 hover:border-[#1C398E]/40 hover:text-[#1C398E] disabled:opacity-30 disabled:cursor-not-allowed transition">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                const show = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                                const ellipsis = page === currentPage - 2 || page === currentPage + 2;
                                if (show) return (
                                    <button key={page} onClick={() => paginate(page)}
                                        className={`cursor-pointer w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                                            currentPage === page ? 'bg-[#1C398E] text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:border-[#1C398E]/40 hover:text-[#1C398E]'
                                        }`}>
                                        {page}
                                    </button>
                                );
                                if (ellipsis) return <span key={page} className="w-9 h-9 flex items-center justify-center text-gray-300 text-sm">…</span>;
                                return null;
                            })}
                        </div>
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}
                            className="cursor-pointer p-2 border border-gray-200 rounded-xl text-gray-500 hover:border-[#1C398E]/40 hover:text-[#1C398E] disabled:opacity-30 disabled:cursor-not-allowed transition">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {showMakeAppointmentModal && (
                <MakeAppointmentModal
                    isOpen={showMakeAppointmentModal}
                    onClose={() => setShowMakeAppointmentModal(false)}
                    initialDoctorId={selectedDoctor?.doctorId}
                    patientId={currentUser?.id}
                />
            )}
        </PatientLayout>
    );
};

export default ViewDoctors;