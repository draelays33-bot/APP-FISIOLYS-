import React, { useState, useEffect } from 'react';
import { ClinicConfig, Appointment, WhatsAppLog, WhatsAppProvider } from '../../types';
import { api } from '../../services/api';
import {
  formatDatePtBR,
  formatPhoneMask
} from '../../utils/qrUtils';
import {
  interpolateWhatsAppTemplate,
  getWhatsAppDirectUrl,
  getWhatsAppWebUrl,
  cleanPhoneNumber,
  DEFAULT_WHATSAPP_TEMPLATES,
  DEFAULT_QUICK_REPLY_TEMPLATES,
  QuickReplyTemplate
} from '../../utils/whatsappUtils';
import {
  MessageSquare,
  Send,
  Sparkles,
  Settings,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Globe,
  Sliders,
  FileText,
  Search,
  Check,
  X,
  Play,
  RotateCcw,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  ChevronRight,
  Filter,
  Eye,
  Trash2,
  Copy,
  Plus,
  HeartHandshake
} from 'lucide-react';

interface AdminWhatsAppProps {
  clinic: ClinicConfig;
  appointments: Appointment[];
  onReload: () => void;
}

export const AdminWhatsApp: React.FC<AdminWhatsAppProps> = ({ clinic, appointments, onReload }) => {
  const [subTab, setSubTab] = useState<'disparos' | 'modelos' | 'configuracao' | 'logs'>('disparos');

  // Logs state
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Filter state for appointments
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchPatient, setSearchPatient] = useState<string>('');

  // Batch sending state
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);

  // Single message send/modal state
  const [activeModalAppt, setActiveModalAppt] = useState<Appointment | null>(null);
  const [customMsgText, setCustomMsgText] = useState<string>('');
  const [modalType, setModalType] = useState<'confirmacao' | 'lembrete_d1' | 'lembrete_d0' | 'manual'>('lembrete_d0');
  const [sendingSingle, setSendingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);

  // QUICK REPLY (Resposta Rápida com Seletor de Templates)
  const [quickReplyAppt, setQuickReplyAppt] = useState<Appointment | null>(null);
  const [quickReplyTemplates, setQuickReplyTemplates] = useState<QuickReplyTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('fisiolys_quick_replies');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_QUICK_REPLY_TEMPLATES;
  });
  const [selectedQuickReplyId, setSelectedQuickReplyId] = useState<string>('orientacoes_pre');
  const [quickReplyText, setQuickReplyText] = useState<string>('');
  const [quickReplyCategoryFilter, setQuickReplyCategoryFilter] = useState<string>('all');
  const [isCreatingCustomTemplate, setIsCreatingCustomTemplate] = useState<boolean>(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState<string>('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<'orientacao' | 'financeiro' | 'localizacao' | 'pontualidade' | 'pos_atendimento' | 'reagendamento' | 'livre'>('orientacao');
  const [newTemplateText, setNewTemplateText] = useState<string>('');
  const [quickReplySending, setQuickReplySending] = useState(false);
  const [quickReplyFeedback, setQuickReplyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle open quick reply for a specific appointment
  const handleOpenQuickReply = (appt: Appointment, initialTemplateId?: string) => {
    setQuickReplyAppt(appt);
    setQuickReplyFeedback(null);
    setIsCreatingCustomTemplate(false);

    const targetTemplateId = initialTemplateId || selectedQuickReplyId || 'orientacoes_pre';
    setSelectedQuickReplyId(targetTemplateId);

    const templateObj = quickReplyTemplates.find(t => t.id === targetTemplateId) || quickReplyTemplates[0];
    if (templateObj) {
      const interpolated = interpolateWhatsAppTemplate(templateObj.template, {
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        serviceName: appt.serviceName,
        servicePrice: appt.servicePrice,
        date: appt.date,
        time: appt.time,
        clinicName: clinic.name,
        managerName: clinic.managerName,
        address: clinic.address,
        city: clinic.city,
        paymentMethod: appt.paymentMethod
      });
      setQuickReplyText(interpolated);
    }
  };

  // Handle select template in quick reply modal
  const handleSelectQuickReplyTemplate = (template: QuickReplyTemplate) => {
    setSelectedQuickReplyId(template.id);
    if (!quickReplyAppt) return;

    const interpolated = interpolateWhatsAppTemplate(template.template, {
      patientName: quickReplyAppt.patientName,
      patientPhone: quickReplyAppt.patientPhone,
      serviceName: quickReplyAppt.serviceName,
      servicePrice: quickReplyAppt.servicePrice,
      date: quickReplyAppt.date,
      time: quickReplyAppt.time,
      clinicName: clinic.name,
      managerName: clinic.managerName,
      address: clinic.address,
      city: clinic.city,
      paymentMethod: quickReplyAppt.paymentMethod
    });
    setQuickReplyText(interpolated);
  };

  // Save new custom quick reply template
  const handleSaveNewCustomTemplate = () => {
    if (!newTemplateTitle.trim() || !newTemplateText.trim()) return;

    const newTemplate: QuickReplyTemplate = {
      id: `custom_${Date.now()}`,
      category: newTemplateCategory,
      title: newTemplateTitle.trim(),
      badge: newTemplateCategory === 'orientacao' ? '🧘 Orientações' : newTemplateCategory === 'financeiro' ? '💳 Financeiro' : newTemplateCategory === 'localizacao' ? '📍 Localização' : newTemplateCategory === 'pontualidade' ? '⏰ Horário' : newTemplateCategory === 'pos_atendimento' ? '🌟 Cuidados' : newTemplateCategory === 'reagendamento' ? '🔄 Reagendar' : '✍️ Personalizada',
      template: newTemplateText.trim()
    };

    const updated = [...quickReplyTemplates, newTemplate];
    setQuickReplyTemplates(updated);
    try {
      localStorage.setItem('fisiolys_quick_replies', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setIsCreatingCustomTemplate(false);
    setNewTemplateTitle('');
    setNewTemplateText('');
    handleSelectQuickReplyTemplate(newTemplate);
  };

  // Send Quick Reply message
  const handleSendQuickReply = async (mode: 'web' | 'direct') => {
    if (!quickReplyAppt || !quickReplyText.trim()) return;
    setQuickReplySending(true);
    setQuickReplyFeedback(null);

    try {
      const res = await api.sendWhatsAppMessage({
        appointmentId: quickReplyAppt.id,
        type: 'manual',
        customMessage: quickReplyText,
        phoneOverride: quickReplyAppt.patientPhone
      });

      setQuickReplyFeedback({ type: 'success', message: 'Mensagem enviada com sucesso!' });
      fetchLogs();
      onReload();

      if (mode === 'web') {
        const webUrl = getWhatsAppWebUrl(quickReplyAppt.patientPhone, quickReplyText);
        window.open(webUrl, '_blank');
      } else {
        const directUrl = getWhatsAppDirectUrl(quickReplyAppt.patientPhone, quickReplyText);
        window.open(directUrl, '_blank');
      }
    } catch (err: any) {
      setQuickReplyFeedback({ type: 'error', message: err.message || 'Erro ao enviar mensagem' });
    } finally {
      setQuickReplySending(false);
    }
  };

  // Config form state
  const [provider, setProvider] = useState<WhatsAppProvider>(clinic.whatsappProvider || 'whatsapp_web');
  const [apiUrl, setApiUrl] = useState<string>(clinic.whatsappApiUrl || '');
  const [apiToken, setApiToken] = useState<string>(clinic.whatsappApiToken || '');
  const [instanceId, setInstanceId] = useState<string>(clinic.whatsappInstanceId || 'fisiolys-main');
  const [autoSendBooking, setAutoSendBooking] = useState<boolean>(clinic.whatsappAutoSendBooking !== false);
  const [autoSendReminderD1, setAutoSendReminderD1] = useState<boolean>(clinic.whatsappAutoSendReminderD1 !== false);
  const [autoSendReminderD0, setAutoSendReminderD0] = useState<boolean>(clinic.whatsappAutoSendReminderD0 !== false);
  const [autoSendBirthday, setAutoSendBirthday] = useState<boolean>(clinic.whatsappAutoSendBirthday !== false);
  const [autoSendSpecialOccasion, setAutoSendSpecialOccasion] = useState<boolean>(clinic.whatsappAutoSendSpecialOccasion !== false);

  // Templates state
  const [templateBooking, setTemplateBooking] = useState<string>(clinic.whatsappTemplateBooking || DEFAULT_WHATSAPP_TEMPLATES.bookingConfirmation);
  const [templateD1, setTemplateD1] = useState<string>(clinic.whatsappTemplateD1 || DEFAULT_WHATSAPP_TEMPLATES.reminderD1);
  const [templateD0, setTemplateD0] = useState<string>(clinic.whatsappTemplateD0 || DEFAULT_WHATSAPP_TEMPLATES.reminderD0);
  const [templateBirthday, setTemplateBirthday] = useState<string>(clinic.whatsappTemplateBirthday || DEFAULT_WHATSAPP_TEMPLATES.birthday);
  const [templateSpecialOccasion, setTemplateSpecialOccasion] = useState<string>(clinic.whatsappTemplateSpecialOccasion || DEFAULT_WHATSAPP_TEMPLATES.specialOccasion);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'booking' | 'd1' | 'd0' | 'birthday' | 'special_occasion'>('d0');

  // Saving states
  const [savingConfig, setSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test send state
  const [testPhone, setTestPhone] = useState<string>(clinic.whatsapp || '5593991265006');
  const [testingSend, setTestingSend] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Log view modal
  const [selectedLogForView, setSelectedLogForView] = useState<WhatsAppLog | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Fetch logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.getWhatsAppLogs();
      setLogs(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Quick dates
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  // Appointments filtered for date
  const filteredAppointments = appointments.filter(a => {
    if (a.status === 'cancelado') return false;
    if (selectedDateFilter && a.date !== selectedDateFilter) return false;
    if (searchPatient.trim()) {
      const q = searchPatient.toLowerCase();
      return a.patientName.toLowerCase().includes(q) || a.patientPhone.includes(q);
    }
    return true;
  });

  const todayCount = appointments.filter(a => a.date === todayStr && a.status !== 'cancelado').length;
  const tomorrowCount = appointments.filter(a => a.date === tomorrowStr && a.status !== 'cancelado').length;

  // Save WhatsApp settings
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setConfigFeedback(null);
    try {
      await api.updateClinic({
        whatsappProvider: provider,
        whatsappApiUrl: apiUrl.trim(),
        whatsappApiToken: apiToken.trim(),
        whatsappInstanceId: instanceId.trim(),
        whatsappAutoSendBooking: autoSendBooking,
        whatsappAutoSendReminderD1: autoSendReminderD1,
        whatsappAutoSendReminderD0: autoSendReminderD0,
        whatsappAutoSendBirthday: autoSendBirthday,
        whatsappAutoSendSpecialOccasion: autoSendSpecialOccasion,
        whatsappTemplateBooking: templateBooking,
        whatsappTemplateD1: templateD1,
        whatsappTemplateD0: templateD0,
        whatsappTemplateBirthday: templateBirthday,
        whatsappTemplateSpecialOccasion: templateSpecialOccasion,
      });
      setConfigFeedback({ type: 'success', message: 'Configurações de WhatsApp, Lembretes e Engajamento salvas com sucesso!' });
      onReload();
    } catch (err: any) {
      setConfigFeedback({ type: 'error', message: err.message || 'Erro ao salvar configurações do WhatsApp.' });
    } finally {
      setSavingConfig(false);
    }
  };

  // Run Real-Time Test
  const handleTestConnection = async () => {
    setTestingSend(true);
    setTestResult(null);
    try {
      const res = await api.testWhatsApp({
        phone: testPhone,
        provider,
        apiUrl,
        apiToken,
        message: `🧪 Teste de Conexão WhatsApp - Fisiolys Fisioterapia e Pilates!\n\nSeu sistema de lembretes automáticos está configurado e pronto para uso!\n\n📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n⏰ Hora: ${new Date().toLocaleTimeString('pt-BR')}\n🏥 Clínica: ${clinic.name}`
      });
      setTestResult(res);
      fetchLogs();
    } catch (err: any) {
      setTestResult({ success: false, status: 'erro', details: err.message || 'Falha ao executar teste' });
    } finally {
      setTestingSend(false);
    }
  };

  // Trigger batch reminders
  const handleBatchSend = async (date: string, type: 'lembrete_d0' | 'lembrete_d1') => {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await api.batchSendWhatsAppReminders(date, type);
      setBatchResult(res);
      fetchLogs();
      onReload();
    } catch (err: any) {
      setBatchResult({ success: false, message: err.message || 'Erro no envio em lote' });
    } finally {
      setBatchLoading(false);
    }
  };

  // Open modal for single appointment
  const handleOpenSingleSendModal = (appt: Appointment, type: 'confirmacao' | 'lembrete_d1' | 'lembrete_d0' | 'manual' = 'lembrete_d0') => {
    setActiveModalAppt(appt);
    setModalType(type);
    setSingleResult(null);

    let template = templateD0;
    if (type === 'lembrete_d1') template = templateD1;
    else if (type === 'confirmacao') template = templateBooking;

    const interpolated = interpolateWhatsAppTemplate(template, {
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      serviceName: appt.serviceName,
      servicePrice: appt.servicePrice,
      date: appt.date,
      time: appt.time,
      clinicName: clinic.name,
      managerName: clinic.managerName,
      address: clinic.address,
      city: clinic.city,
      paymentMethod: appt.paymentMethod
    });

    setCustomMsgText(interpolated);
  };

  // Dispatch single message
  const handleSendSingleMessage = async (mode: 'api' | 'web' | 'direct') => {
    if (!activeModalAppt) return;
    setSendingSingle(true);
    setSingleResult(null);

    try {
      const res = await api.sendWhatsAppMessage({
        appointmentId: activeModalAppt.id,
        type: modalType,
        customMessage: customMsgText,
        phoneOverride: activeModalAppt.patientPhone
      });

      setSingleResult(res);
      fetchLogs();
      onReload();

      if (mode === 'web' && res.directWebUrl) {
        window.open(res.directWebUrl, '_blank');
      } else if (mode === 'direct' && res.directAppUrl) {
        window.open(res.directAppUrl, '_blank');
      }
    } catch (err: any) {
      setSingleResult({ success: false, status: 'erro', details: err.message || 'Erro ao enviar mensagem' });
    } finally {
      setSendingSingle(false);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todo o histórico de logs do WhatsApp?')) return;
    try {
      await api.clearWhatsAppLogs();
      setLogs([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Insert variable into template
  const insertVariable = (variable: string) => {
    if (activeTemplateTab === 'booking') {
      setTemplateBooking(prev => prev + ' ' + variable);
    } else if (activeTemplateTab === 'd1') {
      setTemplateD1(prev => prev + ' ' + variable);
    } else if (activeTemplateTab === 'birthday') {
      setTemplateBirthday(prev => prev + ' ' + variable);
    } else if (activeTemplateTab === 'special_occasion') {
      setTemplateSpecialOccasion(prev => prev + ' ' + variable);
    } else {
      setTemplateD0(prev => prev + ' ' + variable);
    }
  };

  // Active template for live preview
  const currentPreviewTemplate = activeTemplateTab === 'booking'
    ? templateBooking
    : activeTemplateTab === 'd1'
    ? templateD1
    : activeTemplateTab === 'birthday'
    ? templateBirthday
    : activeTemplateTab === 'special_occasion'
    ? templateSpecialOccasion
    : templateD0;
  const sampleDataPreview = {
    patientName: 'Mariana Silveira',
    patientPhone: '(93) 99126-5006',
    serviceName: 'Pilates Clínico & Postural',
    servicePrice: 150,
    date: selectedDateFilter || todayStr,
    time: '09:00',
    clinicName: clinic.name,
    managerName: clinic.managerName,
    address: clinic.address,
    city: clinic.city,
    paymentMethod: 'pix'
  };
  const livePreviewText = interpolateWhatsAppTemplate(currentPreviewTemplate, sampleDataPreview);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Gateway Status */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-800">
                  Automação WhatsApp & Lembretes de Agendamentos
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center space-x-1 ${
                  provider === 'whatsapp_web'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : apiUrl
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    {provider === 'whatsapp_web' ? 'WhatsApp Web (1-Clique Ativo)' : provider === 'meta_cloud' ? 'Meta Cloud API' : provider === 'evolution' ? 'Evolution API' : provider === 'zapi' ? 'Z-API' : 'Webhook'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dispare lembretes de consultas no dia, véspera e confirmações automáticas com rotas do Google Maps, dados da clínica e 1-clique.
              </p>
            </div>
          </div>

          {/* Quick Batch Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-whatsapp-batch-today"
              onClick={() => handleBatchSend(todayStr, 'lembrete_d0')}
              disabled={batchLoading || todayCount === 0}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Lembretes de Hoje ({todayCount})</span>
            </button>

            <button
              id="btn-whatsapp-batch-tomorrow"
              onClick={() => handleBatchSend(tomorrowStr, 'lembrete_d1')}
              disabled={batchLoading || tomorrowCount === 0}
              className="px-3.5 py-2 bg-[#31523D] hover:bg-[#23372B] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Lembretes de Amanhã ({tomorrowCount})</span>
            </button>
          </div>
        </div>

        {/* Batch result notification */}
        {batchResult && (
          <div className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            batchResult.errors === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Disparo em Lote Concluído:</strong> {batchResult.sent} de {batchResult.total} lembretes processados com sucesso ({formatDatePtBR(batchResult.date)}).
              </span>
            </div>
            <button onClick={() => setBatchResult(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSubTab('disparos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            subTab === 'disparos'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Fila de Disparos & Atendimentos</span>
          <span className="ml-1.5 px-2 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200">
            {filteredAppointments.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('modelos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            subTab === 'modelos'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Modelos de Mensagem & Chat Preview</span>
        </button>

        <button
          onClick={() => setSubTab('configuracao')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            subTab === 'configuracao'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configuração da API & Gateway</span>
        </button>

        <button
          onClick={() => {
            setSubTab('logs');
            fetchLogs();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            subTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Histórico & Logs de Envios ({logs.length})</span>
        </button>
      </div>

      {/* --- SUB-TAB 1: FILA DE DISPAROS & PACIENTES --- */}
      {subTab === 'disparos' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Data:</span>
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => setSelectedDateFilter(todayStr)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  selectedDateFilter === todayStr ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setSelectedDateFilter(tomorrowStr)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  selectedDateFilter === tomorrowStr ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Amanhã
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar paciente ou telefone..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* List of Appointments for WhatsApp Reminders */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Agendamentos para {formatDatePtBR(selectedDateFilter)} ({filteredAppointments.length})
                </h4>
              </div>
              <button
                onClick={() => fetchLogs()}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-slate-700">Nenhum atendimento encontrado para esta data</h5>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione outra data ou utilize o botão "Hoje" / "Amanhã" acima.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAppointments.map((appt) => {
                  const hasSentWhatsApp = appt.whatsappStatus === 'enviado';
                  const directWebLink = getWhatsAppWebUrl(appt.patientPhone, interpolateWhatsAppTemplate(templateD0, {
                    patientName: appt.patientName,
                    patientPhone: appt.patientPhone,
                    serviceName: appt.serviceName,
                    servicePrice: appt.servicePrice,
                    date: appt.date,
                    time: appt.time,
                    clinicName: clinic.name,
                    managerName: clinic.managerName,
                    address: clinic.address,
                    city: clinic.city,
                    paymentMethod: appt.paymentMethod
                  }));

                  return (
                    <div key={appt.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Patient & Service Info */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-800">{appt.patientName}</span>
                          {hasSentWhatsApp ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Lembrete Enviado</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              Pendente
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{appt.time} hs</span>
                          </span>
                          <span>•</span>
                          <span>{appt.serviceName}</span>
                          <span>•</span>
                          <a
                            href={`https://wa.me/${cleanPhoneNumber(appt.patientPhone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:underline font-medium"
                          >
                            {formatPhoneMask(appt.patientPhone)}
                          </a>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {/* Quick Reply Button (Requested by User) */}
                        <button
                          onClick={() => handleOpenQuickReply(appt)}
                          className="px-3 py-1.5 bg-[#F5EED3] hover:bg-[#faeec5] text-[#7E611D] border border-[#D0A73B]/50 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5"
                          title="Abrir seletor de templates de resposta rápida personalizados"
                        >
                          <Zap className="w-3.5 h-3.5 text-[#B88E28]" />
                          <span>Resposta Rápida</span>
                        </button>

                        {/* 1-Click Send / Customize */}
                        <button
                          onClick={() => handleOpenSingleSendModal(appt, selectedDateFilter === tomorrowStr ? 'lembrete_d1' : 'lembrete_d0')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
                          title="Visualizar e disparar mensagem de lembrete"
                        >
                          <Send className="w-3 h-3" />
                          <span>Lembrete</span>
                        </button>

                        {/* Direct WhatsApp Web Button */}
                        <a
                          href={directWebLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                          title="Abrir diretamente no WhatsApp Web"
                        >
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden md:inline">Web</span>
                        </a>

                        {/* Direct WhatsApp App Button */}
                        <a
                          href={`https://wa.me/${cleanPhoneNumber(appt.patientPhone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                          title="Abrir no aplicativo WhatsApp"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                        </a>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: MODELOS DE MENSAGEM & CHAT PREVIEW --- */}
      {subTab === 'modelos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Template Editor Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Editor de Mensagens Personalizadas</span>
                </h4>
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingConfig ? 'Salvando...' : 'Salvar Modelos'}</span>
                </button>
              </div>

              {/* Template Tab Selector */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveTemplateTab('d0')}
                  className={`flex-1 min-w-[120px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    activeTemplateTab === 'd0' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ☀️ Lembrete do Dia (D-0)
                </button>
                <button
                  onClick={() => setActiveTemplateTab('d1')}
                  className={`flex-1 min-w-[120px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    activeTemplateTab === 'd1' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📅 Lembrete Véspera (D-1)
                </button>
                <button
                  onClick={() => setActiveTemplateTab('booking')}
                  className={`flex-1 min-w-[120px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    activeTemplateTab === 'booking' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✅ Confirmação Imediata
                </button>
                <button
                  onClick={() => setActiveTemplateTab('birthday')}
                  className={`flex-1 min-w-[120px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    activeTemplateTab === 'birthday' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎂 Aniversário
                </button>
                <button
                  onClick={() => setActiveTemplateTab('special_occasion')}
                  className={`flex-1 min-w-[120px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    activeTemplateTab === 'special_occasion' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌟 Follow-up & Engajamento
                </button>
              </div>

              {/* Variable Chips (Click to Insert) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                  Variáveis Dinâmicas Disponíveis (Clique para Inserir):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{paciente}',
                    '{servico}',
                    '{data}',
                    '{horario}',
                    '{valor}',
                    '{clinica}',
                    '{responsavel}',
                    '{endereco}',
                    '{cidade}',
                    '{maps_link}',
                    '{chave_pix}'
                  ].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 transition-colors border border-slate-200"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for current template */}
              <div>
                {activeTemplateTab === 'd0' && (
                  <textarea
                    rows={12}
                    value={templateD0}
                    onChange={(e) => setTemplateD0(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                )}
                {activeTemplateTab === 'd1' && (
                  <textarea
                    rows={12}
                    value={templateD1}
                    onChange={(e) => setTemplateD1(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                )}
                {activeTemplateTab === 'booking' && (
                  <textarea
                    rows={12}
                    value={templateBooking}
                    onChange={(e) => setTemplateBooking(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                )}
                {activeTemplateTab === 'birthday' && (
                  <textarea
                    rows={12}
                    value={templateBirthday}
                    onChange={(e) => setTemplateBirthday(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                )}
                {activeTemplateTab === 'special_occasion' && (
                  <textarea
                    rows={12}
                    value={templateSpecialOccasion}
                    onChange={(e) => setTemplateSpecialOccasion(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTemplateTab === 'd0') setTemplateD0(DEFAULT_WHATSAPP_TEMPLATES.reminderD0);
                    else if (activeTemplateTab === 'd1') setTemplateD1(DEFAULT_WHATSAPP_TEMPLATES.reminderD1);
                    else if (activeTemplateTab === 'booking') setTemplateBooking(DEFAULT_WHATSAPP_TEMPLATES.bookingConfirmation);
                    else if (activeTemplateTab === 'birthday') setTemplateBirthday(DEFAULT_WHATSAPP_TEMPLATES.birthday);
                    else if (activeTemplateTab === 'special_occasion') setTemplateSpecialOccasion(DEFAULT_WHATSAPP_TEMPLATES.specialOccasion);
                  }}
                  className="text-emerald-700 hover:underline flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar modelo padrão da clínica</span>
                </button>
              </div>

            </div>
          </div>

          {/* Smartphone WhatsApp Mockup Column */}
          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <div className="w-full max-w-sm mx-auto bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800 relative">
                
                {/* Phone Notch */}
                <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2" />

                {/* WhatsApp Chat Screen */}
                <div className="bg-[#EFEAE2] rounded-[24px] overflow-hidden flex flex-col h-[520px] shadow-inner relative">
                  
                  {/* Chat Top Bar */}
                  <div className="bg-[#075E54] text-white p-3 flex items-center space-x-2.5 shadow-xs shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                      🌿
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold truncate leading-tight">{clinic.name}</h5>
                      <p className="text-[10px] text-white/80">online agora</p>
                    </div>
                  </div>

                  {/* Chat Message Area */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
                    
                    {/* Message Bubble (Green) */}
                    <div className="bg-[#D9FDD3] text-slate-800 rounded-2xl rounded-tl-none p-3 max-w-[90%] shadow-xs ml-1 border border-[#c4eabf] relative text-xs whitespace-pre-wrap leading-relaxed">
                      {livePreviewText}
                      <div className="text-[9px] text-slate-400 text-right mt-1 flex items-center justify-end space-x-1">
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-teal-600 font-bold">✓✓</span>
                      </div>
                    </div>

                  </div>

                  {/* Chat Mock Input Footer */}
                  <div className="p-2 bg-[#F0F2F5] flex items-center space-x-2 shrink-0 border-t border-slate-200">
                    <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-slate-400 border border-slate-200">
                      Mensagem...
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#00A884] text-white flex items-center justify-center text-xs">
                      <Send className="w-3 h-3" />
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB-TAB 3: CONFIGURAÇÃO DE API & GATEWAY --- */}
      {subTab === 'configuracao' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Settings Form */}
          <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Provedor de Conexão WhatsApp</span>
            </h4>

            {configFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                configFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {configFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{configFeedback.message}</span>
              </div>
            )}

            {/* Provider selection cards */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                Modo de Operação *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'whatsapp_web',
                    name: 'WhatsApp Web / Direto',
                    desc: 'Gratuito. Gera links prontos no WhatsApp Web e Celular com 1-clique.'
                  },
                  {
                    id: 'meta_cloud',
                    name: 'Meta Cloud API (Oficial)',
                    desc: 'WhatsApp Business API oficial com envio 100% em segundo plano.'
                  },
                  {
                    id: 'evolution',
                    name: 'Evolution API',
                    desc: 'API WhatsApp open-source conectada via QR Code.'
                  },
                  {
                    id: 'zapi',
                    name: 'Z-API / Gateway',
                    desc: 'Gateway comercial para disparo via API.'
                  },
                  {
                    id: 'custom_webhook',
                    name: 'Webhook Personalizado',
                    desc: 'Integração direta com n8n, Make, Typebot ou servidor próprio.'
                  }
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setProvider(item.id as WhatsAppProvider)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      provider === item.id
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{item.name}</span>
                      {provider === item.id && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-tight">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* API Parameters (if not whatsapp_web) */}
            {provider !== 'whatsapp_web' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Endpoint URL da API (POST) *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.evolution.site/message/sendText"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Token de Autenticação / API Key
                  </label>
                  <input
                    type="password"
                    placeholder="Bearer token ou apikey..."
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    ID da Instância / Sessão
                  </label>
                  <input
                    type="text"
                    placeholder="fisiolys-main"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Automation Toggles */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-700 uppercase">Gatilhos Automáticos & Engajamento</h5>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Automação Ativa
                </span>
              </div>

              <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendBooking}
                  onChange={(e) => setAutoSendBooking(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Enviar confirmação automática imediata assim que o paciente agendar no site
                </span>
              </label>

              <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendReminderD1}
                  onChange={(e) => setAutoSendReminderD1(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Habilitar lembretes de véspera (D-1) com botão de confirmação
                </span>
              </label>

              <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendReminderD0}
                  onChange={(e) => setAutoSendReminderD0(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Habilitar lembretes matinais do dia do atendimento (D-0) com rota do Google Maps
                </span>
              </label>

              {/* NEW: Birthday Reminders Toggle */}
              <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendBirthday}
                  onChange={(e) => setAutoSendBirthday(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-800 font-semibold flex items-center space-x-1.5">
                    <span>🎂 Lembretes e Felicitações de Aniversário</span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">Engajamento</span>
                  </span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Dispara mensagem personalizada no aniversário do paciente para fidelização e carinho
                  </p>
                </div>
              </label>

              {/* NEW: Special Occasion Follow-ups Toggle */}
              <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendSpecialOccasion}
                  onChange={(e) => setAutoSendSpecialOccasion(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-slate-800 font-semibold flex items-center space-x-1.5">
                    <span>🌟 Follow-up de Datas Especiais & Pós-Tratamento</span>
                    <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">Retenção</span>
                  </span>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Acompanhamento contínuo da evolução pós-sessão e reengajamento de pacientes
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>{savingConfig ? 'Salvando...' : 'Salvar Configurações'}</span>
              </button>
            </div>

          </form>

          {/* Test Dispatch Tool */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Teste de Conexão em Tempo Real</span>
              </h4>
              <p className="text-xs text-slate-500">
                Dispare uma mensagem de verificação para o seu número de WhatsApp para testar a entrega e formatação.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Número de WhatsApp para Teste *
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="5593991265006"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingSend || !testPhone}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2"
              >
                <Play className={`w-3.5 h-3.5 ${testingSend ? 'animate-spin' : ''}`} />
                <span>{testingSend ? 'Disparando Teste...' : 'Enviar Mensagem de Teste'}</span>
              </button>

              {/* Test Response Window */}
              {testResult && (
                <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="text-emerald-400 font-bold">Status: {testResult.status?.toUpperCase()}</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{testResult.details || 'Mensagem enviada com sucesso'}</p>
                  
                  {testResult.directWebUrl && (
                    <div className="pt-2 flex items-center space-x-2">
                      <a
                        href={testResult.directWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-sans font-bold inline-flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir no WhatsApp Web</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Instruction Card */}
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Segurança e Conformidade</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Todas as mensagens usam a criptografia ponta a ponta do WhatsApp e incluem links diretos de rotas e contato direto com a <strong>Dra. Elays Marinho</strong>.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* --- SUB-TAB 4: HISTÓRICO E LOGS DE ENVIOS --- */}
      {subTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Logs de Envio de WhatsApp ({logs.length})
              </h4>
              <p className="text-[11px] text-slate-500">Histórico de todas as mensagens e lembretes disparados pelo sistema.</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchLogs}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>Recarregar</span>
              </button>

              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Logs</span>
                </button>
              )}
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Nenhum log de disparo registrado</h5>
              <p className="text-xs text-slate-500 mt-1">
                Dispare lembretes no menu "Fila de Disparos" ou realize agendamentos para visualizar os registros aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Destinatário</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Provedor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(log.sentAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{log.patientName}</div>
                        <div className="text-[11px] text-slate-500">{formatPhoneMask(log.patientPhone)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {log.type === 'lembrete_d0' ? 'Lembrete Hoje' : log.type === 'lembrete_d1' ? 'Lembrete Véspera' : log.type === 'confirmacao' ? 'Confirmação' : 'Manual / Teste'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {log.provider}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 w-fit ${
                          log.status === 'enviado' || log.status === 'aberto_web'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status === 'enviado' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          <span>{log.status.toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLogForView(log)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver Texto</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL: SINGLE MESSAGE SEND & CUSTOMIZE --- */}
      {activeModalAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 relative space-y-4 max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setActiveModalAppt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Disparo Individual WhatsApp
              </span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">
                Lembrete para {activeModalAppt.patientName}
              </h3>
              <p className="text-xs text-slate-500">
                {activeModalAppt.serviceName} • {formatDatePtBR(activeModalAppt.date)} às {activeModalAppt.time} hs
              </p>
            </div>

            {/* Message type selector */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setModalType('lembrete_d0');
                  setCustomMsgText(interpolateWhatsAppTemplate(templateD0, {
                    patientName: activeModalAppt.patientName,
                    patientPhone: activeModalAppt.patientPhone,
                    serviceName: activeModalAppt.serviceName,
                    servicePrice: activeModalAppt.servicePrice,
                    date: activeModalAppt.date,
                    time: activeModalAppt.time,
                    clinicName: clinic.name,
                    managerName: clinic.managerName,
                    address: clinic.address,
                    city: clinic.city,
                    paymentMethod: activeModalAppt.paymentMethod
                  }));
                }}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                  modalType === 'lembrete_d0' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Lembrete do Dia
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType('lembrete_d1');
                  setCustomMsgText(interpolateWhatsAppTemplate(templateD1, {
                    patientName: activeModalAppt.patientName,
                    patientPhone: activeModalAppt.patientPhone,
                    serviceName: activeModalAppt.serviceName,
                    servicePrice: activeModalAppt.servicePrice,
                    date: activeModalAppt.date,
                    time: activeModalAppt.time,
                    clinicName: clinic.name,
                    managerName: clinic.managerName,
                    address: clinic.address,
                    city: clinic.city,
                    paymentMethod: activeModalAppt.paymentMethod
                  }));
                }}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                  modalType === 'lembrete_d1' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Lembrete Véspera
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType('confirmacao');
                  setCustomMsgText(interpolateWhatsAppTemplate(templateBooking, {
                    patientName: activeModalAppt.patientName,
                    patientPhone: activeModalAppt.patientPhone,
                    serviceName: activeModalAppt.serviceName,
                    servicePrice: activeModalAppt.servicePrice,
                    date: activeModalAppt.date,
                    time: activeModalAppt.time,
                    clinicName: clinic.name,
                    managerName: clinic.managerName,
                    address: clinic.address,
                    city: clinic.city,
                    paymentMethod: activeModalAppt.paymentMethod
                  }));
                }}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                  modalType === 'confirmacao' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Confirmação
              </button>
            </div>

            {/* Custom message text */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Texto da Mensagem (Você pode editar antes de enviar)
              </label>
              <textarea
                rows={8}
                value={customMsgText}
                onChange={(e) => setCustomMsgText(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            {/* Single result feedback */}
            {singleResult && (
              <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                singleResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {singleResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span>{singleResult.details || (singleResult.success ? 'Mensagem registrada com sucesso!' : 'Erro no envio')}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModalAppt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => handleSendSingleMessage('web')}
                disabled={sendingSingle}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Abrir no WhatsApp Web</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendSingleMessage('direct')}
                disabled={sendingSingle}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Disparar via API / App</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL: RESPOSTA RÁPIDA COM SELETOR DE TEMPLATES SALVOS --- */}
      {quickReplyAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F5EED3] text-[#7E611D] flex items-center justify-center font-black text-base shadow-xs">
                  <Zap className="w-5 h-5 text-[#B88E28]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#F5EED3] text-[#7E611D] border border-[#D0A73B]/30">
                      Resposta Rápida Manual
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {quickReplyAppt.time} hs
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    {quickReplyAppt.patientName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {quickReplyAppt.serviceName} • {formatPhoneMask(quickReplyAppt.patientPhone)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setQuickReplyAppt(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selector Category Filters & New Template Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B88E28]" />
                  <span>Escolha um Modelo de Resposta Rápida:</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsCreatingCustomTemplate(!isCreatingCustomTemplate)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
                >
                  {isCreatingCustomTemplate ? (
                    <span>✕ Cancelar Novo Modelo</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Criar Novo Modelo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'Todos os Modelos' },
                  { id: 'orientacao', label: '🧘 Orientações' },
                  { id: 'financeiro', label: '💳 Financeiro' },
                  { id: 'localizacao', label: '📍 Localização' },
                  { id: 'pontualidade', label: '⏰ Horário' },
                  { id: 'pos_atendimento', label: '🌟 Pós-Sessão' },
                  { id: 'reagendamento', label: '🔄 Reagendar' },
                  { id: 'livre', label: '✍️ Personalizada' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setQuickReplyCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      quickReplyCategoryFilter === cat.id
                        ? 'bg-[#31523D] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid of Templates to select */}
              {!isCreatingCustomTemplate && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {quickReplyTemplates
                    .filter(t => quickReplyCategoryFilter === 'all' || t.category === quickReplyCategoryFilter)
                    .map(template => {
                      const isSelected = selectedQuickReplyId === template.id;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleSelectQuickReplyTemplate(template)}
                          className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#F5EED3]/50 border-[#D0A73B] shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="font-bold text-slate-800 line-clamp-1">{template.title}</span>
                            <span className="text-[10px] font-bold text-[#7E611D] bg-[#F5EED3] px-1.5 py-0.2 rounded-md shrink-0 ml-1">
                              {template.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {template.template.replace(/\{[a-z_]+\}/g, '...')}
                          </p>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Form to create a new custom template */}
              {isCreatingCustomTemplate && (
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Novo Modelo Personalizado</span>
                    <span className="text-[10px] text-emerald-700">Será salvo no seu navegador</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Título do Modelo (ex: Lembrete de Exames)"
                      value={newTemplateTitle}
                      onChange={(e) => setNewTemplateTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs text-slate-800"
                    />

                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs text-slate-800"
                    >
                      <option value="orientacao">🧘 Orientações</option>
                      <option value="financeiro">💳 Financeiro</option>
                      <option value="localizacao">📍 Localização</option>
                      <option value="pontualidade">⏰ Horário</option>
                      <option value="pos_atendimento">🌟 Pós-Sessão</option>
                      <option value="reagendamento">🔄 Reagendar</option>
                      <option value="livre">✍️ Personalizada</option>
                    </select>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Texto do modelo. Use tags como {paciente}, {servico}, {data}, {horario}, {clinica}..."
                    value={newTemplateText}
                    onChange={(e) => setNewTemplateText(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-mono text-slate-800"
                  />

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomTemplate(false)}
                      className="px-3 py-1 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewCustomTemplate}
                      disabled={!newTemplateTitle.trim() || !newTemplateText.trim()}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
                    >
                      Salvar Modelo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Message Box with Patient Interpolation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mensagem Pronta para Envio (Edição Livre):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(quickReplyText);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedText ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <textarea
                rows={7}
                value={quickReplyText}
                onChange={(e) => setQuickReplyText(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 leading-relaxed bg-[#FCFDFC]"
              />
            </div>

            {/* Quick Reply Feedback */}
            {quickReplyFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                quickReplyFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {quickReplyFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span>{quickReplyFeedback.message}</span>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickReplyAppt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Send WhatsApp Web */}
                <button
                  type="button"
                  onClick={() => handleSendQuickReply('web')}
                  disabled={quickReplySending || !quickReplyText.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enviar no WhatsApp Web</span>
                </button>

                {/* Send Direct WhatsApp App */}
                <button
                  type="button"
                  onClick={() => handleSendQuickReply('direct')}
                  disabled={quickReplySending || !quickReplyText.trim()}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar via App / API</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL: VIEW SENT LOG CONTENT --- */}
      {selectedLogForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <button
              onClick={() => setSelectedLogForView(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Log #{selectedLogForView.id}
              </span>
              <h4 className="text-base font-bold text-slate-800 mt-1">
                Mensagem enviada para {selectedLogForView.patientName}
              </h4>
              <p className="text-xs text-slate-500">
                {formatPhoneMask(selectedLogForView.patientPhone)} • {new Date(selectedLogForView.sentAt).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="bg-[#D9FDD3] p-4 rounded-2xl border border-[#c4eabf] text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {selectedLogForView.message}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedLogForView.message);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLogForView(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
