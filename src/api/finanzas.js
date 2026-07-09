import apiClient from './config';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

export const fetchMovimientos = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/movimientos/', { params });
    return normalizeList(response.data);
  } catch (error) {
    console.error('Error al obtener movimientos financieros:', error);
    throw error;
  }
};

export const fetchBalanceFinanciero = async () => {
  try {
    const response = await apiClient.get('/api/movimientos/balance/');
    return response.data;
  } catch (error) {
    console.error('Error al obtener balance financiero:', error);
    throw error;
  }
};

export const createMovimiento = async (payload) => {
  try {
    const response = await apiClient.post('/api/movimientos/', payload);
    return response.data;
  } catch (error) {
    console.error('Error al crear movimiento financiero:', error);
    throw error;
  }
};

export const updateMovimiento = async (id, payload) => {
  try {
    const response = await apiClient.patch(`/api/movimientos/${id}/`, payload);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar movimiento financiero:', error);
    throw error;
  }
};

export const deleteMovimiento = async (id) => {
  try {
    await apiClient.delete(`/api/movimientos/${id}/`);
  } catch (error) {
    console.error('Error al eliminar movimiento financiero:', error);
    throw error;
  }
};

export const fetchDistribuciones = async () => {
  try {
    const response = await apiClient.get('/api/distribuciones/');
    return normalizeList(response.data);
  } catch (error) {
    console.error('Error al obtener categorías de distribución:', error);
    throw error;
  }
};

export const fetchDistribucionCalculada = async () => {
  try {
    const response = await apiClient.get('/api/distribuciones/calculada/');
    return response.data;
  } catch (error) {
    console.error('Error al obtener distribución calculada:', error);
    throw error;
  }
};

export const createDistribucion = async (payload) => {
  try {
    const response = await apiClient.post('/api/distribuciones/', payload);
    return response.data;
  } catch (error) {
    console.error('Error al crear categoría de distribución:', error);
    throw error;
  }
};

export const updateDistribucion = async (id, payload) => {
  try {
    const response = await apiClient.patch(`/api/distribuciones/${id}/`, payload);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar categoría de distribución:', error);
    throw error;
  }
};

export const deleteDistribucion = async (id) => {
  try {
    await apiClient.delete(`/api/distribuciones/${id}/`);
  } catch (error) {
    console.error('Error al eliminar categoría de distribución:', error);
    throw error;
  }
};
