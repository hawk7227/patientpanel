// src/components/free-assessment/ChatWidget.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { MedazonAnalytics } from "@/lib/medazonAnalytics";
import { Send, X, MessageCircle } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-trigger teaser
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && !sessionStorage.getItem('chatDismissed')) {
        setShowTeaser(true);
      }
    }, 3000); // 3 seconds for demo

    // Listen for external "Start Assessment" events
    const handleStart = (e: any) => {
      const initialMsg = e.detail;
      openChat();
      if (initialMsg) handleSend(initialMsg);
    };

    window.addEventListener('medazon-start-chat', handleStart);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('medazon-start-chat', handleStart);
    };
  }, [isOpen]);

  const openChat = () => {
    setIsOpen(true);
    setShowTeaser(false);
    MedazonAnalytics.trackChatOpened('user_click');
    if (messages.length === 0) {
      // Initial Greeting
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([{
          role: 'assistant',
          content: "Hey! Dealing with something that's bothering you? I can help you figure out if you actually need to see a provider - takes about 2 minutes. What's going on?"
        }]);
      }, 600);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    sessionStorage.setItem('chatDismissed', 'true');
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // 1. Optimistic UI Update (Show user message immediately)
    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      // 2. Call Chat API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages // Send context
        })
      });

      const data = await res.json();
      setIsTyping(false);

      if (data.reply) {
        const botMsg: Message = { role: 'assistant', content: data.reply };
        const finalMessages = [...updatedMessages, botMsg];
        setMessages(finalMessages);

        // 3. Save Conversation History (Background)
        fetch('/api/chat/save', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: sessionStorage.getItem('medazon_session_id'),
            messages: finalMessages
          })
        });
      }
    } catch (error) {
      console.log(error);
      setIsTyping(false);
      // Error handling UI
    }
  };

  // Simple keyword matching for demo
  const getSimulatedResponse = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('uti') || t.includes('burn')) return "Ugh, UTI symptoms are the worst 😩 I'm sorry you're dealing with that. Everything here is completely private. How long has this been going on?";
    if (t.includes('weight') || t.includes('fat')) return "Weight management is one of our specialties. We offer semaglutide and tirzepatide programs. Have you tried medication for this before?";
    return "Thanks for sharing. Everything here is confidential. Can you tell me a little more about your symptoms?";
  };

  return (
    <>
      {/* Teaser Bubble */}
      {showTeaser && !isOpen && (
        <div
          onClick={openChat}
          className="fixed bottom-6 right-6 z-50 cursor-pointer animate-in slide-in-from-bottom-4 fade-in duration-500"
        >
          <div className="bg-teal-500 text-black font-semibold px-5 py-3 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
            <MessageCircle size={20} />
            <span>Got health questions?</span>
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-[380px] h-[100dvh] md:h-[600px] z-50 flex flex-col bg-[#0a0f0d] border border-teal-500/30 md:rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">M</div>
              <div>
                <p className="text-white font-semibold text-sm">Medazon Health</p>
                <p className="text-white/80 text-xs">Online now</p>
              </div>
            </div>
            <button onClick={closeChat}><X className="text-white" /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0f0d]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user'
                    ? 'bg-teal-500 text-black rounded-br-none'
                    : 'bg-white/10 text-white rounded-bl-none'
                  }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-1 text-gray-500 text-xs ml-2">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-[#0a0f0d]">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500"
              />
              <button type="submit" className="bg-teal-500 p-3 rounded-xl hover:bg-teal-400 text-black">
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}