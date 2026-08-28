import React, { useState } from 'react';
import { 
  Heart, Sparkles, BookOpen, Send, Check, Copy, X, Sun, 
  MessageCircle, RefreshCw, Users, CheckSquare, Search, Flame
} from 'lucide-react';
import { CrmLead } from '../../types';
import { api } from '../../services/api';

interface CrmDailyWisdomModalProps {
  leads: CrmLead[];
  isOpen: boolean;
  onClose: () => void;
}

interface WisdomPill {
  id: string;
  theme: string;
  verse: string;
  reference: string;
  reflection: string;
}

const DEFAULT_WISDOM_PILLS: WisdomPill[] = [
  {
    id: 'pill-1',
    theme: 'Cura, Restauração e Saúde',
    verse: '“Porque eu te restaurarei a saúde e curarei as tuas feridas, diz o Senhor.”',
    reference: 'Jeremias 30:17',
    reflection: 'Cada dia é uma nova oportunidade de cuidar do templo que Deus lhe deu. Continue firme nos seus exercícios e reabilitação!'
  },
  {
    id: 'pill-2',
    theme: 'Força, Ânimo e Coragem',
    verse: '“Tudo posso naquele que me fortalece.”',
    reference: 'Filipenses 4:13',
    reflection: 'A sua força não vem apenas dos seus músculos, mas da determinação em dar o seu melhor a cada movimento. Tenha um dia abençoado!'
  },
  {
    id: 'pill-3',
    theme: 'Paz, Serenidade e Equilíbrio',
    verse: '“O coração alegre é como bom remédio, mas o espírito abatido seca até os ossos.”',
    reference: 'Provérbios 17:22',
    reflection: 'Respire fundo, conecte sua mente ao seu corpo e cultive a gratidão. O movimento cura e a paz renova as energias.'
  },
  {
    id: 'pill-4',
    theme: 'Renovação e Perseverança',
    verse: '“Os que esperam no Senhor renovarão as suas forças; subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.”',
    reference: 'Isaías 40:31',
    reflection: 'O progresso fisioterapêutico é uma jornada de paciência e consistência. Celebre cada pequena conquista de mobilidade hoje!'
  },
  {
    id: 'pill-5',
    theme: 'Cuidado e Gratidão',
    verse: '“Este é o dia que fez o Senhor; regozijemo-nos e alegremo-nos nele.”',
    reference: 'Salmos 118:24',
    reflection: 'Alongue o corpo, hidrate-se bem e mantenha a postura alinhada. Dra. Elays e toda equipe Fisiolys desejam um dia radiante de saúde para você!'
  }
];

export const CrmDailyWisdomModal: React.FC<CrmDailyWisdomModalProps> = ({
  leads,
  isOpen,
  onClose
}) => {
  const [selectedPill, setSelectedPill] = useState<WisdomPill>(DEFAULT_WISDOM_PILLS[0]);
  const [customText, setCustomText] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>(leads.map(l => l.id));
  const [patientFilter, setPatientFilter] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredPatients = leads.filter(l => 
    l.nome.toLowerCase().includes(patientFilter.toLowerCase()) ||
    l.telefone.includes(patientFilter)
  );

  const getFullMessage = (leadName = '{nome}') => {
    if (customText.trim()) {
      return customText.replace('{nome}', leadName);
    }
    return `Olá ${leadName}! 🌿✨\n\n*Pílula de Sabedoria & Saúde Fisiolys* ☀️\n\n📖 ${selectedPill.verse}\n— _${selectedPill.reference}_\n\n💭 *Reflexão do Dia:* ${selectedPill.reflection}\n\nLembre-se de cuidar do seu corpo com carinho, beber água e manter seus alongamentos em dia! 💚\n\nCom carinho,\n*Dra. Elays Marinho*\n_Fisiolys Fisioterapia e Pilates_ 🌸`;
  };

  const handleGenerateWithAi = async () => {
    setIsAiGenerating(true);
    try {
      const prompt = `Gere uma pílula de sabedoria diária para pacientes da clínica de Fisioterapia e Pilates Fisiolys (Dra. Elays Marinho). A mensagem deve conter:
1) Uma saudação calorosa e motivacional para {nome};
2) Um versículo bíblico inspirador sobre saúde, cura, ânimo ou força (com citação do livro e capítulo);
3) Uma breve reflexão prática conectando a mensagem à reabilitação física, postura e qualidade de vida;
4) Emojis gentis e assinatura da Dra. Elays Marinho / Fisiolys.`;

      const res = await api.askGeminiAssistant({
        userMessage: prompt,
        systemContext: 'Você é a assistente clínica da Dra. Elays Marinho na Fisiolys.'
      });

      if (res.reply) {
        setCustomText(res.reply);
      }
    } catch (e) {
      console.error("Error generating AI wisdom pill:", e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPatientIds.length === filteredPatients.length) {
      setSelectedPatientIds([]);
    } else {
      setSelectedPatientIds(filteredPatients.map(l => l.id));
    }
  };

  const togglePatient = (id: string) => {
    setSelectedPatientIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(getFullMessage('Paciente'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToPatient = (lead: CrmLead) => {
    const rawTel = lead.telefone.replace(/\D/g, '');
    const phone = rawTel.length === 10 || rawTel.length === 11 ? `55${rawTel}` : rawTel;
    const msg = getFullMessage(lead.nome);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setDispatchStatus(`WhatsApp aberto para ${lead.nome}!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FAF7F0] rounded-3xl w-full max-w-3xl border border-[#E4DCC8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#1B2E24] text-[#FAF7F0] p-5 flex items-center justify-between border-b border-[#16251D]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCC58F]/20 text-[#DCC58F] flex items-center justify-center border border-[#B08A3E]/40">
              <Sun className="w-6 h-6 text-[#DCC58F]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold flex items-center space-x-2">
                <span>Pílula de Sabedoria Diária (Fé & Motivação)</span>
              </h3>
              <p className="text-xs text-[#C9D1C8]">
                Disparo diário de versículos bíblicos e frases motivacionais para pacientes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#C9D1C8] hover:text-white rounded-xl hover:bg-[#20372B] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Pills Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1B2E24] flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-[#B08A3E]" />
              <span>Selecione a Pílula Bíblica & Motivacional de Hoje:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_WISDOM_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setSelectedPill(pill);
                    setCustomText('');
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    selectedPill.id === pill.id && !customText
                      ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#B08A3E] shadow-sm'
                      : 'bg-white text-[#1B2E24] border-[#E4DCC8] hover:bg-[#F3EEE2]'
                  }`}
                >
                  <span className="text-xs font-bold block">{pill.theme}</span>
                  <p className="text-[11px] opacity-85 line-clamp-1 mt-0.5">{pill.verse}</p>
                  <span className="text-[10px] text-[#DCC58F] font-semibold block mt-1">{pill.reference}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Generator Action */}
          <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-[#E4DCC8]">
            <span className="text-xs text-[#5B5A52]">Criar mensagem inédita com inteligência artificial:</span>
            <button
              onClick={handleGenerateWithAi}
              disabled={isAiGenerating}
              className="px-3.5 py-1.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isAiGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B08A3E]" />
                  <span>Gerando Pílula...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#B08A3E]" />
                  <span>Gerar Nova Pílula com Gemini</span>
                </>
              )}
            </button>
          </div>

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider">
                Mensagem a ser enviada no WhatsApp:
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-[#B08A3E] font-bold hover:underline flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={customText || getFullMessage('{nome}')}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full text-xs font-sans p-3.5 rounded-2xl border border-[#E4DCC8] bg-white text-[#1B2E24] focus:ring-2 focus:ring-[#B08A3E] outline-none leading-relaxed"
              placeholder="Digite ou personalize o texto..."
            />
            <p className="text-[11px] text-[#736B5E]">
              O termo <code className="font-mono bg-[#E4DCC8]/50 px-1 py-0.5 rounded text-[10px]">{'{nome}'}</code> será automaticamente substituído pelo primeiro nome de cada paciente ao disparar.
            </p>
          </div>

          {/* Patient Selection for Daily Dispatch */}
          <div className="space-y-2 pt-2 border-t border-[#E4DCC8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#B08A3E]" />
                <span className="text-xs font-bold text-[#1B2E24]">
                  Destinatários da Clínica ({leads.length} pacientes cadastrados):
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={patientFilter}
                  onChange={(e) => setPatientFilter(e.target.value)}
                  placeholder="Buscar paciente..."
                  className="px-2.5 py-1 text-xs bg-white border border-[#E4DCC8] rounded-xl outline-none"
                />
                <button
                  onClick={toggleSelectAll}
                  className="px-2.5 py-1 text-xs bg-white border border-[#E4DCC8] font-bold rounded-xl text-[#1B2E24]"
                >
                  {selectedPatientIds.length === filteredPatients.length ? 'Desmarcar' : 'Todos'}
                </button>
              </div>
            </div>

            {/* Patients List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white rounded-2xl border border-[#E4DCC8]">
              {filteredPatients.map((lead) => {
                const isChecked = selectedPatientIds.includes(lead.id);
                return (
                  <div
                    key={lead.id}
                    className="p-2 rounded-xl flex items-center justify-between hover:bg-[#F3EEE2] transition-colors text-xs"
                  >
                    <div 
                      className="flex items-center space-x-2.5 cursor-pointer flex-1"
                      onClick={() => togglePatient(lead.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-[#1B2E24] border-[#8C8270]"
                      />
                      <div>
                        <strong className="text-[#1B2E24]">{lead.nome}</strong>
                        <span className="text-[11px] text-[#736B5E] ml-2 font-mono">{lead.telefone}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendToPatient(lead)}
                      className="px-3 py-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[11px] font-bold rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer transition-all active:scale-95"
                      title="Disparar no WhatsApp deste paciente agora"
                    >
                      <Send className="w-3 h-3" />
                      <span>Enviar no WhatsApp</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {dispatchStatus && (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{dispatchStatus}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F3EEE2] border-t border-[#E4DCC8] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E4DCC8] hover:bg-[#FAF7F0] text-[#736B5E] text-xs font-bold rounded-xl"
          >
            Fechar
          </button>

          <div className="text-xs text-[#736B5E]">
            Disparos individuais seguros e humanizados via WhatsApp Web / Mobile
          </div>
        </div>

      </div>
    </div>
  );
};
