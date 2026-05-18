import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ComprasPadre from './ComprasPadre';
import { createVenta, updateVenta, deleteVenta, fetchVentas } from './api/ventas';
import { createCompra, fetchCompras } from './api/compras';
import { createProducto, updateProducto, deleteProducto, fetchProductos } from './api/productos';
import { fetchInventario, fetchReporteFinanciero } from './api/inventario';
import Login from "./Login";
import { logout, isAuthenticated } from "./api/auth";




// Función para formatear fechas a dd-mm-yyyy
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const date = new Date(fecha + 'T00:00:00');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Función para obtener la fecha local en formato YYYY-MM-DD
const obtenerFechaLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Componente independiente para formulario de ventas
const FormularioVentas = ({ productos, ventas, initialVenta, onVentaRegistrada }) => {
  const [ventaForm, setVentaForm] = useState(
    initialVenta ? {
      producto: initialVenta.producto,
      fecha: initialVenta.fecha,
      canal_venta: initialVenta.canal_venta,
      cliente: initialVenta.cliente,
      metodo_pago: initialVenta.metodo_pago,
      cantidad: initialVenta.cantidad,
      precio_unitario: initialVenta.precio_unitario,
      pagado: initialVenta.pagado
    } : {
      producto: '',
      fecha: obtenerFechaLocal(),
      canal_venta: 'local',
      cliente: '',
      metodo_pago: 'efectivo',
      cantidad: '',
      precio_unitario: '',
      pagado: true
    }
  );
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const editingId = initialVenta?.id;

  // cuando se carga un venta para editar, también mostramos el nombre del producto
  useEffect(() => {
    if (initialVenta) {
      const prod = productos.find(p => p.id === initialVenta.producto);
      setProductSearch(prod ? prod.nombre : '');
      setShowSuggestions(false);
      setVentaForm({
        producto: initialVenta.producto,
        fecha: initialVenta.fecha,
        canal_venta: initialVenta.canal_venta,
        cliente: initialVenta.cliente,
        metodo_pago: initialVenta.metodo_pago,
        cantidad: initialVenta.cantidad,
        precio_unitario: initialVenta.precio_unitario,
        pagado: initialVenta.pagado
      });
    }
  }, [initialVenta, productos]);

  const handleCreateVenta = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);

    // si no tenemos id pero sí un nombre, intentamos resolverlo
    const formToSend = { ...ventaForm };
    if (!formToSend.producto && productSearch) {
      const match = productos.find(p => p.nombre.toLowerCase() === productSearch.toLowerCase());
      if (match) {
        formToSend.producto = match.id;
      }
    }
    if (!formToSend.producto) {
      alert('Por favor selecciona un producto válido de la lista');
      setLoading(false);
      return;
    }

    try {
      if (editingId) {
        await updateVenta(editingId, formToSend);
      } else {
        await createVenta(formToSend);
      }
      setVentaForm({
        producto: '',
        fecha: obtenerFechaLocal(),
        canal_venta: 'local',
        cliente: '',
        metodo_pago: 'efectivo',
        cantidad: '',
        precio_unitario: '',
        pagado: true
      });
      setProductSearch('');
      setShowSuggestions(false);
      alert(editingId ? 'Venta actualizada exitosamente' : 'Venta registrada exitosamente');
      if (onVentaRegistrada) onVentaRegistrada();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar/actualizar venta');
    }
    setLoading(false);
  }, [ventaForm, editingId, productSearch, productos]);

  return (
    <>
      <form onSubmit={handleCreateVenta} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
<div className="col-span-2 md:col-span-1 relative">
          <label className="block text-xs md:text-sm font-medium mb-1">Producto *</label>
          <input
            type="text"
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setVentaForm({ ...ventaForm, producto: '' });
              setShowSuggestions(true);
            }}
            className="w-full border rounded px-3 py-2 text-xs md:text-sm"
            placeholder="Escribe para buscar..."
            required
          />
          {showSuggestions && productSearch && (
            <ul className="absolute z-10 bg-white border w-full max-h-40 overflow-auto mt-1 shadow">
              {productos
                .filter(p => p.nombre.toLowerCase().includes(productSearch.toLowerCase()))
                .map(p => (
                  <li
                    key={p.id}
                    className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-xs md:text-sm"
                    onClick={() => {
                      setProductSearch(p.nombre);
                      setVentaForm({ ...ventaForm, producto: p.id, precio_unitario: p.precio_unitario ? p.precio_unitario.toString() : '' });
                      setShowSuggestions(false);
                    }}
                  >
                    {p.nombre}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium mb-1">Fecha *</label>
          <input
            type="date"
            value={ventaForm.fecha}
            onChange={(e) => setVentaForm({ ...ventaForm, fecha: e.target.value })}
            className="w-full border rounded px-3 py-2 text-xs md:text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium mb-1">Canal de Venta *</label>
          <select
            value={ventaForm.canal_venta}
            onChange={(e) => setVentaForm({ ...ventaForm, canal_venta: e.target.value })}
            className="w-full border rounded px-3 py-2 text-xs md:text-sm"
            required
          >
            <option value="local">Local</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="messenger">Messenger</option>
            <option value="instagram">Instagram</option>
            <option value="telefono">Teléfono</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs md:text-sm font-medium mb-1">Cliente *</label>
          <input
            type="text"
            value={ventaForm.cliente}
            onChange={(e) => setVentaForm({ ...ventaForm, cliente: e.target.value })}
            className="w-full border rounded px-3 py-2 text-xs md:text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium mb-1">Cantidad *</label>
          <input
            type="number"
            step="1"
            value={ventaForm.cantidad}
            onChange={(e) => setVentaForm({ ...ventaForm, cantidad: e.target.value })}
            className="w-full border rounded px-3 py-2 text-xs md:text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium mb-1">Precio Unitario *</label>
          <input
            type="number"
            step="1"
            value={ventaForm.precio_unitario}
            onChange={(e) => setVentaForm({ ...ventaForm, precio_unitario: e.target.value })}
            className="w-full border rounded px-3 py-2 text-xs md:text-sm"
            required
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs md:text-sm font-medium mb-1">Método de Pago *</label>
          <select
            value={ventaForm.metodo_pago}
            onChange={(e) => setVentaForm({ ...ventaForm, metodo_pago: e.target.value })}
            className="w-full border rounded px-3 py-2 text-xs md:text-sm"
            required
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="factura">Factura</option>
            <option value="debito">Debito</option>
            <option value="credito">Crédito</option>
          </select>
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={ventaForm.pagado}
              onChange={(e) => setVentaForm({ ...ventaForm, pagado: e.target.checked })}
              className="mr-2"
            />
            <span className="text-xs md:text-sm font-medium">¿Pagado?</span>
          </label>
        </div>

        <div className="col-span-2 md:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 text-sm md:text-base"
          >
            {loading ? 'Registrando...' : editingId ? 'Actualizar Venta' : 'Registrar Venta'}
          </button>
        </div>
      </form>
    </>
  );
};

// Componente independiente para formulario de compras
const FormularioCompras = ({ productos, onCompraRegistrada }) => {
  const [compraForm, setCompraForm] = useState({
    producto: '',
    fecha: obtenerFechaLocal(),
    cantidad: '',
    costo_unitario: '',
    valor_venta: '',
    proveedor: ''
  });
  const [loading, setLoading] = useState(false);

  const handleCreateCompra = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createCompra(compraForm);
      setCompraForm({
        producto: '',
        fecha: obtenerFechaLocal(),
        cantidad: '',
        costo_unitario: '',
        valor_venta: '',
        proveedor: ''
      });
      alert('Compra registrada exitosamente');
      if (onCompraRegistrada) onCompraRegistrada();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar compra');
    }
    setLoading(false);
  }, [compraForm]);

  return (
    <form onSubmit={handleCreateCompra} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      <div className="sm:col-span-2 md:col-span-1">
        <label className="block text-xs md:text-sm font-medium mb-1">Producto *</label>
        <select
          value={compraForm.producto}
          onChange={(e) => setCompraForm({ ...compraForm, producto: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        >
          <option value="">Seleccionar producto</option>
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium mb-1">Fecha *</label>
        <input
          type="date"
          value={compraForm.fecha}
          onChange={(e) => setCompraForm({ ...compraForm, fecha: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium mb-1">Cantidad *</label>
        <input
          type="number"
          step="1"
          value={compraForm.cantidad}
          onChange={(e) => setCompraForm({ ...compraForm, cantidad: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium mb-1">Costo Unit. *</label>
        <input
          type="number"
          step="1"
          value={compraForm.costo_unitario}
          onChange={(e) => setCompraForm({ ...compraForm, costo_unitario: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium mb-1">Valor Venta *</label>
        <input
          type="number"
          step="1"
          value={compraForm.valor_venta}
          onChange={(e) => setCompraForm({ ...compraForm, valor_venta: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        />
      </div>

      <div className="sm:col-span-2 md:col-span-1">
        <label className="block text-xs md:text-sm font-medium mb-1">Proveedor *</label>
        <input
          type="text"
          value={compraForm.proveedor}
          onChange={(e) => setCompraForm({ ...compraForm, proveedor: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        />
      </div>

      <div className="sm:col-span-2 md:col-span-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 text-sm md:text-base"
        >
          {loading ? 'Registrando...' : 'Registrar Compra'}
        </button>
      </div>
    </form>
  );
};

// Componente independiente para formulario de productos
const FormularioProductos = ({ onProductoRegistrado, initialProducto }) => {
  const [productoForm, setProductoForm] = useState({
    nombre: '',
    unidad_medida: '',
    descripcion: '',
    precio_unitario: '',
    imagen: null
  });
  const [loading, setLoading] = useState(false);
  const editingId = initialProducto?.id;

  useEffect(() => {
    if (initialProducto) {
      setProductoForm({
        nombre: initialProducto.nombre,
        unidad_medida: initialProducto.unidad_medida,
        precio_unitario: initialProducto.precio_unitario || '',
        imagen: null // No cargar imagen existente para edición, solo subir nueva si se quiere cambiar
      });
    } else {
      setProductoForm({
        nombre: '',
        unidad_medida: '',
        precio_unitario: '',
        imagen: null
      });
    }
  }, [initialProducto]);

  const handleCreateProducto = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateProducto(editingId, productoForm);
      } else {
        await createProducto(productoForm);
      }
      setProductoForm({
        nombre: '',
        unidad_medida: '',
        precio_unitario: '',
        imagen: null
      });
      alert(editingId ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
      if (onProductoRegistrado) onProductoRegistrado();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear/actualizar producto');
    }
    setLoading(false);
  }, [productoForm, editingId]);

  return (
    <form onSubmit={handleCreateProducto} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      <div className="sm:col-span-2 md:col-span-1">
        <label className="block text-xs md:text-sm font-medium mb-1">Nombre *</label>
        <input
          type="text"
          value={productoForm.nombre}
          onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium mb-1">Unidad de Medida *</label>
        <input
          type="text"
          placeholder="ej: 1,36 kg"
          value={productoForm.unidad_medida}
          onChange={(e) => setProductoForm({ ...productoForm, unidad_medida: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium mb-1">Precio Unitario</label>
        <input
          type="number"
          step="1"
          value={productoForm.precio_unitario}
          onChange={(e) => setProductoForm({ ...productoForm, precio_unitario: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          placeholder="0"
        />
      </div>

      <div className="col-span-2 md:col-span-3">
        <label className="block text-xs md:text-sm font-medium mb-1">Imagen</label>
        <div className="flex gap-4 items-end">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProductoForm({ ...productoForm, imagen: e.target.files[0] })}
            className="flex-1 border rounded px-3 py-2 text-xs md:text-sm"
          />
          {editingId && initialProducto?.imagen && (
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-600 mb-1">Imagen actual:</p>
              <img
                src={initialProducto.imagen}
                alt="Imagen actual del producto"
                className="w-32 h-32 object-cover rounded border"
              />
            </div>
          )}
        </div>
      </div>

      <div className="col-span-2 md:col-span-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400 text-sm md:text-base"
        >
          {loading ? (editingId ? 'Actualizando...' : 'Creando...') : (editingId ? 'Actualizar Producto' : 'Crear Producto')}
        </button>
      </div>
    </form>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [auth, setAuth] = useState(isAuthenticated());

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const monthNavRef = useRef(null);

  const loadProductos = useCallback(async () => {
    try {
      const data = await fetchProductos();
      setProductos(Array.isArray(data) ? data : data.results ?? []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const loadVentas = useCallback(async (mes = null, anio = null) => {
    try {
      const data = await fetchVentas({ mes, anio });
      setVentas(Array.isArray(data) ? data : data.results ?? []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const loadCompras = useCallback(async () => {
    try {
      const data = await fetchCompras();
      setCompras(Array.isArray(data) ? data : data.results ?? []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const loadInventario = useCallback(async () => {
    try {
      const data = await fetchInventario();
      setInventario(data);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const loadReporte = useCallback(async () => {
    try {
      const data = await fetchReporteFinanciero();
      setReporte(data);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  // helper to deal with login event
  const handleLogin = useCallback(() => {
    setAuth(true);
    // force a fresh data load after authentication
    loadProductos();
    loadVentas(selectedMonth, selectedYear);
    loadCompras();
    loadInventario();
    loadReporte();
  }, [loadProductos, loadVentas, loadCompras, loadInventario, loadReporte, selectedMonth, selectedYear]);

  // Cargar datos cuando el usuario está autenticado (al montar o al iniciar sesión)
  useEffect(() => {
    if (!auth) return; // no intentar cargar si no está autenticado
    loadProductos();
    loadVentas(selectedMonth, selectedYear);
    loadCompras();
    loadInventario();
    loadReporte();
  }, [auth, loadProductos, loadVentas, loadCompras, loadInventario, loadReporte, selectedMonth, selectedYear]);

  // Función helper para calcular la semana ISO con formato personalizado
  const getWeekInfo = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado

    const firstDayOfYear = new Date(year, 0, 1);
    const firstDayOfWeek = firstDayOfYear.getDay();

    // Calcular el primer domingo del año
    let firstSunday;
    if (firstDayOfWeek === 0) {
      // 1 de enero es domingo
      firstSunday = new Date(year, 0, 1);
    } else {
      // Calcular días hasta el primer domingo
      const daysUntilSunday = (7 - firstDayOfWeek + 1) % 7;
      firstSunday = new Date(year, 0, 1 + daysUntilSunday);
    }

    // Si la fecha es antes del primer domingo, pertenece a W01
    if (date < firstSunday) {
      return {
        weekKey: `${year}-W01`,
        weekStart: new Date(year, 0, 1),
        weekEnd: new Date(firstSunday)
      };
    }

    // Para fechas después del primer domingo, calcular semana completa (lunes a domingo)
    // Obtener el lunes de esta semana
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // días desde lunes
    const monday = new Date(date);
    monday.setDate(monday.getDate() - diff);

    // Calcular número de semana
    const weeksSinceFirstSunday = Math.floor((date.getTime() - firstSunday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const weekNumber = weeksSinceFirstSunday + 2; // +2 porque empieza con W02

    // Calcular domingo de esta semana
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    return {
      weekKey: `${year}-W${String(weekNumber).padStart(2, '0')}`,
      weekStart: new Date(monday),
      weekEnd: new Date(sunday)
    };
  };

  // Comparativa de Ingresos vs Gastos
  const ComparativaTab = () => {
    const comprasArray = Array.isArray(compras) ? compras : compras?.results ?? [];

    // Agrupar por mes para comparativa
    const datosPorMes = {};

    // Sumar ingresos por mes
    (Array.isArray(ventas) ? ventas : ventas?.results ?? []).forEach(v => {
      const date = new Date(v.fecha + 'T00:00:00');
      const mesAño = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!datosPorMes[mesAño]) {
        datosPorMes[mesAño] = { mes: mesAño, ingresos: 0, gastos: 0 };
      }
      datosPorMes[mesAño].ingresos += parseFloat(v.total);
    });

    // Sumar gastos por mes
    comprasArray.forEach(c => {
      const date = new Date(c.fecha + 'T00:00:00');
      const mesAño = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!datosPorMes[mesAño]) {
        datosPorMes[mesAño] = { mes: mesAño, ingresos: 0, gastos: 0 };
      }
      const costo = parseFloat(c.costo_unitario) * parseInt(c.cantidad);
      datosPorMes[mesAño].gastos += costo;
    });

    const dataComparativa = Object.values(datosPorMes).sort((a, b) => a.mes.localeCompare(b.mes));
    const gananciaTotal = dataComparativa.reduce((sum, d) => sum + (d.ingresos - d.gastos), 0);

    return (
      <div className="p-4 md:p-6">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="mb-4 bg-gray-400 text-white px-3 md:px-4 py-2 rounded hover:bg-gray-500 text-xs md:text-sm"
        >
          ← Volver al Dashboard
        </button>

        <h2 className="text-2xl md:text-3xl font-bold mb-6">Comparativa: Ingresos vs Gastos</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`${gananciaTotal >= 0 ? 'bg-green-500' : 'bg-red-500'} text-white p-4 md:p-6 rounded-lg shadow`}>
            <h3 className="text-xs md:text-sm font-semibold mb-2">Ganancia Total</h3>
            <p className="text-2xl md:text-3xl font-bold">${Math.abs(gananciaTotal)}</p>
            <p className="text-xs mt-2">{gananciaTotal >= 0 ? 'Positivo' : 'Negativo'}</p>
          </div>

          <div className="bg-blue-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Total Ingresos</h3>
            <p className="text-2xl md:text-3xl font-bold">${dataComparativa.reduce((sum, d) => sum + d.ingresos, 0)}</p>
          </div>

          <div className="bg-red-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Total Gastos</h3>
            <p className="text-2xl md:text-3xl font-bold">${dataComparativa.reduce((sum, d) => sum + d.gastos, 0)}</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-4">Comparativa Mensual</h3>
          {dataComparativa.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dataComparativa}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Legend />
                <Bar dataKey="ingresos" fill="#0088FE" name="Ingresos" />
                <Bar dataKey="gastos" fill="#FF8042" name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay datos</p>
          )}
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-lg md:text-xl font-bold mb-4">Detalle por Mes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 md:p-3 text-left">Mes</th>
                  <th className="p-2 md:p-3 text-right">Ingresos</th>
                  <th className="p-2 md:p-3 text-right">Gastos</th>
                  <th className="p-2 md:p-3 text-right">Ganancia/Pérdida</th>
                </tr>
              </thead>
              <tbody>
                {dataComparativa.map((d, idx) => {
                  const diferencia = d.ingresos - d.gastos;
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 md:p-3 font-semibold">{d.mes}</td>
                      <td className="p-2 md:p-3 text-right text-blue-600 font-semibold">${d.ingresos}</td>
                      <td className="p-2 md:p-3 text-right text-red-600 font-semibold">${d.gastos}</td>
                      <td className={`p-2 md:p-3 text-right font-bold ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${diferencia}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Ventas Pendientes de Pago
  const PorPagarTab = () => {
    const ventasArray = Array.isArray(ventas) ? ventas : ventas?.results ?? [];
    const ventasPendientes = ventasArray.filter(v => !v.pagado);
    const totalPendiente = ventasPendientes.reduce((sum, v) => sum + parseFloat(v.total), 0);

    return (
      <div className="p-4 md:p-6">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="mb-4 bg-gray-400 text-white px-3 md:px-4 py-2 rounded hover:bg-gray-500 text-xs md:text-sm"
        >
          ← Volver al Dashboard
        </button>

        <h2 className="text-2xl md:text-3xl font-bold mb-6">Ventas Pendientes de Pago</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-yellow-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Total Pendiente</h3>
            <p className="text-2xl md:text-3xl font-bold">${totalPendiente}</p>
            <p className="text-xs mt-2">{ventasPendientes.length} ventas</p>
          </div>

          <div className="bg-blue-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Clientes Deudores</h3>
            <p className="text-2xl md:text-3xl font-bold">{new Set(ventasPendientes.map(v => v.cliente)).size}</p>
            <p className="text-xs mt-2">Clientes únicos</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-lg md:text-xl font-bold mb-4">Listado de Ventas Pendientes</h3>
          {ventasPendientes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">N°</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Fecha</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Cliente</th>
                    <th className="p-2 md:p-3 text-left hidden md:table-cell whitespace-nowrap">Producto</th>
                    <th className="p-2 md:p-3 text-left hidden lg:table-cell whitespace-nowrap">Canal</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Cant.</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Total</th>
                    <th className="p-2 md:p-3 text-left hidden md:table-cell whitespace-nowrap">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPendientes.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b hover:bg-yellow-50 transition"
                    >
                      <td className="p-2 md:p-3 font-semibold text-xs md:text-sm whitespace-nowrap">#{v.numero}</td>
                      <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{formatearFecha(v.fecha)}</td>
                      <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap font-semibold">{v.cliente}</td>
                      <td className="p-2 md:p-3 text-xs md:text-sm hidden md:table-cell whitespace-nowrap">{v.producto_nombre}</td>
                      <td className="p-2 md:p-3 text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">{v.canal_venta}</td>
                      <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{v.cantidad}</td>
                      <td className="p-2 md:p-3 font-bold text-xs md:text-sm whitespace-nowrap text-yellow-600">${v.total || 0}</td>
                      <td className="p-2 md:p-3 text-xs md:text-sm hidden md:table-cell whitespace-nowrap">
                        <span className="px-2 py-1 rounded text-white text-xs font-semibold bg-red-500">
                          Pendiente
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-semibold mb-2">✅ ¡Excelente!</p>
              <p>No hay ventas pendientes de pago</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  
  // Dashboard
  const DashboardTab = () => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const ventasArray = Array.isArray(ventas)
      ? ventas
      : ventas?.results ?? [];

    // Clientes más frecuentes (Top 5)
    const clientesFrecuentes = ventasArray.reduce((acc, v) => {
      const cliente = v.cliente || 'Sin nombre';
      const existing = acc.find(c => c.nombre === cliente);
      if (existing) {
        existing.compras += 1;
        existing.total += parseFloat(v.total);
      } else {
        acc.push({ nombre: cliente, compras: 1, total: parseFloat(v.total) });
      }
      return acc;
    }, [])
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const dataClientesTop5 = clientesFrecuentes.map(c => ({
      name: c.nombre.substring(0, 15),
      value: c.total
    }));

    return (
      <div className="p-4 md:p-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Dashboard</h2>

        {reporte && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <button
              onClick={() => setActiveTab('ingresos')}
              className="bg-blue-500 text-white p-4 md:p-6 rounded-lg shadow hover:shadow-lg hover:scale-105 transition transform cursor-pointer"
            >
              <h3 className="text-xs md:text-sm font-semibold mb-2">Total Ingresos</h3>
              <p className="text-2xl md:text-3xl font-bold">${reporte.total_ingresos}</p>
              <p className="text-xs mt-2">{reporte.cantidad_ventas} ventas</p>
              <p className="text-xs mt-1 opacity-75">📈 Ver detalle</p>
            </button>

            <button
              onClick={() => setActiveTab('gastos')}
              className="bg-red-500 text-white p-4 md:p-6 rounded-lg shadow hover:shadow-lg hover:scale-105 transition transform cursor-pointer"
            >
              <h3 className="text-xs md:text-sm font-semibold mb-2">Total Gastos</h3>
              <p className="text-2xl md:text-3xl font-bold">${reporte.total_gastos}</p>
              <p className="text-xs mt-2">{reporte.cantidad_compras} compras</p>
              <p className="text-xs mt-1 opacity-75">📈 Ver detalle</p>
            </button>

            <button
              onClick={() => setActiveTab('comparativa')}
              className={`${reporte.ganancia_perdida >= 0 ? 'bg-green-500' : 'bg-orange-500'} text-white p-4 md:p-6 rounded-lg shadow hover:shadow-lg hover:scale-105 transition transform cursor-pointer`}
            >
              <h3 className="text-xs md:text-sm font-semibold mb-2">
                {reporte.ganancia_perdida >= 0 ? 'Ganancia 🡹' : 'Pérdida 🡻'}
              </h3>
              <p className="text-2xl md:text-3xl font-bold">${Math.abs(reporte.ganancia_perdida)}</p>
              <p className="text-xs mt-1 opacity-75">📊 Ver detalle</p>
            </button>

            <button
              onClick={() => setActiveTab('porpagar')}
              className="bg-yellow-500 text-white p-4 md:p-6 rounded-lg shadow hover:shadow-lg hover:scale-105 transition transform cursor-pointer"
            >
              <h3 className="text-xs md:text-sm font-semibold mb-2">Pendiente de Pago</h3>
              <p className="text-2xl md:text-3xl font-bold">${reporte.ventas_pendientes}</p>
              <p className="text-xs mt-1 opacity-75">📋 Ver detalle</p>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-lg md:text-xl font-bold mb-4">Top 5 Clientes</h3>
            {dataClientesTop5.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataClientesTop5}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos de ventas</p>
            )}
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-lg md:text-xl font-bold mb-4">Productos con Bajo Stock</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {inventario
                .filter(item => item.stock_actual < 5)
                .map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 md:p-3 bg-red-50 rounded border border-red-200 text-xs md:text-sm">
                    <span className="font-semibold">{item.producto_nombre}</span>
                    <span className="text-red-600 font-bold">
                      Stock: {item.stock_actual}
                    </span>
                  </div>
                ))}
              {inventario.filter(item => item.stock_actual < 5).length === 0 && (
                <p className="text-gray-500 text-center py-4 text-sm">No hay productos con stock bajo</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Ingresos Tab - Análisis detallado de ventas
  const IngresosTab = () => {
    const ventasArray = Array.isArray(ventas) ? ventas : ventas?.results ?? [];

    // Agrupar ventas por fecha
    const ventasPorDia = ventasArray.reduce((acc, v) => {
      const fecha = v.fecha;
      const existing = acc.find(item => item.fecha === fecha);
      if (existing) {
        existing.total += parseFloat(v.total);
        existing.cantidad += 1;
      } else {
        acc.push({ fecha, total: parseFloat(v.total), cantidad: 1 });
      }
      return acc;
    }, []).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Agrupar por semana usando la función helper
    const ventasPorSemanaMap = {};
    const ventasPorSemanaDetalles = {};
    ventasArray.forEach(v => {
      const weekInfo = getWeekInfo(v.fecha);
      ventasPorSemanaMap[weekInfo.weekKey] = (ventasPorSemanaMap[weekInfo.weekKey] || 0) + parseFloat(v.total);
      ventasPorSemanaDetalles[weekInfo.weekKey] = weekInfo;
    });

    const dataVentasProSemana = Object.keys(ventasPorSemanaMap)
      .sort()
      .map(weekKey => {
        const details = ventasPorSemanaDetalles[weekKey];
        const startStr = `${String(details.weekStart.getDate()).padStart(2, '0')}/${String(details.weekStart.getMonth() + 1).padStart(2, '0')}`;
        const endStr = `${String(details.weekEnd.getDate()).padStart(2, '0')}/${String(details.weekEnd.getMonth() + 1).padStart(2, '0')}`;
        return {
          semana: weekKey,
          rango: `${startStr} - ${endStr}`,
          total: ventasPorSemanaMap[weekKey]
        };
      });

    // Agrupar por mes
    const ventasPorMesMap = {};
    ventasArray.forEach(v => {
      const date = new Date(v.fecha + 'T00:00:00');
      const mesAño = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      ventasPorMesMap[mesAño] = (ventasPorMesMap[mesAño] || 0) + parseFloat(v.total);
    });

    const dataVentasPorMes = Object.keys(ventasPorMesMap)
      .sort()
      .map(mes => ({
        mes,
        total: ventasPorMesMap[mes]
      }));

    const totalIngresos = ventasArray.reduce((sum, v) => sum + parseFloat(v.total), 0);
    const diasConVentas = ventasPorDia.length;
    const promedioPorDia = diasConVentas > 0 ? Math.round(totalIngresos / diasConVentas) : 0;

    return (
      <div className="p-4 md:p-6">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="mb-4 bg-gray-400 text-white px-3 md:px-4 py-2 rounded hover:bg-gray-500 text-xs md:text-sm"
        >
          ← Volver al Dashboard
        </button>

        <h2 className="text-2xl md:text-3xl font-bold mb-6">Análisis de Ingresos</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Total Ingresos</h3>
            <p className="text-2xl md:text-3xl font-bold">${Math.round(totalIngresos)}</p>
          </div>
          <div className="bg-indigo-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Ventas Totales</h3>
            <p className="text-2xl md:text-3xl font-bold">{ventasArray.length}</p>
          </div>
          <div className="bg-cyan-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Promedio por Día</h3>
            <p className="text-2xl md:text-3xl font-bold">${promedioPorDia}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-lg md:text-xl font-bold mb-4">Ingresos por Día</h3>
            {ventasPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ventasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#0088FE" name="Ingresos ($)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos</p>
            )}
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-lg md:text-xl font-bold mb-4">Ingresos por Semana</h3>
            {dataVentasProSemana.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataVentasProSemana}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value}`} labelFormatter={(label) => `${label}`} />
                  <Bar dataKey="total" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-lg md:text-xl font-bold mb-4">Ingresos por Mes</h3>
          {dataVentasPorMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataVentasPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay datos</p>
          )}
        </div>

        {/* Historial de ventas en análisis de ingresos (solo lectura) */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold mb-4">Historial de Ventas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">N°</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Fecha</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Producto</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Cliente</th>
                  <th className="p-2 md:p-3 text-left hidden lg:table-cell whitespace-nowrap">Canal</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Cant.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">P. Unit.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Total</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {ventasArray.map(v => (
                  <tr key={v.id} className="border-b text-xs md:text-sm">
                    <td className="p-2 md:p-3 font-semibold whitespace-nowrap">#{v.numero}</td>
                    <td className="p-2 md:p-3 whitespace-nowrap">{formatearFecha(v.fecha)}</td>
                    <td className="p-2 md:p-3 whitespace-nowrap">{v.producto_nombre}</td>
                    <td className="p-2 md:p-3 whitespace-nowrap">{v.cliente}</td>
                    <td className="p-2 md:p-3 hidden lg:table-cell whitespace-nowrap">{v.canal_venta}</td>
                    <td className="p-2 md:p-3 whitespace-nowrap">{v.cantidad}</td>
                    <td className="p-2 md:p-3 whitespace-nowrap">${v.precio_unitario}</td>
                    <td className="p-2 md:p-3 font-bold whitespace-nowrap">${v.total || 0}</td>
                    <td className="p-2 md:p-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-white text-xs font-semibold ${v.pagado ? 'bg-green-500' : 'bg-red-500'}`}>
                        {v.pagado ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Gastos Tab - Análisis detallado de compras
  const GastosTab = () => {
    const comprasArray = Array.isArray(compras) ? compras : compras?.results ?? [];

    // Agrupar compras por fecha
    const comprasPorDia = comprasArray.reduce((acc, c) => {
      const fecha = c.fecha;
      const existing = acc.find(item => item.fecha === fecha);
      const costo = parseFloat(c.costo_unitario) * parseInt(c.cantidad);
      if (existing) {
        existing.total += costo;
        existing.cantidad += 1;
      } else {
        acc.push({ fecha, total: costo, cantidad: 1 });
      }
      return acc;
    }, []).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Agrupar por semana usando la función helper
    const comprasPorSemanaMap = {};
    const comprasPorSemanaDetalles = {};
    comprasArray.forEach(c => {
      const weekInfo = getWeekInfo(c.fecha);
      const costo = parseFloat(c.costo_unitario) * parseInt(c.cantidad);
      comprasPorSemanaMap[weekInfo.weekKey] = (comprasPorSemanaMap[weekInfo.weekKey] || 0) + costo;
      comprasPorSemanaDetalles[weekInfo.weekKey] = weekInfo;
    });

    const dataComprasProSemana = Object.keys(comprasPorSemanaMap)
      .sort()
      .map(weekKey => {
        const details = comprasPorSemanaDetalles[weekKey];
        const startStr = `${String(details.weekStart.getDate()).padStart(2, '0')}/${String(details.weekStart.getMonth() + 1).padStart(2, '0')}`;
        const endStr = `${String(details.weekEnd.getDate()).padStart(2, '0')}/${String(details.weekEnd.getMonth() + 1).padStart(2, '0')}`;
        return {
          semana: weekKey,
          rango: `${startStr} - ${endStr}`,
          total: comprasPorSemanaMap[weekKey]
        };
      });

    // Agrupar por mes
    const comprasPorMesMap = {};
    comprasArray.forEach(c => {
      const date = new Date(c.fecha + 'T00:00:00');
      const mesAño = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const costo = parseFloat(c.costo_unitario) * parseInt(c.cantidad);
      comprasPorMesMap[mesAño] = (comprasPorMesMap[mesAño] || 0) + costo;
    });

    const dataComprasPorMes = Object.keys(comprasPorMesMap)
      .sort()
      .map(mes => ({
        mes,
        total: comprasPorMesMap[mes]
      }));

    const totalGastos = comprasArray.reduce((sum, c) => {
      const costo = parseFloat(c.costo_unitario) * parseInt(c.cantidad);
      return sum + costo;
    }, 0);

    const diasConCompras = comprasPorDia.length;
    const promedioPorDia = diasConCompras > 0 ? Math.round(totalGastos / diasConCompras) : 0;

    return (
      <div className="p-4 md:p-6">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="mb-4 bg-gray-400 text-white px-3 md:px-4 py-2 rounded hover:bg-gray-500 text-xs md:text-sm"
        >
          ← Volver al Dashboard
        </button>

        <h2 className="text-2xl md:text-3xl font-bold mb-6">Análisis de Gastos</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Total Gastos</h3>
            <p className="text-2xl md:text-3xl font-bold">${Math.round(totalGastos)}</p>
          </div>
          <div className="bg-orange-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Compras Totales</h3>
            <p className="text-2xl md:text-3xl font-bold">{comprasArray.length}</p>
          </div>
          <div className="bg-pink-500 text-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-xs md:text-sm font-semibold mb-2">Promedio por Día</h3>
            <p className="text-2xl md:text-3xl font-bold">${promedioPorDia}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-lg md:text-xl font-bold mb-4">Gastos por Día</h3>
            {comprasPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comprasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#FF8042" name="Gastos ($)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos</p>
            )}
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-lg md:text-xl font-bold mb-4">Gastos por Semana</h3>
            {dataComprasProSemana.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataComprasProSemana}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value}`} labelFormatter={(label) => `${label}`} />
                  <Bar dataKey="total" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-lg md:text-xl font-bold mb-4">Gastos por Mes</h3>
          {dataComprasPorMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataComprasPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#FF6B6B" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay datos</p>
          )}
        </div>
      </div>
    );
  };

  // Ventas Tab
  const VentasTab = () => {
    const [editingVenta, setEditingVenta] = useState(null);

    const handleEditVenta = (venta) => {
      setEditingVenta(venta);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div className="p-4 md:p-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Gestión de Ventas</h2>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-4">{editingVenta ? 'Editar Venta' : 'Registrar Nueva Venta'}</h3>
          {editingVenta && (
            <button
              onClick={() => setEditingVenta(null)}
              className="mb-4 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
            >
              ← Volver a Nueva Venta
            </button>
          )}
          <FormularioVentas
            productos={productos}
            ventas={ventas}
            initialVenta={editingVenta}
            onVentaRegistrada={() => {
              setEditingVenta(null);
              loadVentas(selectedMonth, selectedYear);
              loadInventario();
              loadReporte();
            }}
          />
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 md:p-6">
            <div className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h3 className="text-lg md:text-xl font-bold">Historial de Ventas</h3>
                <p className="text-sm text-gray-600">
                  Ventas de <span className="font-semibold">{monthNames[selectedMonth - 1]}</span> <span className="font-semibold">{selectedYear}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedYear((prev) => prev - 1)}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  title="Año anterior"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedYear((prev) => prev + 1)}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  title="Año siguiente"
                >
                  →
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => monthNavRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded border border-gray-300 bg-white text-lg text-gray-700 hover:bg-gray-50"
                title="Mover meses a la izquierda"
              >
                ‹
              </button>
              <div
                ref={monthNavRef}
                className="flex w-full overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
              >
                {monthNames.map((nombre, index) => (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => setSelectedMonth(index + 1)}
                    className={`min-w-[100px] flex-shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${selectedMonth === index + 1 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'}`}
                  >
                    {nombre}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => monthNavRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded border border-gray-300 bg-white text-lg text-gray-700 hover:bg-gray-50"
                title="Mover meses a la derecha"
              >
                ›
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">N°</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Fecha</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Producto</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Cliente</th>
                  <th className="p-2 md:p-3 text-left hidden lg:table-cell whitespace-nowrap">Canal</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Cant.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">P. Unit.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Total</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Pagado</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => handleEditVenta(v)}
                    className="border-b hover:bg-blue-50 cursor-pointer transition"
                  >
                    <td className="p-2 md:p-3 font-semibold text-xs md:text-sm whitespace-nowrap">#{v.numero}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{formatearFecha(v.fecha)}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{v.producto_nombre}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{v.cliente}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">{v.canal_venta}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{v.cantidad}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">${v.precio_unitario}</td>
                    <td className="p-2 md:p-3 font-bold text-xs md:text-sm whitespace-nowrap">${v.total || 0}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-white text-xs font-semibold ${v.pagado ? 'bg-green-500' : 'bg-red-500'}`}>
                        {v.pagado ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="p-2 md:p-3 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('¿Estás seguro de eliminar esta venta?')) {
                            (async () => {
                              try {
                                await deleteVenta(v.id);
                                alert('Venta eliminada exitosamente');
                                loadVentas(selectedMonth, selectedYear);
                                loadInventario();
                                loadReporte();
                              } catch (error) {
                                alert('Error al eliminar venta');
                              }
                            })();
                          }
                        }}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                        title="Eliminar venta"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Compras Tab
  const ComprasTab = () => (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Gestión de Compras</h2>
      <ComprasPadre
        productos={productos}
        onCompraRegistrada={() => {
          loadCompras();
          loadInventario();
          loadReporte();
        }}
      />
    </div>
  );

  // Inventario Tab
  const InventarioTab = () => (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Inventario Actual</h2>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {inventario.map((item, idx) => (
            <div key={idx} className="border rounded-lg p-3 md:p-4 hover:shadow-lg transition">
              <h4 className="font-bold text-base md:text-lg mb-2">{item.producto_nombre}</h4>
              <div className="space-y-1 text-xs md:text-sm">
                <p>
                  <span className="font-semibold">Stock:</span>{' '}
                  <span className={`font-bold ${item.stock_actual < 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.stock_actual}
                  </span>
                </p>
                <p className="text-gray-600">Compras: {item.total_compras}</p>
                <p className="text-gray-600">Ventas: {item.total_ventas}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );



  // Productos Tab
  const ProductosTab = () => {
    const [editingProducto, setEditingProducto] = useState(null);

    const handleEditProducto = (producto) => {
      setEditingProducto(producto);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteProducto = async (productoId) => {
      if (window.confirm('¿Estás seguro de que deseas eliminar este producto? Se eliminarán todos sus registros de ventas y compras.')) {
        try {
          await deleteProducto(productoId);
          alert('Producto eliminado exitosamente');
          setEditingProducto(null);
          loadProductos();
          loadInventario();
          loadVentas();
          loadCompras();
          loadReporte();
        } catch (error) {
          console.error('Error:', error);
          alert('Error al eliminar producto');
        }
      }
    };

    return (
      <div className="p-4 md:p-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Gestión de Productos</h2>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-4">{editingProducto ? 'Editar Producto' : 'Agregar Nuevo Producto'}</h3>
          {editingProducto && (
            <button
              onClick={() => setEditingProducto(null)}
              className="mb-4 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
            >
              ← Volver a Nuevo Producto
            </button>
          )}
          <FormularioProductos
            onProductoRegistrado={() => {
              setEditingProducto(null);
              loadProductos();
              loadInventario();
            }}
            initialProducto={editingProducto}
          />
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-lg md:text-xl font-bold mb-4">Lista de Productos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {productos.map(p => (
              <div
                key={p.id}
                onClick={() => handleEditProducto(p)}
                className="border rounded-lg p-3 md:p-4 hover:shadow-lg transition cursor-pointer hover:border-blue-400"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">#{p.id_producto}</span>
                      <h4 className="font-bold text-base md:text-lg">{p.nombre}</h4>
                    </div>
                    <div className="space-y-1 text-xs md:text-sm">
                      <p>
                        <span className="font-semibold">Unidad:</span>{' '}
                        <span className="text-gray-600">{p.unidad_medida}</span>
                      </p>
                      {p.precio_unitario && (
                        <p>
                          <span className="font-semibold">Precio:</span>{' '}
                          <span className="text-gray-600">${p.precio_unitario}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProducto(p.id);
                    }}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm ml-2 flex-shrink-0"
                    title="Eliminar producto"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          {productos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay productos registrados
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Retornar Login o Dashboard basado en autenticación
  if (!auth) {
    return <Login onLogin={handleLogin} />;
  }

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
        <h1 className="text-lg md:text-2xl font-bold flex-1 md:flex-initial">Sistema ERP</h1>
        <button 
          onClick={() => {
            logout();
            setAuth(false);
          }}
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
};

export default App;
