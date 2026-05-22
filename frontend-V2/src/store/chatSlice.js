import { createSlice } from '@reduxjs/toolkit';

/**
 * Chat Slice — Manages chat workspace state (sessions, streaming, UI).
 * Replaces local component state + chatSessionStorage for global access.
 */
const initialState = {
  // Workspace
  sessions: [],
  currentSessionId: null,

  // Active session state
  isLoading: false,
  isStreaming: false,

  // UI
  webSearchEnabled: false,
  historyPanelOpen: false,
  detailsDrawerOpen: false,
  downloadModalOpen: false,

  // Sync status
  synced: false,
  syncError: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // --- Sessions ---
    setSessions(state, action) {
      state.sessions = action.payload;
    },
    setCurrentSessionId(state, action) {
      state.currentSessionId = action.payload;
    },
    addSession(state, action) {
      state.sessions.unshift(action.payload);
      state.currentSessionId = action.payload.id;
    },
    removeSession(state, action) {
      const id = action.payload;
      state.sessions = state.sessions.filter((s) => s.id !== id);
      if (state.currentSessionId === id) {
        state.currentSessionId = state.sessions[0]?.id || null;
      }
    },
    updateSession(state, action) {
      const { id, ...updates } = action.payload;
      const session = state.sessions.find((s) => s.id === id);
      if (session) {
        Object.assign(session, updates);
      }
    },
    updateSessionMessages(state, action) {
      const { id, messages } = action.payload;
      const session = state.sessions.find((s) => s.id === id);
      if (session) {
        session.messages = messages;
        session.messageCount = messages.length;
        session.updatedAt = Date.now();
      }
    },

    // --- Loading / Streaming ---
    setIsLoading(state, action) {
      state.isLoading = action.payload;
    },
    setIsStreaming(state, action) {
      state.isStreaming = action.payload;
    },

    // --- UI ---
    setWebSearchEnabled(state, action) {
      state.webSearchEnabled = action.payload;
    },
    toggleWebSearch(state) {
      state.webSearchEnabled = !state.webSearchEnabled;
    },
    setHistoryPanelOpen(state, action) {
      state.historyPanelOpen = action.payload;
    },
    toggleHistoryPanel(state) {
      state.historyPanelOpen = !state.historyPanelOpen;
    },
    setDetailsDrawerOpen(state, action) {
      state.detailsDrawerOpen = action.payload;
    },
    setDownloadModalOpen(state, action) {
      state.downloadModalOpen = action.payload;
    },

    // --- Sync ---
    setSynced(state, action) {
      state.synced = action.payload;
    },
    setSyncError(state, action) {
      state.syncError = action.payload;
    },

    // --- Bulk ---
    hydrateWorkspace(state, action) {
      const { sessions, currentSessionId } = action.payload;
      state.sessions = sessions;
      state.currentSessionId = currentSessionId;
      state.synced = true;
    },
    resetChat(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setSessions, setCurrentSessionId, addSession, removeSession,
  updateSession, updateSessionMessages,
  setIsLoading, setIsStreaming,
  setWebSearchEnabled, toggleWebSearch,
  setHistoryPanelOpen, toggleHistoryPanel,
  setDetailsDrawerOpen, setDownloadModalOpen,
  setSynced, setSyncError,
  hydrateWorkspace, resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
