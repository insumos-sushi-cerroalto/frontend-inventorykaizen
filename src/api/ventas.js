import apiClient from './config';

// Obtener todas las ventas con filtros opcionales por mes y año
export const fetchVentas = async ({ mes = null, anio = null } = {}) => {
  try {
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;

    const response = await apiClient.get('/api/ventas/', { params });
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    throw error;
  }
};

// Crear una nueva venta
export const createVenta = async (ventaData) => {
  try {
    const response = await apiClient.post('/api/ventas/', ventaData);
    return response.data;
  } catch (error) {
    console.error('Error al crear venta:', error);
    throw error;
  }
};

// Actualizar una venta existente
export const updateVenta = async (id, ventaData) => {
  try {
    const response = await apiClient.put(`/api/ventas/${id}/`, ventaData);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar venta:', error);
    throw error;
  }
};

// Eliminar una venta
export const deleteVenta = async (id) => {
  try {
    await apiClient.delete(`/api/ventas/${id}/`);
  } catch (error) {
    console.error('Error al eliminar venta:', error);
    throw error;
  }
};
