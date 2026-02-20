"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Zap, Loader2 } from "lucide-react";
import { MEDAZON_AI_SYSTEM_PROMPT } from "@/lib/ai-booking-prompt";

// ═══════════════════════════════════════════════════════
// STANDALONE AI CHAT WIDGET
// Calls Anthropic API directly — no backend route needed.
// Uses the full 2400-line system prompt from ai-booking-prompt.ts
// ═══════════════════════════════════════════════════════

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Trim system prompt to stay within token limits — keep first ~80K chars
// The full prompt is ~138K chars; Claude can handle large system prompts
// but we trim the admin/dashboard sections (19-22) that aren't needed at runtime
const RUNTIME_PROMPT = MEDAZON_AI_SYSTEM_PROMPT.split("# SECTION 19:")[0] +
  "\n\n---\n*End of runtime prompt. Sections 19-22 (Admin, Outreach, Dashboard) omitted for runtime efficiency.*";

const OPENER = {
  message: "Hey! 👋 I'm the Medazon Health booking assistant. Whether it's something urgent, something private, or something you've been putting off — I'm here to help you get in front of your provider. What's going on?",
  quickReplies: ["UTI symptoms", "ADHD evaluation", "Anxiety", "STD testing", "Weight loss", "Something else"],
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Listen for external chat triggers (e.g., condition clicks)
  useEffect(() => {
    const handleStartChat = (e: CustomEvent) => {
      const condition = e.detail;
      if (condition) {
        setIsOpen(true);
        setShowQuickReplies(false);
        handleSend(condition);
      }
    };
    window.addEventListener("medazon-start-chat", handleStartChat as EventListener);
    return () => window.removeEventListener("medazon-start-chat", handleStartChat as EventListener);
  }, []);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setShowQuickReplies(false);
    setIsLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: RUNTIME_PROMPT,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const assistantText = data.content
        ?.map((block: any) => (block.type === "text" ? block.text : ""))
        .filter(Boolean)
        .join("\n") || "I'm sorry, I'm having trouble responding right now. Please try again.";

      setMessages(prev => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err) {
      console.error("Chat API error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "I'm sorry — I'm having a connection issue. In the meantime, you can book directly for $1.89 using the button above. Your provider personally reviews every case." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading]);

  const handleQuickReply = (reply: string) => {
    setShowQuickReplies(false);
    handleSend(reply);
  };

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-teal-500 text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:bg-teal-400 transition-all hover:scale-105"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[60] w-full sm:w-[400px] h-[100dvh] sm:h-[600px] sm:max-h-[80vh] bg-[#0a0f0d] sm:rounded-2xl overflow-hidden flex flex-col border border-teal-500/30 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
             style={{ animation: "slideUp 0.3s ease-out" }}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0f0d] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-500/20 rounded-full flex items-center justify-center">
                <Zap size={18} className="text-teal-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Medazon Health</p>
                <p className="text-teal-400 text-[10px] font-medium">Booking Assistant · Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Opener */}
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-teal-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Zap size={12} className="text-teal-400" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <p className="text-gray-200 text-sm leading-relaxed">{OPENER.message}</p>
              </div>
            </div>

            {/* Quick Replies */}
            {showQuickReplies && (
              <div className="flex flex-wrap gap-2 pl-10">
                {OPENER.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className="bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-teal-500/20 transition-all"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-teal-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap size={12} className="text-teal-400" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-teal-500 text-black rounded-tr-sm"
                    : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-teal-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap size={12} className="text-teal-400" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 size={16} className="text-teal-400 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 bg-[#0a0f0d] flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 disabled:opacity-50 transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="bg-teal-500 text-black p-3 rounded-xl hover:bg-teal-400 transition-all disabled:opacity-30"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center text-[8px] text-gray-600 mt-2">HIPAA Compliant · Not Medical Advice · Booking Assistant Only</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

