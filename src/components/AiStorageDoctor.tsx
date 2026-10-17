import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Terminal,
  RotateCcw,
  Bot,
  User,
  HardDrive,
} from 'lucide-react';
import { DiskNode, OperatingSystem } from '../types/disk';
import { formatBytes } from '../utils/formatters';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AiStorageDoctorProps {
  os: OperatingSystem;
  rootNode: DiskNode;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export const AiStorageDoctor: React.FC<AiStorageDoctorProps> = ({
  os,
  rootNode,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: `### Welcome to DiskSize AI Storage Doctor

I am your expert system storage assistant for **${os.toUpperCase()}**.
I specialize in disk analysis, space hog detection, and safe cleanup scripts.

**Safety Guarantee:**
- I will **NEVER** recommend deleting critical OS files like \`System32\`, \`pagefile.sys\`, or \`/System\`.
- All recommended scripts include safe dry-run flags (\`-WhatIf\` or preview commands).

How can I help you reclaim disk space today? Ask a question or click one of the quick diagnostics below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle initial prompt passed from other components (e.g. "Ask AI about this folder")
  useEffect(() => {
    if (initialPrompt) {
      sendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  async function sendMessage(textToSend: string) {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Package top 10 heavy nodes as context
      const topHogs: { name: string; path: string; sizeFormatted: string; category: string; safety: string }[] = [];
      function gatherHogs(n: DiskNode) {
        if (n.size > 1024 * 1024 * 1024) { // > 1 GB
          topHogs.push({
            name: n.name,
            path: n.path,
            sizeFormatted: formatBytes(n.size),
            category: n.category,
            safety: n.safetyRating,
          });
        }
        if (n.children) {
          for (const c of n.children) gatherHogs(c);
        }
      }
      gatherHogs(rootNode);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          os,
          contextData: {
            driveRoot: rootNode.path,
            totalScannedBytes: formatBytes(rootNode.size),
            topFolders: topHogs.slice(0, 8),
          },
        }),
      });

      const data = await response.json();
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        content: data.reply || data.error || 'Diagnostic completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          content: `Unable to reach Gemini API. Please check your network connection or GEMINI_API_KEY.\n\nOffline safe fallback advice: Clean %TEMP%, browser caches, or run \`npm cache clean --force\`.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // Trigger full scan diagnostic
  async function triggerDeepAnalysis() {
    sendMessage(
      `Please analyze my entire ${os.toUpperCase()} drive scan (${formatBytes(
        rootNode.size
      )} used). Identify the largest space hogs, classify their safety levels, and give me exact dry-run cleanup commands.`
    );
  }

  function handleCopySnippet(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  }

  // Simple Markdown renderer with code block copy buttons
  function renderMarkdown(content: string) {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].trim();
        const code = lines.slice(lang ? 1 : 0).join('\n');
        const snippetId = `snippet-${index}`;

        return (
          <div key={index} className="my-3 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
              <span>{lang || 'command'}</span>
              <button
                onClick={() => handleCopySnippet(code, snippetId)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedCodeId === snippetId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-cyan-300 font-mono text-xs leading-relaxed select-text">
              {code}
            </pre>
          </div>
        );
      }

      // Format headings, bold, bullet points, and tables simply
      return (
        <div key={index} className="space-y-2 text-slate-300 leading-relaxed text-xs">
          {part.split('\n\n').map((paragraph, pIdx) => {
            if (paragraph.startsWith('### ')) {
              return (
                <h3 key={pIdx} className="text-sm font-bold text-white mt-3 mb-1">
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            if (paragraph.startsWith('#### ')) {
              return (
                <h4 key={pIdx} className="text-xs font-bold text-cyan-300 mt-2 mb-1">
                  {paragraph.replace('#### ', '')}
                </h4>
              );
            }
            return (
              <p key={pIdx} className="whitespace-pre-line">
                {paragraph}
              </p>
            );
          })}
        </div>
      );
    });
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>DiskSize AI Storage Doctor</span>
              <span className="text-[10px] text-cyan-400 font-normal">Gemini 3.8 Flash</span>
            </h2>
            <div className="text-[11px] text-slate-400">
              Safe storage diagnosis &amp; cleanup commands for {os.toUpperCase()}
            </div>
          </div>
        </div>

        <button
          onClick={triggerDeepAnalysis}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors font-semibold shadow-sm disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Analyze Entire Drive</span>
        </button>
      </div>

      {/* Quick Prompts Strip */}
      <div className="flex items-center gap-2 px-6 py-2 bg-slate-900/30 border-b border-slate-800/80 overflow-x-auto text-xs">
        <span className="text-slate-500 text-[11px] shrink-0">Suggestions:</span>
        <button
          onClick={() => sendMessage('How do I safely clean C:\\Windows\\WinSxS using DISM?')}
          className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0 text-[11px]"
        >
          WinSxS Component Store
        </button>
        <button
          onClick={() => sendMessage('Find and clean all node_modules across my user projects')}
          className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0 text-[11px]"
        >
          Purge node_modules
        </button>
        <button
          onClick={() => sendMessage('How to safely prune Docker images, containers, and volumes?')}
          className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0 text-[11px]"
        >
          Docker Pruning
        </button>
        <button
          onClick={() => sendMessage('What is pagefile.sys and is it safe to delete or resize it?')}
          className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0 text-[11px]"
        >
          pagefile.sys rules
        </button>
        <button
          onClick={() => sendMessage('How to clean macOS Xcode DerivedData and iOS simulator runtimes?')}
          className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0 text-[11px]"
        >
          macOS Xcode Cleanup
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                msg.sender === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 border border-slate-700 text-cyan-400'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`p-4 rounded-xl border ${
                msg.sender === 'user'
                  ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-100'
                  : 'bg-slate-900/80 border-slate-800 text-slate-200'
              }`}
            >
              {renderMarkdown(msg.content)}
              <div className="text-[10px] text-slate-500 mt-2 text-right">{msg.timestamp}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-slate-400 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span>DiskSize AI is analyzing storage hierarchies and verifying safety rules...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any folder, command, or paste 'du -sh' output..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
