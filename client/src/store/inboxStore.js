import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '../lib/api';

let socket = null;

const useInboxStore = create((set, get) => ({
  conversations:        [],
  total:                0,
  activeConversation:   null,
  messages:             [],
  loadingConvs:         false,
  loadingMsgs:          false,
  sendingReply:         false,
  unreadTotal:          0,
  filters:              { platform: '', outlet: '', assignedTo: '', search: '' },

  fetchConversations: async (extra = {}) => {
    set({ loadingConvs: true });
    try {
      const params = { ...get().filters, ...extra };
      const { data } = await api.get('/social/conversations', { params });
      set({ conversations: data.conversations, total: data.total, loadingConvs: false });
    } catch {
      set({ loadingConvs: false });
    }
  },

  fetchUnread: async () => {
    try {
      const { data } = await api.get('/social/unread');
      set({ unreadTotal: data.unread });
    } catch (_) {}
  },

  openConversation: async (id) => {
    set({ loadingMsgs: true, activeConversation: null, messages: [] });
    try {
      const [convRes, msgRes] = await Promise.all([
        api.get(`/social/conversations/${id}`),
        api.get(`/social/conversations/${id}/messages`),
      ]);
      set({
        activeConversation: convRes.data.conversation,
        messages:           msgRes.data.messages,
        loadingMsgs:        false,
      });
      // Clear unread locally
      set(s => ({
        conversations: s.conversations.map(c =>
          c._id === id ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch {
      set({ loadingMsgs: false });
    }
  },

  loadMoreMessages: async () => {
    const { messages, activeConversation } = get();
    if (!activeConversation || !messages.length) return;
    const oldest = messages[0]?.sentAt;
    const { data } = await api.get(`/social/conversations/${activeConversation._id}/messages`, {
      params: { before: oldest },
    });
    if (data.messages.length) {
      set(s => ({ messages: [...data.messages, ...s.messages] }));
    }
    return data.messages.length;
  },

  sendReply: async (text) => {
    const { activeConversation } = get();
    if (!activeConversation || !text.trim()) return;
    set({ sendingReply: true });
    try {
      const { data } = await api.post(`/social/conversations/${activeConversation._id}/reply`, { body: text });
      set(s => ({ messages: [...s.messages, data.message], sendingReply: false }));
      set(s => ({
        conversations: s.conversations.map(c =>
          c._id === activeConversation._id
            ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() }
            : c
        ),
      }));
      return data.message;
    } catch (err) {
      set({ sendingReply: false });
      throw err;
    }
  },

  updateConversation: async (id, update) => {
    const { data } = await api.patch(`/social/conversations/${id}`, update);
    set(s => ({
      conversations:    s.conversations.map(c => c._id === id ? { ...c, ...data.conversation } : c),
      activeConversation: s.activeConversation?._id === id
        ? { ...s.activeConversation, ...data.conversation }
        : s.activeConversation,
    }));
  },

  linkConversation: async (id, payload) => {
    const { data } = await api.post(`/social/conversations/${id}/link`, payload);
    set(s => ({
      activeConversation: s.activeConversation?._id === id
        ? { ...s.activeConversation, ...data.conversation }
        : s.activeConversation,
    }));
  },

  setFilter: (key, value) => set(s => ({ filters: { ...s.filters, [key]: value } })),

  // ── Socket.io ──────────────────────────────────────────────────────────────
  initSocket: (outletIds = []) => {
    if (socket?.connected) return;
    socket = io({ withCredentials: true, transports: ['websocket', 'polling'] });

    outletIds.forEach(id => socket.emit('join_outlet', id));

    socket.on('new_message', ({ conversationId, message }) => {
      const { activeConversation } = get();

      if (activeConversation?._id === conversationId) {
        set(s => ({ messages: [...s.messages, message] }));
      }

      set(s => {
        const exists = s.conversations.find(c => c._id === conversationId);
        const updated = exists
          ? s.conversations.map(c => {
              if (c._id !== conversationId) return c;
              const isActive = activeConversation?._id === conversationId;
              return {
                ...c,
                lastMessage:    message.body,
                lastMessageAt:  message.sentAt,
                unreadCount:    isActive ? 0 : (c.unreadCount || 0) + 1,
              };
            })
          : s.conversations;

        return {
          conversations: [...updated].sort(
            (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
          ),
          unreadTotal: s.unreadTotal + (activeConversation?._id === conversationId ? 0 : 1),
        };
      });
    });
  },

  disconnectSocket: () => {
    socket?.disconnect();
    socket = null;
  },
}));

export default useInboxStore;
