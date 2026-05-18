import React, { useState } from 'react';
import { logout } from './api/auth';
import ComprasPadre from './ComprasPadre';

// Este arquivo será llenado con el contenido del dashboard
// Por ahora es un placeholder que será actualizado

function Dashboard({ setAuth, productos, ventas, compras, inventario, reporte, activeTab, setActiveTab, setSidebarOpen, sidebarOpen, loadProductos, loadVentas, loadCompras, loadInventario, loadReporte, FormularioVentas, FormularioProductos, FormularioCompras, DashboardTab, VentasTab, IngresosTab, GastosTab, ComprasTab, ComparativaTab, PorPagarTab, InventarioTab, ProductosTab, editingProducto, setEditingProducto }) {
  
  const handleLogout = () => {
    logout();
    setAuth(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4 flex justify-between items-center md:justify-start">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 rounded hover:bg-blue-700 transition"
          title="Toggle Sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg md:text-2xl font-bold flex-1 md:flex-initial">Sistema de Inventario - Kaizen F&F</h1>
        <button 
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded transition"
          title="Cerrar sesión"
        >
          🚪
        </button>
      </nav>

      <div className="flex relative">
        {/* Overlay para móviles */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:relative w-64 bg-white h-screen shadow-lg z-40 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
        >
          <div className="p-4 flex flex-col h-full">
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden self-end mb-4 p-2 hover:bg-gray-100 rounded"
              title="Close Sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <nav className="space-y-2 flex-1">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded mb-2 transition ${activeTab === 'dashboard'
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100'
                  }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => {
                  setActiveTab('ventas');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded mb-2 transition ${activeTab === 'ventas'
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100'
                  }`}
              >
                💰 Ventas
              </button>
              <button
                onClick={() => {
                  setActiveTab('compras');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded mb-2 transition ${activeTab === 'compras'
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100'
                  }`}
              >
                🛒 Compras
              </button>
              <button
                onClick={() => {
                  setActiveTab('inventario');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded mb-2 transition ${activeTab === 'inventario'
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100'
                  }`}
              >
                📦 Inventario
              </button>
              <button
                onClick={() => {
                  setActiveTab('productos');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded mb-2 transition ${activeTab === 'productos'
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100'
                  }`}
              >
                🏷️ Productos
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto w-full md:w-auto">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'ventas' && <VentasTab />}
          {activeTab === 'ingresos' && <IngresosTab />}
          {activeTab === 'compras' && <ComprasTab />}
          {activeTab === 'gastos' && <GastosTab />}
          {activeTab === 'comparativa' && <ComparativaTab />}
          {activeTab === 'porpagar' && <PorPagarTab />}
          {activeTab === 'inventario' && <InventarioTab />}
          {activeTab === 'productos' && <ProductosTab />}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
