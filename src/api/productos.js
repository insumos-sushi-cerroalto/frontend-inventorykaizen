// src/api/productos.js
import apiClient from './config';

const normalizeProductoPayload = (productoData) => {
  const normalized = { ...productoData };

  if (normalized.producto_base === '') normalized.producto_base = null;
  if (normalized.precio_unitario === '') normalized.precio_unitario = null;
  if (normalized.factor_conversion === '' || normalized.factor_conversion === null || normalized.factor_conversion === undefined) {
    normalized.factor_conversion = 1;
  }

  return normalized;
};

const buildProductoRequest = (productoData) => {
  const normalized = normalizeProductoPayload(productoData);

  if (!normalized.imagen) {
    delete normalized.imagen;
    const data = normalized;
    return { data, headers: {} };
  }

  const formData = new FormData();
  Object.entries(normalized).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });

  return {
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  };
};

// Obtener todos los productos
export const fetchProductos = async () => {
  try {
    const response = await apiClient.get('/api/productos/');
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    throw error;
  }
};

// Crear un nuevo producto
export const createProducto = async (productoData) => {
  try {
    const { data, headers } = buildProductoRequest(productoData);
    const response = await apiClient.post('/api/productos/', data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error al crear producto:', error);
    throw error;
  }
};

// Actualizar un producto existente
export const updateProducto = async (id, productoData) => {
  try {
    const { data, headers } = buildProductoRequest(productoData);
    const response = await apiClient.patch(`/api/productos/${id}/`, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    throw error;
  }
};

// Eliminar un producto
export const deleteProducto = async (id) => {
  try {
    await apiClient.delete(`/api/productos/${id}/`);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    throw error;
  }
};
