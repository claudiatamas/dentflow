import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Package, TrendingUp, TrendingDown, History, X, Save } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const StockManagement = () => {
  const [stocks, setStocks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [deletingStock, setDeletingStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [summary, setSummary] = useState({ total_items: 0, total_value: 0, low_stock_count: 0 });
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('stock');
  const [showInactiveMaterials, setShowInactiveMaterials] = useState(false); 
  const [stockSearch, setStockSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');

  const [stockFormData, setStockFormData] = useState({ material_id: '', quantity_change: '', reason: '' });
  const [materialFormData, setMaterialFormData] = useState({ name: '', unit: '', price_per_unit: '', sku: '', min_quantity: '', active: true });

  const API_URL = 'http://localhost:8000';
  const token = localStorage.getItem('access_token');
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

      const stockData = await stockRes.json();
      const materialsData = await materialsRes.json();
      const summaryData = summaryRes.ok ? await summaryRes.json() : { total_items: 0, total_value: 0, low_stock_count: 0 };
      const alertsData = alertsRes.ok ? await alertsRes.json() : { alerts: [] };

      
      console.log('Stock data:', stockData);
      console.log('Materials data:', materialsData);

      setStocks(stockData);
      setMaterials(materialsData);
      setSummary(summaryData);
      setAlerts(alertsData.alerts || []);
      setError(null);
    } catch (err) {
      setError(`Data loading error: ${err.message.includes('Eroare') ? 'Please check the connection or data structure' : err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/stock`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          material_id: parseInt(stockFormData.material_id),
          quantity_change: parseFloat(stockFormData.quantity_change),
          reason: stockFormData.reason || 'Manual adjustment'
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error adding stock');
      }
      await fetchData();
      setShowStockModal(false);
      setStockFormData({ material_id: '', quantity_change: '', reason: '' });
    } catch (err) { alert(err.message); }
  };

  const handleUpdateQuantity = async (materialId, newQuantity) => {
    try {
      const response = await fetch(`${API_URL}/stock/${materialId}?quantity=${newQuantity}&reason=Quantity updated`, { method: 'PATCH', headers });
      if (!response.ok) throw new Error('Error updating quantity');
      await fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteStock = async () => {
    if (!deletingStock) return;
    
    try {
      const response = await fetch(`${API_URL}/stock/${deletingStock.material_id}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) throw new Error('Error deleting stock entry');
      
      await fetchData();
      setShowDeleteModal(false);
      setDeletingStock(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmDeleteStock = (stock) => {
    setDeletingStock(stock);
    setShowDeleteModal(true);
  };

  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingMaterial ? `${API_URL}/materials/${editingMaterial.id}` : `${API_URL}/materials`;
      const method = editingMaterial ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: materialFormData.name,
          unit: materialFormData.unit,
          price_per_unit: parseFloat(materialFormData.price_per_unit),
          sku: materialFormData.sku || null,
          min_quantity: parseFloat(materialFormData.min_quantity || 0),
          active: materialFormData.active
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error saving material');
      }
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
      const response = await fetch(`${API_URL}/stock/history?material_id=${materialId}`, { headers });
      if (!response.ok) throw new Error('Error fetching history');
      const data = await response.json();
      setHistory(data);
      setSelectedMaterial(materials.find(m => m.id === materialId));
      setShowHistoryModal(true);
    } catch (err) { alert(err.message); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );


  const filteredMaterials = showInactiveMaterials ? materials : materials.filter(m => m.active);
  const searchedStocks = stocks.filter(stock =>
    stock.material.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    (stock.material.sku && stock.material.sku.toLowerCase().includes(stockSearch.toLowerCase()))
  );
  const searchedMaterials = filteredMaterials.filter(material =>
    material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    (material.sku && material.sku.toLowerCase().includes(materialSearch.toLowerCase()))
  );

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">Stock & Material Management</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage materials and cabinet inventory</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button onClick={() => { setEditingMaterial(null); setMaterialFormData({ name:'', unit:'', price_per_unit:'', sku:'', min_quantity:'', active:true }); setShowMaterialModal(true); }}
              className="bg-green-600 cursor-pointer text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition w-full sm:w-auto">
              <Plus size={20}/> Add Material
            </button>
            <button onClick={() => setShowStockModal(true)}
              className="bg-blue-600 text-white cursor-pointer px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition w-full sm:w-auto">
              <Plus size={20}/> Update Stock
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm sm:text-base">
            <AlertCircle size={20}/> {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-4 overflow-x-auto border-b border-gray-200">
            <button onClick={() => setActiveTab('stock')}
              className={`px-4 py-2 cursor-pointer font-medium transition whitespace-nowrap ${activeTab === 'stock' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Current Stock
            </button>
            <button onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 cursor-pointer font-medium transition whitespace-nowrap ${activeTab === 'materials' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              All Materials
            </button>
          </div>
        </div>

        {/* Active Tab Content */}
        {activeTab === 'stock' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm sm:text-base">Total Items</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{summary.total_items}</p>
                </div>
                <Package className="text-blue-600" size={40} />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm sm:text-base">Total Value</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{summary.total_value.toFixed(2)} RON</p>
                </div>
                <TrendingUp className="text-green-600" size={40} />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex justify-between items-center">
                <div>
                  <p className="text-gray-600 text-sm sm:text-base">Low Stock Alerts</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1">{summary.low_stock_count}</p>
                </div>
                <AlertCircle className="text-red-600" size={40} />
              </div>
            </div>

            {/* Low Stock Alerts */}
            {alerts.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 overflow-x-auto">
                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <AlertCircle size={20}/> Low Stock Alerts
                </h3>
                <div className="space-y-2 text-sm sm:text-base">
                  {alerts.map(alert => (
                    <div key={alert.material_id}>
                      <strong>{alert.material_name}</strong>: {alert.current_quantity} {alert.unit} (minimum: {alert.min_quantity} {alert.unit})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-x-auto mb-6">
              <div className="p-4 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-start sm:items-center">
                <input type="text" value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} placeholder="Search stock..."
                  className="px-4 py-2 shadow-md border border-gray-50 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
              </div>
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm sm:text-base">
                  {searchedStocks.length === 0 ? (
                    <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">No items in stock.</td></tr>
                  ) : (
                    searchedStocks.map(stock => {
                      const isLowStock = stock.quantity < stock.material.min_quantity;
                      const totalValue = stock.quantity * stock.material.price_per_unit;
                      const isZeroStock = stock.quantity === 0;
                      
                      return (
                        <tr key={stock.id} className={`hover:bg-gray-50 ${stock.material.active === false ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{stock.material.name}</span>
                              {stock.material.active === false && <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-200 text-gray-700">Inactive</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{stock.material.sku || '-'}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <input type="number" value={stock.quantity} onChange={(e)=>handleUpdateQuantity(stock.material_id, e.target.value)}
                              className="w-20 px-2 py-1 border rounded text-sm sm:text-base" step="1"/>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{stock.material.unit}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{stock.material.price_per_unit.toFixed(2)} RON</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{totalValue.toFixed(2)} RON</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {isLowStock ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1 w-fit"><TrendingDown size={14}/> Low Stock</span>
                            : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit"><TrendingUp size={14}/> OK</span>}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button onClick={()=>viewHistory(stock.material_id)} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50" title="View History">
                                <History size={18}/>
                              </button>
                              {isZeroStock && (
                                <button onClick={()=>confirmDeleteStock(stock)} className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50" title="Delete Stock Entry">
                                  <Trash2 size={18}/>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'materials' && (
          <>
           <div className="bg-white rounded-lg shadow-sm overflow-x-auto mb-6">
            {/* Filter */}
            <div className="p-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <input type="text" value={materialSearch} onChange={(e)=>setMaterialSearch(e.target.value)} placeholder="Search materials..."
                className="px-4 py-2 cursor-pointer shadow-md border border-gray-50 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input type="checkbox" checked={showInactiveMaterials} onChange={(e)=>setShowInactiveMaterials(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"/>
                <span className="text-sm font-medium text-gray-700">Show inactive materials</span>
              </label>
            </div>

            {/* Material Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-x-auto ">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm sm:text-base">
                  {searchedMaterials.length === 0 ? (
                    <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No materials found.</td></tr>
                  ) : (
                    searchedMaterials.map(material => (
                      <tr key={material.id} className={`hover:bg-gray-50`}>
                        <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{material.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">{material.sku || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">{material.unit}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{material.price_per_unit.toFixed(2)} RON</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">{material.min_quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {material.active ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                          : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Inactive</span>}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap flex gap-2">
                          <button onClick={()=>editMaterial(material)} className="cursor-pointer text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"><Edit2 size={16}/></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </>
        )}

        {/* Modals */}
        {/* Stock Modal */}
        {showStockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
              <button onClick={()=>setShowStockModal(false)} className="cursor-pointer absolute top-2 right-2 p-1 rounded hover:bg-gray-100"><X size={20}/></button>
              <h2 className="text-xl font-semibold mb-4">Update Stock</h2>
              <form onSubmit={handleStockSubmit} className="flex flex-col gap-4">
                <select value={stockFormData.material_id} onChange={e=>setStockFormData({...stockFormData, material_id: e.target.value})}
                  className="px-4 py-2 border rounded-lg w-full">
                  <option value="">Select Material</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="number" step="1" placeholder="Quantity Change"
                  value={stockFormData.quantity_change} onChange={e=>setStockFormData({...stockFormData, quantity_change:e.target.value})}
                  className="px-4 py-2 border rounded-lg w-full"/>
                <input type="text" placeholder="Reason (optional)" value={stockFormData.reason}
                  onChange={e=>setStockFormData({...stockFormData, reason:e.target.value})}
                  className="px-4 py-2 border rounded-lg w-full"/>
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button type="button" onClick={()=>setShowStockModal(false)} className="cursor-pointer flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="cursor-pointer flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"><Save size={18}/> Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Material Modal */}
        {showMaterialModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
              <button onClick={()=>{ setShowMaterialModal(false); setEditingMaterial(null); }} className="cursor-pointer absolute top-2 right-2 p-1 rounded hover:bg-gray-100"><X size={20}/></button>
              <h2 className="text-xl font-semibold mb-4">{editingMaterial ? 'Edit Material' : 'Add Material'}</h2>
              <form onSubmit={handleMaterialSubmit} className="flex flex-col gap-4">
                <input type="text" placeholder="Material Name" value={materialFormData.name} required
                  onChange={e=>setMaterialFormData({...materialFormData, name:e.target.value})} className="px-4 py-2 border rounded-lg w-full"/>
                <input type="text" placeholder="Unit" value={materialFormData.unit} required
                  onChange={e=>setMaterialFormData({...materialFormData, unit:e.target.value})} className="px-4 py-2 border rounded-lg w-full"/>
                <input type="number" step="0.01" placeholder="Price per Unit" value={materialFormData.price_per_unit} required
                  onChange={e=>setMaterialFormData({...materialFormData, price_per_unit:e.target.value})} className="px-4 py-2 border rounded-lg w-full"/>
                <input type="text" placeholder="SKU (optional)" value={materialFormData.sku}
                  onChange={e=>setMaterialFormData({...materialFormData, sku:e.target.value})} className="px-4 py-2 border rounded-lg w-full"/>
                <input type="number" step="1" placeholder="Minimum Quantity" value={materialFormData.min_quantity}
                  onChange={e=>setMaterialFormData({...materialFormData, min_quantity:e.target.value})} className="px-4 py-2 border rounded-lg w-full"/>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={materialFormData.active} onChange={e=>setMaterialFormData({...materialFormData, active:e.target.checked})} className="w-4 h-4 text-blue-600 rounded"/>
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button type="button" onClick={()=>{ setShowMaterialModal(false); setEditingMaterial(null); }} className="cursor-pointer flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="cursor-pointer flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"><Save size={18}/> Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingStock && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
              <button onClick={()=>{ setShowDeleteModal(false); setDeletingStock(null); }} className="cursor-pointer absolute top-2 right-2 p-1 rounded hover:bg-gray-100">
                <X size={20}/>
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertCircle className="text-red-600" size={24}/>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Delete Stock Entry</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the stock entry for <strong>{deletingStock.material.name}</strong>? 
                This action cannot be undone, but the material will remain in your materials list.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={()=>{ setShowDeleteModal(false); setDeletingStock(null); }} 
                  className="cursor-pointer flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDeleteStock} 
                  className="cursor-pointer flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition">
                  <Trash2 size={18}/> Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && selectedMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 mt-30" style={{ backgroundColor: 'rgba(0, 0,0, 0.3)' }}>
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 relative overflow-x-auto">
              <button onClick={()=>{ setShowHistoryModal(false); setSelectedMaterial(null); }} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100"><X size={20}/></button>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><History size={20}/> History: {selectedMaterial.name}</h2>
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm sm:text-base">
                  {history.length === 0 ? (
                    <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-500">No history available.</td></tr>
                  ) : (
                    history.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{new Date(item.changed_at).toLocaleString()}</td>
                        <td className={`px-4 py-2 ${item.quantity_change < 0 ? 'text-red-600' : 'text-green-600'}`}>{item.quantity_change}</td>
                        <td className="px-4 py-2">{item.reason}</td>
                        <td className="px-4 py-2">{item.doctor_id}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div></DashboardLayout>
  );
};

export default StockManagement;