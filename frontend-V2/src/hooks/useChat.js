/**
 * useChat — Phase 3 streaming transport hook.
 *
 * Encapsulates ALL HTTP streaming concerns:
 *  • AbortController for user-initiated cancellation
 *  • requestAnimationFrame-buffered token flushing (true 60fps rendering)
 *  • Newline-delimited JSON parser with incomplete-line buffering
 *  • Structured metadata callbacks (intent, gds_results, data_grounding, web_search_result)
 *
 * ChatPage manages workspace/session state; this hook manages the network transport.
 * Communication happens through four narrow callbacks so the hook stays pure.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const CHAT_HISTORY_SEND_WINDOW = 20;

/**
 * @param {object} opts
 * @param {(tokens: string) => void}   opts.onTokens       - Called at 60fps with buffered token string
 * @param {(meta: object) => void}     opts.onMetadata     - Called for every non-content SSE chunk
 * @param {() => void}                 opts.onDone         - Called when stream completes normally
 * @param {(err: Error) => void}       opts.onError        - Called on network/parse errors (not AbortError)
 */
export function useChat({ onTokens, onMetadata, onDone, onError }) {
  const [loading, setLoading] = useState(false);

  const abortRef   = useRef(null); // AbortController for the active fetch
  const rafRef     = useRef(null); // requestAnimationFrame id for flush scheduling
  const bufferRef  = useRef('');   // token accumulation buffer

  // Stable refs for callbacks so scheduleFlush closure doesn't go stale
  const onTokensRef   = useRef(onTokens);
  const onMetadataRef = useRef(onMetadata);
  const onDoneRef     = useRef(onDone);
  const onErrorRef    = useRef(onError);
  useEffect(() => { onTokensRef.current   = onTokens;   }, [onTokens]);
  useEffect(() => { onMetadataRef.current = onMetadata; }, [onMetadata]);
  useEffect(() => { onDoneRef.current     = onDone;     }, [onDone]);
  useEffect(() => { onErrorRef.current    = onError;    }, [onError]);

  // ── Flush pending buffer at next animation frame ──────────────────────────
  const flushBuffer = useCallback(() => {
    rafRef.current = null;
    if (!bufferRef.current) return;
    const pending = bufferRef.current;
    bufferRef.current = '';
    onTokensRef.current?.(pending);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return; // already scheduled
    rafRef.current = requestAnimationFrame(flushBuffer);
  }, [flushBuffer]);

  // ── Cancel ongoing stream ─────────────────────────────────────────────────
  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    bufferRef.current = '';
    setLoading(false);
  }, []);

  // ── Parse a single JSON line from the NDJSON stream ──────────────────────
  const processLine = useCallback((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const chunk = JSON.parse(trimmed);
      if (chunk.type === 'content' && chunk.data) {
        bufferRef.current += chunk.data;
        scheduleFlush();
      } else if (chunk.type === 'done') {
        // Flush any remaining tokens before signalling done
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        flushBuffer();
        onDoneRef.current?.();
      } else {
        // intent, gds_results, data_grounding, web_search_result, web_search_suggestion, step …
        onMetadataRef.current?.(chunk);
      }
    } catch {
      // Incomplete JSON fragment — silently ignored; will be picked up in lineBuffer
    }
  }, [scheduleFlush, flushBuffer]);

  // ── Main streaming function ───────────────────────────────────────────────
  /**
   * @param {object} opts
   * @param {string}   opts.question
   * @param {string}   [opts.sessionId]
   * @param {string}   [opts.folderId]
   * @param {Array}    [opts.history]       - Prior messages to send as context
   * @param {boolean}  [opts.webSearch]
   */
  const streamMessage = useCallback(async ({
    question,
    sessionId,
    folderId,
    history = [],
    webSearch = false,
  }) => {
    // Cancel any in-flight stream before starting a new one
    cancelStream();

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const token = localStorage.getItem('neural_nexus_token');
      const response = await fetch('/api/v1/chat-optimized/stream-answer', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question,
          folder_id: folderId || null,
          session_id: sessionId || null,
          history: history.slice(-CHAT_HISTORY_SEND_WINDOW),
          web_search: webSearch,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not available');

      const decoder = new TextDecoder();
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');

        // All complete lines except the last (may be incomplete)
        for (let i = 0; i < lines.length - 1; i++) {
          processLine(lines[i]);
        }
        lineBuffer = lines[lines.length - 1];
      }

      // Flush any remaining incomplete line on stream end
      if (lineBuffer.trim()) processLine(lineBuffer);

      // Final buffer flush
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      flushBuffer();

    } catch (err) {
      if (err.name === 'AbortError') return; // User-initiated cancel — no error
      onErrorRef.current?.(err);
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }, [cancelStream, processLine, flushBuffer]);

  // Cleanup on unmount
  useEffect(() => () => cancelStream(), [cancelStream]);

  return { streamMessage, cancelStream, loading };
}
