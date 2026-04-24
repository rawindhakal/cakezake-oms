import { create } from 'zustand';
import api from '../lib/api';

const useOrderStore = create((set, get) => ({
  orders: [],
  total: 0,
  page: 1,
  currentOrder: null,
  loading: false,

  fetchOrders: async (params = {}) => {
    set({ loading: true });
    try {
      const { data } = await api.get('/orders', { params });
      set({ orders: data.orders, total: data.total, page: data.page || 1, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchOrder: async (id) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/orders/${id}`);
      set({ currentOrder: data.order, loading: false });
      return data.order;
    } catch {
      set({ loading: false });
    }
  },

  createOrder: async (payload) => {
    const { data } = await api.post('/orders', payload);
    return data;
  },

  updateOrder: async (id, payload) => {
    const { data } = await api.put(`/orders/${id}`, payload);
    return data;
  },

  updateStatus: async (id, status) => {
    const { data } = await api.patch(`/orders/${id}/status`, { status });
    if (data.success) {
      set((state) => ({
        orders: state.orders.map((o) => (o._id === id ? { ...o, status } : o)),
        currentOrder: state.currentOrder?._id === id ? { ...state.currentOrder, status } : state.currentOrder,
      }));
    }
    return data;
  },

  deleteOrder: async (id) => {
    const { data } = await api.delete(`/orders/${id}`);
    return data;
  },

  updateItemStatus: async (orderId, itemId, itemStatus) => {
    const { data } = await api.patch(`/orders/${orderId}/items/${itemId}/status`, { itemStatus });
    if (data.success) {
      set((state) => ({
        currentOrder: state.currentOrder?._id === orderId ? data.order : state.currentOrder,
        orders: state.orders.map((o) => o._id === orderId ? { ...o, items: data.order.items } : o),
      }));
    }
    return data;
  },
}));

export default useOrderStore;
