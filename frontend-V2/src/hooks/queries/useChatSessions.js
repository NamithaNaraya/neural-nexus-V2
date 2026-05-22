import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chatService from '../../services/chatService';

const SESSIONS_STALE_TIME = 30 * 1000; // 30 seconds

/**
 * Fetches all chat sessions (metadata only, lazy loading).
 */
export function useChatSessions(options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: () => chatService.listSessions(),
    enabled,
    staleTime: SESSIONS_STALE_TIME,
    select: (data) => data || [],
  });
}

/**
 * Fetches chat history for a specific session.
 * Only fetches when a sessionId is provided (lazy load on selection).
 */
export function useChatHistory(sessionId, options = {}) {
  const { limit = 200, enabled = true } = options;

  return useQuery({
    queryKey: ['chat', 'history', sessionId],
    queryFn: () => chatService.getSessionHistory(sessionId, limit),
    enabled: !!sessionId && enabled,
    staleTime: SESSIONS_STALE_TIME,
    select: (data) => data || [],
  });
}

/**
 * Syncs the full workspace (sessions + metadata) from backend.
 */
export function useChatWorkspaceSync(options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['chat', 'workspace'],
    queryFn: () => chatService.syncWorkspaceFromBackend(),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Mutation: Delete a chat session.
 * Invalidates session list cache on success.
 */
export function useDeleteChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId) => chatService.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'workspace'] });
    },
  });
}

/**
 * Mutation: Clear a chat session's messages.
 * Invalidates the specific session history cache.
 */
export function useClearChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId) => chatService.clearSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'history', sessionId] });
    },
  });
}
