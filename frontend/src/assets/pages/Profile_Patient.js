import React, { useEffect, useState } from "react";
import { FiUser, FiMail, FiBriefcase, FiPhone, FiMapPin, FiCalendar, FiInfo, FiEdit, FiSave, FiX, FiTrash2, FiAlertTriangle, FiCamera, FiCheck } from "react-icons/fi";
import PatientLayout from "../components/PatientLayout";
import AppFeedbackCard from "../components/AppFeedbackCard";

const API = "http://localhost:8000";

const capitalize = (str) => { if (!str) return ""; return str.charAt(0).toUpperCase() + str.slice(1); };
const formatDate = (dateStr) => {
  if (!dateStr) return "Not specified";
  return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const Field = ({ icon: Icon, label, name, value, editing, onChange, type = "text", textarea = false }) => (
  <div className="group">
    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
      <Icon size={11} />{label}
    </label>
    {editing ? (
      name === "gender" ? (
        <select name={name} value={value} onChange={onChange}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all">
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      ) : textarea ? (
        <textarea name={name} value={value} onChange={onChange} rows={3} placeholder={label}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all resize-none" />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} placeholder={label}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all" />
      )
    ) : (
      <p className="text-sm font-medium text-gray-700 px-1">
        {type === "date" ? formatDate(value) : capitalize(value) || <span className="text-gray-300 font-normal">Not specified</span>}
      </p>
    )}
  </div>
);

const Section = ({ title, icon: Icon, children, accent = false }) => (
  <div className={`rounded-2xl p-6 ${accent ? "bg-red-50 border border-red-100" : "bg-white border border-gray-100"} shadow-sm`}>
    <div className="flex items-center gap-2 mb-5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? "bg-red-100" : "bg-[#1C398E]/8"}`}>
        <Icon size={14} className={accent ? "text-red-500" : "text-[#1C398E]"} />
      </div>
      <h2 className={`text-sm font-bold uppercase tracking-widest ${accent ? "text-red-500" : "text-gray-400"}`}>{title}</h2>
    </div>
    {children}
  </div>
);

const ProfilePatient = () => {
  const [user, setUser]                           = useState(null);
  const [formData, setFormData]                   = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState(null);
  const [editing, setEditing]                     = useState(false);
  const [saving, setSaving]                       = useState(false);
  const [saveError, setSaveError]                 = useState(null);
  const [selectedFile, setSelectedFile]           = useState(null);
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting]                   = useState(false);
  const [saved, setSaved]                         = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) { setError("No access token found."); setLoading(false); return; }
      try {
        const res = await fetch(`${API}/me`, { headers: { Authorization: "Bearer " + token } });
        if (!res.ok) { setError("Failed to fetch profile."); setLoading(false); return; }
        const data = await res.json();
        setUser(data); setFormData(data);
      } catch (err) { setError("Network error: " + err.message); }
      finally { setLoading(false); }
    };
    fetchUser();
  }, []);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    const token = localStorage.getItem("access_token");
    try {
      const fd = new FormData();
      ["first_name","last_name","email","phone","gender","country","county","city","address","birth_date","status"]
        .forEach(f => { if (formData[f]) fd.append(f, formData[f]); });
      if (selectedFile) fd.append("profile_picture", selectedFile);
      const res = await fetch(`${API}/me`, { method: "PUT", headers: { Authorization: "Bearer " + token }, body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setSaveError(err.detail || "Failed to save."); }
      else {
        const refresh = await fetch(`${API}/me`, { headers: { Authorization: "Bearer " + token } });
        if (refresh.ok) { const u = await refresh.json(); setUser(u); setFormData(u); }
        setEditing(false); setSelectedFile(null); setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) { setSaveError("Network error: " + err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/me`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.detail || "Failed to delete."); }
      else { localStorage.removeItem("access_token"); window.location.href = "/login"; }
    } catch (err) { alert("Network error: " + err.message); }
    finally { setDeleting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  );

  const avatarSrc = selectedFile ? URL.createObjectURL(selectedFile) : (user.profile_picture || null);
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();

  return (
    <PatientLayout>
      <div className="max-w-5xl mx-auto space-y-4 pb-10">

        {/* Hero card */}
        <div className="relative bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-28 bg-[#1C398E] relative overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="absolute -bottom-px left-0 right-0 h-8 bg-white" style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0" }} />
          </div>
          <div className="px-6 pb-6 -mt-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              <div className="relative -mt-14 flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-[#1C398E]">
                  {avatarSrc ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">{initials}</div>}
                </div>
                {editing && (
                  <label className="cursor-pointer absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#1C398E] rounded-lg flex items-center justify-center shadow-md hover:bg-[#1C398E]/90 transition">
                    <FiCamera size={13} className="text-white" />
                    <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} className="hidden" />
                  </label>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                {editing ? (
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <input type="text" name="first_name" value={formData.first_name || ""} onChange={handleInputChange}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 w-36" placeholder="First name" />
                    <input type="text" name="last_name" value={formData.last_name || ""} onChange={handleInputChange}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 w-36" placeholder="Last name" />
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{user.first_name} {user.last_name}</h1>
                )}
                <div className="flex items-center gap-2 mt-1.5 justify-center sm:justify-start flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1C398E]/8 text-[#1C398E] rounded-lg text-xs font-semibold">
                    <FiBriefcase size={11} /> {capitalize(user.role)}
                  </span>
                  {editing ? (
                    <input type="email" name="email" value={formData.email || ""} onChange={handleInputChange}
                      className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 w-52" placeholder="Email" />
                  ) : (
                    <span className="text-xs text-gray-400 flex items-center gap-1"><FiMail size={11} /> {user.email}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {saved && !editing && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-xl">
                    <FiCheck size={13} /> Saved
                  </span>
                )}
                {!editing ? (
                  <button onClick={() => { setSaveError(null); setFormData(user); setEditing(true); }}
                    className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition shadow-sm">
                    <FiEdit size={14} /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button onClick={() => { setEditing(false); setSelectedFile(null); setSaveError(null); }}
                      className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition">
                      <FiX size={14} /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition shadow-sm disabled:opacity-50">
                      <FiSave size={14} /> {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {saveError && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                <FiAlertTriangle size={14} /> {saveError}
              </div>
            )}
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Personal" icon={FiUser}>
            <div className="space-y-5">
              <Field icon={FiPhone} label="Phone" name="phone" value={formData?.phone || ""} editing={editing} onChange={handleInputChange} />
              <Field icon={FiUser} label="Gender" name="gender" value={formData?.gender || ""} editing={editing} onChange={handleInputChange} />
              <Field icon={FiCalendar} label="Birth Date" name="birth_date" value={formData?.birth_date || ""} editing={editing} onChange={handleInputChange} type="date" />
            </div>
          </Section>
          <Section title="Location" icon={FiMapPin}>
            <div className="space-y-5">
              <Field icon={FiMapPin} label="Country" name="country" value={formData?.country || ""} editing={editing} onChange={handleInputChange} />
              <Field icon={FiMapPin} label="County" name="county" value={formData?.county || ""} editing={editing} onChange={handleInputChange} />
              <Field icon={FiMapPin} label="City" name="city" value={formData?.city || ""} editing={editing} onChange={handleInputChange} />
              <Field icon={FiMapPin} label="Address" name="address" value={formData?.address || ""} editing={editing} onChange={handleInputChange} />
            </div>
          </Section>
        </div>

        {/* App Feedback */}
        <AppFeedbackCard />

        {/* Danger zone */}
        <Section title="" icon={FiAlertTriangle} accent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Delete Account</p>
              <p className="text-xs text-gray-400 mt-0.5">Permanently remove your account and all associated data.</p>
            </div>
            <button onClick={() => setShowDeleteModal(true)}
              className="cursor-pointer flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition shadow-sm">
              <FiTrash2 size={14} /> Delete
            </button>
          </div>
        </Section>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                <FiAlertTriangle size={22} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Delete Account</h3>
              <p className="text-sm text-gray-400">This action is permanent and cannot be undone.</p>
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Type <span className="text-red-500 font-mono font-bold">DELETE</span> to confirm
            </p>
            <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-4" placeholder="Type DELETE" />
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE" || deleting}
                className="cursor-pointer flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PatientLayout>
  );
};

export default ProfilePatient;