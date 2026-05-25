/**
 * useChatSessions — Phase 2 TanStack Query hooks for chat session management.
 *
 * Replaces manual localStorage sync + chatService polling with proper
 * server-state management. Full messages are still managed in ChatPage's
 * local workspace until Phase 4; these hooks manage the lightweight
 * session metadata and history operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chatService from '../services/chatService';
import api from '../services/api';

// ── Query key factory ─────────────────────────────────────────────────────
export const chatKeys = {
  all:         ()          => ['chat'],
  sessions:    ()          => ['chat', 'sessions'],
  session:     (id)        => ['chat', 'session', id],
  history:     (id)        => ['chat', 'session', id, 'history'],
  workspace:   ()          => ['chat', 'workspace'],
};

const STALE_TIME = {
  sessions: 60 * 1000,      // 1 min
  history:  5 * 60 * 1000,  // 5 min
};

// ── Fetcher helpers ───────────────────────────────────────────────────────
const fetchSessions = async () => {
  const workspace = await chatService.syncWorkspaceFromBackend({ timeoutMs: 8000 });
  return workspace?.sessions ?? [];
};

const fetchSessionHistory = async (sessionId) => {
  return chatService.getSessionHistory(sessionId);
};

// ── Query hooks ───────────────────────────────────────────────────────────

/** Fetch the list of all sessions from the backend. */
export function useChatSessions({ enabled = true } = {}) {
  return useQuery({
    queryKey:  chatKeys.sessions(),
    queryFn:   fetchSessions,
    staleTime: STALE_TIME.sessions,
    enabled,
  });
}

/** Fetch full message history for a specific session. */
export function useSessionHistory(sessionId, { enabled = true } = {}) {
  return useQuery({
    queryKey:  chatKeys.history(sessionId),
    queryFn:   () => fetchSessionHistory(sessionId),
    staleTime: STALE_TIME.history,
    enabled:   Boolean(sessionId) && enabled,
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────

/** Delete a session. */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => chatService.deleteSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.sessions() });
      queryClient.removeQueries({ queryKey: chatKeys.history(sessionId) });
    },
  });
}

/** Clear (wipe messages from) a session. */
export function useClearSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => chatService.clearSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.history(sessionId) });
    },
  });
}

/**
 * Save a message pair (user + assistant) to the backend.
 * Used post-stream when the full answer text is available.
 */
export function useSaveChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, question, answer, citations }) =>
      api.post('/chat-optimized/save-message', { sessionId, question, answer, citations }),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.history(sessionId) });
    },
  });
}

/**
 * Convenience: invalidate all chat-related queries.
 * Call after workspace-level operations.
 */
export function useInvalidateChat() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: chatKeys.all() });
}
