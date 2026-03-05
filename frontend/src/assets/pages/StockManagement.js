import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Package, TrendingUp, TrendingDown, History, X, Save, Search, ChevronDown } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const API_URL = 'http://localhost:8000';

// ── Modal Shell ───────────────────────────────────────────────
const ModalShell = ({ isOpen, onClose, title, children, maxW = 'max-w-lg' }) => {
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

const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 focus:border-[#1C398E]/50 transition-all";
const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5";

const StockManagement = () => {
    const [stocks, setStocks]               = useState([]);
    const [materials, setMaterials]         = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);
    const [showStockModal, setShowStockModal]       = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal]   = useState(false);
    const [showDeleteModal, setShowDeleteModal]     = useState(false);
    const [editingMaterial, setEditingMaterial]     = useState(null);
    const [deletingStock, setDeletingStock]         = useState(null);
    const [history, setHistory]             = useState([]);
    const [selectedMaterial, setSelectedMaterial]   = useState(null);
    const [summary, setSummary]             = useState({ total_items: 0, total_value: 0, low_stock_count: 0 });
    const [alerts, setAlerts]               = useState([]);
    const [activeTab, setActiveTab]         = useState('stock');
    const [showInactiveMaterials, setShowInactiveMaterials] = useState(false);
    const [stockSearch, setStockSearch]     = useState('');
    const [materialSearch, setMaterialSearch] = useState('');

    const [stockFormData, setStockFormData]     = useState({ material_id: '', quantity_change: '', reason: '' });
    const [materialFormData, setMaterialFormData] = useState({ name: '', unit: '', price_per_unit: '', sku: '', min_quantity: '', active: true });

    const token   = localStorage.getItem('access_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [stockRes, materialsRes, summaryRes, alertsRes] = await Promise.all([
                fetch(`${API_URL}/stock`, { headers }),
                fetch(`${API_URL}/materials`, { headers }),
                fetch(`${API_URL}/stock/summary`, { headers }),
                fetch(`${API_URL}/stock/alerts`, { headers })
            ]);
            if (!stockRes.ok) throw new Error('Error fetching stock');
            if (!materialsRes.ok) throw new Error('Error fetching materials');
            const stockData    = await stockRes.json();
            const materialsData = await materialsRes.json();
            const summaryData  = summaryRes.ok ? await summaryRes.json() : { total_items: 0, total_value: 0, low_stock_count: 0 };
            const alertsData   = alertsRes.ok ? await alertsRes.json() : { alerts: [] };
            setStocks(stockData);
            setMaterials(materialsData);
            setSummary(summaryData);
            setAlerts(alertsData.alerts || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleStockSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/stock`, {
                method: 'POST', headers,
                body: JSON.stringify({
                    material_id:     parseInt(stockFormData.material_id),
                    quantity_change: parseFloat(stockFormData.quantity_change),
                    reason:          stockFormData.reason || 'Manual adjustment'
                })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Error'); }
            await fetchData();
            setShowStockModal(false);
            setStockFormData({ material_id: '', quantity_change: '', reason: '' });
        } catch (err) { alert(err.message); }
    };

    const handleUpdateQuantity = async (materialId, newQuantity) => {
        try {
            const res = await fetch(`${API_URL}/stock/${materialId}?quantity=${newQuantity}&reason=Quantity updated`, { method: 'PATCH', headers });
            if (!res.ok) throw new Error('Error updating quantity');
            await fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteStock = async () => {
        if (!deletingStock) return;
        try {
            const res = await fetch(`${API_URL}/stock/${deletingStock.material_id}`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error('Error deleting stock entry');
            await fetchData();
            setShowDeleteModal(false);
            setDeletingStock(null);
        } catch (err) { alert(err.message); }
    };

    const handleMaterialSubmit = async (e) => {
        e.preventDefault();
        try {
            const url    = editingMaterial ? `${API_URL}/materials/${editingMaterial.id}` : `${API_URL}/materials`;
            const method = editingMaterial ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers,
                body: JSON.stringify({
                    name:           materialFormData.name,
                    unit:           materialFormData.unit,
                    price_per_unit: parseFloat(materialFormData.price_per_unit),
                    sku:            materialFormData.sku || null,
                    min_quantity:   parseFloat(materialFormData.min_quantity || 0),
                    active:         materialFormData.active
                })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Error'); }
            await fetchData();
            setShowMaterialModal(false);
            setEditingMaterial(null);
            setMaterialFormData({ name: '', unit: '', price_per_unit: '', sku: '', min_quantity: '', active: true });
        } catch (err) { alert(err.message); }
    };

    const editMaterial = (material) => {
        setEditingMaterial(material);
        setMaterialFormData({ name: material.name, unit: material.unit, price_per_unit: material.price_per_unit, sku: material.sku || '', min_quantity: material.min_quantity, active: material.active });
        setShowMaterialModal(true);
    };

    const viewHistory = async (materialId) => {
        try {
            const res = await fetch(`${API_URL}/stock/history?material_id=${materialId}`, { headers });
            if (!res.ok) throw new Error('Error fetching history');
            const data = await res.json();
            setHistory(data);
            setSelectedMaterial(materials.find(m => m.id === materialId));
            setShowHistoryModal(true);
        } catch (err) { alert(err.message); }
    };

    const filteredMaterials  = showInactiveMaterials ? materials : materials.filter(m => m.active);
    const searchedStocks     = stocks.filter(s =>
        s.material.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        (s.material.sku && s.material.sku.toLowerCase().includes(stockSearch.toLowerCase()))
    );
    const searchedMaterials  = filteredMaterials.filter(m =>
        m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
        (m.sku && m.sku.toLowerCase().includes(materialSearch.toLowerCase()))
    );

    if (loading) return (
        <DashboardLayout>
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#1C398E] border-t-transparent rounded-full animate-spin" />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>

            {/* ── Stock Update Modal ── */}
            <ModalShell isOpen={showStockModal} onClose={() => setShowStockModal(false)} title="Update Stock">
                <form onSubmit={handleStockSubmit} className="space-y-4">
                    <div>
                        <label className={labelCls}>Material <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <select value={stockFormData.material_id}
                                onChange={e => setStockFormData({ ...stockFormData, material_id: e.target.value })}
                                className={`${inputCls} appearance-none pr-8`} required>
                                <option value="">Select material...</option>
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Quantity Change <span className="text-red-400">*</span></label>
                        <input type="number" step="1" placeholder="e.g. 10 or -5"
                            value={stockFormData.quantity_change}
                            onChange={e => setStockFormData({ ...stockFormData, quantity_change: e.target.value })}
                            className={inputCls} required />
                        <p className="text-xs text-gray-400 mt-1">Use negative values to decrease stock</p>
                    </div>
                    <div>
                        <label className={labelCls}>Reason</label>
                        <input type="text" placeholder="e.g. New delivery, Inventory correction..."
                            value={stockFormData.reason}
                            onChange={e => setStockFormData({ ...stockFormData, reason: e.target.value })}
                            className={inputCls} />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setShowStockModal(false)}
                            className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit"
                            className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition flex items-center justify-center gap-2">
                            <Save size={15} /> Save
                        </button>
                    </div>
                </form>
            </ModalShell>

            {/* ── Material Modal ── */}
            <ModalShell isOpen={showMaterialModal} onClose={() => { setShowMaterialModal(false); setEditingMaterial(null); }}
                title={editingMaterial ? 'Edit Material' : 'Add Material'}>
                <form onSubmit={handleMaterialSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className={labelCls}>Material Name <span className="text-red-400">*</span></label>
                            <input type="text" placeholder="e.g. Dental Gloves" value={materialFormData.name} required
                                onChange={e => setMaterialFormData({ ...materialFormData, name: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Unit <span className="text-red-400">*</span></label>
                            <input type="text" placeholder="e.g. pcs, ml, g" value={materialFormData.unit} required
                                onChange={e => setMaterialFormData({ ...materialFormData, unit: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Price/Unit (RON) <span className="text-red-400">*</span></label>
                            <input type="number" step="0.01" placeholder="0.00" value={materialFormData.price_per_unit} required
                                onChange={e => setMaterialFormData({ ...materialFormData, price_per_unit: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>SKU</label>
                            <input type="text" placeholder="Optional" value={materialFormData.sku}
                                onChange={e => setMaterialFormData({ ...materialFormData, sku: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Min Quantity</label>
                            <input type="number" step="1" placeholder="0" value={materialFormData.min_quantity}
                                onChange={e => setMaterialFormData({ ...materialFormData, min_quantity: e.target.value })} className={inputCls} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <input type="checkbox" checked={materialFormData.active}
                            onChange={e => setMaterialFormData({ ...materialFormData, active: e.target.checked })}
                            className="w-4 h-4 accent-[#1C398E] rounded" />
                        <div>
                            <p className="text-sm font-medium text-gray-700">Active material</p>
                            <p className="text-xs text-gray-400">Inactive materials are hidden from stock view</p>
                        </div>
                    </label>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => { setShowMaterialModal(false); setEditingMaterial(null); }}
                            className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit"
                            className="cursor-pointer flex-1 px-4 py-2.5 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-[#1C398E]/90 transition flex items-center justify-center gap-2">
                            <Save size={15} /> {editingMaterial ? 'Update' : 'Add Material'}
                        </button>
                    </div>
                </form>
            </ModalShell>

            {/* ── Delete Modal ── */}
            <ModalShell isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeletingStock(null); }}
                title="Delete Stock Entry" maxW="max-w-sm">
                {deletingStock && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-700">
                                Delete stock entry for <strong>{deletingStock.material.name}</strong>? This cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setShowDeleteModal(false); setDeletingStock(null); }}
                                className="cursor-pointer flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">Cancel</button>
                            <button onClick={handleDeleteStock}
                                className="cursor-pointer flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2">
                                <Trash2 size={15} /> Delete
                            </button>
                        </div>
                    </div>
                )}
            </ModalShell>

            {/* ── History Modal ── */}
            <ModalShell isOpen={showHistoryModal} onClose={() => { setShowHistoryModal(false); setSelectedMaterial(null); }}
                title={selectedMaterial ? `History: ${selectedMaterial.name}` : 'History'} maxW="max-w-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                        <thead>
                            <tr className="border-b border-gray-100">
                                {['Date', 'Change', 'Reason', 'User'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {history.length === 0 ? (
                                <tr><td colSpan="4" className="px-3 py-8 text-center text-sm text-gray-400">No history available.</td></tr>
                            ) : history.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(item.changed_at).toLocaleString()}</td>
                                    <td className={`px-3 py-2.5 text-sm font-bold ${item.quantity_change < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-gray-600">{item.reason}</td>
                                    <td className="px-3 py-2.5 text-sm text-gray-500">{item.doctor_id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ModalShell>

            {/* ── Page Content ── */}
            <div className="space-y-5">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Stock Management</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Manage materials and cabinet inventory</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingMaterial(null); setMaterialFormData({ name:'', unit:'', price_per_unit:'', sku:'', min_quantity:'', active:true }); setShowMaterialModal(true); }}
                            className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition shadow-sm">
                            <Plus size={13} /> Add Material
                        </button>
                        <button onClick={() => setShowStockModal(true)}
                            className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-[#1C398E] text-white text-xs font-semibold rounded-xl hover:bg-[#1C398E]/90 transition shadow-sm">
                            <Plus size={13} /> Update Stock
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                        <AlertCircle size={15} className="flex-shrink-0" /> {error}
                    </div>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Total Items',      value: summary.total_items,                     suffix: '',    icon: Package,     color: 'text-[#1C398E]',  bg: 'bg-[#1C398E]/8' },
                        { label: 'Total Value',       value: summary.total_value.toFixed(2),          suffix: ' RON', icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Low Stock Alerts',  value: summary.low_stock_count,                 suffix: '',    icon: AlertCircle, color: 'text-red-500',     bg: 'bg-red-50' },
                    ].map(card => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
                                    <Icon size={20} className={card.color} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{card.label}</p>
                                    <p className={`text-2xl font-bold mt-0.5 ${card.color}`}>{card.value}{card.suffix}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Low stock alerts banner */}
                {alerts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={15} className="text-amber-600" />
                            <h3 className="text-sm font-bold text-amber-800">Low Stock Alerts</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {alerts.map(alert => (
                                <span key={alert.material_id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    {alert.material_name}: <strong>{alert.current_quantity}</strong> / {alert.min_quantity} {alert.unit}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                    {[{ id: 'stock', label: 'Current Stock' }, { id: 'materials', label: 'All Materials' }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white text-[#1C398E] shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Stock Tab ── */}
                {activeTab === 'stock' && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        {/* Search */}
                        <div className="px-5 py-4 border-b border-gray-50">
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                <input type="text" value={stockSearch} onChange={e => setStockSearch(e.target.value)}
                                    placeholder="Search stock..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 transition-all" />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        {['Material', 'SKU', 'Quantity', 'Unit', 'Price/Unit', 'Total Value', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {searchedStocks.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-5 py-10 text-center">
                                                <Package size={28} className="mx-auto mb-2 text-gray-200" />
                                                <p className="text-sm text-gray-400">No items in stock.</p>
                                            </td>
                                        </tr>
                                    ) : searchedStocks.map(stock => {
                                        const isLowStock  = stock.quantity < stock.material.min_quantity;
                                        const isZeroStock = stock.quantity === 0;
                                        const totalValue  = stock.quantity * stock.material.price_per_unit;
                                        return (
                                            <tr key={stock.id} className={`hover:bg-gray-50/70 transition-colors ${stock.material.active === false ? 'opacity-60' : ''}`}>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-gray-800">{stock.material.name}</span>
                                                        {stock.material.active === false && (
                                                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-500">Inactive</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-xs text-gray-400 font-mono">{stock.material.sku || '—'}</td>
                                                <td className="px-5 py-3">
                                                    <input type="number" value={stock.quantity}
                                                        onChange={e => handleUpdateQuantity(stock.material_id, e.target.value)}
                                                        className="w-20 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 transition" step="1" />
                                                </td>
                                                <td className="px-5 py-3 text-sm text-gray-500">{stock.material.unit}</td>
                                                <td className="px-5 py-3 text-sm text-gray-700">{stock.material.price_per_unit.toFixed(2)} RON</td>
                                                <td className="px-5 py-3 text-sm font-bold text-gray-800">{totalValue.toFixed(2)} RON</td>
                                                <td className="px-5 py-3">
                                                    {isLowStock ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border bg-red-50 text-red-600 border-red-200">
                                                            <TrendingDown size={11} /> Low
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            <TrendingUp size={11} /> OK
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => viewHistory(stock.material_id)} title="View History"
                                                            className="cursor-pointer p-1.5 text-[#1C398E] hover:bg-[#1C398E]/8 rounded-lg transition">
                                                            <History size={15} />
                                                        </button>
                                                        {isZeroStock && (
                                                            <button onClick={() => { setDeletingStock(stock); setShowDeleteModal(true); }} title="Delete"
                                                                className="cursor-pointer p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Materials Tab ── */}
                {activeTab === 'materials' && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                <input type="text" value={materialSearch} onChange={e => setMaterialSearch(e.target.value)}
                                    placeholder="Search materials..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C398E]/30 transition-all" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`relative w-9 h-5 rounded-full transition-colors ${showInactiveMaterials ? 'bg-[#1C398E]' : 'bg-gray-200'}`}
                                    onClick={() => setShowInactiveMaterials(!showInactiveMaterials)}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showInactiveMaterials ? 'translate-x-4' : ''}`} />
                                </div>
                                <span className="text-xs font-medium text-gray-500">Show inactive</span>
                            </label>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[550px]">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        {['Material', 'SKU', 'Unit', 'Price/Unit', 'Min Qty', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {searchedMaterials.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-5 py-10 text-center">
                                                <Package size={28} className="mx-auto mb-2 text-gray-200" />
                                                <p className="text-sm text-gray-400">No materials found.</p>
                                            </td>
                                        </tr>
                                    ) : searchedMaterials.map(material => (
                                        <tr key={material.id} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="px-5 py-3 text-sm font-semibold text-gray-800">{material.name}</td>
                                            <td className="px-5 py-3 text-xs text-gray-400 font-mono">{material.sku || '—'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-500">{material.unit}</td>
                                            <td className="px-5 py-3 text-sm font-semibold text-gray-800">{material.price_per_unit.toFixed(2)} RON</td>
                                            <td className="px-5 py-3 text-sm text-gray-500">{material.min_quantity}</td>
                                            <td className="px-5 py-3">
                                                {material.active ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">Active</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border bg-gray-100 text-gray-500 border-gray-200">Inactive</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <button onClick={() => editMaterial(material)} title="Edit"
                                                    className="cursor-pointer p-1.5 text-[#1C398E] hover:bg-[#1C398E]/8 rounded-lg transition">
                                                    <Edit2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default StockManagement;