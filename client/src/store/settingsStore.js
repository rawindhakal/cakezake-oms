import { create } from 'zustand';
import api from '../lib/api';

const useSettingsStore = create((set, get) => ({
  settings: {},
  loaded: false,

  fetchSettings: async () => {
    if (get().loaded) return;
    try {
      const { data } = await api.get('/app-settings');
      set({ settings: data.settings, loaded: true });
    } catch {}
  },

  updateSetting: async (key, values) => {
    const { data } = await api.put(`/app-settings/${key}`, { values });
    if (data.success) {
      set((s) => ({
        settings: {
          ...s.settings,
          [key]: { ...s.settings[key], values },
        },
      }));
    }
    return data;
  },

  getValues: (key, fallback = []) => {
    return get().settings[key]?.values || fallback;
  },
}));

export default useSettingsStore;
