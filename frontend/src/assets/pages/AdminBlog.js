import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { Plus, Edit3, Trash2, Search, Loader2, X } from "lucide-react";

const API_BASE = "http://localhost:8000";

const AdminBlog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false); // nou
  const [userToken, setUserToken] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
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
    setFormData({
      title: "",
      short_description: "",
      post_type: "external",
      content: "",
      external_link: "",
      is_active: false,
      featured_image: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      short_description: post.short_description || "",
      post_type: post.post_type,
      content: post.content || "",
      external_link: post.external_link || "",
      is_active: post.is_active,
      featured_image: null,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userToken) return;

    const data = new FormData();
    data.append("title", formData.title);
    data.append("short_description", formData.short_description);
    data.append("post_type", formData.post_type);
    data.append("content", formData.content);
    data.append("external_link", formData.external_link);
    data.append("is_active", formData.is_active);
    if (formData.featured_image) data.append("featured_image", formData.featured_image);

    try {
      const url = editingPost
        ? `${API_BASE}/blogs/${editingPost.id}`
        : `${API_BASE}/blogs`;
      const method = editingPost ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${userToken}` },
        body: data,
      });
      if (!res.ok) throw new Error("Failed to save post.");
      await fetchPosts();
      setIsModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`${API_BASE}/blogs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete post.");
      setPosts(posts.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (showInactive || post.is_active === true || post.is_active === "true")
  );

  return (
    <AdminLayout>
      <div className="md:max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="flex justify-between items-center pb-4 border-b border-gray-400">
          <h1 className="text-3xl font-semibold text-gray-800">Blog Management</h1>
          <button
            onClick={openAddModal}
            className="cursor-pointer flex items-center space-x-2 bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-800"
          >
            <Plus className="w-5 h-5" />
            <span>New Post</span>
          </button>
        </header>

        {/* Filters */}
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <span>Show Inactive</span>
            </label>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 shadow-md bg-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Posts as cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="flex justify-center py-6 text-gray-500 col-span-full">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading posts...
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4 col-span-full">{error}</div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden flex flex-col`}
              >
                {post.featured_image_url && (
                  <img
                    src={post.featured_image_url}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="text-lg font-semibold mb-2 truncate">{post.title}</h2>
                  <p className="text-gray-600 mb-2 text-sm">{post.short_description}</p>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mb-2 w-[80px] ${
                      post.is_active === true || post.is_active === "true"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {post.is_active === true || post.is_active === "true"
                      ? "Published"
                      : "Draft"}
                  </span>
                  <div className="mt-auto flex justify-end space-x-2">
                    <button
                      onClick={() => openEditModal(post)}
                      className="cursor-pointer text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className=" cursor-pointer text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-center col-span-full">No posts found.</div>
          )}
        </div>
      </div>

      {/* ==================== MODAL ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"   style={{
    backgroundColor: "rgba(0, 0, 0, 0.5)" 
  }}>
          <div className="bg-white p-6 rounded-lg w-full max-w-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 cursor-pointer"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              {editingPost ? "Edit Post" : "New Post"}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="border px-3 py-2 rounded-lg"
              />
              <textarea
                placeholder="Short Description"
                value={formData.short_description}
                onChange={(e) =>
                  setFormData({ ...formData, short_description: e.target.value })
                }
                className="border px-3 py-2 rounded-lg"
              />
              <select
                value={formData.post_type}
                onChange={(e) => setFormData({ ...formData, post_type: e.target.value })}
                className="border px-3 py-2 rounded-lg"
              >
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
              {formData.post_type === "internal" ? (
                <textarea
                  placeholder="Content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="border px-3 py-2 rounded-lg"
                />
              ) : (
                <input
                  type="text"
                  placeholder="External Link"
                  value={formData.external_link}
                  onChange={(e) =>
                    setFormData({ ...formData, external_link: e.target.value })
                  }
                  className="border px-3 py-2 rounded-lg"
                />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Featured Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({ ...formData, featured_image: e.target.files[0] })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 text-gray-700"
                />
                {formData.featured_image && (
                  <img
                    src={URL.createObjectURL(formData.featured_image)}
                    alt="Preview"
                    className="mt-3 w-32 h-32 object-cover rounded-md border"
                  />
                )}
              </div>
              <label className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span>Published</span>
              </label>
              <button
                type="submit"
                className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 mt-3 cursor-pointer"
              >
                {editingPost ? "Update Post" : "Create Post"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBlog;
