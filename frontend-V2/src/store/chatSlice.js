/**
 * chatSlice — Phase 2 global chat session state.
 *
 * Manages:
 *  • Active session ID
 *  • Session list metadata (titles, timestamps, message counts — NOT full messages)
 *  • Web search toggle
 *  • Streaming loading flag
 *
 * Full message arrays are NOT stored here — they stay in ChatPage's workspace
 * state / localStorage via chatSessionStorage.js until a full Phase 4 migration.
 * This slice only holds the lightweight metadata needed for cross-component access.
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeSessionId: null,
  sessionMeta: [],  // [{ id, title, folderId, folderName, createdAt, updatedAt, messageCount }]
  isWebSearchEnabled: false,
  isStreaming: false,
  streamingSessionId: null,
  historyPanelOpen: typeof window !== 'undefined' ? window.innerWidth >= 1280 : false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveSessionId(state, action) {
      state.activeSessionId = action.payload;
    },
    setSessionMeta(state, action) {
      state.sessionMeta = action.payload;
    },
    upsertSessionMeta(state, action) {
      const meta = action.payload;
      const idx = state.sessionMeta.findIndex((s) => s.id === meta.id);
      if (idx >= 0) {
        state.sessionMeta[idx] = { ...state.sessionMeta[idx], ...meta };
      } else {
        state.sessionMeta.unshift(meta);
      }
    },
    removeSessionMeta(state, action) {
      state.sessionMeta = state.sessionMeta.filter((s) => s.id !== action.payload);
    },
    setWebSearchEnabled(state, action)  { state.isWebSearchEnabled = action.payload; },
    setIsStreaming(state, action)       { state.isStreaming          = action.payload; },
    setStreamingSessionId(state, action){ state.streamingSessionId   = action.payload; },
    setHistoryPanelOpen(state, action)  { state.historyPanelOpen     = action.payload; },
    toggleHistoryPanel(state)           { state.historyPanelOpen     = !state.historyPanelOpen; },
  },
});

export const {
  setActiveSessionId,
  setSessionMeta,
  upsertSessionMeta,
  removeSessionMeta,
  setWebSearchEnabled,
  setIsStreaming,
  setStreamingSessionId,
  setHistoryPanelOpen,
  toggleHistoryPanel,
} = chatSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────
export const selectActiveSessionId    = (state) => state.chat.activeSessionId;
export const selectSessionMeta        = (state) => state.chat.sessionMeta;
export const selectIsWebSearchEnabled = (state) => state.chat.isWebSearchEnabled;
export const selectIsStreaming        = (state) => state.chat.isStreaming;
export const selectHistoryPanelOpen   = (state) => state.chat.historyPanelOpen;

export default chatSlice.reducer;
