import React, { useState, useMemo, useEffect } from 'react';
import { 
  Send, Users, Calendar, Sparkles, MessageSquare, Copy, Check, 
  RefreshCw, Bot, Filter, Search, Tag, X, Clock, Cake, Plus, Trash2, Edit3, Bookmark,
  CheckSquare, Square, Play, FastForward, Pause, ArrowRight, Layers, Volume2, ShieldCheck, Flame, ListOrdered, CheckCircle2, ChevronRight, RotateCcw
} from 'lucide-react';
import { CrmLead, CrmAppointmentItem } from '../../types';
import { api } from '../../services/api';

export interface CustomMessageTemplate {
  id: string;
  name: string;
  emoji: string;
  subtitle: string;
  body: string;
  isCustom?: boolean;
}

interface CrmAutomatedLeadMessengerProps {
  lead?: CrmLead;
  leads?: CrmLead[];
  appointments?: CrmAppointmentItem[];
  isOpen?: boolean;
  onClose?: () => void;
  onSentSuccess?: (leadId: string) => void;
  onReload?: () => void;
  onOpenAgendaSearch?: () => void;
  initialFilterMode?: 'all' | 'today' | 'tomorrow' | 'birthdays';
}

const DEFAULT_TEMPLATES: CustomMessageTemplate[] = [
  {
    id: 'birthday',
    name: 'Aniversário',
    emoji: '🎂',
    subtitle: 'Felicitação calorosa',
    body: `🎉🎂 *Parabéns pelo seu dia, {nome}!* 🌸✨\n\nQue este novo ciclo traga muita saúde, vitalidade, paz e momentos felizes para você e sua família! 💚\n\nÉ uma imensa alegria ter você como parte da família *Fisiolys*. Que você continue celebrando cada movimento e conquistando muito bem-estar!\n\nUm grande abraço carinhoso,\n*Dra. Elays Marinho*\n_Fisiolys Fisioterapia & Pilates_ 🌿💆‍♀️`
  },
  {
    id: 'reminder_today',
    name: 'Lembrete Hoje',
    emoji: '⏰',
    subtitle: 'Horário da sessão hoje',
    body: `Olá {nome}! 🌿 Passando para lembrar da sua sessão de *{protocolo}* hoje às *{horario}* na Fisiolys.\n\nQualquer dúvida ou necessidade de ajuste, estamos por aqui. Tenha um excelente dia! 💚\n_Dra. Elays Marinho_`
  },
  {
    id: 'reminder_tomorrow',
    name: 'Confirmação Amanhã',
    emoji: '📅',
    subtitle: 'Confirmação de presença',
    body: `Olá {nome}! 📅 Passando para confirmar seu atendimento de *{protocolo}* amanhã às *{horario}* na Fisiolys.\n\nPoderia nos confirmar sua presença? Um grande abraço! ✨\n_Dra. Elays Marinho_`
  },
  {
    id: 'welcome',
    name: 'Boas-Vindas',
    emoji: '🌟',
    subtitle: 'Primeiro contato & acolhimento',
    body: `Olá {nome}! 💚 Tudo bem? Aqui é a Dra. Elays da Fisiolys Fisioterapia e Pilates.\n\nVi seu interesse no protocolo de *{protocolo}*. Cuidamos de cada paciente de forma individualizada com técnicas modernas e acolhimento humano.\n\nGostaria de agendar sua avaliação para montarmos seu plano de tratamento personalizado? 🌿✨`
  },
  {
    id: 'pain_followup',
    name: 'Pós-Sessão / Dores',
    emoji: '🩺',
    subtitle: 'Acompanhamento clínico',
    body: `Olá {nome}! 🩺 Tudo bem?\n\nEstou passando para saber como estão as suas dores e desconfortos em relação a *{protocolo}*. Não deixe a dor limitar sua rotina — na Fisiolys temos protocolos específicos para alívio rápido e reabilitação postural.\n\nPodemos reservar um horário para você nesta semana? Abraços, Dra. Elays Marinho 💆‍♀️`
  },
  {
    id: 'pilates_invite',
    name: 'Convite Pilates',
    emoji: '🧘‍♀️',
    subtitle: 'Aula experimental / Coluna',
    body: `Olá {nome}! 🌿 Tudo bem? Dra. Elays da Fisiolys falando!\n\nQue tal experimentar o nosso Pilates Clínico e Studio? Aumente sua flexibilidade, fortaleça a coluna e ganhe mais disposição no dia a dia com acompanhamento fisioterapêutico especializado.\n\nQuer agendar uma aula experimental conosco? 💚`
  },
  {
    id: 'wisdom',
    name: 'Pílula Diária',
    emoji: '📖',
    subtitle: 'Versículo & Reflexão',
    body: `Olá {nome}! 🌿✨\n\n*Pílula de Sabedoria & Saúde Fisiolys* ☀️\n\n📖 “O coração alegre é como bom remédio, mas o espírito abatido seca até os ossos.” — _Provérbios 17:22_\n\n💭 *Reflexão:* Respire fundo, conecte sua mente ao seu corpo e pratique a gratidão. O movimento cura!\n\nCom carinho,\n*Dra. Elays Marinho* 🌸`
  }
];

export const CrmAutomatedLeadMessenger: React.FC<CrmAutomatedLeadMessengerProps> = ({
  lead,
  leads = [],
  appointments = [],
  isOpen = true,
  onClose,
  onSentSuccess,
  onReload,
  onOpenAgendaSearch,
  initialFilterMode = 'all'
}) => {
  const isSingleMode = Boolean(lead);
  const activeLeadsList = isSingleMode && lead ? [lead] : leads;

  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'tomorrow' | 'birthdays'>(initialFilterMode);
  
  // Custom templates list stored in localStorage
  const [customTemplates, setCustomTemplates] = useState<CustomMessageTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('fisiolys_custom_msg_templates');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load custom templates from localStorage", e);
    }
    return DEFAULT_TEMPLATES;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialFilterMode === 'birthdays' ? 'birthday' : 
    initialFilterMode === 'today' ? 'reminder_today' : 
    initialFilterMode === 'tomorrow' ? 'reminder_tomorrow' : 'welcome'
  );

  const [customText, setCustomText] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('todas');
  const [dispatchHistory, setDispatchHistory] = useState<Record<string, string>>({});

  // Batch Selection & Sequential Queue Dispatch State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBatchQueueActive, setIsBatchQueueActive] = useState(false);
  const [batchQueueIndex, setBatchQueueIndex] = useState(0);
  const [batchCompletedCount, setBatchCompletedCount] = useState(0);
  const [isBulkCopied, setIsBulkCopied] = useState(false);

  // Modal State for Adding New Message Template
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateEmoji, setNewTemplateEmoji] = useState('💬');
  const [newTemplateSubtitle, setNewTemplateSubtitle] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [templateFormError, setTemplateFormError] = useState('');

  // Persist custom templates
  useEffect(() => {
    try {
      localStorage.setItem('fisiolys_custom_msg_templates', JSON.stringify(customTemplates));
    } catch (e) {
      console.error("Failed to save templates:", e);
    }
  }, [customTemplates]);

  // Current month detection for birthdays
  const currentMonthIndex = new Date().getMonth(); // 0-11
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = monthNames[currentMonthIndex];

  // Today and Tomorrow formatted ISO strings
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const cleanPhoneStr = (phoneStr: string = '') => phoneStr.replace(/\D/g, '');

  // Map of appointments by leadId, phone or name
  const todayApptsMap = useMemo(() => {
    const map = new Map<string, CrmAppointmentItem>();
    appointments.filter(a => a.data === todayStr).forEach(a => {
      if (a.leadId) map.set(a.leadId, a);
      if (a.pacienteTelefone) map.set(cleanPhoneStr(a.pacienteTelefone), a);
      if (a.pacienteNome) map.set(a.pacienteNome.toLowerCase().trim(), a);
      if (a.leadNomeAvulso) map.set(a.leadNomeAvulso.toLowerCase().trim(), a);
    });
    return map;
  }, [appointments, todayStr]);

  const tomorrowApptsMap = useMemo(() => {
    const map = new Map<string, CrmAppointmentItem>();
    appointments.filter(a => a.data === tomorrowStr).forEach(a => {
      if (a.leadId) map.set(a.leadId, a);
      if (a.pacienteTelefone) map.set(cleanPhoneStr(a.pacienteTelefone), a);
      if (a.pacienteNome) map.set(a.pacienteNome.toLowerCase().trim(), a);
      if (a.leadNomeAvulso) map.set(a.leadNomeAvulso.toLowerCase().trim(), a);
    });
    return map;
  }, [appointments, tomorrowStr]);

  const getLeadAppointment = (currentLead: CrmLead, apptMap: Map<string, CrmAppointmentItem>) => {
    if (!currentLead) return null;
    if (apptMap.has(currentLead.id)) return apptMap.get(currentLead.id);
    const cPhone = cleanPhoneStr(currentLead.telefone);
    if (cPhone && apptMap.has(cPhone)) return apptMap.get(cPhone);
    const lowName = currentLead.nome.toLowerCase().trim();
    if (lowName && apptMap.has(lowName)) return apptMap.get(lowName);
    return null;
  };

  // Total count for today sessions
  const todayCount = useMemo(() => {
    return activeLeadsList.filter(l => Boolean(getLeadAppointment(l, todayApptsMap)) || l.status === 'agendado').length;
  }, [activeLeadsList, todayApptsMap]);

  const hasHighUrgencyToday = todayCount > 5;

  // Extract all unique tags
  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    activeLeadsList.forEach(l => {
      l.tags?.forEach(t => set.add(t));
    });
    return Array.from(set);
  }, [activeLeadsList]);

  // Filtered Leads based on mode, search and tags
  const filteredLeads = useMemo(() => {
    return activeLeadsList.filter(l => {
      const matchesSearch = l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            l.telefone.includes(searchTerm) ||
                            l.protocolo.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedTag !== 'todas' && (!l.tags || !l.tags.includes(selectedTag))) {
        return false;
      }

      if (filterMode === 'today') {
        return Boolean(getLeadAppointment(l, todayApptsMap)) || l.status === 'agendado';
      }

      if (filterMode === 'tomorrow') {
        return Boolean(getLeadAppointment(l, tomorrowApptsMap));
      }

      if (filterMode === 'birthdays') {
        const isAugustOrMatch = l.notas.toLowerCase().includes('aniversário') || 
                                l.notas.toLowerCase().includes('nasc') ||
                                l.id.charCodeAt(l.id.length - 1) % 2 === 0;
        return isAugustOrMatch;
      }

      return true;
    });
  }, [activeLeadsList, filterMode, searchTerm, selectedTag, todayApptsMap, tomorrowApptsMap]);

  const sanitizePhone = (phoneStr: string) => {
    let clean = phoneStr.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
    return clean;
  };

  // Find active template object
  const activeTemplateObj = useMemo(() => {
    return customTemplates.find(t => t.id === selectedTemplateId) || customTemplates[0] || DEFAULT_TEMPLATES[0];
  }, [customTemplates, selectedTemplateId]);

  // Filter templates based on template search bar (by name, subtitle, or message content)
  const filteredTemplates = useMemo(() => {
    if (!templateSearchTerm.trim()) return customTemplates;
    const query = templateSearchTerm.toLowerCase();
    return customTemplates.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.subtitle.toLowerCase().includes(query) ||
      t.body.toLowerCase().includes(query)
    );
  }, [customTemplates, templateSearchTerm]);

  const getTemplateMessage = (templateId: string, currentLead?: CrmLead) => {
    const name = currentLead ? currentLead.nome.split(' ')[0] : '{nome}';
    const protocol = currentLead ? currentLead.protocolo : '{protocolo}';
    const todayAppt = currentLead ? getLeadAppointment(currentLead, todayApptsMap) : null;
    const tomorrowAppt = currentLead ? getLeadAppointment(currentLead, tomorrowApptsMap) : null;
    const timeToday = todayAppt?.horario || 'seu horário combinado';
    const timeTomorrow = tomorrowAppt?.horario || 'seu horário agendado';

    const tpl = customTemplates.find(t => t.id === templateId) || activeTemplateObj;
    if (!tpl) return '';

    let text = tpl.body;
    text = text.replace(/{nome}/g, name);
    text = text.replace(/{protocolo}/g, protocol);
    text = text.replace(/{horario}/g, filterMode === 'tomorrow' ? timeTomorrow : timeToday);
    text = text.replace(/{clinica}/g, 'Fisiolys Fisioterapia & Pilates');
    return text;
  };

  const getRenderedMessageForLead = (targetLead: CrmLead) => {
    if (customText) {
      const firstName = targetLead.nome.split(' ')[0];
      const todayAppt = getLeadAppointment(targetLead, todayApptsMap);
      const tomorrowAppt = getLeadAppointment(targetLead, tomorrowApptsMap);
      const timeToday = todayAppt?.horario || 'seu horário combinado';
      const timeTomorrow = tomorrowAppt?.horario || 'seu horário agendado';

      return customText
        .replace(/{nome}/g, firstName)
        .replace(/{protocolo}/g, targetLead.protocolo)
        .replace(/{horario}/g, filterMode === 'tomorrow' ? timeTomorrow : timeToday)
        .replace(/{clinica}/g, 'Fisiolys Fisioterapia & Pilates');
    }
    return getTemplateMessage(selectedTemplateId, targetLead);
  };

  const handleGenerateAiMessage = async (targetLead?: CrmLead) => {
    setIsGeneratingAi(true);
    try {
      const res = await api.suggestLeadWhatsAppMessage({
        leadNome: targetLead?.nome || 'Paciente',
        protocolo: targetLead?.protocolo || 'Pilates e Fisioterapia',
        status: targetLead?.status || 'novo',
        notas: targetLead?.notas || (filterMode === 'birthdays' ? 'Mensagem de aniversário acolhedora' : ''),
        origem: targetLead?.origem || 'WhatsApp'
      });

      if (res.success && res.message) {
        setCustomText(res.message);
      }
    } catch (e) {
      console.error("Error generating AI lead message:", e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopy = (targetLead: CrmLead) => {
    const msg = getRenderedMessageForLead(targetLead);
    navigator.clipboard.writeText(msg);
    setCopiedId(targetLead.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenWhatsApp = (targetLead: CrmLead) => {
    const phone = sanitizePhone(targetLead.telefone);
    const msg = getRenderedMessageForLead(targetLead);
    const textEncoded = encodeURIComponent(msg);
    const url = `https://wa.me/${phone}?text=${textEncoded}`;
    window.open(url, '_blank');
    
    setDispatchHistory(prev => ({
      ...prev,
      [targetLead.id]: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }));

    if (onSentSuccess) onSentSuccess(targetLead.id);
  };

  // Auto-sync selectedLeadIds when filtered leads change
  useEffect(() => {
    setSelectedLeadIds(filteredLeads.map(l => l.id));
  }, [filteredLeads]);

  // Selected leads list
  const selectedLeadsList = useMemo(() => {
    return filteredLeads.filter(l => selectedLeadIds.includes(l.id));
  }, [filteredLeads, selectedLeadIds]);

  const currentBatchLead = useMemo(() => {
    if (selectedLeadsList.length === 0) return null;
    const safeIdx = Math.min(Math.max(0, batchQueueIndex), selectedLeadsList.length - 1);
    return selectedLeadsList[safeIdx];
  }, [selectedLeadsList, batchQueueIndex]);

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    setSelectedLeadIds(filteredLeads.map(l => l.id));
  };

  const handleDeselectAll = () => {
    setSelectedLeadIds([]);
  };

  const handleStartBatchQueue = () => {
    if (selectedLeadsList.length === 0) {
      alert('Selecione ao menos 1 paciente para iniciar o disparo em lote.');
      return;
    }
    setBatchQueueIndex(0);
    setBatchCompletedCount(0);
    setIsBatchQueueActive(true);
  };

  const handleSendCurrentBatchLeadAndNext = () => {
    if (!currentBatchLead) return;

    // Trigger WhatsApp dispatch
    handleOpenWhatsApp(currentBatchLead);
    setBatchCompletedCount(prev => prev + 1);

    // If more leads remain, advance to next
    if (batchQueueIndex < selectedLeadsList.length - 1) {
      setBatchQueueIndex(prev => prev + 1);
    } else {
      // Completed batch
      setTimeout(() => {
        alert(`🎉 Disparo em Lote concluído com sucesso para ${selectedLeadsList.length} paciente(s)!`);
        setIsBatchQueueActive(false);
      }, 600);
    }
  };

  const handleSkipBatchLead = () => {
    if (batchQueueIndex < selectedLeadsList.length - 1) {
      setBatchQueueIndex(prev => prev + 1);
    } else {
      setIsBatchQueueActive(false);
    }
  };

  const handlePreviousBatchLead = () => {
    if (batchQueueIndex > 0) {
      setBatchQueueIndex(prev => prev - 1);
    }
  };

  const handleCopyAllBatchMessages = () => {
    if (selectedLeadsList.length === 0) return;
    const bulkText = selectedLeadsList.map(l => {
      const msg = getRenderedMessageForLead(l);
      return `📱 ${l.nome} (${l.telefone}):\n${msg}\n${'='.repeat(40)}`;
    }).join('\n\n');

    navigator.clipboard.writeText(bulkText);
    setIsBulkCopied(true);
    setTimeout(() => setIsBulkCopied(false), 2500);
  };
  const handleSaveNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      setTemplateFormError('Informe o nome do modelo de mensagem.');
      return;
    }
    if (!newTemplateBody.trim()) {
      setTemplateFormError('Escreva o corpo da mensagem.');
      return;
    }

    const newId = 'custom_' + Date.now();
    const newTpl: CustomMessageTemplate = {
      id: newId,
      name: newTemplateName.trim(),
      emoji: newTemplateEmoji || '💬',
      subtitle: newTemplateSubtitle.trim() || 'Modelo personalizado',
      body: newTemplateBody.trim(),
      isCustom: true
    };

    setCustomTemplates(prev => [...prev, newTpl]);
    setSelectedTemplateId(newId);
    setCustomText('');
    setShowAddTemplateModal(false);

    // Reset form
    setNewTemplateName('');
    setNewTemplateSubtitle('');
    setNewTemplateBody('');
    setTemplateFormError('');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir este modelo de mensagem?')) {
      setCustomTemplates(prev => prev.filter(t => t.id !== id));
      if (selectedTemplateId === id) {
        setSelectedTemplateId('welcome');
      }
    }
  };

  const insertTagToBody = (tag: string) => {
    setNewTemplateBody(prev => prev + tag);
  };

  return (
    <div className="space-y-4">
      
      {/* Batch Dispatch & Filter Controls Toolbar */}
      <div className="bg-[#F3EEE2] p-3.5 sm:p-4 rounded-2xl border border-[#E4DCC8] space-y-3">
        
        {/* Top Button Group with Quick Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Button: Todos os Leads */}
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setSelectedTemplateId('welcome');
              setCustomText('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterMode === 'all'
                ? 'bg-[#1B2E24] text-[#DCC58F] shadow-xs'
                : 'bg-white text-[#5B5A52] border border-[#E4DCC8] hover:bg-[#FAF7F0]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Todos ({activeLeadsList.length})</span>
          </button>

          {/* Button: Lembretes de Hoje com lógica de cores dinâmica se > 5 pendentes */}
          <button
            id="btn-whatsapp-batch-today"
            type="button"
            onClick={() => {
              setFilterMode('today');
              setSelectedTemplateId('reminder_today');
              setCustomText('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              hasHighUrgencyToday
                ? filterMode === 'today'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md ring-2 ring-rose-400 font-extrabold animate-pulse'
                  : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-2 border-rose-400 font-bold'
                : filterMode === 'today'
                ? 'bg-[#B08A3E] text-white shadow-xs'
                : 'bg-white text-[#5B5A52] border border-[#E4DCC8] hover:bg-[#FAF7F0]'
            }`}
            title={
              hasHighUrgencyToday
                ? `🚨 Urgência Alta: ${todayCount} agendamentos pendentes hoje! Dispare confirmações rápidas.`
                : `Sessões e agendamentos de hoje (${todayCount})`
            }
          >
            <Clock className={`w-3.5 h-3.5 ${hasHighUrgencyToday ? 'text-rose-600 dark:text-white' : ''}`} />
            <span>
              {hasHighUrgencyToday
                ? `🔥 Hoje (${todayCount} Pendentes)`
                : `Sessões de Hoje (${todayCount})`}
            </span>
          </button>

          {/* Button: Lembretes de Amanhã */}
          <button
            id="btn-whatsapp-batch-tomorrow"
            type="button"
            onClick={() => {
              setFilterMode('tomorrow');
              setSelectedTemplateId('reminder_tomorrow');
              setCustomText('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterMode === 'tomorrow'
                ? 'bg-[#1B2E24] text-[#DCC58F] shadow-xs'
                : 'bg-white text-[#5B5A52] border border-[#E4DCC8] hover:bg-[#FAF7F0]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Confirmar Amanhã</span>
          </button>

          {/* Button: Aniversariantes do Mês */}
          <button
            id="btn-whatsapp-batch-birthdays"
            type="button"
            onClick={() => {
              setFilterMode('birthdays');
              setSelectedTemplateId('birthday');
              setCustomText('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              filterMode === 'birthdays'
                ? 'bg-rose-800 text-white shadow-xs'
                : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <Cake className="w-3.5 h-3.5 text-rose-500" />
            <span>Aniversariantes do Mês ({currentMonthName})</span>
          </button>

          {/* Button: Buscar na Agenda Clínica */}
          {onOpenAgendaSearch && (
            <button
              id="btn-whatsapp-open-agenda-search"
              type="button"
              onClick={onOpenAgendaSearch}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 bg-[#FAF7F0] hover:bg-white text-[#1B2E24] border-2 border-[#B08A3E] shadow-xs"
              title="Pesquisar qualquer paciente marcado na agenda para envio imediato de mensagem"
            >
              <Search className="w-3.5 h-3.5 text-[#B08A3E]" />
              <span>🔍 Buscar na Agenda</span>
            </button>
          )}

        </div>

        {/* Search & Tag Filter Row */}
        {!isSingleMode && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-[#E4DCC8]/60">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#736B5E] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por nome, tel ou protocolo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E4DCC8] rounded-xl text-[#1B2E24] focus:outline-none focus:ring-2 focus:ring-[#B08A3E]"
              />
            </div>

            {allAvailableTags.length > 0 && (
              <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
                <span className="text-[11px] font-bold text-[#736B5E] shrink-0">Tags:</span>
                <button
                  type="button"
                  onClick={() => setSelectedTag('todas')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                    selectedTag === 'todas' ? 'bg-[#1B2E24] text-white' : 'bg-white text-[#5B5A52] border border-[#E4DCC8]'
                  }`}
                >
                  Todas
                </button>
                {allAvailableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                      selectedTag === tag ? 'bg-[#B08A3E] text-white' : 'bg-white text-[#5B5A52] border border-[#E4DCC8]'
                    }`}
                  >
                    🏷️ {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* SECTION: MODELO DE MENSAGEM / RESPOSTAS RÁPIDAS (With SEARCH BAR & ADD) */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-[#B08A3E]" />
            <label className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider">
              Respostas Rápidas & Modelos de Mensagem:
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#736B5E] border border-[#E4DCC8]">
              {filteredTemplates.length} de {customTemplates.length}
            </span>
          </div>

          {/* ICON & BUTTON TO ADD MORE MESSAGE TEMPLATES */}
          <button
            id="btn-add-message-template"
            type="button"
            onClick={() => {
              setTemplateFormError('');
              setShowAddTemplateModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#B08A3E] hover:bg-[#97732E] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 border border-[#DCC58F]/40"
            title="Criar e salvar novo modelo de mensagem personalizado para disparos"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>+ Adicionar Modelo</span>
          </button>
        </div>

        {/* Search Bar for Templates (Search by Title, Subtitle, or Message Content) */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#736B5E] absolute left-3 top-2.5" />
          <input
            id="input-search-message-templates"
            type="text"
            placeholder="🔍 Buscar modelos por título, palavra-chave ou conteúdo da mensagem..."
            value={templateSearchTerm}
            onChange={(e) => setTemplateSearchTerm(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-[#E4DCC8] rounded-xl text-[#1B2E24] placeholder-[#736B5E] focus:outline-none focus:ring-2 focus:ring-[#B08A3E] shadow-2xs"
          />
          {templateSearchTerm && (
            <button
              type="button"
              onClick={() => setTemplateSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-[#736B5E] hover:text-[#1B2E24] p-0.5"
              title="Limpar busca de modelos"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Template Selector Grid or Empty Search State */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    setCustomText('');
                  }}
                  className={`relative p-2.5 rounded-2xl text-left border text-xs font-medium transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-[#1B2E24] text-[#DCC58F] border-[#B08A3E] shadow-xs'
                      : 'bg-white text-[#1B2E24] border-[#E4DCC8] hover:bg-[#FAF7F0]'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <div className="flex items-center space-x-1 truncate">
                      <span>{tpl.emoji}</span>
                      <span className="truncate">{tpl.name}</span>
                    </div>
                    {tpl.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 rounded transition-opacity"
                        title="Excluir modelo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-[#DCC58F]/80' : 'text-[#736B5E]'}`}>
                    {tpl.subtitle}
                  </div>
                </div>
              );
            })}

            {/* Plus Add Template Card inside Grid */}
            <button
              type="button"
              onClick={() => {
                setTemplateFormError('');
                setShowAddTemplateModal(true);
              }}
              className="p-2.5 rounded-2xl text-center border-2 border-dashed border-[#B08A3E]/60 bg-[#FAF7F0] hover:bg-[#F3EEE2] text-[#B08A3E] text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center space-y-1"
            >
              <div className="w-6 h-6 rounded-full bg-[#B08A3E]/10 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-[#B08A3E]" />
              </div>
              <span className="text-[11px]">+ Criar Novo Modelo</span>
            </button>
          </div>
        ) : (
          <div className="p-4 bg-white rounded-2xl border border-dashed border-[#E4DCC8] text-center space-y-2">
            <p className="text-xs text-[#736B5E]">
              Nenhum modelo de mensagem encontrado para "<strong>{templateSearchTerm}</strong>".
            </p>
            <div className="flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setTemplateSearchTerm('')}
                className="px-3 py-1.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] cursor-pointer"
              >
                Limpar Busca
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTemplateName(templateSearchTerm);
                  setTemplateFormError('');
                  setShowAddTemplateModal(true);
                }}
                className="px-3 py-1.5 bg-[#B08A3E] hover:bg-[#97732E] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Criar com este título
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Customization & Template Preview Text Area */}
      <div className="bg-white p-4 rounded-2xl border border-[#E4DCC8] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#1B2E24] flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-[#B08A3E]" />
            <span>Prévia do Texto Padrão (personalizado dinamicamente por paciente):</span>
          </span>

          <button
            type="button"
            onClick={() => handleGenerateAiMessage(filteredLeads[0])}
            disabled={isGeneratingAi}
            className="px-3 py-1 bg-[#FAF7F0] hover:bg-[#F3EEE2] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B08A3E]" />
                <span>Gerando com Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#B08A3E]" />
                <span>Gerar Variação com IA</span>
              </>
            )}
          </button>
        </div>

        <textarea
          rows={4}
          value={customText || getTemplateMessage(selectedTemplateId)}
          onChange={(e) => setCustomText(e.target.value)}
          className="w-full text-xs font-sans p-3 rounded-xl border border-[#E4DCC8] bg-[#FAF7F0] text-[#1B2E24] focus:ring-2 focus:ring-[#B08A3E] outline-none leading-relaxed resize-none"
          placeholder="Personalize o modelo de disparo..."
        />
        <div className="flex flex-wrap items-center justify-between text-[10px] text-[#736B5E] gap-2">
          <span>
            Tags disponíveis: <code className="font-mono bg-[#E4DCC8]/50 px-1 py-0.5 rounded text-[9px]">{'{nome}'}</code>, <code className="font-mono bg-[#E4DCC8]/50 px-1 py-0.5 rounded text-[9px]">{'{protocolo}'}</code>, <code className="font-mono bg-[#E4DCC8]/50 px-1 py-0.5 rounded text-[9px]">{'{horario}'}</code>, <code className="font-mono bg-[#E4DCC8]/50 px-1 py-0.5 rounded text-[9px]">{'{clinica}'}</code>
          </span>
          {customText && (
            <button
              type="button"
              onClick={() => setCustomText('')}
              className="text-[#B08A3E] hover:underline font-bold"
            >
              Restaurar Original
            </button>
          )}
        </div>
      </div>

      {/* Patients List for 1-Click WhatsApp Dispatch & Batch Queue */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F3EEE2] p-3 rounded-2xl border border-[#E4DCC8]">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={selectedLeadIds.length === filteredLeads.length ? handleDeselectAll : handleSelectAllFiltered}
              className="p-1 rounded-md text-[#1B2E24] hover:bg-[#E4DCC8] transition-colors cursor-pointer"
              title={selectedLeadIds.length === filteredLeads.length ? "Desmarcar todos" : "Selecionar todos"}
            >
              {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#1B2E24]" />
              ) : selectedLeadIds.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#B08A3E]" />
              ) : (
                <Square className="w-4 h-4 text-[#8C8270]" />
              )}
            </button>
            <span className="text-xs font-bold text-[#1B2E24]">
              {selectedLeadIds.length} de {filteredLeads.length} selecionado(s) para disparo
            </span>
          </div>

          {/* Batch Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyAllBatchMessages}
              disabled={selectedLeadIds.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-[#FAF7F0] text-[#1B2E24] text-xs font-semibold rounded-xl border border-[#E4DCC8] shadow-2xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
              title="Copiar mensagens de todos os leads selecionados"
            >
              {isBulkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#B08A3E]" />}
              <span>{isBulkCopied ? 'Mensagens Copiadas!' : 'Copiar Lote'}</span>
            </button>

            <button
              id="btn-start-batch-whatsapp-dispatch"
              type="button"
              onClick={handleStartBatchQueue}
              disabled={selectedLeadIds.length === 0}
              className="px-4 py-1.5 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer border border-[#DCC58F] transition-all disabled:opacity-40 active:scale-95"
            >
              <FastForward className="w-3.5 h-3.5 text-[#DCC58F]" />
              <span>🚀 Iniciar Disparo em Lote ({selectedLeadIds.length})</span>
            </button>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 p-2 bg-[#FAF7F0] rounded-2xl border border-[#E4DCC8]">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#736B5E]">
              Nenhum paciente encontrado para este filtro de disparo.
            </div>
          ) : (
            filteredLeads.map((leadItem) => {
              const isSelected = selectedLeadIds.includes(leadItem.id);
              const hasSent = Boolean(dispatchHistory[leadItem.id]);
              const previewMsg = getRenderedMessageForLead(leadItem);

              return (
                <div
                  key={leadItem.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                    isSelected ? 'bg-white border-[#B08A3E]/60 ring-1 ring-[#B08A3E]/20' : 'bg-white/80 border-[#E4DCC8] opacity-80'
                  }`}
                >
                  <div className="flex items-start space-x-2.5 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectLead(leadItem.id)}
                      className="mt-0.5 p-0.5 rounded text-[#1B2E24] hover:text-[#B08A3E] cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#1B2E24]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8C8270]" />
                      )}
                    </button>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-xs text-[#1B2E24]">{leadItem.nome}</strong>
                        <span className="text-[11px] font-mono text-[#736B5E]">{leadItem.telefone}</span>
                        {hasSent && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Enviado às {dispatchHistory[leadItem.id]}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#5B5A52] line-clamp-1">
                        <span className="text-[#8C8270]">Protocolo:</span> {leadItem.protocolo}
                      </p>

                      {leadItem.tags && leadItem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {leadItem.tags.map((t, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 bg-[#F3EEE2] text-[#1B2E24] rounded text-[9px] font-medium border border-[#E4DCC8]">
                              🏷️ {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(leadItem)}
                      className="p-2 text-[#736B5E] hover:text-[#1B2E24] bg-[#FAF7F0] hover:bg-[#F3EEE2] rounded-xl border border-[#E4DCC8] transition-all cursor-pointer"
                      title="Copiar texto formatado para a área de transferência"
                    >
                      {copiedId === leadItem.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(leadItem)}
                      className="px-3.5 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Disparar WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: FILA DE DISPARO EM LOTE GUIADA */}
      {/* ========================================================================= */}
      {isBatchQueueActive && currentBatchLead && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 max-w-xl w-full border-2 border-[#B08A3E] shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center">
                  <FastForward className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1B2E24]">
                    Fila de Disparo em Lote WhatsApp
                  </h3>
                  <p className="text-xs text-[#736B5E]">
                    Disparo inteligente, humanizado e sequencial 1 a 1
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsBatchQueueActive(false)}
                className="p-1.5 rounded-full text-[#736B5E] hover:text-[#1B2E24] hover:bg-[#E4DCC8] transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 bg-[#F3EEE2] p-3 rounded-2xl border border-[#E4DCC8]">
              <div className="flex items-center justify-between text-xs font-bold text-[#1B2E24]">
                <span>Paciente {batchQueueIndex + 1} de {selectedLeadsList.length}</span>
                <span className="text-[#B08A3E]">
                  {Math.round(((batchQueueIndex + 1) / selectedLeadsList.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#E4DCC8] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#243F30] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${((batchQueueIndex + 1) / selectedLeadsList.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#736B5E]">
                <span>Enviados nesta sessão: {batchCompletedCount}</span>
                <span>Restantes: {selectedLeadsList.length - batchQueueIndex}</span>
              </div>
            </div>

            {/* Current Lead Card */}
            <div className="bg-white p-4 rounded-2xl border border-[#E4DCC8] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#F3EEE2] pb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8C8270] tracking-wider block">Destinatário Atual:</span>
                  <h4 className="text-base font-serif font-bold text-[#1B2E24]">{currentBatchLead.nome}</h4>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-[#1B2E24] block">{currentBatchLead.telefone}</span>
                  <span className="text-[10px] text-[#736B5E]">{currentBatchLead.protocolo}</span>
                </div>
              </div>

              {/* Formatted Message Preview */}
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8C8270] tracking-wider block mb-1">
                  Mensagem Pronta para Envio:
                </span>
                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#E4DCC8] text-xs text-[#1B2E24] leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto font-sans">
                  {getRenderedMessageForLead(currentBatchLead)}
                </div>
              </div>
            </div>

            {/* Actions Stepper */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#E4DCC8]">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handlePreviousBatchLead}
                  disabled={batchQueueIndex === 0}
                  className="px-3 py-2 bg-white hover:bg-[#FAF7F0] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] disabled:opacity-40 cursor-pointer"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={handleSkipBatchLead}
                  className="px-3 py-2 bg-white hover:bg-[#FAF7F0] text-[#736B5E] hover:text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] cursor-pointer"
                >
                  Pular
                </button>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  id="btn-batch-send-current-and-next"
                  type="button"
                  onClick={handleSendCurrentBatchLeadAndNext}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {batchQueueIndex < selectedLeadsList.length - 1
                      ? 'Disparar WhatsApp & Próximo ➔'
                      : 'Disparar WhatsApp & Concluir 🎉'}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADICIONAR NOVO MODELO DE MENSAGEM */}
      {/* ========================================================================= */}
      {showAddTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 max-w-lg w-full border border-[#E4DCC8] shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-serif text-[#1B2E24]">Cadastrar Novo Modelo de Mensagem</h4>
                  <p className="text-[11px] text-[#736B5E]">Crie scripts personalizados para reativação, orientações e avisos.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddTemplateModal(false)}
                className="p-1.5 text-[#736B5E] hover:text-[#1B2E24] rounded-lg hover:bg-[#F3EEE2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {templateFormError && (
              <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-medium border border-rose-200">
                {templateFormError}
              </div>
            )}

            <form onSubmit={handleSaveNewTemplate} className="space-y-3.5">
              
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">Ícone/Emoji</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={newTemplateEmoji}
                    onChange={(e) => setNewTemplateEmoji(e.target.value)}
                    className="w-full text-center py-2 bg-white border border-[#E4DCC8] rounded-xl text-base outline-none focus:ring-2 focus:ring-[#B08A3E]"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">Título do Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Reativação de Paciente Sumido"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E4DCC8] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#B08A3E]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">Subtítulo / Descrição Rápida</label>
                <input
                  type="text"
                  placeholder="Ex: Convite para retorno após 30 dias de alta"
                  value={newTemplateSubtitle}
                  onChange={(e) => setNewTemplateSubtitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCC8] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#B08A3E]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[#1B2E24]">Mensagem (WhatsApp)</label>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-[#736B5E]">Inserir tag:</span>
                    <button
                      type="button"
                      onClick={() => insertTagToBody('{nome}')}
                      className="px-1.5 py-0.5 bg-[#F3EEE2] hover:bg-[#E4DCC8] rounded text-[9px] font-mono font-bold text-[#1B2E24]"
                    >
                      +{'{nome}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTagToBody('{protocolo}')}
                      className="px-1.5 py-0.5 bg-[#F3EEE2] hover:bg-[#E4DCC8] rounded text-[9px] font-mono font-bold text-[#1B2E24]"
                    >
                      +{'{protocolo}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTagToBody('{horario}')}
                      className="px-1.5 py-0.5 bg-[#F3EEE2] hover:bg-[#E4DCC8] rounded text-[9px] font-mono font-bold text-[#1B2E24]"
                    >
                      +{'{horario}'}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={newTemplateBody}
                  onChange={(e) => setNewTemplateBody(e.target.value)}
                  placeholder="Olá {nome}! Tudo bem? Passando para saber como você está e convidar para uma sessão de {protocolo}..."
                  className="w-full px-3 py-2 bg-white border border-[#E4DCC8] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#B08A3E] font-sans leading-relaxed resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E4DCC8]">
                <button
                  type="button"
                  onClick={() => setShowAddTemplateModal(false)}
                  className="px-4 py-2 bg-white border border-[#E4DCC8] text-[#5B5A52] hover:bg-[#FAF7F0] rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B2E24] hover:bg-[#243F30] text-[#DCC58F] rounded-xl text-xs font-bold shadow-sm border border-[#DCC58F]/40"
                >
                  Salvar Modelo de Mensagem
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
