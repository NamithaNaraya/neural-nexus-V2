import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Send, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

/**
 * OptimizedChatPage - Modern streaming chat component
 * 
 * Features:
 * - Real-time streaming responses (ChatGPT-like)
 * - Intelligent entity handling (John vs Johnson)
 * - Scope-aware queries (no data leaks)
 * - Parallel database queries (fast responses)
 * - Accessibility & keyboard support
 */
export default function OptimizedChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m your smart knowledge assistant. Ask me anything about your knowledge graph.',
      isWelcome: true,
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentStreamRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Stream response from backend
   * Uses Server-Sent Events (SSE) for real-time chunks
   */
  const handleStreamedQuery = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/v1/chat-optimized/query-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          query: input,
          folder_id: currentFolderId,
          conversation_history: messages
            .filter(m => !m.isWelcome)
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content })),
          enable_streaming: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create streaming message
      const assistantMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };

      setMessages(prev => [...prev, assistantMessage]);
      currentStreamRef.current = assistantMessage.id;

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.done) {
                // Stream complete
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessage.id
                      ? { ...m, isStreaming: false }
                      : m
                  )
                );
                currentStreamRef.current = null;
              } else if (data.chunk) {
                // Update message with chunk
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessage.id
                      ? { ...m, content: m.content + data.chunk }
                      : m
                  )
                );
              } else if (data.error) {
                setError(data.error);
                toast.error(data.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1];
      }

      // Handle final buffer content
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.error) {
            setError(data.error);
          }
        } catch (e) {
          console.error('Failed to parse final SSE data:', e);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Streaming error:', err);
        setError(err.message);
        toast.error(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [input, messages, currentFolderId]);

  /**
   * Handle form submission (Enter key or Send button)
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    handleStreamedQuery();
  };

  /**
   * Cancel ongoing stream
   */
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);

      if (currentStreamRef.current) {
        setMessages(prev =>
          prev.map(m =>
            m.id === currentStreamRef.current
              ? { ...m, isStreaming: false }
              : m
          )
        );
      }
    }
  };

  /**
   * Clear chat history
   */
  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hi! I\'m your smart knowledge assistant. Ask me anything about your knowledge graph.',
        isWelcome: true,
        timestamp: new Date()
      }
    ]);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Smart Chat 🚀</h1>
        <p className="text-sm text-slate-400 mt-1">
          Fast, accurate knowledge graph queries with intelligent entity matching
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-100'
              } ${message.isStreaming ? 'animate-pulse' : ''}`}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content}
                {message.isStreaming && (
                  <span className="inline-block animate-pulse ml-1">▌</span>
                )}
              </div>
              <div className="text-xs mt-2 opacity-60">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !error && (
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing your query...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur px-6 py-4 space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything... (e.g., 'Who is John and how is he connected?')"
            disabled={loading}
            className="flex-1 rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !loading) {
                handleSubmit(e);
              }
            }}
          />

          {loading ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-3 text-white font-medium transition"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-6 py-3 text-white font-medium transition flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          )}
        </form>

        {/* Quick Actions */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={handleClear}
            className="px-3 py-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
          >
            Clear
          </button>
          <span className="text-slate-500">
            💡 Tip: Ask follow-up questions for context-aware answers
          </span>
        </div>

        {/* Status Info */}
        <div className="text-xs text-slate-500 space-y-1">
          <div>✅ Intelligent entity matching (John vs Johnson)</div>
          <div>✅ Fast streaming responses (parallel queries)</div>
          <div>✅ Scope-aware (no cross-folder data)</div>
        </div>
      </div>
    </div>
  );
}
