"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardSkeleton, Button, Input, Badge } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";
import RoleGuard from "@/shared/components/RoleGuard";

export default function ChatbotPage() {
  return (
    <RoleGuard allowed={["manager"]}>
      <ChatbotContent />
    </RoleGuard>
  );
}

function ChatbotContent() {
  const { isManager } = useRole();
  const chatEndRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [apiKey, setApiKey] = useState("");
  const [url, setUrl] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("4096");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/chatbot");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig(data);
      setApiKey(data.apiKey || "");
      setUrl(data.url || "");
      setModel(data.model || "");
      setSystemPrompt(data.systemPrompt || "");
      setTemperature(String(data.temperature ?? 0.7));
      setMaxTokens(String(data.maxTokens ?? 4096));

      // Load history after config is loaded
      const historyRes = await fetch("/api/chatbot/history");
      const historyData = await historyRes.json();
      if (historyRes.ok && historyData.history) {
        setMessages(historyData.history);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body = {
        url: url || null,
        model: model || null,
        systemPrompt: systemPrompt || null,
        temperature: Number(temperature) || 0.7,
        maxTokens: Number(maxTokens) || 4096,
      };
      if (apiKey && !apiKey.startsWith("••••")) {
        body.apiKey = apiKey;
      }
      const res = await fetch("/api/chatbot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Configuration saved");
      await fetchConfig();
      setShowConfig(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setError(null);

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          temperature: Number(temperature) || 0.7,
          maxTokens: Number(maxTokens) || 4096,
          model: model || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.history) {
        setMessages(data.history);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        { role: "error", content: `Error: ${err.message}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await fetch("/api/chatbot/history", { method: "DELETE" });
      setMessages([]);
    } catch (err) {
      setError("Failed to clear history: " + err.message);
    }
  };

  const configured = config?.hasApiKey && config?.url;

  if (!isManager) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">smart_toy</span>
            </div>
            <h3 className="text-lg font-medium">Chatbot</h3>
            <p className="text-sm text-text-muted mt-2">Only team managers can configure the chatbot.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Chatbot</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure and interact with an external AI chatbot
          </p>
        </div>
        <div className="flex items-center gap-2">
          {configured && (
            <Badge variant="success" size="sm" dot>
              Configured
            </Badge>
          )}
          <Button
            variant={showConfig ? "primary" : "outline"}
            size="sm"
            icon="settings"
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? "Hide Config" : "Config"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {!configured && !showConfig && (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-200 mb-4">
              <span className="material-symbols-outlined text-[32px]">smart_toy</span>
            </div>
            <h3 className="text-lg font-medium">Not Configured</h3>
            <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">
              Set up your chatbot connection by providing an API key, endpoint URL, and model.
            </p>
            <Button
              variant="primary"
              className="mt-4"
              icon="settings"
              onClick={() => setShowConfig(true)}
            >
              Configure Chatbot
            </Button>
          </div>
        </Card>
      )}

      {showConfig && (
        <Card padding="md">
          <h3 className="font-semibold mb-4">Chatbot Configuration</h3>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <Input
              label="API Key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Input
              label="API URL"
              type="url"
              placeholder="https://api.openai.com/v1/chat/completions"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Input
              label="Model"
              placeholder="gpt-4o"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">
                System Prompt
              </label>
              <textarea
                placeholder="You are a helpful assistant."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Temperature"
                type="number"
                placeholder="0.7"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                min="0"
                max="2"
                step="0.1"
              />
              <Input
                label="Max Tokens"
                type="number"
                placeholder="4096"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                min="1"
                max="128000"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary" loading={saving}>
                Save Configuration
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfig(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {configured && (
        <Card className="flex flex-col" style={{ height: "calc(100vh - 300px)", minHeight: "400px" }}>
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-brand-600">smart_toy</span>
              <span className="font-medium text-sm">{model || "Chatbot"}</span>
            </div>
            <button
              onClick={handleClearChat}
              className="text-xs text-text-muted hover:text-text-main transition-colors"
            >
              Clear chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[40px] text-text-subtle">chat</span>
                  <p className="mt-2 text-sm text-text-muted">Send a message to start the conversation</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-500 text-white rounded-br-md"
                      : msg.role === "error"
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-bl-md"
                      : "bg-surface-2 text-text-main rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-2 text-text-main rounded-2xl rounded-bl-md px-4 py-2.5">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-border-subtle px-4 py-3 flex gap-2"
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
        </Card>
      )}
    </div>
  );
}
