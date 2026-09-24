/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import PageHeader, { btnPrimary, btnSecondary } from './PageHeader';
import { Sparkles, Send, Bot, User, Brain, MessageSquareCode, CircleHelp } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export default function GemologyAiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: "Bonjour, je suis le Dr. Aurélien GemoPhy, votre co-pilote IA de laboratoire. Je suis spécialisé en caractérisation physique des gemmes, en estimation financière de joaillerie, et en développement de scripts Python de gemmologie. Comment puis-je vous aider aujourd'hui ?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputValue;
    if (!textToSend.trim() || loading) return;

    // Add user message to history
    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const resp = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages
        })
      });

      if (!resp.ok) {
        throw new Error("Impossible de joindre le serveur d'intelligence artificielle GemoPhy.");
      }

      const data = await resp.json();
      setMessages(prev => [...prev, { role: 'model', content: data.text || "Pardon, je n'ai pas pu générer de réponse." }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: `Désolé, une erreur s'est produite lors de l'appel à l'IA : ${err?.message || "Erreur de connexion serveur"}. Assurez-vous d'avoir démarré le serveur de développement.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const PROMPT_HELPERS = [
    {
      title: "Différencier Rubis",
      prompt: "Comment différencier scientifiquement un rubis naturel birman d'un rubis synthétique chauffé avec remplissage de verre ?"
    },
    {
      title: "Modèle Python 4Cs",
      prompt: "Écris-moi un algorithme Python élégant et commenté pour catégoriser des diamants selon la pureté et le poids en carats."
    },
    {
      title: "Physique Optique",
      prompt: "Qu'est-ce que la biréfringence et comment m'aide-t-elle à distinguer un zircon d'un diamant d'imitation ?"
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Copilot"
        description="Assistant gemmologue IA : expertise scientifique et aide au code Python."
      />
    <div className="bg-[#121620] border border-[#212a3d] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[560px]" id="ai-assistant-tab">
      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0e1117] scrollbar-thin select-text">
        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            {/* Avatar */}
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#bda165] text-black' : 'bg-[#1e283b] text-amber-400 border border-gray-800'}`}>
              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div className={`p-3.5 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-[#bda165] text-black font-medium rounded-tr-none shadow-md' 
                : 'bg-[#181f2d] text-gray-200 border border-[#232f48] rounded-tl-none whitespace-pre-wrap'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="h-8 w-8 rounded-lg bg-[#1e283b] text-amber-400 border border-gray-800 flex items-center justify-center animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-[#181f2d] text-gray-400 border border-[#232f48] rounded-xl rounded-tl-none p-4 text-xs flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-bounce"></span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-gray-500 italic font-mono pl-1">Le Dr. GemoPhy examine la structure cristalline...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts helper pane */}
      <div className="p-3 bg-[#111520] border-t border-[#212a3d] flex flex-wrap gap-2 items-center shrink-0">
        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-bold flex items-center gap-0.5">
          <MessageSquareCode className="h-3.5 w-3.5 text-amber-600" />
          <span>Suggestions Labo :</span>
        </span>
        {PROMPT_HELPERS.map((helper, i) => (
          <button 
            key={i}
            onClick={() => handleSendMessage(undefined, helper.prompt)}
            className="px-2.5 py-1 text-[10px] bg-[#171e2c] border border-[#27354d] hover:border-amber-400/40 text-gray-300 rounded-lg transition-all text-left truncate max-w-xs"
          >
            {helper.title}
          </button>
        ))}
      </div>

      {/* Form Submit */}
      <form onSubmit={handleSendMessage} className="p-4 bg-[#171d2b] border-t border-[#212a3d] flex gap-2 shrink-0">
        <input 
          id="chat-input"
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Posez une question d'identification, d'estimation, ou demandez du code Python..."
          className="flex-1 px-4 py-2.5 text-xs bg-[#0e1117] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c] placeholder-gray-500"
        />
        <button 
          id="btn-send-chat"
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="px-4 bg-[#bda165] hover:bg-[#cca96e] text-black disabled:opacity-30 rounded-lg flex items-center justify-center transition-colors"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
    </div>
  );
}
