import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Language, RestorationReport } from '../types';
import { TRANSLATIONS } from '../constants';
import { chatWithExpert } from '../services/geminiService';
import { logUserAction } from '../services/analyticsService';
import { Send, Bot, Sparkles } from 'lucide-react';

interface ChatAssistantProps {
  language: Language;
  report?: RestorationReport | null;
  onUpdateReport?: (report: RestorationReport) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ language, report, onUpdateReport }) => {
  const t = TRANSLATIONS[language];
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: report ? TRANSLATIONS[language].chatProjWelcome : TRANSLATIONS[language].chatWelcome, timestamp: Date.now() }
  ]);

  useEffect(() => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length === 1 && newMessages[0].role === 'model') {
        newMessages[0].text = report ? t.chatProjWelcome : t.chatWelcome;
      }
      return newMessages;
    });
  }, [language, report, t.chatProjWelcome, t.chatWelcome]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: inputValue, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    await logUserAction('chat_message', { message_length: userMsg.text.length, has_report: !!report });

    try {
      const response = await chatWithExpert(messages, inputValue, language, report);
      const _text = response.text || t.chatProjUpdated;
      const modelMsg: ChatMessage = { role: 'model', text: _text, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
      
      if (response.updatedReport && onUpdateReport) {
        onUpdateReport(response.updatedReport);
      }
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = { role: 'model', text: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const generalHints = [t.chatHint1, t.chatHint2, t.chatHint3];
  const projectHints = language === 'uk' 
    ? ["Які альтернативні матеріали можна використати?", "Чи можна здешевити ці роботи?", "Як безпечно зберігати цей об'єкт?"]
    : language === 'pl'
    ? ["Jakie alternatywne materiały można wykorzystać?", "Czy można obniżyć koszty tych prac?", "Jak bezpiecznie przechowywać ten obiekt?"]
    : ["What alternative materials can be used?", "Can we reduce the cost of these works?", "How to safely store this object?"];
  
  const quickHints = report ? projectHints : generalHints;

  return (
    <div className="flex flex-col h-full bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-white text-lg">{t.tabChat}</h3>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1">
              <Sparkles size={10} /> {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/20 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-lg text-sm leading-relaxed backdrop-blur-sm
              ${msg.role === 'user' 
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-none border border-white/10' 
                : 'bg-white/10 border border-white/5 text-slate-200 rounded-tl-none'}
            `}>
              {msg.text.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
              ))}
              <div className={`text-[10px] mt-2 opacity-40 font-mono ${msg.role === 'user' ? 'text-right' : ''}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="flex flex-wrap gap-2 mb-4">
          {quickHints.map((hint, i) => (
            <button 
              key={i}
              onClick={() => { setInputValue(hint); }}
              className="px-3 py-1 bg-white/5 text-slate-300 text-xs rounded-full border border-white/10 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm"
            >
              {hint}
            </button>
          ))}
        </div>
        <div className="relative flex items-center gap-2">
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t.chatPlaceholder}
            className="w-full pl-5 pr-14 py-4 bg-black/30 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none resize-none backdrop-blur-sm transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`absolute right-2 p-2 rounded-xl transition-all ${
              !inputValue.trim() || isLoading ? 'text-slate-600' : 'text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
