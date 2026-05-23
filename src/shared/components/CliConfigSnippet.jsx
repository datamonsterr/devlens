"use client";

import { useState } from "react";

const SNIPPETS = {
  "claude-code": {
    label: "Claude Code",
    config: (baseUrl, apiKey) =>
      `# Add to ~/.claude/settings.json\n{\n  "env": {\n    "ANTHROPIC_BASE_URL": "${baseUrl}/v1",\n    "ANTHROPIC_API_KEY": "${apiKey}"\n  }\n}`,
  },
  opencode: {
    label: "OpenCode",
    config: (baseUrl, apiKey) =>
      `# Set environment variables\nOPENAI_BASE_URL=${baseUrl}/v1\nOPENAI_API_KEY=${apiKey}`,
  },
  codex: {
    label: "OpenAI Codex",
    config: (baseUrl, apiKey) =>
      `# Set environment variables\nOPENAI_BASE_URL=${baseUrl}/v1\nOPENAI_API_KEY=${apiKey}`,
  },
};

export default function CliConfigSnippet({ baseUrl, apiKey }) {
  const [activeTab, setActiveTab] = useState("claude-code");
  const [copied, setCopied] = useState(false);

  const snippet = SNIPPETS[activeTab].config(baseUrl, apiKey);
  const tabs = Object.entries(SNIPPETS);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-border p-4 bg-surface">
        <h3 className="text-sm font-medium mb-2">CLI Configuration</h3>
        <p className="text-xs text-text-muted">
          Create an API key to see configuration snippets for your CLI tools.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="px-4 pt-3 pb-0">
        <h3 className="text-sm font-medium mb-2">CLI Configuration</h3>
        <div className="flex gap-1 mb-2">
          {tabs.map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1 text-xs rounded-t transition-colors ${
                activeTab === key
                  ? "bg-bg text-text border-t border-x border-border"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pb-3">
        <pre className="bg-bg rounded p-3 text-xs font-mono text-text-muted overflow-x-auto whitespace-pre-wrap">
          {snippet}
        </pre>
        <button
          onClick={handleCopy}
          className="mt-2 px-3 py-1 text-xs bg-primary text-white rounded hover:opacity-90 transition-opacity"
        >
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
      </div>
    </div>
  );
}
