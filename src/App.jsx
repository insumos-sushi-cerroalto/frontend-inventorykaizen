import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ComprasPadre from './ComprasPadre';
import { createVenta, updateVenta, deleteVenta, fetchVentas, fetchAllVentas } from './api/ventas';
import { createCompra, fetchAllCompras } from './api/compras';
import { createProducto, updateProducto, deleteProducto, fetchProductos } from './api/productos';
import { fetchInventario, fetchReporteFinanciero } from './api/inventario';
import {
  fetchMovimientos,
  fetchBalanceFinanciero,
  createMovimiento,
  updateMovimiento,
  deleteMovimiento,
  fetchDistribuciones,
  fetchDistribucionCalculada,
  createDistribucion,
  updateDistribucion,
  deleteDistribucion,
} from './api/finanzas';
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

const getMetodoPagoLabel = (metodoPago) => {
  const valor = (metodoPago ?? '').toString().trim().toLowerCase();
  if (valor.includes('mercado')) return 'Mercado Pago';
  if (valor.includes('cuenta')) return 'Cuenta Rut';
  if (valor.includes('efectivo')) return 'Efectivo';
  return metodoPago || 'Sin método';
};

// Función para obtener la fecha local en formato YYYY-MM-DD
const obtenerFechaLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getItemMinimo = (item) => {
  if (!item) return 5;
  const candidates = [item.stock_minimo, item.minimo_stock, item.min_stock];
  for (const value of candidates) {
    if (value !== undefined && value !== null && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 5;
};

const getCategoriaProducto = (item) => {
  if (!item) return 'Otros';
  const rawValue = (item.categoria || item.category || item.tipo || item.producto_categoria || '').toString().trim();
  const raw = rawValue.toLowerCase();
  const name = (item.producto_nombre || item.nombre || '').toString().toLowerCase();

  if (raw) {
    if (raw.includes('insumo') || raw.includes('envase') || raw.includes('aluminio') || raw.includes('alusa') || raw.includes('contenedor')) return 'Insumos / Envases';
    if (raw.includes('materia') || raw.includes('alimento') || raw.includes('grano') || raw.includes('comida')) return 'Materia Prima / Alimentos';
    if (raw.includes('final') || raw.includes('producto') || raw.includes('bandeja') || raw.includes('roll')) return 'Productos Finales';
    return rawValue;
  }

  if (name.match(/arroz|camarón|camaron|choclito|pollo|carne|queso|verdura|fruta|harina|azúcar|aceite|sal|salsa/)) return 'Materia Prima / Alimentos';
  if (name.match(/envase|aluminio|alusa|contenedor|bolsa|papel|plástico|empaque/)) return 'Insumos / Envases';
  if (name.match(/roll|bandeja|arrollado|combo|producto|postre|relleno/)) return 'Productos Finales';

  return 'Otros';
};

const getStockStatus = (item) => {
  const stock = Number(item?.stock_actual ?? item?.stock ?? 0);
  const minimo = getItemMinimo(item);
  if (stock <= 0) return 'sin_stock';
  if (stock <= minimo) return 'bajo_stock';
  return 'optimo';
};

const getStockStatusLabel = (status) => {
  return status === 'sin_stock' ? 'Sin stock' : status === 'bajo_stock' ? 'Stock bajo' : 'Stock óptimo';
};

const getStockCardClass = (status) => {
  if (status === 'sin_stock') return 'border-red-300 bg-red-50';
  if (status === 'bajo_stock') return 'border-amber-300 bg-amber-50';
  return 'border-emerald-300 bg-emerald-50';
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return amount.toLocaleString('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 });
};

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const monthOptions = [{ label: 'Todo el año', value: null }, ...monthNames.map((label, index) => ({ label, value: index + 1 }))];

const getProductoBaseId = (producto) => producto?.producto_base ?? producto?.producto_base_id ?? producto?.id;

const getProductoFactorConversion = (producto) => {
  const factor = Number(producto?.factor_conversion);
  return Number.isFinite(factor) && factor > 0 ? factor : 1;
};

const getProductoLabel = (producto) => {
  if (!producto) return 'Producto no definido';
  const partes = [producto.nombre];
  if (producto.marca) partes.push(producto.marca);
  if (producto.producto_base_nombre) partes.push(`base: ${producto.producto_base_nombre}`);
  const factor = getProductoFactorConversion(producto);
  if (factor !== 1) partes.push(`${factor} ${producto.unidad_medida || 'unidades base'}`);
  return partes.join(' - ');
};

// Componente independiente para formulario de ventas
const FormularioVentas = ({ productos, initialVenta, onVentaRegistrada }) => {
  const [ventaForm, setVentaForm] = useState(
    initialVenta ? {
      producto: initialVenta.producto,
      fecha: initialVenta.fecha,
      cliente: initialVenta.cliente,
      metodo_pago: initialVenta.metodo_pago,
      cantidad: initialVenta.cantidad,
      precio_unitario: initialVenta.precio_unitario,
      pagado: initialVenta.pagado,
      monto_pendiente: initialVenta.monto_pendiente ?? 0
    } : {
      producto: '',
      fecha: obtenerFechaLocal(),
      cliente: '',
      metodo_pago: 'efectivo',
      cantidad: 1,
      precio_unitario: '',
      pagado: true,
      monto_pendiente: 0
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
        cliente: initialVenta.cliente,
        metodo_pago: initialVenta.metodo_pago,
        cantidad: initialVenta.cantidad,
        precio_unitario: initialVenta.precio_unitario,
        pagado: initialVenta.pagado,
        monto_pendiente: initialVenta.monto_pendiente ?? 0
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
        cliente: '',
        metodo_pago: 'efectivo',
        cantidad: 1,
        precio_unitario: '',
        pagado: true,
        monto_pendiente: 0
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
                    {getProductoLabel(p)}
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
            min="1"
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
            <option value="cuenta_rut">Cuenta Rut</option>
            <option value="mercado_pago">Mercado Pago</option>
          </select>
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={ventaForm.pagado}
              onChange={(e) => {
                const nextPagado = e.target.checked;
                setVentaForm({ ...ventaForm, pagado: nextPagado, monto_pendiente: nextPagado ? 0 : ventaForm.monto_pendiente || 0 });
              }}
              className="mr-2"
            />
            <span className="text-xs md:text-sm font-medium">¿Pagado?</span>
          </label>
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs md:text-sm font-medium mb-1">Monto pendiente</label>
          <input
            type="number"
            min="0"
            step="1"
            value={ventaForm.monto_pendiente}
            onChange={(e) => setVentaForm({ ...ventaForm, monto_pendiente: Number(e.target.value) || 0 })}
            className="w-full border rounded px-3 py-2 text-xs md:text-sm"
            disabled={ventaForm.pagado}
            placeholder="0"
          />
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
            <option key={p.id} value={p.id}>{getProductoLabel(p)}</option>
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
          min="1"
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
const FormularioProductos = ({ productos, onProductoRegistrado, initialProducto }) => {
  const productosBase = useMemo(
    () => productos.filter((producto) => !producto.producto_base),
    [productos]
  );
  const [productoForm, setProductoForm] = useState({
    nombre: '',
    unidad_medida: '',
    descripcion: '',
    precio_unitario: '',
    marca: '',
    categoria: '',
    producto_base: '',
    factor_conversion: 1,
    imagen: null
  });
  const [loading, setLoading] = useState(false);
  const editingId = initialProducto?.id;

  useEffect(() => {
    if (initialProducto) {
      setProductoForm({
        nombre: initialProducto.nombre || '',
        unidad_medida: initialProducto.unidad_medida || '',
        descripcion: initialProducto.descripcion || '',
        precio_unitario: initialProducto.precio_unitario || '',
        marca: initialProducto.marca || '',
        categoria: initialProducto.categoria || '',
        producto_base: initialProducto.producto_base || '',
        factor_conversion: initialProducto.factor_conversion || 1,
        imagen: null // No cargar imagen existente para edición, solo subir nueva si se quiere cambiar
      });
    } else {
      setProductoForm({
        nombre: '',
        unidad_medida: '',
        descripcion: '',
        precio_unitario: '',
        marca: '',
        categoria: '',
        producto_base: '',
        factor_conversion: 1,
        imagen: null
      });
    }
  }, [initialProducto]);

  const handleCreateProducto = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...productoForm,
      producto_base: productoForm.producto_base || null,
      factor_conversion: Number(productoForm.factor_conversion) || 1
    };
    try {
      if (editingId) {
        await updateProducto(editingId, payload);
      } else {
        await createProducto(payload);
      }
      setProductoForm({
        nombre: '',
        unidad_medida: '',
        descripcion: '',
        precio_unitario: '',
        marca: '',
        categoria: '',
        producto_base: '',
        factor_conversion: 1,
        imagen: null
      });
      alert(editingId ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
      if (onProductoRegistrado) onProductoRegistrado();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear/actualizar producto');
    }
    setLoading(false);
  }, [productoForm, editingId, onProductoRegistrado]);

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
        <label className="block text-xs md:text-sm font-medium mb-1">Marca</label>
        <input
          type="text"
          value={productoForm.marca}
          onChange={(e) => setProductoForm({ ...productoForm, marca: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          placeholder="Kaizen, Japofood, Premium..."
        />
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium mb-1">Categoria</label>
        <input
          type="text"
          value={productoForm.categoria}
          onChange={(e) => setProductoForm({ ...productoForm, categoria: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          placeholder="Sushi, Congelados, Salsas..."
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

      <div className="col-span-2 md:col-span-1">
        <label className="block text-xs md:text-sm font-medium mb-1">Producto base</label>
        <select
          value={productoForm.producto_base}
          onChange={(e) => setProductoForm({ ...productoForm, producto_base: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
        >
          <option value="">Este producto controla stock</option>
          {productosBase
            .filter((producto) => producto.id !== editingId)
            .map((producto) => (
              <option key={producto.id} value={producto.id}>
                {getProductoLabel(producto)}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium mb-1">Conversion stock *</label>
        <input
          type="number"
          min="1"
          step="1"
          value={productoForm.factor_conversion}
          onChange={(e) => setProductoForm({ ...productoForm, factor_conversion: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          required
        />
      </div>

      <div className="col-span-2 md:col-span-3">
        <label className="block text-xs md:text-sm font-medium mb-1">Descripcion</label>
        <textarea
          value={productoForm.descripcion}
          onChange={(e) => setProductoForm({ ...productoForm, descripcion: e.target.value })}
          className="w-full border rounded px-3 py-2 text-xs md:text-sm"
          rows="2"
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
  const [finanzas, setFinanzas] = useState({ balance: null, movimientos: [], distribuciones: [], calculada: null });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analisisOpen, setAnalisisOpen] = useState(false);
  const [auth, setAuth] = useState(isAuthenticated());
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('all');
  const [inventoryStatus, setInventoryStatus] = useState('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [inventoryAdjustments, setInventoryAdjustments] = useState([]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    productoId: null,
    type: 'perdida',
    cantidad: '',
    stock_real: '',
    comentario: ''
  });

  const [sortColumn, setSortColumn] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeFilters, setActiveFilters] = useState({
    producto_nombre: new Set(),
    cliente: new Set(),
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
      const data = await fetchAllCompras();
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

  const loadFinanzas = useCallback(async () => {
    try {
      const [balance, movimientos, distribuciones, calculada] = await Promise.all([
        fetchBalanceFinanciero(),
        fetchMovimientos(),
        fetchDistribuciones(),
        fetchDistribucionCalculada().catch(() => null),
      ]);
      setFinanzas({ balance, movimientos, distribuciones, calculada });
    } catch (error) {
      console.error('Error al cargar finanzas:', error);
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

  const inventoryItemsAll = useMemo(() => {
    const items = Array.isArray(inventario) ? inventario : [];
    return items.map((item) => {
      const stock = Number(item.stock_actual ?? item.stock ?? 0);
      const stock_minimo = getItemMinimo(item);
      const stock_status = getStockStatus({ ...item, stock_actual: stock, stock_minimo });
      const categoria = getCategoriaProducto(item);
      return { ...item, stock_actual: stock, stock_minimo, stock_status, categoria };
    });
  }, [inventario]);

  const inventoryItems = useMemo(() => {
    return inventoryItemsAll.filter((item) => {
      const searchableText = [
        item.producto_nombre,
        item.nombre,
        item.marca,
        item.categoria
      ].filter(Boolean).join(' ').toLowerCase();
      const searchMatch = searchableText.includes(inventorySearch.toLowerCase());
      const categoryMatch = inventoryCategory === 'all' || item.categoria === inventoryCategory;
      const statusMatch = inventoryStatus === 'all' || item.stock_status === inventoryStatus;
      const urgentMatch = !showUrgentOnly || item.stock_status !== 'optimo';
      return searchMatch && categoryMatch && statusMatch && urgentMatch;
    });
  }, [inventoryItemsAll, inventorySearch, inventoryCategory, inventoryStatus, showUrgentOnly]);

  const inventoryCategories = useMemo(() => {
    return Array.from(new Set(inventoryItemsAll.map((item) => item.categoria).filter(Boolean))).sort();
  }, [inventoryItemsAll]);

  const productosById = useMemo(() => {
    return productos.reduce((acc, producto) => {
      acc[String(producto.id)] = producto;
      return acc;
    }, {});
  }, [productos]);

  const inventoryValueTotal = useMemo(() => {
    return inventoryItemsAll.reduce((sum, item) => {
      if (item.stock_actual > 0) {
        const costo = Number(item.precio_compra_promedio ?? item.precio_unitario ?? item.precio ?? 0);
        return sum + item.stock_actual * costo;
      }
      return sum;
    }, 0);
  }, [inventoryItemsAll]);

  const inventoryAlertCount = useMemo(() => {
    return inventoryItemsAll.filter(item => item.stock_status !== 'optimo').length;
  }, [inventoryItemsAll]);

  const getMovementsForItem = useCallback((item) => {
    const key = item.producto ?? item.id ?? item.producto_id;
    const name = item.producto_nombre?.toString().toLowerCase();
    const itemBaseKey = String(key);
    const movimientos = [];

    const addCompra = (compra, detalle) => {
      if (!detalle) return;
      const productId = detalle.producto ?? detalle.producto_id;
      const productName = detalle.producto_nombre?.toString().toLowerCase();
      const producto = productosById[String(productId)];
      const productBaseKey = String(getProductoBaseId(producto) ?? productId);
      if (productBaseKey === itemBaseKey || String(productId) === itemBaseKey || (name && productName === name)) {
        const factor = getProductoFactorConversion(producto);
        const cantidad = (Number(detalle.cantidad) || 0) * factor;
        movimientos.push({
          fecha: compra.fecha || compra.created_at || compra.updated_at || obtenerFechaLocal(),
          tipo: 'Compra',
          cantidad,
          total: Number(detalle.costo_unitario) * Number(detalle.cantidad) || 0,
          referencia: `${compra.proveedor || detalle.proveedor || 'Proveedor no definido'} - ${producto ? getProductoLabel(producto) : detalle.producto_nombre || 'Presentacion'}`,
        });
      }
    };

    const addVenta = (venta) => {
      const productId = venta.producto ?? venta.producto_id;
      const productName = venta.producto_nombre?.toString().toLowerCase();
      const producto = productosById[String(productId)];
      const productBaseKey = String(getProductoBaseId(producto) ?? productId);
      if (productBaseKey === itemBaseKey || String(productId) === itemBaseKey || (name && productName === name)) {
        const factor = getProductoFactorConversion(producto);
        const cantidad = (Number(venta.cantidad) || 0) * factor;
        movimientos.push({
          fecha: venta.fecha || venta.created_at || venta.updated_at || obtenerFechaLocal(),
          tipo: 'Venta',
          cantidad: -cantidad,
          total: Number(venta.precio_unitario) * Number(venta.cantidad) || 0,
          referencia: `${venta.cliente || 'Cliente no definido'} - ${producto ? getProductoLabel(producto) : venta.producto_nombre || 'Presentacion'}`,
        });
      }
    };

    const addAdjustment = (adj) => {
      if (String(adj.productoId) === String(key) || (name && adj.productoNombre?.toLowerCase() === name)) {
        const cantidad = adj.type === 'perdida'
          ? -Math.abs(Number(adj.cantidad) || 0)
          : Number(adj.stockDespues) - Number(adj.stockAntes);
        movimientos.push({
          fecha: adj.fecha,
          tipo: adj.type === 'perdida' ? 'Pérdida' : 'Ajuste auditoría',
          cantidad,
          total: 0,
          referencia: adj.comentario || 'Ajuste de inventario',
        });
      }
    };

    compras.forEach((compra) => {
      const detalles = Array.isArray(compra.compras_data) ? compra.compras_data : Array.isArray(compra.compras) ? compra.compras : [compra];
      detalles.forEach((detalle) => addCompra(compra, detalle));
    });

    ventas.forEach(addVenta);
    inventoryAdjustments.forEach(addAdjustment);

    return movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [compras, ventas, inventoryAdjustments, productosById]);

  const getProviderForItem = useCallback((item) => {
    if (!item) return 'N/D';
    if (item.proveedor) return item.proveedor;
    const providers = {};
    const itemKey = String(item.producto ?? item.id ?? item.producto_id);
    compras.forEach((compra) => {
      const detalles = Array.isArray(compra.compras_data) ? compra.compras_data : Array.isArray(compra.compras) ? compra.compras : [compra];
      detalles.forEach((detalle) => {
        const productId = detalle.producto ?? detalle.producto_id;
        const producto = productosById[String(productId)];
        const productBaseKey = String(getProductoBaseId(producto) ?? productId);
        if (productBaseKey === itemKey || String(productId) === itemKey || String(detalle.producto_nombre)?.toLowerCase() === String(item.producto_nombre)?.toLowerCase()) {
          const proveedor = compra.proveedor || detalle.proveedor || 'N/D';
          providers[proveedor] = (providers[proveedor] || 0) + 1;
        }
      });
    });
    return Object.entries(providers).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/D';
  }, [compras, productosById]);

  const handleOpenDetail = (item) => {
    setSelectedInventoryItem(item);
    setDetailModalOpen(true);
  };

  const handleOpenAdjustment = (item = null) => {
    setSelectedInventoryItem(item);
    setAdjustmentForm({
      productoId: item?.producto ?? item?.id ?? item?.producto_id ?? null,
      type: 'perdida',
      cantidad: '',
      stock_real: item ? String(item.stock_actual) : '',
      comentario: ''
    });
    setAdjustmentModalOpen(true);
  };

  const handleSubmitAdjustment = useCallback((e) => {
    e.preventDefault();
    const selectedProductoId = adjustmentForm.productoId;
    const item = inventoryItemsAll.find((inv) => String(inv.producto ?? inv.id ?? inv.producto_id) === String(selectedProductoId));
    if (!item) {
      alert('Selecciona un producto válido para registrar el ajuste.');
      return;
    }

    const cantidad = Number(adjustmentForm.cantidad) || 0;
    const stock_real = Number(adjustmentForm.stock_real);
    const beforeStock = Number(item.stock_actual || 0);
    let afterStock = beforeStock;
    let cantidadMovimiento = 0;

    if (adjustmentForm.type === 'perdida') {
      afterStock = beforeStock - Math.abs(cantidad);
      cantidadMovimiento = -Math.abs(cantidad);
    } else {
      afterStock = stock_real;
      cantidadMovimiento = stock_real - beforeStock;
    }

    setInventario((prevInventario) => prevInventario.map((inv) => {
      const invKey = String(inv.producto ?? inv.id ?? inv.producto_id);
      const selectedKey = String(item.producto ?? item.id ?? item.producto_id);
      if (invKey === selectedKey) {
        return { ...inv, stock_actual: afterStock };
      }
      return inv;
    }));

    setInventoryAdjustments((prev) => [
      ...prev,
      {
        id: Date.now(),
        productoId: item.producto ?? item.id ?? item.producto_id,
        productoNombre: item.producto_nombre || item.nombre || 'Sin nombre',
        fecha: obtenerFechaLocal(),
        type: adjustmentForm.type,
        cantidad: adjustmentForm.type === 'perdida' ? Math.abs(cantidad) : cantidadMovimiento,
        stockAntes: beforeStock,
        stockDespues: afterStock,
        comentario: adjustmentForm.comentario || (adjustmentForm.type === 'perdida' ? 'Pérdida registrada' : 'Ajuste de auditoría')
      }
    ]);

    setAdjustmentModalOpen(false);
    setDetailModalOpen(false);
  }, [adjustmentForm, inventoryItemsAll]);

  const handleCloseAdjustment = () => {
    setAdjustmentModalOpen(false);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedInventoryItem(null);
  };

  const handleInventorySearchChange = (value) => {
    setInventorySearch(value);
  };

  const handleCategoryChange = (value) => {
    setInventoryCategory(value);
  };

  const handleStatusChange = (value) => {
    setInventoryStatus(value);
  };

  const providerForSelected = selectedInventoryItem ? getProviderForItem(selectedInventoryItem) : 'N/D';

  const handleAdjustmentProductChange = (value) => {
    const item = inventoryItemsAll.find((inv) => String(inv.producto ?? inv.id ?? inv.producto_id) === String(value));
    setAdjustmentForm((prev) => ({
      ...prev,
      productoId: value,
      stock_real: item ? String(item.stock_actual) : prev.stock_real
    }));
  };

  const handleLogin = useCallback(() => {
    setAuth(true);
    // force a fresh data load after authentication
    loadProductos();
    loadVentas({ ordering: orderingValue, filters: appliedFilters });
    loadCompras();
    loadInventario();
    loadReporte();
    loadFinanzas();
  }, [loadProductos, loadVentas, loadCompras, loadInventario, loadReporte, loadFinanzas, orderingValue, appliedFilters]);

  // Cargar datos cuando el usuario está autenticado (al montar o al iniciar sesión)
  useEffect(() => {
    if (!auth) return; // no intentar cargar si no está autenticado
    loadProductos();
    loadVentas({ ordering: orderingValue, filters: appliedFilters });
    loadCompras();
    loadInventario();
    loadReporte();
    loadFinanzas();
  }, [auth, loadProductos, loadVentas, loadCompras, loadInventario, loadReporte, loadFinanzas, orderingValue, appliedFilters]);

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
    const totalPendiente = ventasPendientes.reduce((sum, v) => sum + Number(v.monto_pendiente ?? v.total ?? 0), 0);

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
            <div className="overflow-x-auto w-full">
              <table className="min-w-[920px] w-full text-xs sm:text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">N°</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Fecha</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Cliente</th>
                    <th className="p-2 md:p-3 text-left hidden md:table-cell whitespace-nowrap">Producto</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Cant.</th>
                    <th className="p-2 md:p-3 text-left whitespace-nowrap">Debe</th>
                    <th className="p-2 md:p-3 text-left hidden md:table-cell whitespace-nowrap">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPendientes.map((v) => {
                    const montoPendiente = Number(v.monto_pendiente ?? v.total ?? 0);
                    return (
                      <tr
                        key={v.id}
                        className="border-b hover:bg-yellow-50 transition"
                      >
                        <td className="p-2 md:p-3 font-semibold text-xs md:text-sm whitespace-nowrap">#{v.numero}</td>
                        <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{formatearFecha(v.fecha)}</td>
                        <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap font-semibold">{v.cliente}</td>
                        <td className="p-2 md:p-3 text-xs md:text-sm hidden md:table-cell whitespace-nowrap">{v.producto_nombre}</td>
                        <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{v.cantidad}</td>
                        <td className="p-2 md:p-3 font-bold text-xs md:text-sm whitespace-nowrap text-yellow-600">${montoPendiente}</td>
                        <td className="p-2 md:p-3 text-xs md:text-sm hidden md:table-cell whitespace-nowrap">
                          <span className="px-2 py-1 rounded text-white text-xs font-semibold bg-red-500">
                            Pendiente
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Cant.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">P. Unit.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Total</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Pago</th>
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
                    <td className="p-2 md:p-3 whitespace-nowrap">{v.cantidad}</td>
                    <td className="p-2 md:p-3 whitespace-nowrap">${v.precio_unitario}</td>
                    <td className="p-2 md:p-3 font-bold whitespace-nowrap">${v.total || 0}</td>
                    <td className="p-2 md:p-3 whitespace-nowrap">{getMetodoPagoLabel(v.metodo_pago)}</td>
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
    const [filtroFecha, setFiltroFecha] = useState('');
    const [filtroProveedor, setFiltroProveedor] = useState('');
    const [filtroProducto, setFiltroProducto] = useState('');

    const comprasFiltradas = useMemo(() => {
      const normalize = (value) => String(value ?? '').toLowerCase().trim();
      return comprasArray.filter((c) => {
        const fechaTexto = normalize(formatearFecha(c.fecha));
        const fechaRaw = normalize(c.fecha);
        const proveedorTexto = normalize(c.proveedor);
        const productoTexto = normalize(c.producto_nombre || 'Sin producto');

        const coincideFecha = !filtroFecha || fechaTexto.includes(filtroFecha.toLowerCase()) || fechaRaw.includes(filtroFecha.toLowerCase());
        const coincideProveedor = !filtroProveedor || proveedorTexto.includes(filtroProveedor.toLowerCase());
        const coincideProducto = !filtroProducto || productoTexto.includes(filtroProducto.toLowerCase());

        return coincideFecha && coincideProveedor && coincideProducto;
      });
    }, [comprasArray, filtroFecha, filtroProveedor, filtroProducto]);

    // Agrupar compras por fecha
    const comprasPorDia = comprasFiltradas.reduce((acc, c) => {
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
    comprasFiltradas.forEach(c => {
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
    comprasFiltradas.forEach(c => {
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

    const totalGastos = comprasFiltradas.reduce((sum, c) => {
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

        <div className="bg-white p-4 md:p-6 rounded-lg shadow mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg md:text-xl font-bold">Registro completo de compras</h3>
            <span className="text-sm text-gray-500">{comprasFiltradas.length} registros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrar por fecha</label>
              <input
                type="text"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                list="compras-fechas"
                placeholder="Ej. 2026-07"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <datalist id="compras-fechas">
                {[...new Set(comprasArray.map((c) => c.fecha).filter(Boolean))].map((fecha) => (
                  <option key={fecha} value={formatearFecha(fecha)} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrar por proveedor</label>
              <input
                type="text"
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                list="compras-proveedores"
                placeholder="Ej. Proveedor A"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <datalist id="compras-proveedores">
                {[...new Set(comprasArray.map((c) => c.proveedor).filter(Boolean))].map((proveedor) => (
                  <option key={proveedor} value={proveedor} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrar por producto</label>
              <input
                type="text"
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
                list="compras-productos"
                placeholder="Ej. Arroz"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <datalist id="compras-productos">
                {[...new Set(comprasArray.map((c) => c.producto_nombre || 'Sin producto').filter(Boolean))].map((producto) => (
                  <option key={producto} value={producto} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="min-w-[920px] w-full text-xs md:text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Fecha</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">N°</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Producto</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Cant.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Costo unit.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Total</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Proveedor</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Valor Venta</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.map((c) => {
                  const costo = Number(c.costo_unitario || 0) * Number(c.cantidad || 0);
                  const valorVentaTotal = Number(c.cantidad || 0) * Number(c.valor_venta || 0);
                  const ganancia = valorVentaTotal - costo;
                  return (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 md:p-3 whitespace-nowrap">{formatearFecha(c.fecha)}</td>
                      <td className="p-2 md:p-3 whitespace-nowrap font-semibold">{c.numero || c.id}</td>
                      <td className="p-2 md:p-3 whitespace-nowrap">{c.producto_nombre || 'Sin producto'}</td>
                      <td className="p-2 md:p-3 whitespace-nowrap">{c.cantidad}</td>
                      <td className="p-2 md:p-3 whitespace-nowrap">${Number(c.costo_unitario || 0)}</td>
                      <td className="p-2 md:p-3 whitespace-nowrap font-semibold">${costo}</td>
                      <td className="p-2 md:p-3 whitespace-nowrap">{c.proveedor || 'Sin proveedor'}</td>
                      <td className="p-2 md:p-3 whitespace-nowrap">${valorVentaTotal}</td>
                      <td className={`p-2 md:p-3 whitespace-nowrap font-semibold ${ganancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${ganancia}
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

  // Ventas Tab
  const VentasTab = () => {
    const [editingVenta, setEditingVenta] = useState(null);
    const [ventasPage, setVentasPage] = useState({ results: [], next: null, previous: null, count: 0 });
    const [ventasLoading, setVentasLoading] = useState(false);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [filtroProducto, setFiltroProducto] = useState('');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [productoSuggestions, setProductoSuggestions] = useState([]);
    const [clienteSuggestions, setClienteSuggestions] = useState([]);

    const ventasArray = ventasPage.results || [];
    const filterableColumns = [
      { key: 'numero', label: 'N°' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'producto_nombre', label: 'Producto' },
      { key: 'cliente', label: 'Cliente' },
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

    useEffect(() => {
      if (!filtroProducto) {
        setProductoSuggestions([]);
        return;
      }
      const query = filtroProducto.toLowerCase();
      setProductoSuggestions(productos.filter((producto) => producto.nombre?.toLowerCase().includes(query)).slice(0, 8));
    }, [filtroProducto, productos]);

    useEffect(() => {
      if (!filtroCliente) {
        setClienteSuggestions([]);
        return;
      }
      const query = filtroCliente.toLowerCase();
      const clientes = [...new Set(ventasArray.map((venta) => venta.cliente).filter(Boolean))].filter((cliente) => cliente.toLowerCase().includes(query));
      setClienteSuggestions(clientes.slice(0, 8));
    }, [filtroCliente, ventasArray]);

    const ventasFiltradas = useMemo(() => {
      return ventasArray.filter((venta) => {
        const fechaTexto = formatearFecha(venta.fecha).toLowerCase();
        const fechaRaw = String(venta.fecha || '').toLowerCase();
        const producto = String(venta.producto_nombre || '').toLowerCase();
        const cliente = String(venta.cliente || '').toLowerCase();
        const coincideFecha = !filtroFecha || fechaTexto.includes(filtroFecha.toLowerCase()) || fechaRaw.includes(filtroFecha.toLowerCase());
        const coincideProducto = !filtroProducto || producto.includes(filtroProducto.toLowerCase());
        const coincideCliente = !filtroCliente || cliente.includes(filtroCliente.toLowerCase());
        return coincideFecha && coincideProducto && coincideCliente;
      });
    }, [ventasArray, filtroFecha, filtroProducto, filtroCliente]);

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
            initialVenta={editingVenta}
            onVentaRegistrada={() => {
              setEditingVenta(null);
              loadVentasPage({ pageUrl: null, mes: selectedMonth, anio: selectedYear, ordering: orderingValue, filters: appliedFilters });
              loadInventario();
              loadReporte();
              loadFinanzas();
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

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrar por fecha</label>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrar por producto</label>
                <input
                  type="text"
                  value={filtroProducto}
                  onChange={(e) => setFiltroProducto(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Escribe para buscar"
                />
                {productoSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow">
                    {productoSuggestions.map((producto) => (
                      <li key={producto.id} className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setFiltroProducto(producto.nombre)}>
                        {producto.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrar por cliente</label>
                <input
                  type="text"
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Escribe para buscar"
                />
                {clienteSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow">
                    {clienteSuggestions.map((cliente) => (
                      <li key={cliente} className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setFiltroCliente(cliente)}>
                        {cliente}
                      </li>
                    ))}
                  </ul>
                )}
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
          <div className="overflow-x-auto w-full">
            <table className="min-w-[1100px] w-full text-xs sm:text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">N°</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Fecha</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Producto</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Cliente</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Cant.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">P. Unit.</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Total</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Pago</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Pagado</th>
                  <th className="p-2 md:p-3 text-left whitespace-nowrap">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => handleEditVenta(v)}
                    className="border-b hover:bg-blue-50 cursor-pointer transition"
                  >
                    <td className="p-2 md:p-3 font-semibold text-xs md:text-sm whitespace-nowrap">#{v.numero}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{formatearFecha(v.fecha)}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{v.producto_nombre}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{v.cliente}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{v.cantidad}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">${v.precio_unitario}</td>
                    <td className="p-2 md:p-3 font-bold text-xs md:text-sm whitespace-nowrap">${v.total || 0}</td>
                    <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{getMetodoPagoLabel(v.metodo_pago)}</td>
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
                                loadFinanzas();
                              } catch {
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
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {ventasFiltradas.length} de {ventasPage.count} ventas
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

  const FinanzasTab = () => {
    const [form, setForm] = useState({
      fecha: obtenerFechaLocal(),
      tipo_movimiento: 'ingreso',
      categoria: '',
      descripcion: '',
      monto: '',
      observaciones: '',
      es_manual: true,
    });
    const [filters, setFilters] = useState({ fecha: '', tipo: 'all', categoria: '' });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [distForm, setDistForm] = useState({ nombre: '', porcentaje: '', descripcion: '' });
    const [distLoading, setDistLoading] = useState(false);

    const balance = finanzas.balance;
    const movimientos = Array.isArray(finanzas.movimientos) ? finanzas.movimientos : [];
    const distribuciones = Array.isArray(finanzas.distribuciones) ? finanzas.distribuciones : [];
    const calculada = finanzas.calculada;

    const filteredMovimientos = useMemo(() => {
      return movimientos.filter((item) => {
        const fechaMatch = !filters.fecha || item.fecha === filters.fecha;
        const tipoMatch = filters.tipo === 'all' || item.tipo_movimiento === filters.tipo;
        const categoriaMatch = !filters.categoria || (item.categoria || '').toLowerCase().includes(filters.categoria.toLowerCase());
        return fechaMatch && tipoMatch && categoriaMatch;
      });
    }, [movimientos, filters]);

    const handleSubmitMovimiento = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const payload = {
          ...form,
          monto: Number(form.monto),
        };
        if (editingId) {
          await updateMovimiento(editingId, payload);
        } else {
          await createMovimiento(payload);
        }
        setForm({ fecha: obtenerFechaLocal(), tipo_movimiento: 'ingreso', categoria: '', descripcion: '', monto: '', observaciones: '', es_manual: true });
        setEditingId(null);
        await loadFinanzas();
      } catch (error) {
        console.error('Error al guardar movimiento:', error);
        alert('No se pudo guardar el movimiento financiero.');
      } finally {
        setLoading(false);
      }
    };

    const handleEditMovimiento = (mov) => {
      setEditingId(mov.id);
      setForm({
        fecha: mov.fecha,
        tipo_movimiento: mov.tipo_movimiento,
        categoria: mov.categoria || '',
        descripcion: mov.descripcion || '',
        monto: mov.monto || '',
        observaciones: mov.observaciones || '',
        es_manual: mov.es_manual ?? true,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteMovimiento = async (id) => {
      if (!window.confirm('¿Deseas eliminar este movimiento?')) return;
      try {
        await deleteMovimiento(id);
        await loadFinanzas();
      } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        alert('No se pudo eliminar el movimiento.');
      }
    };

    const handleSubmitDistribucion = async (e) => {
      e.preventDefault();
      setDistLoading(true);
      try {
        await createDistribucion({
          nombre: distForm.nombre,
          porcentaje: Number(distForm.porcentaje),
          descripcion: distForm.descripcion,
          activo: true,
          orden: distribuciones.length + 1,
        });
        setDistForm({ nombre: '', porcentaje: '', descripcion: '' });
        await loadFinanzas();
      } catch (error) {
        console.error('Error al guardar distribución:', error);
        alert('No se pudo guardar la distribución, verifica que el porcentaje total sea del 100%.');
      } finally {
        setDistLoading(false);
      }
    };

    const handleDeleteDistribucion = async (id) => {
      if (!window.confirm('¿Deseas eliminar esta categoría?')) return;
      try {
        await deleteDistribucion(id);
        await loadFinanzas();
      } catch (error) {
        console.error('Error al eliminar distribución:', error);
        alert('No se pudo eliminar la categoría.');
      }
    };

    const formatAmount = (value) => formatCurrency(value || 0);

    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Cuentas y Movimientos Financieros</h2>
            <p className="text-sm text-slate-600 mt-1">Controla ingresos, egresos, saldo y distribución de utilidades en tiempo real.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow">
            <p className="text-sm opacity-90">Saldo actual</p>
            <p className="text-2xl font-bold mt-2">{formatAmount(balance?.saldo_actual)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow">
            <p className="text-sm opacity-90">Total ingresos</p>
            <p className="text-2xl font-bold mt-2">{formatAmount(balance?.total_ingresos)}</p>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-5 rounded-2xl shadow">
            <p className="text-sm opacity-90">Total egresos</p>
            <p className="text-2xl font-bold mt-2">{formatAmount(balance?.total_egresos)}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow">
            <p className="text-sm opacity-90">Balance general</p>
            <p className="text-2xl font-bold mt-2">{formatAmount(balance?.balance_general)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Registrar movimiento manual</h3>
              <span className="text-xs text-slate-500">{editingId ? 'Editando' : 'Nuevo'}</span>
            </div>
            <form onSubmit={handleSubmitMovimiento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2">Fecha</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2">Tipo de movimiento</label>
                <select value={form.tipo_movimiento} onChange={(e) => setForm({ ...form, tipo_movimiento: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2">Categoría</label>
                <input type="text" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="Ej. Abono, Gastos" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2">Monto</label>
                <input type="number" min="1" step="1" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-2">Descripción</label>
                <input type="text" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="Ej. Aporte inicial" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-2">Observaciones</label>
                <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" rows="3" />
              </div>
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                <button type="submit" disabled={loading} className="bg-slate-900 text-white px-5 py-2 rounded hover:bg-slate-700 transition disabled:opacity-60">
                  {loading ? 'Guardando...' : editingId ? 'Actualizar movimiento' : 'Guardar movimiento'}
                </button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ fecha: obtenerFechaLocal(), tipo_movimiento: 'ingreso', categoria: '', descripcion: '', monto: '', observaciones: '', es_manual: true }); }} className="border border-slate-300 px-5 py-2 rounded hover:bg-slate-50 transition">Cancelar</button>}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="text-lg font-bold mb-4">Distribución de utilidades</h3>
            <form onSubmit={handleSubmitDistribucion} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-2">Nombre</label>
                <input type="text" value={distForm.nombre} onChange={(e) => setDistForm({ ...distForm, nombre: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2">Porcentaje</label>
                <input type="number" min="1" max="100" value={distForm.porcentaje} onChange={(e) => setDistForm({ ...distForm, porcentaje: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2">Descripción</label>
                <input type="text" value={distForm.descripcion} onChange={(e) => setDistForm({ ...distForm, descripcion: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <button type="submit" disabled={distLoading} className="w-full bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition disabled:opacity-60">{distLoading ? 'Guardando...' : 'Agregar categoría'}</button>
            </form>
            {calculada && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-700">Utilidad actual</p>
                <p className="text-xl font-bold text-emerald-800">{formatAmount(calculada.utilidad)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Historial de movimientos</h3>
              <p className="text-sm text-slate-600">Filtra por fecha, tipo o categoría.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="date" value={filters.fecha} onChange={(e) => setFilters({ ...filters, fecha: e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <select value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })} className="border rounded px-3 py-2 text-sm">
                <option value="all">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
              </select>
              <input type="text" value={filters.categoria} onChange={(e) => setFilters({ ...filters, categoria: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Categoría" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Categoría</th>
                  <th className="text-left p-3">Descripción</th>
                  <th className="text-right p-3">Monto</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovimientos.map((mov) => (
                  <tr key={mov.id} className="border-b border-slate-100">
                    <td className="p-3">{formatearFecha(mov.fecha)}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${mov.tipo_movimiento === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{mov.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'}</span></td>
                    <td className="p-3">{mov.categoria}</td>
                    <td className="p-3">{mov.descripcion}</td>
                    <td className={`p-3 text-right font-semibold ${mov.tipo_movimiento === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatAmount(mov.monto)}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEditMovimiento(mov)} className="text-sm text-blue-600 hover:text-blue-800">Editar</button>
                        <button onClick={() => handleDeleteMovimiento(mov.id)} className="text-sm text-rose-600 hover:text-rose-800">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMovimientos.length === 0 && <p className="text-center text-sm text-slate-500 py-6">No hay movimientos para los filtros seleccionados.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Categorías de distribución</h3>
            <span className="text-sm text-slate-500">Suma de porcentajes debe ser 100%</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {distribuciones.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.nombre}</p>
                    <p className="text-sm text-slate-600">{item.descripcion || 'Sin descripción'}</p>
                  </div>
                  <button onClick={() => handleDeleteDistribucion(item.id)} className="text-sm text-rose-600 hover:text-rose-800">Eliminar</button>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Porcentaje</p>
                    <p className="text-xl font-bold">{item.porcentaje}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Monto estimado</p>
                    <p className="text-sm font-semibold">{formatAmount(calculada?.items?.find((entry) => entry.id === item.id)?.monto || 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {distribuciones.length === 0 && <p className="text-center text-sm text-slate-500 py-6">Aún no hay categorías configuradas.</p>}
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
          loadFinanzas();
        }}
      />
    </div>
  );

  // Inventario Tab
  const InventarioTab = () => (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Inventario Actual</h2>
          <p className="text-sm text-slate-600 mt-1">Revisa stock, alertas y movimientos por producto.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleOpenAdjustment()}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            Registrar Ajuste de Inventario
          </button>
          <button
            type="button"
            onClick={() => setShowUrgentOnly((prev) => !prev)}
            className={`px-4 py-2 rounded border transition ${showUrgentOnly ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'}`}
          >
            {showUrgentOnly ? 'Ver todos' : 'Por Agotar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-slate-500 mb-2">Valor Total del Inventario</h3>
          <p className="text-2xl font-bold">{formatCurrency(inventoryValueTotal)}</p>
          <p className="text-xs text-slate-500 mt-2">Ignora productos con stock negativo.</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-slate-500 mb-2">Productos en Alerta</h3>
          <p className="text-2xl font-bold">{inventoryAlertCount}</p>
          <p className="text-xs text-slate-500 mt-2">Sin stock o bajo el mínimo.</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-slate-500 mb-2">Total productos</h3>
          <p className="text-2xl font-bold">{inventoryItemsAll.length}</p>
          <p className="text-xs text-slate-500 mt-2">Incluye todos los productos cargados.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-2">Buscar</label>
            <input
              type="text"
              value={inventorySearch}
              onChange={(e) => handleInventorySearchChange(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-2">Categoría</label>
            <select
              value={inventoryCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="all">Todas</option>
              {inventoryCategories.map((categoria) => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-2">Estado</label>
            <select
              value={inventoryStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="sin_stock">Sin stock</option>
              <option value="bajo_stock">Stock bajo</option>
              <option value="optimo">Stock óptimo</option>
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-2">Urgentes</label>
            <div className="flex items-center gap-2">
              <input
                id="urgent-only"
                type="checkbox"
                checked={showUrgentOnly}
                onChange={() => setShowUrgentOnly((prev) => !prev)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label htmlFor="urgent-only" className="text-sm text-slate-700">Mostrar por agotar</label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {inventoryItems.length > 0 ? inventoryItems.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleOpenDetail(item)}
            className={`text-left rounded-2xl p-5 border shadow-sm transition hover:shadow-lg ${getStockCardClass(item.stock_status)}`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.categoria}</p>
                <h3 className="text-lg font-bold mt-2">{item.producto_nombre || item.nombre}</h3>
                {item.marca && <p className="text-xs text-slate-600 mt-1">Marca: {item.marca}</p>}
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${item.stock_status === 'sin_stock' ? 'bg-red-500 text-white' : item.stock_status === 'bajo_stock' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'}`}>
                {getStockStatusLabel(item.stock_status)}
              </span>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <p><span className="font-semibold">Stock:</span> {item.stock_actual}</p>
              <p><span className="font-semibold">Unidad base:</span> {item.unidad_medida || 'N/D'}</p>
              <p><span className="font-semibold">Mínimo:</span> {item.stock_minimo ?? 'N/D'}</p>
              <p><span className="font-semibold">Proveedor:</span> {getProviderForItem(item)}</p>
              <p><span className="font-semibold">Compras:</span> {item.total_compras ?? 'n/a'}</p>
              <p><span className="font-semibold">Ventas:</span> {item.total_ventas ?? 'n/a'}</p>
            </div>
          </button>
        )) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No hay productos que coincidan con los filtros.
          </div>
        )}
      </div>

      {detailModalOpen && selectedInventoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold">Detalle de {selectedInventoryItem.producto_nombre || selectedInventoryItem.nombre}</h3>
                <p className="text-sm text-slate-500">Historial completo, costos y proveedores asociados.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-4 p-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Resumen</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Stock actual</p>
                      <p className="mt-2 text-2xl font-bold">{selectedInventoryItem.stock_actual}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Proveedor principal</p>
                      <p className="mt-2 text-base font-semibold">{providerForSelected}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Precio de compra promedio</p>
                      <p className="mt-2 text-base font-semibold">{formatCurrency(selectedInventoryItem.precio_compra_promedio ?? selectedInventoryItem.precio_unitario ?? selectedInventoryItem.precio ?? 0)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Último precio de venta</p>
                      <p className="mt-2 text-base font-semibold">{formatCurrency((() => {
                        const movimientos = getMovementsForItem(selectedInventoryItem).filter(m => m.tipo === 'Venta');
                        return movimientos.length > 0 ? movimientos[0].total / Math.max(1, Math.abs(movimientos[0].cantidad)) : selectedInventoryItem.precio_unitario ?? 0;
                      })())}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Costos y márgenes</h4>
                  {(() => {
                    const movimientos = getMovementsForItem(selectedInventoryItem);
                    const comprasProducto = movimientos.filter(m => m.tipo === 'Compra');
                    const ventasProducto = movimientos.filter(m => m.tipo === 'Venta');
                    const totalComprasProducto = comprasProducto.reduce((sum, item) => sum + item.total, 0);
                    const totalCantCompras = comprasProducto.reduce((sum, item) => sum + item.cantidad, 0);
                    const compraPromedio = totalCantCompras > 0 ? totalComprasProducto / totalCantCompras : Number(selectedInventoryItem.precio_unitario ?? 0);
                    const totalVentasProducto = ventasProducto.reduce((sum, item) => sum + Math.abs(item.total), 0);
                    const margen = totalVentasProducto - totalComprasProducto;

                    return (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs text-slate-500">PPP estimado</p>
                          <p className="mt-2 text-base font-semibold">{formatCurrency(compraPromedio)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs text-slate-500">Total ingresos</p>
                          <p className="mt-2 text-base font-semibold">{formatCurrency(totalVentasProducto)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs text-slate-500">Total gastos</p>
                          <p className="mt-2 text-base font-semibold">{formatCurrency(totalComprasProducto)}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs text-slate-500">Margen</p>
                          <p className={`mt-2 text-base font-semibold ${margen >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(margen)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-slate-700">Historial de Movimientos (Kardex)</h4>
                    <button
                      type="button"
                      onClick={() => handleOpenAdjustment(selectedInventoryItem)}
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                    >
                      Registrar ajuste
                    </button>
                  </div>
                  <div className="max-h-96 overflow-auto rounded-3xl border border-slate-200 bg-white">
                    <table className="min-w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-100 text-xs uppercase tracking-[0.24em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Cantidad</th>
                          <th className="px-4 py-3">Referencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getMovementsForItem(selectedInventoryItem).map((mov, index) => (
                          <tr key={index} className="border-t border-slate-200">
                            <td className="px-4 py-3 text-xs md:text-sm">{mov.fecha}</td>
                            <td className="px-4 py-3 text-xs md:text-sm font-semibold">{mov.tipo}</td>
                            <td className={`px-4 py-3 text-xs md:text-sm font-semibold ${mov.cantidad < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{mov.cantidad}</td>
                            <td className="px-4 py-3 text-xs md:text-sm">{mov.referencia}</td>
                          </tr>
                        ))}
                        {getMovementsForItem(selectedInventoryItem).length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-4 py-6 text-center text-sm text-slate-500">No hay movimientos registrados para este producto.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> 
       )}
      
      {adjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold">Registrar Ajuste de Inventario</h3>
                <p className="text-sm text-slate-500">Registra pérdidas o ajustes de conteo físico.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseAdjustment}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
            <form onSubmit={handleSubmitAdjustment} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Producto</label>
                  <select
                    value={adjustmentForm.productoId ?? ''}
                    onChange={(e) => handleAdjustmentProductChange(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Seleccionar producto</option>
                    {inventoryItemsAll.map((item) => (
                      <option key={item.producto ?? item.id ?? item.producto_id} value={item.producto ?? item.id ?? item.producto_id}>
                        {item.producto_nombre || item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Tipo de ajuste</label>
                  <select
                    value={adjustmentForm.type}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="perdida">Pérdida (vencido, dañado)</option>
                    <option value="auditoria">Inventario físico (auditoría)</option>
                  </select>
                </div>
              </div>

              {adjustmentForm.type === 'perdida' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Cantidad a restar</label>
                  <input
                    type="number"
                    min="1"
                    value={adjustmentForm.cantidad}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, cantidad: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Ej. 2"
                    required
                  />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Stock real</label>
                    <input
                      type="number"
                      min="0"
                      value={adjustmentForm.stock_real}
                      onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, stock_real: e.target.value }))}
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder="Ej. 18"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Diferencia</label>
                    <div className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {adjustmentForm.productoId ? (() => {
                        const item = inventoryItemsAll.find((inv) => String(inv.producto ?? inv.id ?? inv.producto_id) === String(adjustmentForm.productoId));
                        const current = item ? Number(item.stock_actual || 0) : 0;
                        const real = Number(adjustmentForm.stock_real) || 0;
                        return real - current;
                      })() : 0}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Comentario</label>
                <textarea
                  value={adjustmentForm.comentario}
                  onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, comentario: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows="3"
                  placeholder="Motivo del ajuste"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseAdjustment}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )


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
          <h3 className="text-lg md:text-xl font-bold mb-4">
            {editingProducto ? 'Editar Producto' : 'Agregar Nuevo Producto'}</h3>
          {editingProducto && (
            <button
              onClick={() => setEditingProducto(null)}
              className="mb-4 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
            >
              ← Volver a Nuevo Producto
            </button>
          )}
          <FormularioProductos
            productos={productos}
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
                      {p.marca && (
                        <p>
                          <span className="font-semibold">Marca:</span>{' '}
                          <span className="text-gray-600">{p.marca}</span>
                        </p>
                      )}
                      {p.categoria && (
                        <p>
                          <span className="font-semibold">Categoria:</span>{' '}
                          <span className="text-gray-600">{p.categoria}</span>
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Inventario:</span>{' '}
                        <span className="text-gray-600">
                          {p.producto_base_nombre ? `Presentacion de ${p.producto_base_nombre}` : 'Producto base'}
                        </span>
                      </p>
                      <p>
                        <span className="font-semibold">Conversion:</span>{' '}
                        <span className="text-gray-600">{getProductoFactorConversion(p)} unidad(es) base</span>
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
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-2">System ERP</p>
              <h2 className="text-2xl font-bold">Panel de Control</h2>
            </div>
            <nav className="space-y-2 flex-1">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
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
                  setActiveTab('finanzas');
                }}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition ${activeTab === 'finanzas'
                  ? 'bg-blue-600 text-white shadow'
                  : 'hover:bg-slate-800/80'
                  }`}
              >
                💳 Cuentas
              </button>
              <button
                onClick={() => {
                  setActiveTab('inventario');
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
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
                  >
                    Ingresos
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('gastos');
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
                  >
                    Gastos
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('comparativa');
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
                  >
                    Comparativa: Ingresos vs Gastos
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('porpagar');
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
          {activeTab === 'finanzas' && <FinanzasTab />}
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
