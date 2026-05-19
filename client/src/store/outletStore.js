import { create } from 'zustand';
import api from '../lib/api';

const useOutletStore = create((set) => ({
  outlets: [],
  loaded: false,
  loadedForTenant: null,

  fetchOutlets: async (tenantId) => {
    try {
      const { data } = await api.get('/outlets');
      set({ outlets: data.outlets, loaded: true, loadedForTenant: tenantId ?? null });
    } catch {}
  },

  resetOutlets: () => set({ outlets: [], loaded: false, loadedForTenant: null }),
}));

export default useOutletStore;
