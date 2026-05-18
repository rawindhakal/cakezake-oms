import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set) => ({
  authenticated: false,
  user: null, // { id, username, name, email, role, tenantId, assignedOutlets }
  loading: true,

  verify: async () => {
    try {
      const { data } = await api.get('/auth/verify');
      set({ authenticated: data.authenticated, user: data.user || null, loading: false });
    } catch {
      set({ authenticated: false, user: null, loading: false });
    }
  },

  login: async ({ username, password }) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.success) set({ authenticated: true, user: data.user });
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ authenticated: false, user: null });
  },

  switchTenant: async (tenantId) => {
    const { data } = await api.post('/tenants/switch-context', { tenantId });
    if (data.success) {
      set((state) => ({ user: { ...state.user, viewingTenant: data.viewingTenant } }));
    }
    return data;
  },

  clearTenantView: async () => {
    await api.delete('/tenants/switch-context');
    set((state) => ({ user: { ...state.user, viewingTenant: null } }));
  },
}));

export default useAuthStore;
