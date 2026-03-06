import React, { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { Star, Trash2, User, ChevronLeft, ChevronRight, MessageSquare, TrendingUp, Search } from "lucide-react";

const API = "http://localhost:8000";

const StarDisplay = ({ value, size = 13 }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={size}
        className={i <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
    ))}
  </div>
);

const ITEMS_PER_PAGE = 10;

const AdminAppFeedback = () => {
  const [feedbacks, setFeedbacks]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStars, setFilterStars] = useState(0); // 0 = all
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [summary, setSummary]       = useState({ total: 0, average: 0, distribution: {} });

  const token = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/app-feedback`, { headers });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
        computeSummary(data);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const computeSummary = (data) => {
    if (!data.length) { setSummary({ total: 0, average: 0, distribution: {} }); return; }
    const total = data.length;
    const average = Math.round((data.reduce((s, f) => s + f.stars, 0) / total) * 10) / 10;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.forEach(f => { distribution[f.stars] = (distribution[f.stars] || 0) + 1; });
    setSummary({ total, average, distribution });
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await fetch(`${API}/admin/app-feedback/${id}`, { method: "DELETE", headers });
      const updated = feedbacks.filter(f => f.id !== id);
      setFeedbacks(updated);
      computeSummary(updated);
      setDeleteId(null);
    } catch {}
    finally { setDeleting(false); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // Filter + search
  const filtered = feedbacks.filter(f => {
    const matchStars  = filterStars === 0 || f.stars === filterStars;
    const matchSearch = !search || f.user_name?.toLowerCase().includes(search.toLowerCase()) ||
                        f.message?.toLowerCase().includes(search.toLowerCase());
    return matchStars && matchSearch;
  });

  const totalPages    = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated     = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginate      = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [search, filterStars]);

  const starLabels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">App Feedback</h1>
          <p className="text-xs text-gray-400 mt-0.5">All user feedback submitted about Dentflow</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1C398E]/8 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={18} className="text-[#1C398E]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{summary.total}</p>
              <p className="text-xs text-gray-400">Total responses</p>
            </div>
          </div>

          {/* Average */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Star size={18} className="text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-800">{summary.average || "—"}</p>
                {summary.average > 0 && <StarDisplay value={summary.average} size={12} />}
              </div>
              <p className="text-xs text-gray-400">Average rating</p>
            </div>
          </div>

          {/* Distribution */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Distribution</p>
            </div>
            <div className="space-y-1.5">
              {[5,4,3,2,1].map(s => {
                const count = summary.distribution[s] || 0;
                const pct   = summary.total ? Math.round((count / summary.total) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-3">{s}</span>
                    <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by user or message..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[0,5,4,3,2,1].map(s => (
              <button key={s} onClick={() => setFilterStars(s)}
                className={`cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
                  filterStars === s
                    ? "bg-[#1C398E] text-white border-[#1C398E]"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#1C398E]/40"
                }`}>
                {s === 0 ? "All" : <><Star size={10} className="fill-current" /> {s}</>}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No feedback found</p>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_2fr_auto_auto] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">User</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rating</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest"></p>
              </div>

              {paginated.map(f => (
                <div key={f.id}
                  className="grid grid-cols-[1fr_auto_2fr_auto_auto] gap-4 items-center px-5 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors">

                  {/* User */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#1C398E]/8 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-[#1C398E]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{f.user_name || "User"}</p>
                      <p className="text-xs text-gray-400 truncate">{f.user_email || ""}</p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex flex-col items-center gap-0.5">
                    <StarDisplay value={f.stars} size={12} />
                    <span className="text-xs text-gray-400">{starLabels[f.stars]}</span>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {f.message || <span className="text-gray-300 italic">No message</span>}
                  </p>

                  {/* Date */}
                  <p className="text-xs text-gray-400 whitespace-nowrap">{formatDate(f.created_at)}</p>

                  {/* Delete */}
                  <button onClick={() => setDeleteId(f.id)}
                    className="cursor-pointer p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}
              className="cursor-pointer p-2 border border-gray-200 rounded-xl text-gray-500 hover:border-[#1C398E]/40 disabled:opacity-30 disabled:cursor-not-allowed transition">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const p = i + 1;
                const show = p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1);
                const ellipsis = p === currentPage - 2 || p === currentPage + 2;
                if (show) return (
                  <button key={p} onClick={() => paginate(p)}
                    className={`cursor-pointer w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                      currentPage === p ? "bg-[#1C398E] text-white" : "border border-gray-200 text-gray-600 hover:border-[#1C398E]/40"
                    }`}>{p}</button>
                );
                if (ellipsis) return <span key={p} className="w-9 h-9 flex items-center justify-center text-gray-300">…</span>;
                return null;
              })}
            </div>
            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}
              className="cursor-pointer p-2 border border-gray-200 rounded-xl text-gray-500 hover:border-[#1C398E]/40 disabled:opacity-30 disabled:cursor-not-allowed transition">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Delete feedback?</h3>
              <p className="text-sm text-gray-400">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="cursor-pointer flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition disabled:opacity-60">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAppFeedback;