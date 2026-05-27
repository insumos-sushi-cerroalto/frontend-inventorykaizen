import apiClient from './config';

// Obtener todas las compras padre
export const fetchComprasPadre = async () => {
  try {
    const response = await apiClient.get('/api/compras-padre/');
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Error al obtener compras padre:', error);
    throw error;
  }
};

// Crear una nueva compra padre
export const createCompraPadre = async (compraData) => {
  try {
    let response;
    // Soportar envío de archivos (FormData) si el frontend incluye factura/boleta
    if (compraData instanceof FormData) {
      response = await apiClient.post('/api/compras-padre/', compraData);
    } else {
      response = await apiClient.post('/api/compras-padre/', compraData);
    }
    return response.data;
  } catch (error) {
    console.error('Error al crear compra padre:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      request: error.request,
    });
    throw error;
  }
};

// Actualizar una compra padre existente
export const updateCompraPadre = async (id, compraData) => {
  try {
    let response;
    if (compraData instanceof FormData) {
      response = await apiClient.put(`/api/compras-padre/${id}/`, compraData);
    } else {
      response = await apiClient.put(`/api/compras-padre/${id}/`, compraData);
    }
    return response.data;
  } catch (error) {
    console.error('Error al actualizar compra padre:', error.response?.data ?? error);
    throw error;
  }
};

// Eliminar una compra padre
export const deleteCompraPadre = async (id) => {
  try {
    await apiClient.delete(`/api/compras-padre/${id}/`);
  } catch (error) {
    console.error('Error al eliminar compra padre:', error);
    throw error;
  }
};
