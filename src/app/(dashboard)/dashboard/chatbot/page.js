'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Badge } from '@/shared/components';
import RoleGuard from '@/shared/components/RoleGuard';

export default function ChatbotPage() {
  return (
    <RoleGuard allowed={['manager']}>
      <ChatbotContent />
    </RoleGuard>
  );
}

function ChatbotContent() {
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeTool, setActiveTool] = useState(null);
  const [toolResults, setToolResults] = useState([]);
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/chatbot/models');
      const data = await res.json();
      if (res.ok) {
        setModels(data.options || []);
        const defaultModel = data.options?.find((o) => o.toolCapable);
        if (defaultModel) setSelectedModel(defaultModel.value);
      }
    } catch (e) {
      console.error('Failed to load models:', e);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/chatbot/history');
      const data = await res.json();
      if (res.ok && data.history) {
        setMessages(transformHistory(data.history));
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    fetchHistory();
  }, [fetchModels, fetchHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const fetchPrompt = async () => {
    try {
      const res = await fetch('/api/chatbot/prompt');
      const data = await res.json();
      if (res.ok) {
        setPromptText(data.prompt);
      }
    } catch {}
    setShowPrompt(true);
  };

  const transformHistory = (history) => {
    return history.map((msg) => {
      if (msg.role === 'tool_call') {
        return {
          role: 'tool_call',
          toolData: {
            name: msg.tool_name || 'tool',
            arguments: {},
            result: msg.content ? { tool_name: msg.tool_name, result: msg.content } : {},
          },
          timestamp: msg.timestamp || new Date().toISOString(),
        };
      }
      return msg;
    });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setStreaming(true);
    setStreamingText('');
    setActiveTool(null);
    setToolResults([]);
    setError(null);

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/chatbot/internal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel || undefined,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `API error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let gotResponse = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              gotResponse = true;

              if (currentEvent === 'text_delta') {
                assistantContent += data.content || '';
                setStreamingText(assistantContent);
              } else if (currentEvent === 'tool_call') {
                setActiveTool({ id: data.id, name: data.name, arguments: data.arguments });
                setStreamingText('');
              } else if (currentEvent === 'tool_result') {
                setToolResults((prev) => [...prev, { id: data.id, name: data.name, result: data.result }]);
                setActiveTool(null);
              } else if (currentEvent === 'error') {
                setError(data.message || 'An error occurred');
              } else if (currentEvent === 'done') {
                if (data.maxRounds) {
                  setError('Max tool rounds reached. Response may be incomplete.');
                }
              }
            } catch {}
          }
        }
      }

      if (gotResponse || assistantContent || toolResults.length > 0) {
        const finalMessages = [...newMessages];

        for (const tr of toolResults) {
          finalMessages.push({
            role: 'tool_call',
            toolData: { name: tr.name, arguments: {}, result: tr.result },
          });
        }

        if (assistantContent) {
          finalMessages.push({ role: 'assistant', content: assistantContent });
        }

        setMessages(finalMessages);
      }
    } catch (err) {
      setError(err.message || 'Connection failed. Check your network and try again.');
    } finally {
      setSending(false);
      setStreaming(false);
      setStreamingText('');
      setActiveTool(null);
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Clear all chat messages?')) return;
    try {
      await fetch('/api/chatbot/history', { method: 'DELETE' });
      setMessages([]);
    } catch (err) {
      setError('Failed to clear history: ' + err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toolCapableCount = models.filter((m) => m.toolCapable).length;

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[24px] text-brand-600">smart_toy</span>
          <div>
            <h1 className="text-sm font-semibold">Manager Chatbot</h1>
            <p className="text-xs text-text-muted">
              {toolCapableCount > 0
                ? `${toolCapableCount} tool-capable options`
                : 'No tool-capable models'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loadingModels ? (
            <span className="text-xs text-text-muted">Loading models...</span>
          ) : models.length > 0 ? (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs bg-surface-2 border border-transparent rounded-lg px-3 py-1.5 text-text-main focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} {!m.toolCapable ? '(chat only)' : ''}
                </option>
              ))}
            </select>
          ) : null}
          <button
            onClick={fetchPrompt}
            className="text-xs text-text-muted hover:text-text-main transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            View Prompt
          </button>
          <button
            onClick={handleClearChat}
            className="text-xs text-text-muted hover:text-text-main transition-colors"
          >
            Clear chat
          </button>
        </div>
      </div>

      {loadingHistory ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-text-muted">
            <span className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading...
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <span className="material-symbols-outlined text-[48px] text-text-subtle">smart_toy</span>
                <h2 className="mt-3 text-lg font-medium">Devlens Manager Assistant</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Ask me about your team&apos;s usage, provider status, team members, or RTK pool.
                  I can query platform data to give you insights.
                </p>
                {toolCapableCount === 0 && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                    No tool-capable models available. Chat functionality is limited — I cannot query platform data.
                  </div>
                )}
              </div>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === 'tool_call' ? (
              <ToolCallCard key={i} data={msg.toolData} />
            ) : (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white rounded-br-md'
                      : msg.role === 'error'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-bl-md'
                      : 'bg-surface-2 text-text-main rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            )
          )}

          {streaming && (
            <div className="space-y-3">
              {activeTool && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface-2 px-4 py-2.5 text-sm text-text-main">
                    <span className="material-symbols-outlined text-[18px] text-brand-600 animate-pulse">build</span>
                    <span>Using tool: <strong>{activeTool.name}</strong></span>
                  </div>
                </div>
              )}
              {streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-2 px-4 py-2.5 text-sm text-text-main">
                    {streamingText}
                  </div>
                </div>
              )}
              {!activeTool && !streamingText && !error && (
                <div className="flex justify-start">
                  <div className="bg-surface-2 text-text-main rounded-2xl rounded-bl-md px-4 py-2.5">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="max-w-[80%] rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 font-semibold hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="border-t border-border-subtle px-4 py-3 flex gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={toolCapableCount > 0 ? 'Ask about your team...' : 'Chat is limited — no tool-capable models'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          autoFocus
        />
        <Button
          type="submit"
          variant="primary"
          icon="send"
          loading={sending}
          disabled={!input.trim()}
        >
          Send
        </Button>
      </form>

      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPrompt(false)}>
          <div
            className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h3 className="font-semibold">System Prompt</h3>
              <button onClick={() => setShowPrompt(false)} className="text-text-muted hover:text-text-main">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-xs text-text-main whitespace-pre-wrap font-mono leading-relaxed">
                {promptText || 'Loading...'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolCallCard({ data }) {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  const isError = data.result?.error;
  const hasResult = data.result?.result || data.result?.tool_name;

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-2 px-4 py-2.5 text-sm">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span
            className={`material-symbols-outlined text-[18px] ${
              isError ? 'text-red-500' : 'text-green-500'
            }`}
          >
            {isError ? 'error' : 'check_circle'}
          </span>
          <span className="font-medium">
            Tool: <span className="font-mono text-xs">{data.name}</span>
          </span>
          <span className="material-symbols-outlined text-[16px] text-text-muted ml-auto">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {expanded && data.result && (
          <div className="mt-2 pt-2 border-t border-border-subtle space-y-2">
            {data.result.arguments && Object.keys(data.result.arguments).length > 0 && (
              <div>
                <span className="text-xs text-text-muted">Arguments:</span>
                <pre className="text-xs mt-1 font-mono bg-surface px-2 py-1 rounded overflow-x-auto">
                  {JSON.stringify(data.result.arguments, null, 2)}
                </pre>
              </div>
            )}
            {hasResult && (
              <div>
                <span className="text-xs text-text-muted">Result:</span>
                <pre className="text-xs mt-1 font-mono bg-surface px-2 py-1 rounded overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(data.result.result || data.result, null, 2)}
                </pre>
              </div>
            )}
            {data.result.error && (
              <div>
                <span className="text-xs text-red-500 font-medium">Error:</span>
                <pre className="text-xs mt-1 font-mono bg-red-50 dark:bg-red-950 px-2 py-1 rounded overflow-x-auto">
                  {JSON.stringify(data.result.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
