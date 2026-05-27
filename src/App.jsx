import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ComprasPadre from './ComprasPadre';
import { createVenta, updateVenta, deleteVenta, fetchVentas, fetchAllVentas } from './api/ventas';
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
const monthOptions = [{ label: 'Todo el año', value: null }, ...monthNames.map((label, index) => ({ label, value: index + 1 }))];

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
  const [analisisOpen, setAnalisisOpen] = useState(false);
  const [auth, setAuth] = useState(isAuthenticated());

  const [sortColumn, setSortColumn] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeFilters, setActiveFilters] = useState({
    producto_nombre: new Set(),
    cliente: new Set(),
    canal_venta: new Set(),
    pagado: new Set()
  });
  const [activeColumnFilter, setActiveColumnFilter] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

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

  const loadVentas = useCallback(async ({ pageUrl = null, mes = null, anio = null, ordering = null, filters = {}, allPages = true } = {}) => {
    try {
      const data = allPages
        ? await fetchAllVentas({ mes, anio, ordering, filters })
        : await fetchVentas({ pageUrl, mes, anio, ordering, filters });
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
  const appliedFilters = useMemo(() => {
    return Object.fromEntries(Object.entries(activeFilters)
      .filter(([, values]) => values.size > 0)
      .map(([key, values]) => [key, Array.from(values).sort()]));
  }, [activeFilters]);

  const orderingValue = useMemo(() => {
    if (!sortColumn) return null;
    return sortOrder === 'desc' ? `-${sortColumn}` : sortColumn;
  }, [sortColumn, sortOrder]);

  const handleLogin = useCallback(() => {
    setAuth(true);
    // force a fresh data load after authentication
    loadProductos();
    loadVentas({ ordering: orderingValue, filters: appliedFilters });
    loadCompras();
    loadInventario();
    loadReporte();
  }, [loadProductos, loadVentas, loadCompras, loadInventario, loadReporte, orderingValue, appliedFilters]);

  // Cargar datos cuando el usuario está autenticado (al montar o al iniciar sesión)
  useEffect(() => {
    if (!auth) return; // no intentar cargar si no está autenticado
    loadProductos();
    loadVentas({ ordering: orderingValue, filters: appliedFilters });
    loadCompras();
    loadInventario();
    loadReporte();
  }, [auth, loadProductos, loadVentas, loadCompras, loadInventario, loadReporte, orderingValue, appliedFilters]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#A28BFE', '#FF6394', '#5DD4FF', '#FF9E30', '#62C78A'];

    const ventasArray = Array.isArray(ventas)
      ? ventas
      : ventas?.results ?? [];

    // Clientes más frecuentes (Top 5) excluyendo NN/nn anónimos
    const clientesFrecuentes = ventasArray
      .filter((v) => {
        const clienteRaw = (v.cliente || '').toString().trim();
        const clienteLower = clienteRaw.toLowerCase();
        return clienteLower !== 'nn' && clienteLower !== 'ningún nombre' && clienteRaw !== '';
      })
      .reduce((acc, v) => {
        const cliente = v.cliente || 'Sin nombre';
        const existing = acc.find(c => c.nombre === cliente);
        if (existing) {
          existing.compras += 1;
          existing.total += parseFloat(v.total) || 0;
        } else {
          acc.push({ nombre: cliente, compras: 1, total: parseFloat(v.total) || 0 });
        }
        return acc;
      }, [])
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const dataClientesTop5 = clientesFrecuentes.map(c => ({
      name: c.nombre.substring(0, 15),
      value: c.total
    }));

    const dataProductosMasGanancia = ventasArray
      .reduce((acc, venta) => {
        const nombre = venta.producto_nombre || `Producto ${venta.producto || ''}` || 'Sin producto';
        const cantidad = parseFloat(venta.cantidad) || 0;
        const precio = parseFloat(venta.precio_unitario) || 0;
        const ingreso = cantidad * precio;
        if (ingreso <= 0) return acc;
        const existing = acc.find(item => item.nombre === nombre);
        if (existing) {
          existing.valor += ingreso;
        } else {
          acc.push({ nombre, valor: ingreso });
        }
        return acc;
      }, [])
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow xl:col-span-1">
            <h3 className="text-lg md:text-xl font-bold mb-4">Top 5 Clientes</h3>
            {dataClientesTop5.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={dataClientesTop5}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#0088FE"
                    label={(entry) => `${entry.name}: ${Number(entry.value).toLocaleString()}`}
                  >
                    {dataClientesTop5.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingreso']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos de ventas</p>
            )}
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow xl:col-span-2">
            <h3 className="text-lg md:text-xl font-bold mb-4">Top 10 Productos por Ingreso</h3>
            {dataProductosMasGanancia.length > 0 ? (
              <ResponsiveContainer width="100%" height={420}>
                <BarChart layout="vertical" data={dataProductosMasGanancia} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <YAxis type="category" dataKey="nombre" width={190} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingreso']} />
                  <Bar dataKey="valor" fill="#0A84FF" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos suficientes para mostrar productos</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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
          <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-x-auto">
            <h3 className="text-lg md:text-xl font-bold mb-4">Ingresos por Día</h3>
            {ventasPorDia.length > 0 ? (
              <div className="min-w-[600px]">
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
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos</p>
            )}
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-x-auto">
            <h3 className="text-lg md:text-xl font-bold mb-4">Ingresos por Semana</h3>
            {dataVentasProSemana.length > 0 ? (
              <div className="min-w-[600px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dataVentasProSemana}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} labelFormatter={(label) => `${label}`} />
                    <Bar dataKey="total" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow overflow-x-auto">
          <h3 className="text-lg md:text-xl font-bold mb-4">Ingresos por Mes</h3>
          {dataVentasPorMes.length > 0 ? (
            <div className="min-w-[600px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataVentasPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
    const [ventasPage, setVentasPage] = useState({ results: [], next: null, previous: null, count: 0 });
    const [ventasLoading, setVentasLoading] = useState(false);

    const ventasArray = ventasPage.results || [];
    const filterableColumns = [
      { key: 'numero', label: 'N°' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'producto_nombre', label: 'Producto' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'canal_venta', label: 'Canal', hiddenClass: 'hidden lg:table-cell' },
      { key: 'cantidad', label: 'Cant.' },
      { key: 'precio_unitario', label: 'P. Unit.' },
      { key: 'total', label: 'Total' },
      { key: 'pagado', label: 'Pagado' }
    ];

    const isNumericColumn = (columnKey) => ['numero', 'cantidad', 'precio_unitario', 'total'].includes(columnKey);

    const columnOptions = useMemo(() => {
      const options = {};
      filterableColumns.forEach(({ key }) => {
        const rawValues = ventasArray.map((v) => v[key]);
        const uniqueValues = Array.from(new Set(rawValues.filter((value) => value !== null && value !== undefined && value !== '')));
        options[key] = uniqueValues.sort((a, b) => {
          if (isNumericColumn(key)) {
            return Number(a) - Number(b);
          }
          return String(a).localeCompare(String(b));
        });
      });
      return options;
    }, [ventasArray]);

    const toggleFilterOption = (columnKey, value) => {
      setActiveFilters((prev) => {
        const next = { ...prev };
        const current = new Set(next[columnKey] || []);
        if (current.has(value)) {
          current.delete(value);
        } else {
          current.add(value);
        }
        next[columnKey] = current;
        return next;
      });
    };

    const clearFilterForColumn = (columnKey) => {
      setActiveFilters((prev) => ({ ...prev, [columnKey]: new Set() }));
    };

    const toggleColumnFilterMenu = (columnKey) => {
      setActiveColumnFilter((prev) => (prev === columnKey ? null : columnKey));
    };

    const loadVentasPage = useCallback(async ({ pageUrl = null, mes = selectedMonth, anio = selectedYear, ordering = orderingValue, filters = appliedFilters } = {}) => {
      setVentasLoading(true);
      try {
        const data = await fetchVentas({ pageUrl, mes: mes === null ? null : mes, anio, ordering, filters });
        const results = Array.isArray(data) ? data : data.results ?? [];
        const next = data.next || null;
        const previous = data.previous || null;
        const count = data.count ?? (Array.isArray(results) ? results.length : 0);
        setVentasPage({ results, next, previous, count });
      } catch (error) {
        console.error('Error cargando página de ventas:', error);
      } finally {
        setVentasLoading(false);
      }
    }, [selectedMonth, selectedYear, orderingValue, appliedFilters]);

    useEffect(() => {
      loadVentasPage({ pageUrl: null, mes: selectedMonth, anio: selectedYear, ordering: orderingValue, filters: appliedFilters });
    }, [selectedMonth, selectedYear, orderingValue, appliedFilters, loadVentasPage]);

    const renderHeaderCell = ({ key, label, hiddenClass }) => {
      const selectedCount = activeFilters[key]?.size || 0;
      const isOpen = activeColumnFilter === key;
      const sortLabel = isNumericColumn(key) ? 'Menor a Mayor' : 'A-Z';
      const reverseLabel = isNumericColumn(key) ? 'Mayor a Menor' : 'Z-A';

      return (
        <th className={`p-2 md:p-3 text-left whitespace-nowrap ${hiddenClass ?? ''} relative`}>
          <div className="flex items-center gap-2">
            <span>{label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleColumnFilterMenu(key);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              aria-label={`Abrir opciones de filtro y orden para ${label}`}
            >
              ▾
            </button>
            {selectedCount > 0 && (
              <span className="inline-flex h-5 items-center rounded-full bg-blue-500 px-2 text-[11px] font-semibold text-white">
                {selectedCount}
              </span>
            )}
          </div>

          {!isMobile && isOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-[18rem] min-w-[220px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{label}</p>
                <button type="button" onClick={() => setActiveColumnFilter(null)} className="text-sm text-gray-500 hover:text-gray-800">
                  Cerrar
                </button>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setSortColumn(key);
                    setSortOrder('asc');
                    setActiveColumnFilter(null);
                  }}
                  className={`w-full rounded border px-3 py-2 text-left text-sm ${sortColumn === key && sortOrder === 'asc' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`}
                >
                  {sortLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortColumn(key);
                    setSortOrder('desc');
                    setActiveColumnFilter(null);
                  }}
                  className={`w-full rounded border px-3 py-2 text-left text-sm ${sortColumn === key && sortOrder === 'desc' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`}
                >
                  {reverseLabel}
                </button>
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Filtrar por valores</p>
                <div className="max-h-44 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2">
                  {columnOptions[key]?.length ? (
                    columnOptions[key].map((option) => {
                      const normalized = String(option);
                      return (
                        <label key={`${key}-${normalized}`} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={activeFilters[key]?.has(option)}
                            onChange={() => toggleFilterOption(key, option)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="truncate">{normalized}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">Sin valores para filtrar</p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => clearFilterForColumn(key)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Limpiar filtros
                  </button>
                  <span className="text-xs text-gray-500">Toca fuera para cerrar</span>
                </div>
              </div>
            </div>
          )}
        </th>
      );
    };

    const renderMobileFilterSheet = () => {
      if (!activeColumnFilter) return null;
      const activeColumn = filterableColumns.find((col) => col.key === activeColumnFilter);
      const label = activeColumn?.label || 'Filtro';
      const sortLabel = isNumericColumn(activeColumnFilter) ? 'Menor a Mayor' : 'A-Z';
      const reverseLabel = isNumericColumn(activeColumnFilter) ? 'Mayor a Menor' : 'Z-A';

      return (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end md:hidden" onClick={() => setActiveColumnFilter(null)}>
          <div className="w-full max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{label}</p>
                <p className="text-sm text-gray-500">Ordenar y filtrar</p>
              </div>
              <button type="button" onClick={() => setActiveColumnFilter(null)} className="text-sm font-semibold text-gray-700">
                Cerrar
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold">Orden</p>
                <button
                  type="button"
                  onClick={() => {
                    setSortColumn(activeColumnFilter);
                    setSortOrder('asc');
                    setActiveColumnFilter(null);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${sortColumn === activeColumnFilter && sortOrder === 'asc' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`}
                >
                  {sortLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortColumn(activeColumnFilter);
                    setSortOrder('desc');
                    setActiveColumnFilter(null);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${sortColumn === activeColumnFilter && sortOrder === 'desc' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`}
                >
                  {reverseLabel}
                </button>
              </div>
              <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold">Filtrar por valores</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {columnOptions[activeColumnFilter]?.length ? (
                    columnOptions[activeColumnFilter].map((option) => {
                      const normalized = String(option);
                      return (
                        <label key={`mobile-${activeColumnFilter}-${normalized}`} className="flex cursor-pointer items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={activeFilters[activeColumnFilter]?.has(option)}
                            onChange={() => toggleFilterOption(activeColumnFilter, option)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <span>{normalized}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">Sin valores para filtrar</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => clearFilterForColumn(activeColumnFilter)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

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
              loadVentasPage({ pageUrl: null, mes: selectedMonth, anio: selectedYear, ordering: orderingValue, filters: appliedFilters });
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
                  Ventas de <span className="font-semibold">{selectedMonth === null ? 'Todo el año' : monthNames[selectedMonth - 1]}</span> <span className="font-semibold">{selectedYear}</span>
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
                {monthOptions.map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedMonth(value)}
                    className={`min-w-[100px] shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${selectedMonth === value ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'}`}
                  >
                    {label}
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
                  {renderHeaderCell({ key: 'numero', label: 'N°' })}
                  {renderHeaderCell({ key: 'fecha', label: 'Fecha' })}
                  {renderHeaderCell({ key: 'producto_nombre', label: 'Producto' })}
                  {renderHeaderCell({ key: 'cliente', label: 'Cliente' })}
                  {renderHeaderCell({ key: 'canal_venta', label: 'Canal', hiddenClass: 'hidden lg:table-cell' })}
                  {renderHeaderCell({ key: 'cantidad', label: 'Cant.' })}
                  {renderHeaderCell({ key: 'precio_unitario', label: 'P. Unit.' })}
                  {renderHeaderCell({ key: 'total', label: 'Total' })}
                  {renderHeaderCell({ key: 'pagado', label: 'Pagado' })}
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {ventasArray.map((v) => (
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
                                loadVentasPage({ pageUrl: null, mes: selectedMonth, anio: selectedYear, ordering: orderingValue, filters: appliedFilters });
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
          {renderMobileFilterSheet()}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {ventasArray.length} de {ventasPage.count} ventas
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadVentasPage({ pageUrl: ventasPage.previous })}
                disabled={!ventasPage.previous || ventasLoading}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => loadVentasPage({ pageUrl: ventasPage.next })}
                disabled={!ventasPage.next || ventasLoading}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
              >
                Siguiente →
              </button>
            </div>
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
    <div className="min-h-screen bg-slate-100">
      <nav className="relative z-50 bg-slate-900 text-white p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="relative z-50 p-2 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 transition"
            title="Toggle Sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg md:text-2xl font-bold">Sistema ERP</h1>
        </div>
        <button 
          onClick={() => {
            logout();
            setAuth(false);
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
          title="Cerrar sesión"
        >
          Cerrar sesión
        </button>
      </nav>

      <div className="flex relative">
        {/* Overlay para móviles */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/10 md:hidden z-30 transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 w-64 bg-slate-950 text-slate-100 h-screen shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-5 flex flex-col h-full">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-2">Kaizen ERP</p>
              <h2 className="text-2xl font-bold">Panel de Control</h2>
            </div>
            <nav className="space-y-2 flex-1">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition ${activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow'
                  : 'hover:bg-slate-800/80'
                  }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => {
                  setActiveTab('ventas');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition ${activeTab === 'ventas'
                  ? 'bg-blue-600 text-white shadow'
                  : 'hover:bg-slate-800/80'
                  }`}
              >
                💰 Ventas
              </button>
              <button
                onClick={() => {
                  setActiveTab('compras');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition ${activeTab === 'compras'
                  ? 'bg-blue-600 text-white shadow'
                  : 'hover:bg-slate-800/80'
                  }`}
              >
                🛒 Compras
              </button>
              <button
                onClick={() => {
                  setActiveTab('inventario');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition ${activeTab === 'inventario'
                  ? 'bg-blue-600 text-white shadow'
                  : 'hover:bg-slate-800/80'
                  }`}
              >
                📦 Inventario
              </button>
              <button
                onClick={() => {
                  setActiveTab('productos');
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition ${activeTab === 'productos'
                  ? 'bg-blue-600 text-white shadow'
                  : 'hover:bg-slate-800/80'
                  }`}
              >
                🏷️ Productos
              </button>
            </nav>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <button
                onClick={() => setAnalisisOpen(!analisisOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-800 bg-slate-900 text-left text-slate-100 hover:bg-slate-800 transition"
              >
                <span>📈 Análisis</span>
                <span className="text-sm">{analisisOpen ? '▲' : '▼'}</span>
              </button>
              {analisisOpen && (
                <div className="mt-3 space-y-2 pl-2">
                  <button
                    onClick={() => {
                      setActiveTab('ingresos');
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
                  >
                    Ingresos
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('gastos');
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
                  >
                    Gastos
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('comparativa');
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
                  >
                    Comparativa: Ingresos vs Gastos
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('porpagar');
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
                  >
                    Ventas Pendientes de Pago
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto w-full transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
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
