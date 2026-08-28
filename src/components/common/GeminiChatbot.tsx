import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Brain, Bot, User, X, ChevronDown, ChevronUp, RefreshCw, MessageSquare, CheckCircle, Zap, Shield, HelpCircle } from 'lucide-react';
import { api } from '../../services/api';
import { ChatMessage } from '../../types';

interface GeminiChatbotProps {
  isOpen?: boolean;
  onClose?: () => void;
  floatingMode?: boolean;
  initialRole?: 'dra' | 'paciente' | 'lead';
  currentContext?: any;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  isOpen = true,
  onClose,
  floatingMode = false,
  initialRole = 'dra',
  currentContext,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Olá! Sou o Assistente Clínico com Inteligência Artificial da Fisiolys (Dra. Elays Marinho). Como posso te auxiliar hoje? Posso elaborar raciocínio clínico para fichas de avaliação, sugerir planos de cinesioterapia/Pilates ou tirar dúvidas sobre os protocolos da clínica.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      thinkingProcess: 'Assistente inicializado com conhecimento dos protocolos de Fisioterapia Domiciliar, Pilates Clássico, Pediátrica, ABA, Terapia Manual e Pós-Operatório.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [thinkingMode, setThinkingMode] = useState(true);
  const [userRole, setUserRole] = useState<'dra' | 'paciente'>(initialRole === 'paciente' || initialRole === 'lead' ? 'paciente' : 'dra');
  const [loading, setLoading] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleThinking = (id: string) => {
    setExpandedThinking(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const apiMessages = newHistory.map(m => ({
        role: m.sender === 'assistant' ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await api.askGeminiChat({
        messages: apiMessages,
        thinkingMode,
        userRole,
        contextData: currentContext
      });

      const botMsgId = `bot-${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'assistant',
        text: res.text || 'Não consegui processar a resposta. Tente novamente.',
        thinkingProcess: res.thinkingProcess,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      if (res.thinkingProcess) {
        setExpandedThinking(prev => ({ ...prev, [botMsgId]: true }));
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'system',
        text: 'Erro ao se comunicar com o Gemini. Verifique se o servidor está ativo ou sua conexão.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: '🧠 Hipótese: Lombalgia Aguda', prompt: 'Paciente de 45 anos, motorista, dor lombar escala 8/10 com irradiação para glúteo sem déficit neurológico. Como estruturar o raciocínio clínico e conduta na Fisiolys?' },
    { label: '🌿 Protocolo de Pilates', prompt: 'Quais os melhores exercícios no MAT Solo e aparelhos para fortalecimento de Core e estabilização lombar em pacientes pós-crise álgica?' },
    { label: '👶 Fisioterapia Pediátrica & ABA', prompt: 'Como funciona a abordagem da Fisiolys para estimulação motora lúdica e desenvolvimento neuropsicomotor infantil?' },
    { label: '📋 Tabela de Tratamentos', prompt: 'Liste os serviços, valores (como Pilates R$ 99/mês e Domiciliar R$ 150) e vantagens do Clube de Fidelidade Fisiolys.' }
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#FAF7F0] text-[#1C2420] font-sans antialiased">
      {/* Header */}
      <div className="px-4 py-3.5 bg-[#1C2420] text-[#F3F5F2] flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#B44A2E] flex items-center justify-center text-white shadow-xs">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-serif font-bold text-sm sm:text-base tracking-tight">Gemini Clínico</span>
              <span className="px-1.5 py-0.2 bg-[#DCC58F]/30 text-[#E8D8B0] text-[10px] font-mono rounded font-semibold border border-[#DCC58F]/40">
                3.7 Flash
              </span>
            </div>
            <p className="text-[11px] text-[#A2ADA5]">Raciocínio Clínico Inteligente · Fisiolys</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Thinking Toggle */}
          <button
            onClick={() => setThinkingMode(!thinkingMode)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              thinkingMode
                ? 'bg-[#2E7355] text-white border-[#3F8F6D] shadow-2xs'
                : 'bg-[#2D3833] text-[#A2ADA5] border-[#3C4A44]'
            }`}
            title={thinkingMode ? "Modo Pensamento Inteligente Ativo (Raciocínio Passo a Passo)" : "Ativar Pensamento Inteligente"}
          >
            <Brain className={`w-3 h-3 ${thinkingMode ? 'animate-pulse text-[#A5F3C6]' : ''}`} />
            <span className="hidden sm:inline">Pensamento</span>
            <span className="text-[10px] font-bold">{thinkingMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Role selector */}
          <div className="bg-[#2D3833] p-0.5 rounded-lg flex items-center text-[11px]">
            <button
              onClick={() => setUserRole('dra')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                userRole === 'dra' ? 'bg-[#FAF7F0] text-[#1C2420] font-bold' : 'text-[#A2ADA5] hover:text-white'
              }`}
              title="Visão Fisioterapeuta / Técnica"
            >
              Dra.
            </button>
            <button
              onClick={() => setUserRole('paciente')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                userRole === 'paciente' ? 'bg-[#FAF7F0] text-[#1C2420] font-bold' : 'text-[#A2ADA5] hover:text-white'
              }`}
              title="Visão Paciente / Acolhimento"
            >
              Paciente
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-[#2D3833] text-[#A2ADA5] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 bg-[#F3EEE2] border-b border-[#E4DCC8] flex items-center space-x-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[11px] font-semibold text-[#6E6A5E] shrink-0 flex items-center space-x-1 pl-1">
          <Zap className="w-3 h-3 text-[#B08A3E]" />
          <span>Atalhos:</span>
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.prompt)}
            disabled={loading}
            className="text-xs px-2.5 py-1 bg-white hover:bg-[#FAF7F0] text-[#1C2420] rounded-full border border-[#DDE3DD] whitespace-nowrap shadow-2xs transition-all cursor-pointer shrink-0 font-medium hover:border-[#B08A3E]"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center space-x-1.5 mb-1 px-1">
              <span className="text-[11px] font-semibold text-[#6B7570]">
                {msg.sender === 'user' ? 'Você' : msg.sender === 'assistant' ? 'Gemini Clínico · Fisiolys' : 'Sistema'}
              </span>
              <span className="text-[10px] text-[#8C9892] font-mono">{msg.timestamp}</span>
            </div>

            {/* Thinking Process Box if available */}
            {msg.thinkingProcess && msg.sender === 'assistant' && (
              <div className="w-full max-w-[92%] sm:max-w-[85%] mb-2 rounded-lg border border-[#D0DED4] bg-[#EAF3EC] overflow-hidden text-xs text-[#1E3B2D] shadow-2xs">
                <button
                  onClick={() => toggleThinking(msg.id)}
                  className="w-full px-3 py-1.5 flex items-center justify-between bg-[#E0EFE4] hover:bg-[#D5E8DA] font-semibold text-[11px] text-[#24543C] transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-1.5">
                    <Brain className="w-3.5 h-3.5 text-[#2E7355]" />
                    <span>Raciocínio Clínico & Biomecânico (Thinking Mode)</span>
                  </div>
                  {expandedThinking[msg.id] ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#24543C]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#24543C]" />
                  )}
                </button>
                {expandedThinking[msg.id] && (
                  <div className="p-3 border-t border-[#D0DED4] font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap bg-[#F2F8F4] text-[#1E3B2D]">
                    {msg.thinkingProcess}
                  </div>
                )}
              </div>
            )}

            {/* Main Message Bubble */}
            <div
              className={`rounded-xl px-3.5 py-2.5 max-w-[92%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed shadow-2xs whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-[#1C2420] text-[#F3F5F2] rounded-tr-xs'
                  : msg.sender === 'assistant'
                  ? 'bg-white text-[#1C2420] border border-[#E4DCC8] rounded-tl-xs'
                  : 'bg-[#FBE7DF] text-[#B44A2E] border border-[#F2C5B8] rounded-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start space-y-1.5">
            <div className="flex items-center space-x-2 px-1 text-[11px] text-[#2E7355] font-medium animate-pulse">
              <Brain className="w-3.5 h-3.5 animate-spin" />
              <span>
                {thinkingMode ? 'Processando raciocínio clínico com pensamento profundo...' : 'Gerando resposta...'}
              </span>
            </div>
            <div className="bg-white border border-[#E4DCC8] rounded-xl px-4 py-3 text-xs text-[#6B7570] flex items-center space-x-2 shadow-2xs">
              <div className="w-2 h-2 rounded-full bg-[#2E7355] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#B08A3E] animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-[#B44A2E] animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-[#8C9892] font-mono pl-1">Consultando base anatômica e protocolos Fisiolys...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-[#E4DCC8] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end space-x-2"
        >
          <div className="flex-1 bg-[#FAF7F0] border border-[#DDE3DD] focus-within:border-[#1C2420] rounded-xl p-2 transition-all">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                userRole === 'dra'
                  ? 'Ex: Paciente com dor no ombro teste de Neer positivo, sugerir protocolo...'
                  : 'Tire dúvidas sobre tratamentos, dor na coluna, Pilates e agendamento...'
              }
              className="w-full bg-transparent resize-none text-xs sm:text-sm text-[#1C2420] placeholder-[#8C9892] focus:outline-hidden leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className={`p-3 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              inputText.trim() && !loading
                ? 'bg-[#B44A2E] hover:bg-[#9B3B22] text-white shadow-sm'
                : 'bg-[#E5E0D5] text-[#A8A195] cursor-not-allowed'
            }`}
            title="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-[#8C9892] mt-1.5 px-1">
          <span>Pressione <kbd className="font-mono bg-[#FAF7F0] px-1 border rounded">Enter</kbd> para enviar</span>
          <span className="flex items-center space-x-1">
            <Shield className="w-3 h-3 text-[#2E7355]" />
            <span>Fisiolys · Altamira/PA</span>
          </span>
        </div>
      </div>
    </div>
  );

  if (floatingMode) {
    if (!isOpen) return null;
    return (
      <div className="fixed bottom-4 right-4 z-50 w-[95vw] max-w-[420px] h-[580px] max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-[#D4C8B0] flex flex-col animate-in fade-in slide-in-from-bottom-5">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-[#E4DCC8] shadow-xs flex flex-col">
      {content}
    </div>
  );
};
