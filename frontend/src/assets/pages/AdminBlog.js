import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { Plus, Edit3, Trash2, Search, Loader2, X, ExternalLink, FileText, Eye, EyeOff, ImageOff } from "lucide-react";

const API_BASE = "http://localhost:8000";

const AdminBlog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    short_description: "",
    post_type: "external",
    content: "",
    external_link: "",
    is_active: false,
    featured_image: null,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) navigate("/login");
    else setUserToken(token);
  }, [navigate]);

  const fetchPosts = async () => {
    if (!userToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/blogs`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error("Failed to load posts.");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userToken) fetchPosts();
  }, [userToken]);

  const openAddModal = () => {
    setEditingPost(null);
    setFormData({ title: "", short_description: "", post_type: "external", content: "", external_link: "", is_active: false, featured_image: null });
    setIsModalOpen(true);
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setFormData({ title: post.title, short_description: post.short_description || "", post_type: post.post_type, content: post.content || "", external_link: post.external_link || "", is_active: post.is_active, featured_image: null });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userToken) return;
    setSubmitting(true);
    const data = new FormData();
    data.append("title", formData.title);
    data.append("short_description", formData.short_description);
    data.append("post_type", formData.post_type);
    data.append("content", formData.content);
    data.append("external_link", formData.external_link);
    data.append("is_active", formData.is_active);
    if (formData.featured_image) data.append("featured_image", formData.featured_image);
    try {
      const url = editingPost ? `${API_BASE}/blogs/${editingPost.id}` : `${API_BASE}/blogs`;
      const method = editingPost ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${userToken}` }, body: data });
      if (!res.ok) throw new Error("Failed to save post.");
      await fetchPosts();
      setIsModalOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`${API_BASE}/blogs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${userToken}` } });
      if (!res.ok) throw new Error("Failed to delete post.");
      setPosts(posts.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const isActive = (post) => post.is_active === true || post.is_active === "true";

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (showInactive || isActive(post))
  );

  const publishedCount = posts.filter(isActive).length;
  const draftCount = posts.filter(p => !isActive(p)).length;

  const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all placeholder-gray-400";
  const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Blog Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {publishedCount} published · {draftCount} draft{draftCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition-all shadow-sm"
          >
            <Plus size={16} /> New Post
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/20 transition-all shadow-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setShowInactive(v => !v)}
              className={`w-10 h-5 rounded-full transition-all relative ${showInactive ? 'bg-[#1C398E]' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${showInactive ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-gray-600 font-medium">Show drafts</span>
          </label>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={22} className="animate-spin mr-2" /> Loading posts...
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-10 bg-red-50 rounded-2xl border border-red-100">{error}</div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <FileText size={40} className="mb-3" />
            <p className="text-sm text-gray-400">No posts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPosts.map((post) => (
              <div key={post.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group">

                {/* Image */}
                <div className="relative h-44 bg-gray-50 flex-shrink-0 overflow-hidden">
                  {post.featured_image_url ? (
                    <img src={post.featured_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
                      <ImageOff size={32} />
                      <span className="text-xs mt-1 text-gray-300">No image</span>
                    </div>
                  )}
                  {/* Status badge overlay */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm ${
                      isActive(post)
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-gray-700/70 text-white'
                    }`}>
                      {isActive(post) ? <Eye size={11} /> : <EyeOff size={11} />}
                      {isActive(post) ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {/* Type badge */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/90 text-gray-600 backdrop-blur-sm">
                      {post.post_type === 'external' ? <ExternalLink size={10} /> : <FileText size={10} />}
                      {post.post_type}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-4 gap-2">
                  <h2 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{post.title}</h2>
                  {post.short_description && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{post.short_description}</p>
                  )}

                  {/* Actions */}
                  <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditModal(post)}
                      className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1C398E] bg-[#1C398E]/8 hover:bg-[#1C398E]/15 rounded-lg transition-colors"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pt-20" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-800">{editingPost ? 'Edit Post' : 'New Post'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingPost ? 'Update blog post details' : 'Create a new blog post'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className={labelCls}>Title <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Enter post title..." value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required className={inputCls} />
              </div>

              {/* Short description */}
              <div>
                <label className={labelCls}>Short Description</label>
                <textarea placeholder="Brief summary of the post..." value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  rows={2} className={`${inputCls} resize-none`} />
              </div>

              {/* Type */}
              <div>
                <label className={labelCls}>Post Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['external', 'internal'].map(type => (
                    <button key={type} type="button"
                      onClick={() => setFormData({ ...formData, post_type: type })}
                      className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        formData.post_type === type
                          ? 'border-[#1C398E] bg-[#1C398E]/5 text-[#1C398E]'
                          : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}>
                      {type === 'external' ? <ExternalLink size={14} /> : <FileText size={14} />}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content / Link */}
              {formData.post_type === 'internal' ? (
                <div>
                  <label className={labelCls}>Content</label>
                  <textarea placeholder="Write your post content..." value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4} className={`${inputCls} resize-none`} />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>External Link</label>
                  <input type="text" placeholder="https://..." value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                    className={inputCls} />
                </div>
              )}

              {/* Image */}
              <div>
                <label className={labelCls}>Featured Image</label>
                <label className="cursor-pointer flex items-center gap-3 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#1C398E]/40 hover:bg-[#1C398E]/3 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-[#1C398E]/10 flex items-center justify-center flex-shrink-0">
                    <Plus size={16} className="text-[#1C398E]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Upload image</p>
                    <p className="text-xs text-gray-400">PNG, JPG, WEBP</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => setFormData({ ...formData, featured_image: e.target.files[0] })} />
                </label>
                {formData.featured_image && (
                  <div className="mt-2 relative w-24 h-24">
                    <img src={URL.createObjectURL(formData.featured_image)} alt="Preview"
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
                    <button type="button" onClick={() => setFormData({ ...formData, featured_image: null })}
                      className="cursor-pointer absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition">
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              {/* Published toggle */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Publish post</p>
                  <p className="text-xs text-gray-400">Make this post visible to visitors</p>
                </div>
                <div
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`cursor-pointer w-11 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-[#1C398E]' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${formData.is_active ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={!formData.title || submitting}
                  className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-semibold rounded-xl hover:bg-[#1C398E]/90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                  {submitting ? 'Saving...' : editingPost ? 'Update Post' : 'Create Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBlog;