import { create } from 'zustand';
import api from '../lib/api';

const useOutletStore = create((set) => ({
  outlets: [],
  loaded: false,

  fetchOutlets: async () => {
    try {
      const { data } = await api.get('/outlets');
      set({ outlets: data.outlets, loaded: true });
    } catch {}
  },
}));

export default useOutletStore;
