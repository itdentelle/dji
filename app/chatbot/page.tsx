"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Send, Bot, User, Sparkles, CornerDownLeft } from "lucide-react";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
}

export default function ChatbotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: `Halo ${user?.fullName.replace(" (Demo)", "") || "Supervisor"}, saya adalah Enterprise Assistant AI. Saya terhubung ke n8n workflow untuk menyajikan analitik data hasil produksi mesin rajut, laporan deviasi kualitas, dan detail masalah mesin rajut harian. Ada yang bisa saya bantu hari ini?`,
      timestamp: "Baru saja",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick suggestions questions
  const suggestions = [
    "Bagaimana statistik hasil produksi hari ini?",
    "Tampilkan daftar pegawai produksi hari ini",
  ];

  // Auto Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const timestamp = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";

    // 1. Tambahkan pesan user ke chat feed
    const newUserMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      // 2. Kirim request ke API Route yang terhubung ke n8n webhook
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          userRole: user?.role,
          userName: user?.fullName
        })
      });

      const data = await res.json();

      const newAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.reply || "Terjadi kesalahan yang tidak diketahui.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      };

      setMessages((prev) => [...prev, newAiMessage]);
    } catch (error) {
      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Maaf, gagal terhubung ke server. Silakan coba lagi.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      };
      setMessages((prev) => [...prev, errorAiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend(inputText);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white border border-[#e9ecef] rounded-[32px] h-[calc(100vh-140px)] overflow-hidden shadow-2xl relative">
      {/* Header Chat */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0070bc]/5 border border-[#0070bc]/10 flex items-center justify-center text-[#0070bc] shadow-[0_4px_15px_rgba(15,93,62,0.04)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-800 leading-none">DJI AI</h3>
              <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#0070bc]/10 text-[#0070bc] border border-[#0070bc]/15">
                <Sparkles className="w-2.5 h-2.5" /> n8n Linked
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Asisten Analitik Hasil & Kualitas Produksi</p>
          </div>
        </div>
      </div>

      {/* Messages Feed Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col bg-slate-50/40">
        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isAi ? "self-start" : "self-end flex-row-reverse"}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 text-xs ${isAi
                ? "bg-white border-slate-200 text-[#0070bc]"
                : "bg-[#0070bc] border-[#0070bc] text-white"
                }`}>
                {isAi ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
              </div>

              {/* Text Bubble */}
              <div className="space-y-1">
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border whitespace-pre-wrap ${isAi
                    ? "bg-white border-[#e9ecef] text-slate-700 rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
                    : "bg-[#0070bc] border-[#0070bc] text-white shadow-md shadow-[#0070bc]/10 rounded-tr-none font-medium"
                    }`}
                >
                  {/* Render bold text simply for mock */}
                  {msg.text.split("**").map((chunk, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} className={isAi ? "font-extrabold text-[#0070bc]" : "font-extrabold text-white"}>
                        {chunk}
                      </strong>
                    ) : (
                      chunk
                    )
                  )}
                </div>
                <div className={`text-[9px] text-slate-400 font-bold px-1 ${!isAi && "text-right"}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 self-start max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-[#0070bc] flex items-center justify-center shrink-0">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="bg-white border border-[#e9ecef] p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5 h-11 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0070bc]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#0070bc]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#0070bc]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Prompts Bar */}
      {messages.length === 1 && !isTyping && (
        <div className="px-6 pb-2 pt-2 space-y-2 bg-slate-50/40">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pertanyaan Populer:</span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-[11px] font-extrabold text-slate-600 hover:text-[#0070bc] hover:bg-[#0070bc]/5 bg-white border border-[#e9ecef] rounded-xl px-3.5 py-2 transition-all cursor-pointer shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar Area */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <div className="relative flex items-center max-w-4xl mx-auto bg-white border border-[#e9ecef] rounded-2xl px-4 py-2 focus-within:border-[#0070bc] focus-within:shadow-[0_0_15px_rgba(15,93,62,0.06)] transition-all">
          <input
            type="text"
            disabled={isTyping}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 bg-transparent text-slate-800 text-xs sm:text-sm outline-none border-none py-2 pr-12 focus:ring-0 placeholder:text-slate-400 font-medium"
            placeholder="Tanyakan statistik hasil produksi, status recheck QC, atau kendala mesin rajut..."
          />
          <div className="absolute right-2 flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-0.5 text-[9px] font-extrabold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
              Enter <CornerDownLeft className="w-2.5 h-2.5 text-slate-400" />
            </span>
            <button
              onClick={() => handleSend(inputText)}
              disabled={isTyping || !inputText.trim()}
              className="p-2 rounded-xl bg-[#0070bc] hover:bg-[#0b4b32] active:scale-95 disabled:opacity-40 disabled:hover:bg-[#0070bc] disabled:scale-100 text-white transition-all cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
