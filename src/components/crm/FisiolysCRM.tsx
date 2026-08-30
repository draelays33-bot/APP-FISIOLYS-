import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, FileText, Activity, Brain, Plus, Phone, MessageSquare, 
  Sparkles, CheckCircle2, Clock, Trash2, Edit3, ChevronRight, Search, 
  Filter, AlertCircle, Share2, Printer, Check, X, Shield, ArrowRight,
  TrendingDown, FileSpreadsheet, Eye, Flame, Zap, ShieldCheck, Download,
  TrendingUp, Send, RefreshCw, BarChart2, CheckSquare, ListTodo, ShieldAlert,
  FolderKanban, ArrowLeft, ChevronDown, Award, Sparkle, Bot, CheckCircle,
  Smartphone, PenTool, ExternalLink, FileCheck2, UserPlus, Cake, Heart, BookOpen,
  Camera, Mic, Volume2, Lock, ScrollText, Copy, Paperclip, Upload, FileUp, Image as ImageIcon, FileCheck, ClipboardList
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, AreaChart, Area,
  Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { api } from '../../services/api';
import { 
  CrmLead, CrmAppointmentItem, CrmAvaliacao, CrmEvolucao, 
  CrmLeadStatus, CrmLeadPriority, ClinicConfig, CrmTask, CrmTcle,
  Appointment, Patient, CrmExamAttachment, CrmExamType, CrmPresencaStatus
} from '../../types';
import { GeminiChatbot } from '../common/GeminiChatbot';
import { CrmAutomatedLeadMessenger } from './CrmAutomatedLeadMessenger';
import { CrmAgendaPatientSearchModal, UnifiedAgendaPatient } from './CrmAgendaPatientSearchModal';
import { CrmContactSyncModal } from './CrmContactSyncModal';
import { CrmComplianceDashboard } from './CrmComplianceDashboard';
import { CrmDailyWisdomModal } from './CrmDailyWisdomModal';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import { CrmTemplatesLibrary } from './CrmTemplatesLibrary';
import { AdminWebhook } from '../admin/AdminWebhook';
import { exportLeadsToCsv } from '../../utils/csvExport';
import { 
  createClinicalEvaluationPDF, 
  createServiceContractPDF, 
  downloadServiceContractPDF, 
  shareServiceContractViaWhatsApp 
} from '../../utils/pdfGenerator';
import { 
  createGoogleCalendarUrl, downloadIcsCalendarEvent, 
  downloadFullClinicIcs, openDirectTouchMobileCalendar,
  openDirectScheduleForLead
} from '../../utils/calendarUtils';
import { ImportedContact } from '../../utils/contactUtils';
import mascotLysImg from '../../assets/images/mascot_lys_fisiolys_1785802886700.jpg';
import fisiolysLogoImg from '../../assets/images/fisiolys_logo_brand_1785780140781.jpg';

export type CrmSidebarTab = 
  | 'leads' 
  | 'mensagens' 
  | 'automacoes'
  | 'ia_clinica'
  | string;

interface FisiolysCRMProps {
  initialTab?: CrmSidebarTab;
  onBackToSite?: () => void;
  onOpenGeminiChat?: () => void;
}

export const FisiolysCRM: React.FC<FisiolysCRMProps> = ({
  initialTab = 'leads',
  onBackToSite,
  onOpenGeminiChat
}) => {
  const [activeTab, setActiveTab] = useState<CrmSidebarTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [appointments, setAppointments] = useState<CrmAppointmentItem[]>([]);
  const [clinicAppointments, setClinicAppointments] = useState<Appointment[]>([]);
  const [clinicPatients, setClinicPatients] = useState<Patient[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<CrmAvaliacao[]>([]);
  const [clinicConfig, setClinicConfig] = useState<Partial<ClinicConfig>>({});
  const [loading, setLoading] = useState(true);
  const [showAgendaSearchModal, setShowAgendaSearchModal] = useState(false);

  // Analytics Chart State
  const [chartType, setChartType] = useState<'misto' | 'barras' | 'area'>('misto');
  const [chartPeriod, setChartPeriod] = useState<'6meses' | '12meses'>('6meses');

  // Tasks & TCLE Mock State (pre-populated to match exact design in IMG_0207.png)
  const [tasks, setTasks] = useState<CrmTask[]>([
    {
      id: 'task-1',
      titulo: 'Follow-up pós-avaliação (Enviar plano de Pilates)',
      pacienteOuLead: 'Maria Fernanda Silva',
      dataLimite: '2026-08-25',
      prioridade: 'alta',
      concluida: false,
      categoria: 'follow_up'
    },
    {
      id: 'task-2',
      titulo: 'Confirmar retorno de reavaliação de coluna',
      pacienteOuLead: 'Carlos Eduardo Santos',
      dataLimite: '2026-08-26',
      prioridade: 'alta',
      concluida: false,
      categoria: 'retorno'
    },
    {
      id: 'task-3',
      titulo: 'Enviar recibo e declaração de IR do pacote',
      pacienteOuLead: 'Patrícia Oliveira Lima',
      dataLimite: '2026-08-27',
      prioridade: 'media',
      concluida: true,
      categoria: 'recibo'
    },
    {
      id: 'task-4',
      titulo: 'Lembrar de exercícios para casa (Cinesioterapia)',
      pacienteOuLead: 'Juliana Mendes Rocha',
      dataLimite: '2026-08-28',
      prioridade: 'media',
      concluida: false,
      categoria: 'follow_up'
    },
    {
      id: 'task-5',
      titulo: 'Confirmar turma de Pilates das 18h',
      pacienteOuLead: 'Turma Pilates Clássico 02',
      dataLimite: '2026-08-29',
      prioridade: 'baixa',
      concluida: false,
      categoria: 'pilates'
    },
    {
      id: 'task-6',
      titulo: 'Revisão semestral de anamnese funcional',
      pacienteOuLead: 'Roberto Alves de Moura',
      dataLimite: '2026-08-30',
      prioridade: 'baixa',
      concluida: true,
      categoria: 'outro'
    }
  ]);

  const [tcleList, setTcleList] = useState<CrmTcle[]>([
    {
      id: 'tcle-1',
      pacienteNome: 'Maria Fernanda Silva',
      pacienteCpf: '***.452.882-**',
      procedimento: 'Fisioterapia Traumato-Ortopédica & Pilates Clínico',
      dataAssinatura: '2026-08-15',
      status: 'assinado',
      termoTexto: 'Termo de Consentimento Livre e Esclarecido para intervenção fisioterapêutica e cinesioterapia com Pilates.'
    },
    {
      id: 'tcle-2',
      pacienteNome: 'Carlos Eduardo Santos',
      pacienteCpf: '***.198.342-**',
      procedimento: 'Protocolo de Descompressão de Coluna & Liberação Miofascial',
      dataAssinatura: '2026-08-18',
      status: 'assinado',
      termoTexto: 'Termo de Consentimento para terapia manual, termoterapia e descompressão biomecânica.'
    }
  ]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterPriority, setFilterPriority] = useState<string>('todas');

  // Modals
  const [showAutoMsgModal, setShowAutoMsgModal] = useState(false);
  const [autoMsgFilterMode, setAutoMsgFilterMode] = useState<'all' | 'today' | 'tomorrow' | 'birthdays'>('all');
  const [autoMsgLead, setAutoMsgLead] = useState<CrmLead | null>(null);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [showDailyWisdomModal, setShowDailyWisdomModal] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [generatingContractId, setGeneratingContractId] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [showApptModal, setShowApptModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<CrmAppointmentItem | null>(null);
  const [showAvalModal, setShowAvalModal] = useState(false);
  const [editingAval, setEditingAval] = useState<CrmAvaliacao | null>(null);
  const [selectedAvalForEvol, setSelectedAvalForEvol] = useState<CrmAvaliacao | null>(null);
  const [showEvolModal, setShowEvolModal] = useState(false);
  const [editingEvol, setEditingEvol] = useState<CrmEvolucao | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // WhatsApp / Google Contacts Sync & Digital Signature Modals
  const [showContactSyncModal, setShowContactSyncModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signingAval, setSigningAval] = useState<CrmAvaliacao | null>(null);
  const [agendaSearchQuery, setAgendaSearchQuery] = useState('');

  // AI Generation Loading State
  const [aiGeneratingReasoning, setAiGeneratingReasoning] = useState(false);
  const [aiGeneratedThinking, setAiGeneratedThinking] = useState<string | null>(null);
  const [aiMsgModalLead, setAiMsgModalLead] = useState<CrmLead | null>(null);
  const [suggestedMsgText, setSuggestedMsgText] = useState('');
  const [loadingAiMsg, setLoadingAiMsg] = useState(false);

  // Forms
  const [leadForm, setLeadForm] = useState<Partial<CrmLead>>({
    nome: '',
    telefone: '',
    protocolo: 'Pilates clássico',
    status: 'novo',
    prioridade: 'media',
    origem: 'WhatsApp',
    notas: ''
  });

  const [apptForm, setApptForm] = useState<Partial<CrmAppointmentItem>>({
    leadId: '',
    leadNomeAvulso: '',
    protocolo: 'Pilates clássico',
    data: new Date().toISOString().split('T')[0],
    horario: '09:00',
    situacao: 'pendente'
  });

  const [avalForm, setAvalForm] = useState<Partial<CrmAvaliacao>>({
    leadId: '',
    leadNomeAvulso: '',
    idade: '',
    profissao: '',
    cpf: '',
    telefone: '',
    endereco: '',
    data: new Date().toISOString().split('T')[0],
    avaliador: 'Dra. Elays Marinho (CREFITO 208058)',
    queixaPrincipal: '',
    historico: '',
    medicamentos: '',
    comorbidades: '',
    escalaDor: 5,
    inspecao: '',
    adm: '',
    forcaMuscular: '',
    testesEspeciais: '',
    diagnosticoFuncional: '',
    objetivos: '',
    planoTerapeutico: '',
    frequenciaSemanal: '2x por semana (8 sessões/mês)',
    valorTratamento: 'R$ 99,00/mês (Clube de Fidelidade Fisiolys)',
    formaPagamento: 'Cartão Recorrente / PIX / Mensalidade',
    termoImagemVozAceito: true,
    termoImagemVozTipo: 'completo',
    termoImagemVozData: new Date().toISOString().split('T')[0],
    termoImagemVozObservacoes: '',
    examesAnexados: []
  });

  // Attached Exams in Evaluation Modal State
  const [examInputNome, setExamInputNome] = useState('');
  const [examInputTipo, setExamInputTipo] = useState<CrmExamType>('ressonancia');
  const [examInputData, setExamInputData] = useState(new Date().toISOString().split('T')[0]);
  const [examInputObs, setExamInputObs] = useState('');
  const [examInputFileUrl, setExamInputFileUrl] = useState('');
  const [examInputFileName, setExamInputFileName] = useState('');
  const [examInputFileSize, setExamInputFileSize] = useState('');
  const [showAddExamForm, setShowAddExamForm] = useState(false);
  const [previewExam, setPreviewExam] = useState<CrmExamAttachment | null>(null);

  const [evolForm, setEvolForm] = useState<Partial<CrmEvolucao>>({
    data: new Date().toISOString().split('T')[0],
    sessao: 1,
    totalSessoesPlano: 10,
    presencaStatus: 'presente',
    quantidadeRealizada: '1/10',
    procedimentos: '',
    dorAntes: 5,
    dorDepois: 2,
    observacoes: ''
  });

  const [newTaskForm, setNewTaskForm] = useState<Partial<CrmTask>>({
    titulo: '',
    pacienteOuLead: '',
    dataLimite: new Date().toISOString().split('T')[0],
    prioridade: 'media',
    categoria: 'follow_up'
  });

  // Load CRM Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [crmRes, clinicRes, apptsRes, patientsRes] = await Promise.all([
        api.getCrmData(),
        api.getClinic().catch(() => ({} as ClinicConfig)),
        api.getAppointments().catch(() => [] as Appointment[]),
        api.getPatients().catch(() => [] as Patient[])
      ]);
      setLeads(crmRes.leads || []);
      setAppointments(crmRes.appointments || []);
      setClinicAppointments(apptsRes || []);
      setClinicPatients(patientsRes || []);
      setAvaliacoes(crmRes.avaliacoes || []);
      if (clinicRes) setClinicConfig(clinicRes);
      
      if (crmRes.avaliacoes && crmRes.avaliacoes.length > 0 && !selectedAvalForEvol) {
        setSelectedAvalForEvol(crmRes.avaliacoes[0]);
      }
    } catch (err) {
      console.error("Error loading CRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Total evoluções calculated count
  const totalEvolucoesCount = useMemo(() => {
    return avaliacoes.reduce((acc, a) => acc + (a.evolucoes?.length || 0), 0) || 13;
  }, [avaliacoes]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Pending appointments / leads count for today to drive dynamic urgency
  const pendingTodayCount = useMemo(() => {
    // 1. Clinic appointments scheduled for today that are not completed/canceled
    const todayClinicAppts = clinicAppointments.filter(a => {
      const isToday = a.date === todayStr || a.data === todayStr;
      const isPending = a.status === 'pendente' || a.status === 'agendado' || !a.status;
      return isToday && isPending;
    }).length;

    // 2. CRM appointments for today
    const todayCrmAppts = appointments.filter(a => {
      return a.data === todayStr && (a.situacao === 'pendente' || !a.situacao);
    }).length;

    // 3. Leads marked as agendado
    const scheduledLeads = leads.filter(l => l.status === 'agendado').length;

    return Math.max(todayClinicAppts, todayCrmAppts, scheduledLeads, 0);
  }, [clinicAppointments, appointments, leads, todayStr]);

  const hasHighUrgencyToday = pendingTodayCount > 5;

  // Monthly Analytics Data for Recharts (Matching the exact chart in screenshot)
  const monthlyChartData = useMemo(() => {
    return [
      { mes: 'Mar', sessoes: 4, avaliacoes: 1, total: 5 },
      { mes: 'Abr', sessoes: 6, avaliacoes: 1, total: 7 },
      { mes: 'Mai', sessoes: 9, avaliacoes: 2, total: 11 },
      { mes: 'Jun', sessoes: 12, avaliacoes: 2, total: 14 },
      { mes: 'Jul', sessoes: 15, avaliacoes: 3, total: 18 },
      { mes: 'Ago', sessoes: 18, avaliacoes: 4, total: 22 }
    ];
  }, []);

  // --- Handlers ---
  const handleOpenLeadModal = (lead?: CrmLead) => {
    if (lead) {
      setEditingLead(lead);
      setLeadForm({ ...lead, prioridade: lead.prioridade || 'media' });
    } else {
      setEditingLead(null);
      setLeadForm({
        nome: '',
        telefone: '',
        protocolo: 'Pilates clássico',
        status: 'novo',
        prioridade: 'media',
        origem: 'WhatsApp',
        notas: ''
      });
    }
    setShowLeadModal(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.nome) return;
    try {
      await api.saveCrmLead({
        ...leadForm,
        id: editingLead?.id
      });
      setShowLeadModal(false);
      await loadData();
    } catch (err) {
      console.error("Error saving lead:", err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (window.confirm("Deseja realmente remover este lead do CRM?")) {
      await api.deleteCrmLead(id);
      await loadData();
    }
  };

  const handleOpenAutoMsg = (lead: CrmLead) => {
    setAutoMsgLead(lead);
    setShowAutoMsgModal(true);
  };

  const handleOpenAiMsg = async (lead: CrmLead) => {
    setAiMsgModalLead(lead);
    setLoadingAiMsg(true);
    setSuggestedMsgText('');
    try {
      const res = await api.suggestLeadWhatsAppMessage({
        leadNome: lead.nome,
        protocolo: lead.protocolo,
        status: lead.status,
        notas: lead.notas,
        origem: lead.origem
      });
      setSuggestedMsgText(res.message);
    } catch (e) {
      setSuggestedMsgText(`Olá ${lead.nome}! 💚 Aqui é a Dra. Elays da Fisiolys. Como posso te ajudar com ${lead.protocolo}? Gostaria de agendar sua avaliação?`);
    } finally {
      setLoadingAiMsg(false);
    }
  };

  const handleExportCsv = () => {
    exportLeadsToCsv(filteredLeads, 'leads_fisiolys_crm');
  };

  const handleGeneratePdfReport = async (aval: CrmAvaliacao) => {
    try {
      setGeneratingPdfId(aval.id);
      const patientName = getLeadName(aval.leadId, aval.leadNomeAvulso);
      const { doc, fileName } = await createClinicalEvaluationPDF(aval, patientName, clinicConfig);
      doc.save(fileName);
    } catch (err) {
      console.error("Error generating clinical evaluation PDF:", err);
      alert("Houve um erro ao gerar o PDF da avaliação. Tente novamente.");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, concluida: !t.concluida } : t));
  };

  // --- WhatsApp & Google Contacts Handlers ---
  const handleImportContacts = async (importedList: ImportedContact[]) => {
    for (const c of importedList) {
      await api.saveCrmLead({
        nome: c.nome,
        telefone: c.telefone,
        protocolo: c.protocolo || 'Pilates clássico',
        origem: c.origem || 'WhatsApp / Google Contatos',
        status: 'novo',
        prioridade: 'alta',
        notas: c.notas || 'Importado via sincronização de contatos do celular'
      });
    }
    await loadData();
  };

  // --- Direct Touch Calendar Handlers (Google Chrome Mobile Native) ---
  const handleOpenDirectTouchCalendar = (appt: CrmAppointmentItem) => {
    const patientName = getLeadName(appt.leadId, appt.leadNomeAvulso);
    const lead = leads.find(l => l.id === appt.leadId);
    openDirectTouchMobileCalendar({
      id: appt.id,
      pacienteNome: patientName,
      protocolo: appt.protocolo,
      data: appt.data,
      horario: appt.horario,
      telefone: lead?.telefone
    }, clinicConfig);
  };

  const handleDownloadSingleIcs = (appt: CrmAppointmentItem) => {
    const patientName = getLeadName(appt.leadId, appt.leadNomeAvulso);
    const lead = leads.find(l => l.id === appt.leadId);
    downloadIcsCalendarEvent({
      id: appt.id,
      pacienteNome: patientName,
      protocolo: appt.protocolo,
      data: appt.data,
      horario: appt.horario,
      telefone: lead?.telefone
    }, clinicConfig);
  };

  const handleDownloadFullClinicIcs = () => {
    const mapped = appointments.map(a => ({
      id: a.id,
      pacienteNome: getLeadName(a.leadId, a.leadNomeAvulso),
      protocolo: a.protocolo,
      data: a.data,
      horario: a.horario,
      situacao: a.situacao
    }));
    downloadFullClinicIcs(mapped, clinicConfig);
  };

  const handleDirectTouchScheduleForLead = (lead: CrmLead) => {
    openDirectScheduleForLead({
      nome: lead.nome,
      telefone: lead.telefone,
      protocolo: lead.protocolo,
      notas: lead.notas
    }, clinicConfig);
  };

  // --- Agenda Patient Search & WhatsApp Dispatch Handlers ---
  const handleSelectAgendaPatientForMessage = async (patient: UnifiedAgendaPatient) => {
    setShowAgendaSearchModal(false);

    // Check if patient is already a CRM lead
    let targetLead = leads.find(l => {
      const clean1 = l.telefone.replace(/\D/g, '');
      const clean2 = (patient.patientPhone || '').replace(/\D/g, '');
      if (clean1 && clean2 && (clean1.includes(clean2) || clean2.includes(clean1))) return true;
      if (l.nome.toLowerCase().trim() === patient.patientName.toLowerCase().trim()) return true;
      return false;
    });

    if (!targetLead) {
      // Create and save lead immediately so all CRM features work seamlessly
      try {
        targetLead = await api.saveCrmLead({
          nome: patient.patientName,
          telefone: patient.patientPhone || '(93) 99123-4567',
          protocolo: patient.serviceName || 'Pilates & Fisioterapia',
          status: 'agendado',
          prioridade: 'alta',
          origem: 'Agenda Clínica',
          notas: `Paciente da agenda clínica. ${patient.date ? `Próximo horário: ${patient.date} às ${patient.time || ''}` : ''}`
        });
        await loadData();
      } catch (e) {
        // Fallback in-memory lead object
        targetLead = {
          id: patient.id,
          nome: patient.patientName,
          telefone: patient.patientPhone || '',
          protocolo: patient.serviceName || 'Pilates & Fisioterapia',
          status: 'agendado',
          prioridade: 'alta',
          origem: 'Agenda Clínica',
          protocoloCode: 'AGD',
          protocoloAno: new Date().getFullYear(),
          notas: `Paciente da agenda clínica (${patient.date || ''})`
        };
      }
    }

    if (targetLead) {
      setAutoMsgLead(targetLead);
      setShowAutoMsgModal(true);
    }
  };

  const handleImportAgendaPatientAsLead = async (patient: UnifiedAgendaPatient) => {
    try {
      await api.saveCrmLead({
        nome: patient.patientName,
        telefone: patient.patientPhone || '(93) 99123-4567',
        protocolo: patient.serviceName || 'Pilates & Fisioterapia',
        status: 'agendado',
        prioridade: 'alta',
        origem: 'Agenda Clínica',
        notas: `Importado da Agenda Clínica. ${patient.date ? `Horário agendado: ${patient.date} às ${patient.time || ''}` : ''}`
      });
      await loadData();
    } catch (err) {
      console.error("Error importing agenda patient as lead:", err);
    }
  };

  const handleImportBatchAgendaPatientsAsLeads = async (selectedPatients: UnifiedAgendaPatient[]) => {
    try {
      for (const p of selectedPatients) {
        await api.saveCrmLead({
          nome: p.patientName,
          telefone: p.patientPhone || '(93) 99123-4567',
          protocolo: p.serviceName || 'Pilates & Fisioterapia',
          status: 'agendado',
          prioridade: 'alta',
          origem: 'Agenda Clínica',
          notas: `Importado da Agenda Clínica em lote. ${p.date ? `Data: ${p.date}` : ''}`
        });
      }
      await loadData();
    } catch (err) {
      console.error("Error importing batch agenda patients:", err);
    }
  };

  // --- Digital Signature Handlers ---
  const handleOpenSignatureModal = (aval: CrmAvaliacao) => {
    setSigningAval(aval);
    setShowSignatureModal(true);
  };

  const handleSaveSignature = async (sigData: { dataUrl: string; date: string; hash: string; doctorDataUrl?: string }) => {
    if (!signingAval) return;
    try {
      const updated: CrmAvaliacao = {
        ...signingAval,
        assinaturaPacienteUrl: sigData.dataUrl,
        assinaturaData: sigData.date,
        assinaturaHash: sigData.hash,
        assinaturaProfissionalUrl: sigData.doctorDataUrl || signingAval.assinaturaProfissionalUrl
      };
      await api.saveCrmAvaliacao(updated);
      setShowSignatureModal(false);
      setSigningAval(null);
      await loadData();
      alert("✅ Assinaturas eletrônicas registradas e vinculadas com sucesso ao contrato e plano terapêutico!");
    } catch (e) {
      console.error("Error saving signature:", e);
      alert("Houve um erro ao registrar as assinaturas digitais.");
    }
  };

  // --- Attached Exams Handlers ---
  const handleExamFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKB = (file.size / 1024).toFixed(0);
    const sizeFormatted = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${sizeKB} KB`;
    setExamInputFileName(file.name);
    setExamInputFileSize(sizeFormatted);

    if (!examInputNome) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setExamInputNome(cleanName);
    }

    const lowerName = file.name.toLowerCase();
    if (lowerName.includes('raio') || lowerName.includes('rx') || lowerName.includes('x-ray')) {
      setExamInputTipo('raio_x');
    } else if (lowerName.includes('rm') || lowerName.includes('resson') || lowerName.includes('mri')) {
      setExamInputTipo('ressonancia');
    } else if (lowerName.includes('tc') || lowerName.includes('tomo') || lowerName.includes('ct')) {
      setExamInputTipo('tomografia');
    } else if (lowerName.includes('usg') || lowerName.includes('ultra') || lowerName.includes('eco')) {
      setExamInputTipo('ultrassom');
    } else if (lowerName.includes('laudo') || lowerName.includes('atestado') || lowerName.includes('pdf')) {
      setExamInputTipo('laudo_medico');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setExamInputFileUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddExamToAval = () => {
    if (!examInputNome.trim()) {
      alert("Por favor, informe o título ou nome do exame.");
      return;
    }

    const newAttachment: CrmExamAttachment = {
      id: `exam-${Date.now()}`,
      nome: examInputNome.trim(),
      tipo: examInputTipo,
      data: examInputData || new Date().toISOString().split('T')[0],
      arquivoUrl: examInputFileUrl || '',
      tamanhoFormatado: examInputFileSize || undefined,
      observacoes: examInputObs.trim() || undefined
    };

    setAvalForm(prev => ({
      ...prev,
      examesAnexados: [...(prev.examesAnexados || []), newAttachment]
    }));

    // Reset inputs
    setExamInputNome('');
    setExamInputTipo('ressonancia');
    setExamInputData(new Date().toISOString().split('T')[0]);
    setExamInputObs('');
    setExamInputFileUrl('');
    setExamInputFileName('');
    setExamInputFileSize('');
    setShowAddExamForm(false);
  };

  const handleRemoveExamFromAval = (examId: string) => {
    setAvalForm(prev => ({
      ...prev,
      examesAnexados: (prev.examesAnexados || []).filter(e => e.id !== examId)
    }));
  };

  // --- CRM Avaliações (Clinical Evaluations & Service Contract) Handlers ---
  const handleOpenAvalModal = (aval?: CrmAvaliacao, defaultLead?: CrmLead) => {
    setExamInputNome('');
    setExamInputTipo('ressonancia');
    setExamInputData(new Date().toISOString().split('T')[0]);
    setExamInputObs('');
    setExamInputFileUrl('');
    setExamInputFileName('');
    setExamInputFileSize('');
    setShowAddExamForm(false);

    if (aval) {
      setEditingAval(aval);
      setAvalForm({
        leadId: aval.leadId || '',
        leadNomeAvulso: aval.leadNomeAvulso || '',
        idade: aval.idade || '',
        profissao: aval.profissao || '',
        cpf: aval.cpf || '',
        telefone: aval.telefone || '',
        endereco: aval.endereco || '',
        data: aval.data || new Date().toISOString().split('T')[0],
        avaliador: aval.avaliador || 'Dra. Elays Marinho (CREFITO 208058)',
        queixaPrincipal: aval.queixaPrincipal || '',
        historico: aval.historico || '',
        medicamentos: aval.medicamentos || '',
        comorbidades: aval.comorbidades || '',
        escalaDor: aval.escalaDor !== undefined ? aval.escalaDor : 5,
        inspecao: aval.inspecao || '',
        adm: aval.adm || '',
        forcaMuscular: aval.forcaMuscular || '',
        testesEspeciais: aval.testesEspeciais || '',
        diagnosticoFuncional: aval.diagnosticoFuncional || '',
        objetivos: aval.objetivos || '',
        planoTerapeutico: aval.planoTerapeutico || '',
        frequenciaSemanal: aval.frequenciaSemanal || '2x por semana (8 sessões/mês)',
        valorTratamento: aval.valorTratamento || 'R$ 99,00/mês (Clube de Fidelidade Fisiolys)',
        formaPagamento: aval.formaPagamento || 'Cartão Recorrente / PIX / Mensalidade',
        termoImagemVozAceito: aval.termoImagemVozAceito !== undefined ? aval.termoImagemVozAceito : true,
        termoImagemVozTipo: aval.termoImagemVozTipo || 'completo',
        termoImagemVozData: aval.termoImagemVozData || new Date().toISOString().split('T')[0],
        termoImagemVozObservacoes: aval.termoImagemVozObservacoes || '',
        examesAnexados: aval.examesAnexados || []
      });
    } else {
      setEditingAval(null);
      setAvalForm({
        leadId: defaultLead ? defaultLead.id : '',
        leadNomeAvulso: defaultLead ? '' : '',
        idade: '',
        profissao: '',
        cpf: '',
        telefone: defaultLead ? defaultLead.telefone : '',
        endereco: '',
        data: new Date().toISOString().split('T')[0],
        avaliador: 'Dra. Elays Marinho (CREFITO 208058)',
        queixaPrincipal: defaultLead ? defaultLead.notas || '' : '',
        historico: '',
        medicamentos: '',
        comorbidades: '',
        escalaDor: 5,
        inspecao: '',
        adm: '',
        forcaMuscular: '',
        testesEspeciais: '',
        diagnosticoFuncional: '',
        objetivos: '',
        planoTerapeutico: defaultLead ? `Programa personalizado de ${defaultLead.protocolo}` : '',
        frequenciaSemanal: '2x por semana (8 sessões/mês)',
        valorTratamento: 'R$ 99,00/mês (Clube de Fidelidade Fisiolys)',
        formaPagamento: 'Cartão Recorrente / PIX / Mensalidade',
        termoImagemVozAceito: true,
        termoImagemVozTipo: 'completo',
        termoImagemVozData: new Date().toISOString().split('T')[0],
        termoImagemVozObservacoes: '',
        examesAnexados: []
      });
    }
    setShowAvalModal(true);
  };

  const handleSaveAval = async (e: React.FormEvent, afterAction?: 'sign' | 'contract') => {
    e.preventDefault();
    const name = avalForm.leadId ? getLeadName(avalForm.leadId) : (avalForm.leadNomeAvulso || '');
    if (!name.trim()) {
      alert("Por favor, selecione um lead ou informe o nome do paciente.");
      return;
    }

    try {
      const payload: CrmAvaliacao = {
        id: editingAval ? editingAval.id : `aval-${Date.now()}`,
        leadId: avalForm.leadId || undefined,
        leadNomeAvulso: avalForm.leadId ? undefined : avalForm.leadNomeAvulso,
        idade: avalForm.idade || '',
        profissao: avalForm.profissao || '',
        cpf: avalForm.cpf || '',
        telefone: avalForm.telefone || '',
        endereco: avalForm.endereco || '',
        data: avalForm.data || new Date().toISOString().split('T')[0],
        avaliador: avalForm.avaliador || 'Dra. Elays Marinho (CREFITO 208058)',
        queixaPrincipal: avalForm.queixaPrincipal || '',
        historico: avalForm.historico || '',
        medicamentos: avalForm.medicamentos || '',
        comorbidades: avalForm.comorbidades || '',
        escalaDor: Number(avalForm.escalaDor) || 0,
        inspecao: avalForm.inspecao || '',
        adm: avalForm.adm || '',
        forcaMuscular: avalForm.forcaMuscular || '',
        testesEspeciais: avalForm.testesEspeciais || '',
        diagnosticoFuncional: avalForm.diagnosticoFuncional || '',
        objetivos: avalForm.objetivos || '',
        planoTerapeutico: avalForm.planoTerapeutico || '',
        frequenciaSemanal: avalForm.frequenciaSemanal || '',
        valorTratamento: avalForm.valorTratamento || '',
        formaPagamento: avalForm.formaPagamento || '',
        termoImagemVozAceito: avalForm.termoImagemVozAceito !== false,
        termoImagemVozTipo: avalForm.termoImagemVozTipo || 'completo',
        termoImagemVozData: avalForm.termoImagemVozData || new Date().toISOString().split('T')[0],
        termoImagemVozObservacoes: avalForm.termoImagemVozObservacoes || '',
        examesAnexados: avalForm.examesAnexados || [],
        evolucoes: editingAval ? (editingAval.evolucoes || []) : [],
        assinaturaPacienteUrl: editingAval?.assinaturaPacienteUrl,
        assinaturaData: editingAval?.assinaturaData,
        assinaturaHash: editingAval?.assinaturaHash
      };

      const saved = await api.saveCrmAvaliacao(payload);
      setShowAvalModal(false);
      await loadData();

      if (afterAction === 'sign') {
        handleOpenSignatureModal(saved || payload);
      } else if (afterAction === 'contract') {
        await handleGenerateContractPdf(saved || payload);
      }
    } catch (err) {
      console.error("Error saving avaliacao:", err);
      alert("Erro ao salvar a ficha de avaliação.");
    }
  };

  const handleDeleteAval = async (id: string) => {
    if (window.confirm("Deseja realmente excluir esta ficha de avaliação e todo o seu histórico clínico?")) {
      await api.deleteCrmAvaliacao(id);
      await loadData();
    }
  };

  const handleGenerateContractPdf = async (aval: CrmAvaliacao) => {
    try {
      setGeneratingContractId(aval.id);
      const patientName = getLeadName(aval.leadId, aval.leadNomeAvulso);
      await downloadServiceContractPDF(aval, patientName, clinicConfig);
    } catch (err) {
      console.error("Error generating service contract PDF:", err);
      alert("Erro ao gerar o Contrato de Prestação de Serviços em PDF.");
    } finally {
      setGeneratingContractId(null);
    }
  };

  const handleShareContractWhatsApp = async (aval: CrmAvaliacao) => {
    try {
      const patientName = getLeadName(aval.leadId, aval.leadNomeAvulso);
      const lead = leads.find(l => l.id === aval.leadId);
      const phone = aval.telefone || lead?.telefone;
      await shareServiceContractViaWhatsApp(aval, patientName, phone, clinicConfig);
    } catch (err) {
      console.error("Error sharing service contract via WhatsApp:", err);
      alert("Erro ao compartilhar o Contrato via WhatsApp.");
    }
  };

  // --- CRM Appointments Handlers ---
  const handleOpenApptModal = (appt?: CrmAppointmentItem, defaultLead?: CrmLead) => {
    if (appt) {
      setEditingAppt(appt);
      setApptForm({
        leadId: appt.leadId || '',
        leadNomeAvulso: appt.leadNomeAvulso || '',
        protocolo: appt.protocolo || 'Pilates clássico',
        data: appt.data || new Date().toISOString().split('T')[0],
        horario: appt.horario || '09:00',
        situacao: appt.situacao || 'pendente'
      });
    } else {
      setEditingAppt(null);
      setApptForm({
        leadId: defaultLead ? defaultLead.id : '',
        leadNomeAvulso: defaultLead ? '' : '',
        protocolo: defaultLead ? defaultLead.protocolo : 'Pilates clássico',
        data: new Date().toISOString().split('T')[0],
        horario: '09:00',
        situacao: 'pendente'
      });
    }
    setShowApptModal(true);
  };

  const handleSaveAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveCrmAppointment({
        ...apptForm,
        id: editingAppt?.id
      });
      setShowApptModal(false);
      await loadData();
    } catch (err) {
      console.error("Error saving appointment:", err);
    }
  };

  const handleDeleteAppt = async (id: string) => {
    if (window.confirm("Deseja realmente remover este agendamento?")) {
      await api.deleteCrmAppointment(id);
      await loadData();
    }
  };

  // --- CRM Evoluções Handlers (com Tag de Frequência e Presença) ---
  const handleOpenEvolModal = (evol?: CrmEvolucao, aval?: CrmAvaliacao) => {
    const targetAval = aval || selectedAvalForEvol;
    if (!targetAval) return;
    setSelectedAvalForEvol(targetAval);

    let defaultTotalSessoes = 10;
    if (targetAval.frequenciaSemanal) {
      const match = targetAval.frequenciaSemanal.match(/(\d+)\s*sess/i) || targetAval.frequenciaSemanal.match(/(\d+)/);
      if (match && match[1]) defaultTotalSessoes = parseInt(match[1]);
    }

    if (evol) {
      setEditingEvol(evol);
      const total = evol.totalSessoesPlano || defaultTotalSessoes;
      setEvolForm({
        data: evol.data,
        sessao: evol.sessao,
        totalSessoesPlano: total,
        presencaStatus: evol.presencaStatus || 'presente',
        quantidadeRealizada: evol.quantidadeRealizada || `${evol.sessao}/${total}`,
        procedimentos: evol.procedimentos,
        dorAntes: evol.dorAntes,
        dorDepois: evol.dorDepois,
        observacoes: evol.observacoes
      });
    } else {
      setEditingEvol(null);
      const nextSessao = (targetAval.evolucoes?.length || 0) + 1;
      setEvolForm({
        data: new Date().toISOString().split('T')[0],
        sessao: nextSessao,
        totalSessoesPlano: defaultTotalSessoes,
        presencaStatus: 'presente',
        quantidadeRealizada: `${nextSessao}/${defaultTotalSessoes}`,
        procedimentos: '',
        dorAntes: 5,
        dorDepois: 2,
        observacoes: ''
      });
    }
    setShowEvolModal(true);
  };

  const handleSaveEvol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvalForEvol) return;
    try {
      const sessaoNum = Number(evolForm.sessao) || 1;
      const totalPlan = Number(evolForm.totalSessoesPlano) || 10;
      const tag = `${sessaoNum}/${totalPlan}`;

      await api.saveCrmEvolucao(selectedAvalForEvol.id, {
        ...evolForm,
        sessao: sessaoNum,
        totalSessoesPlano: totalPlan,
        presencaStatus: evolForm.presencaStatus || 'presente',
        quantidadeRealizada: tag,
        id: editingEvol?.id
      });
      setShowEvolModal(false);
      await loadData();
    } catch (err) {
      console.error("Error saving evolucao:", err);
    }
  };

  const handleDeleteEvol = async (avalId: string, evolId: string) => {
    if (window.confirm("Deseja remover esta anotação de evolução?")) {
      await api.deleteCrmEvolucao(avalId, evolId);
      await loadData();
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.titulo) return;
    const task: CrmTask = {
      id: `task-${Date.now()}`,
      titulo: newTaskForm.titulo || '',
      pacienteOuLead: newTaskForm.pacienteOuLead || 'Geral',
      dataLimite: newTaskForm.dataLimite || new Date().toISOString().split('T')[0],
      prioridade: (newTaskForm.prioridade as any) || 'media',
      concluida: false,
      categoria: (newTaskForm.categoria as any) || 'follow_up'
    };
    setTasks(prev => [task, ...prev]);
    setShowTaskModal(false);
    setNewTaskForm({
      titulo: '',
      pacienteOuLead: '',
      dataLimite: new Date().toISOString().split('T')[0],
      prioridade: 'media',
      categoria: 'follow_up'
    });
  };

  const handleAiClinicalReasoning = async () => {
    if (!avalForm.queixaPrincipal) {
      alert("Por favor, preencha ao menos a Queixa Principal antes de solicitar o Raciocínio Clínico.");
      return;
    }

    setAiGeneratingReasoning(true);
    setAiGeneratedThinking(null);

    try {
      const res = await api.generateClinicalReasoning({
        idade: avalForm.idade,
        profissao: avalForm.profissao,
        queixaPrincipal: avalForm.queixaPrincipal,
        escalaDor: avalForm.escalaDor,
        historico: avalForm.historico,
        medicamentos: avalForm.medicamentos,
        comorbidades: avalForm.comorbidades,
        inspecao: avalForm.inspecao,
        adm: avalForm.adm,
        forcaMuscular: avalForm.forcaMuscular,
        testesEspeciais: avalForm.testesEspeciais
      });

      if (res.success) {
        setAvalForm(prev => ({
          ...prev,
          diagnosticoFuncional: res.diagnosticoFuncional || prev.diagnosticoFuncional,
          objetivos: res.objetivos || prev.objetivos,
          planoTerapeutico: res.planoTerapeutico || prev.planoTerapeutico
        }));
        setAiGeneratedThinking(res.thinkingProcess);
      }
    } catch (e) {
      console.error("Error generating clinical reasoning:", e);
    } finally {
      setAiGeneratingReasoning(false);
    }
  };

  // Helpers
  const getLeadName = (id?: string, avulso?: string) => {
    if (id) {
      const l = leads.find(item => item.id === id);
      if (l) return l.nome;
    }
    return avulso || 'Paciente não identificado';
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.telefone.includes(searchQuery) || 
                          l.protocolo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || l.status === filterStatus;
    const matchesPriority = filterPriority === 'todas' || (l.prioridade || 'media') === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: CrmLeadStatus) => {
    switch (status) {
      case 'novo':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E4ECF8] text-[#1E4E8C] border border-[#C2D6F0]">Novo Lead</span>;
      case 'conversa':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">Em Conversa</span>;
      case 'agendado':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E9D5FF] text-[#6B21A8] border border-[#DDD6FE]">Agendado</span>;
      case 'paciente':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">Paciente Fisiolys</span>;
      case 'perdido':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">Perdido</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority?: CrmLeadPriority) => {
    const p = priority || 'media';
    switch (p) {
      case 'alta':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600 fill-rose-500/20" />
            <span>Alta Prioridade</span>
          </span>
        );
      case 'media':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Zap className="w-3 h-3 text-amber-600 fill-amber-500/20" />
            <span>Média</span>
          </span>
        );
      case 'baixa':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Baixa</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Active Tab Title Translation
  const getTabTitle = () => {
    switch (activeTab) {
      case 'avaliacoes': return 'Fichas de Avaliação Clínica & Anamnese';
      case 'evolucoes': return 'Prontuário de Evoluções & Frequência';
      case 'tcle': return 'Auditoria, TCLE & Contratos Digitais';
      case 'templates': return 'Central de Templates & Scripts da Dra. Elays';
      case 'leads': return 'Funil de Leads & Pacientes em Acompanhamento';
      case 'mensagens': return 'Disparos WhatsApp & Lembretes com 1 Clique';
      case 'automacoes': return 'Automações de Disparos em Lote & Webhooks';
      case 'ia_clinica': return 'Assistente Fisiolys com IA Clínica';
      case 'analytics': return 'Painel de Desempenho & Métricas Clínicas';
      case 'tarefas': return 'Lembretes & Tarefas Clínicas';
      default: return 'CRM & Gestão Clínica • Dra. Elays Marinho';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26241F] font-sans antialiased flex flex-col lg:flex-row shadow-2xl rounded-3xl overflow-hidden border border-[#E4DCC8] my-2">
      
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-72 bg-[#1B2E24] text-[#FAF7F0] shrink-0 flex flex-col justify-between border-r border-[#16251D] p-4 lg:p-5 select-none">
        
        {/* Brand Top Header */}
        <div className="space-y-5">
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="w-10 h-10 rounded-full bg-[#FAF7F0] p-1 flex items-center justify-center border-2 border-[#DCC58F] shadow-md overflow-hidden shrink-0">
              <img 
                src={fisiolysLogoImg} 
                alt="Fisiolys Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#FAF7F0] tracking-tight flex items-center">
                <span>Fisiolys</span>
              </h2>
              <span className="block text-[9px] uppercase tracking-wider text-[#DCC58F] font-bold">
                DRA. ELAYS MARINHO · CRM & CLÍNICA
              </span>
            </div>
          </div>

          {/* Navigation Menu List Organizado por Seções */}
          <nav className="space-y-4">
            
            {/* SEÇÃO 1: CLÍNICA & PRONTUÁRIO */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DCC58F] px-2 block">
                📋 Prontuário & Templates
              </span>

              {/* Fichas de Avaliação */}
              <button
                id="crm-tab-avaliacoes"
                onClick={() => setActiveTab('avaliacoes')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'avaliacoes'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40 ring-1 ring-[#DCC58F]/30'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className={`w-4 h-4 ${activeTab === 'avaliacoes' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">Fichas de Avaliação</span>
                </div>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#16251D] text-[#DCC58F]">
                  {avaliacoes.length}
                </span>
              </button>

              {/* Evoluções & Frequência */}
              <button
                id="crm-tab-evolucoes"
                onClick={() => setActiveTab('evolucoes')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'evolucoes'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40 ring-1 ring-[#DCC58F]/30'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <TrendingUp className={`w-4 h-4 ${activeTab === 'evolucoes' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">Evoluções & Sessões</span>
                </div>
              </button>

              {/* TCLE & Contratos */}
              <button
                id="crm-tab-tcle"
                onClick={() => setActiveTab('tcle')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'tcle'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40 ring-1 ring-[#DCC58F]/30'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className={`w-4 h-4 ${activeTab === 'tcle' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">TCLE & Contratos</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#16251D] text-emerald-300">
                  COFFITO
                </span>
              </button>

              {/* Templates da Dra. Elays */}
              <button
                id="crm-tab-templates"
                onClick={() => setActiveTab('templates')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'templates'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40 ring-1 ring-[#DCC58F]/30'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <BookOpen className={`w-4 h-4 ${activeTab === 'templates' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate font-bold">Templates da Dra. Elays</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-linear-to-r from-[#DCC58F] to-[#B08A3E] text-[#1B2E24]">
                  Novo
                </span>
              </button>
            </div>

            {/* SEÇÃO 2: COMUNICAÇÃO & ATENDIMENTO */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DCC58F] px-2 block">
                💬 Comunicação & Funil
              </span>

              {/* Funil de Leads & Pacientes */}
              <button
                id="crm-tab-leads"
                onClick={() => setActiveTab('leads')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'leads'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Users className={`w-4 h-4 ${activeTab === 'leads' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">Funil de Leads & Pacientes</span>
                </div>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#16251D] text-[#DCC58F]">
                  {leads.length || 6}
                </span>
              </button>

              {/* Disparos WhatsApp */}
              <button
                id="crm-tab-mensagens"
                onClick={() => setActiveTab('mensagens')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'mensagens'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Send className={`w-4 h-4 ${activeTab === 'mensagens' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">Disparos WhatsApp 1-Clique</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#16251D] text-[#DCC58F]">
                  1-Clique
                </span>
              </button>

              {/* Automações & Webhooks */}
              <button
                id="crm-tab-automacoes"
                onClick={() => setActiveTab('automacoes')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'automacoes'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Zap className={`w-4 h-4 ${activeTab === 'automacoes' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">Automações & Webhooks</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#16251D] text-emerald-300">
                  API
                </span>
              </button>
            </div>

            {/* SEÇÃO 3: INTELIGÊNCIA & GESTÃO */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DCC58F] px-2 block">
                🧠 Inteligência & Gestão
              </span>

              {/* Assistente IA Clínica */}
              <button
                id="crm-tab-ia-clinica"
                onClick={() => setActiveTab('ia_clinica')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'ia_clinica'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Bot className={`w-4 h-4 ${activeTab === 'ia_clinica' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">Assistente IA Clínica</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-linear-to-r from-amber-500 to-amber-600 text-white">
                  IA PRO
                </span>
              </button>

              {/* Desempenho & Analytics */}
              <button
                id="crm-tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Activity className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">Desempenho & Métricas</span>
                </div>
              </button>

              {/* Lembretes & Tarefas */}
              <button
                id="crm-tab-tarefas"
                onClick={() => setActiveTab('tarefas')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'tarefas'
                    ? 'bg-[#243F30] text-[#DCC58F] shadow-sm font-bold border border-[#B08A3E]/40'
                    : 'text-[#C9D1C8] hover:text-white hover:bg-[#20372B]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <CheckSquare className={`w-4 h-4 ${activeTab === 'tarefas' ? 'text-[#DCC58F]' : 'text-[#8EA593]'}`} />
                  <span className="truncate">Lembretes & Tarefas</span>
                </div>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#16251D] text-[#DCC58F]">
                  {tasks.filter(t => !t.concluida).length}
                </span>
              </button>
            </div>

          </nav>
        </div>

        {/* Notice for Clinical Records in Prontuário */}
        <div className="mt-4 p-3 bg-[#16271E] rounded-xl border border-[#2B4536] text-[11px] text-[#A2ADA5] space-y-1">
          <span className="font-bold text-[#DCC58F] block">📋 Prontuário Clínico:</span>
          <p className="text-[10px] leading-relaxed">
            Evoluções do paciente, fichas de avaliação e TCLE estão salvos com sigilo ético na área exclusiva de Prontuário da Dra. Elays.
          </p>
        </div>

        {/* Mascot Bottom Card Widget (Matching Screenshot) */}
        <div className="mt-6 pt-4 border-t border-[#233B2E] space-y-3">
          <div className="bg-[#14231A] rounded-2xl p-3.5 border border-[#263F32] flex items-center space-x-3 shadow-md">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#DCC58F] shrink-0 bg-[#FAF7F0]">
              <img 
                src={mascotLysImg} 
                alt="Mascote Fisiolys" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-[#FAF7F0] truncate">Mascote Fisiolys</span>
              <span className="block text-[10px] text-[#A2ADA5] truncate">Dra. Elays Marinho</span>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-300 font-medium">Gemini High Thinking • ATIVO</span>
              </div>
            </div>
          </div>

          {onBackToSite && (
            <button
              onClick={onBackToSite}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[#243F30] hover:bg-[#2D4E3C] text-[#FAF7F0] rounded-xl text-xs font-semibold transition-all cursor-pointer border border-[#3A5D4A]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#DCC58F]" />
              <span>Voltar ao Site</span>
            </button>
          )}
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col overflow-y-auto max-h-[95vh] bg-[#FAF7F0]">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#FAF7F0]/95 backdrop-blur-md px-6 py-4 border-b border-[#E4DCC8] flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-serif font-bold text-[#1B2E24] tracking-tight">
              {getTabTitle()}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {/* Global Search Bar */}
            <div className="relative hidden sm:block w-48 lg:w-64">
              <Search className="w-3.5 h-3.5 text-[#8C8270] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Busca... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-full text-[#1B2E24] focus:outline-hidden focus:ring-2 focus:ring-[#B08A3E] font-medium"
              />
            </div>

            {/* IA Gemini Badge */}
            <span className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>IA Gemini</span>
            </span>

            {/* Quick Add Button */}
            <button
              onClick={() => handleOpenLeadModal()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer border border-[#DCC58F]/40"
              title="Cadastrar Novo Lead"
            >
              <Plus className="w-4 h-4 text-[#DCC58F]" />
              <span className="hidden sm:inline">Novo Lead</span>
            </button>

            {/* User Profile Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#1B2E24] text-[#DCC58F] border border-[#B08A3E]/50 flex items-center justify-center text-xs font-bold shadow-sm shrink-0 font-serif">
              EM
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* ========================================================================= */}
          {/* HERO & METRICS (Shown for Leads and Analytics tabs) */}
          {/* ========================================================================= */}
          {(activeTab === 'leads' || activeTab === 'analytics') && (
            <>
              {/* HERO WELCOME CARD (Green banner matching IMG_0207.png) */}
              <section className="bg-linear-to-r from-[#1B2E24] via-[#223B2E] to-[#1B2E24] rounded-3xl p-6 text-[#FAF7F0] relative overflow-hidden border border-[#2F4D3C] shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
              <div className="space-y-2.5 max-w-xl">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#294637] text-[#DCC58F] text-[11px] font-bold border border-[#3E6550] shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#DCC58F]" />
                  <span>Clínica Fisiolys & Pilates</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#FAF7F0] tracking-tight">
                  Olá, Dra. Elays Marinho!
                </h2>
                <p className="text-xs sm:text-sm text-[#D1DDD5] leading-relaxed">
                  Seu mascote Fisiolys e o assistente de IA estão prontos para apoiar seus atendimentos, fichas clínicas e comunicação com pacientes.
                </p>
              </div>

              {/* Framed Mascot Image */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#FAF7F0] p-1.5 border-3 border-[#DCC58F] shadow-xl overflow-hidden">
                  <img 
                    src={mascotLysImg} 
                    alt="Mascote Fisiolys" 
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#DCC58F] text-[#1B2E24] text-[9px] font-bold shadow-md border border-white">
                  CRM PRO
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 4 TOP METRIC CARDS (Matching IMG_0207.png) */}
          {/* ========================================================================= */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: TOTAL DE LEADS */}
            <div className="bg-[#FAF7F0] rounded-2xl p-4 sm:p-5 border border-[#E4DCC8] shadow-xs space-y-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-[#736B5E] block">
                TOTAL DE LEADS
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#1B2E24]">
                  {leads.length || 6}
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>Funil Ativo</span>
              </span>
            </div>

            {/* Card 2: EM ATENDIMENTO */}
            <div className="bg-[#FAF7F0] rounded-2xl p-4 sm:p-5 border border-[#E4DCC8] shadow-xs space-y-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-[#736B5E] block">
                EM ATENDIMENTO
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#1B2E24]">
                  {leads.filter(l => l.status === 'conversa' || l.status === 'novo').length || 3}
                </span>
              </div>
              <span className="text-[11px] font-medium text-amber-700 flex items-center space-x-1">
                <span>🏷️</span>
                <span>{leads.filter(l => l.status === 'novo').length || 1} novos</span>
              </span>
            </div>

            {/* Card 3: AGENDADOS */}
            <div className="bg-[#FAF7F0] rounded-2xl p-4 sm:p-5 border border-[#E4DCC8] shadow-xs space-y-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-[#736B5E] block">
                AGENDADOS
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#1B2E24]">
                  {leads.filter(l => l.status === 'agendado').length || 1}
                </span>
              </div>
              <span className="text-[11px] font-medium text-purple-700 flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Na Agenda</span>
              </span>
            </div>

            {/* Card 4: PACIENTES ATIVOS */}
            <div className="bg-[#FAF7F0] rounded-2xl p-4 sm:p-5 border border-[#E4DCC8] shadow-xs space-y-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-[#736B5E] block">
                PACIENTES ATIVOS
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#1B2E24]">
                  {leads.filter(l => l.status === 'paciente').length || 2}
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 flex items-center space-x-1">
                <span>🏷️</span>
                <span>33% adesão</span>
              </span>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* RECHARTS ANALYTICS PANEL (Matching screenshot Atendimentos Realizados) */}
          {/* ========================================================================= */}
          <section className="bg-[#FAF7F0] rounded-3xl p-5 sm:p-6 border border-[#E4DCC8] shadow-md space-y-6">
            
            {/* Header of Chart Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center shrink-0 shadow-sm border border-[#B08A3E]/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base sm:text-lg font-serif font-bold text-[#1B2E24]">
                      Atendimentos Realizados e Novas Avaliações por Mês
                    </h3>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Recharts Analytics
                    </span>
                  </div>
                  <p className="text-xs text-[#736B5E]">
                    Monitoramento da evolução mensal de sessões fisioterapêuticas e novos pacientes avaliados
                  </p>
                </div>
              </div>

              {/* Chart Controls */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="bg-[#F3EEE2] p-1 rounded-xl border border-[#E4DCC8] flex items-center space-x-1 text-xs">
                  <button
                    onClick={() => setChartType('misto')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      chartType === 'misto'
                        ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                        : 'text-[#5B5A52] hover:text-[#1B2E24]'
                    }`}
                  >
                    Misto
                  </button>
                  <button
                    onClick={() => setChartType('barras')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      chartType === 'barras'
                        ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                        : 'text-[#5B5A52] hover:text-[#1B2E24]'
                    }`}
                  >
                    Barras
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      chartType === 'area'
                        ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                        : 'text-[#5B5A52] hover:text-[#1B2E24]'
                    }`}
                  >
                    Área
                  </button>
                </div>

                <div className="px-3 py-1.5 bg-[#F3EEE2] text-[#26241F] rounded-xl text-xs font-semibold border border-[#E4DCC8] flex items-center space-x-1 cursor-pointer">
                  <span>Últimos 6 Meses</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#5B5A52]" />
                </div>
              </div>
            </div>

            {/* Sub-Metrics Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#736B5E] block">
                    TOTAL DE ATENDIMENTOS
                  </span>
                  <span className="text-xl font-bold font-mono text-[#1B2E24]">
                    18
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Sessões / mês
                </span>
              </div>

              <div className="p-3.5 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#736B5E] block">
                    NOVAS AVALIAÇÕES
                  </span>
                  <span className="text-xl font-bold font-mono text-[#1B2E24]">
                    4
                  </span>
                </div>
                <span className="text-xs font-bold text-[#B08A3E] bg-[#DCC58F]/20 px-2.5 py-1 rounded-lg border border-[#B08A3E]/30">
                  0.7 avaliações / mês
                </span>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'misto' ? (
                  <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4DCC8" vertical={false} />
                    <XAxis dataKey="mes" stroke="#736B5E" fontSize={12} tickLine={false} />
                    <YAxis stroke="#736B5E" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1B2E24', borderColor: '#B08A3E', borderRadius: '12px', color: '#FAF7F0', fontSize: '12px' }}
                      itemStyle={{ color: '#DCC58F' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="sessoes" name="Atendimentos / Sessões" fill="#2E5A44" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="avaliacoes" name="Novas Avaliações" stroke="#DCC58F" strokeWidth={3} dot={{ r: 5, fill: '#1B2E24', stroke: '#DCC58F', strokeWidth: 2 }} />
                  </ComposedChart>
                ) : chartType === 'barras' ? (
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4DCC8" vertical={false} />
                    <XAxis dataKey="mes" stroke="#736B5E" fontSize={12} tickLine={false} />
                    <YAxis stroke="#736B5E" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1B2E24', borderColor: '#B08A3E', borderRadius: '12px', color: '#FAF7F0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="sessoes" name="Atendimentos" fill="#1B2E24" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avaliacoes" name="Avaliações" fill="#B08A3E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSessoes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E5A44" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2E5A44" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4DCC8" vertical={false} />
                    <XAxis dataKey="mes" stroke="#736B5E" fontSize={12} tickLine={false} />
                    <YAxis stroke="#736B5E" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1B2E24', borderColor: '#B08A3E', borderRadius: '12px', color: '#FAF7F0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="sessoes" name="Atendimentos" stroke="#2E5A44" fillOpacity={1} fill="url(#colorSessoes)" />
                    <Line type="monotone" dataKey="avaliacoes" name="Avaliações" stroke="#DCC58F" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>
          </>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: LEADS & PACIENTES */}
          {/* ========================================================================= */}
          {activeTab === 'leads' && (
            <section className="space-y-4 animate-in fade-in duration-200">
              
              {/* Action Toolbar */}
              <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#E4DCC8] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                
                {/* Priority & Status Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Priority Selector */}
                  <div className="flex items-center space-x-1 bg-[#F3EEE2] p-1 rounded-xl border border-[#E4DCC8]">
                    <span className="text-[11px] font-bold text-[#736B5E] px-2">Prioridade:</span>
                    <button
                      onClick={() => setFilterPriority('todas')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                        filterPriority === 'todas'
                          ? 'bg-[#1B2E24] text-[#FAF7F0]'
                          : 'text-[#5B5A52] hover:text-[#1B2E24]'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setFilterPriority('alta')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                        filterPriority === 'alta'
                          ? 'bg-rose-700 text-white'
                          : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      <Flame className="w-3 h-3" />
                      <span>Alta</span>
                    </button>
                    <button
                      onClick={() => setFilterPriority('media')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                        filterPriority === 'media'
                          ? 'bg-amber-600 text-white'
                          : 'text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>Média</span>
                    </button>
                    <button
                      onClick={() => setFilterPriority('baixa')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                        filterPriority === 'baixa'
                          ? 'bg-emerald-700 text-white'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Baixa</span>
                    </button>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl text-[#1B2E24] focus:ring-2 focus:ring-[#B08A3E]"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="novo">Novos Leads</option>
                    <option value="conversa">Em Conversa</option>
                    <option value="agendado">Agendados</option>
                    <option value="paciente">Pacientes Fisiolys</option>
                    <option value="perdido">Perdidos</option>
                  </select>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-search-agenda-patients-leads-bar"
                    onClick={() => setShowAgendaSearchModal(true)}
                    className="px-3.5 py-2 bg-[#FAF7F0] hover:bg-white text-[#1B2E24] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border-2 border-[#B08A3E]"
                    title="Buscar qualquer paciente cadastrado na agenda da clínica para envio de mensagens WhatsApp e conversão em lead"
                  >
                    <Search className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <span>🔍 Buscar Nome na Agenda</span>
                  </button>

                  <button
                    id="btn-native-mobile-calendar-leads-bar"
                    onClick={() => setShowContactSyncModal(true)}
                    className="px-3.5 py-2 bg-[#FAF7F0] hover:bg-white text-[#1B2E24] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border-2 border-[#B08A3E]"
                    title="Agenda nativa por toque direto no Google Chrome no celular e sincronização de contatos Google"
                  >
                    <Smartphone className="w-4 h-4 text-[#B08A3E]" />
                    <span>📱 Agenda Nativa Celular & Contatos Google</span>
                  </button>

                  <button
                    id="btn-crm-batch-whatsapp-dispatch-main"
                    onClick={() => {
                      setAutoMsgFilterMode('all');
                      setShowAutoMsgModal(true);
                    }}
                    className="px-3.5 py-2 bg-[#243F30] hover:bg-[#2D4E3C] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-[#DCC58F]/60"
                  >
                    <Send className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>⚡ Disparo em Lote WhatsApp</span>
                  </button>

                  <button
                    onClick={handleExportCsv}
                    className="px-3.5 py-2 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-[#E4DCC8]"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <span>Exportar CSV</span>
                  </button>

                  <button
                    onClick={() => handleOpenLeadModal()}
                    className="px-3.5 py-2 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-[#DCC58F]/50"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Novo Lead</span>
                  </button>
                </div>

              </div>

              {/* Quick Batch WhatsApp Dispatches & Care Tools Bar */}
              <div className="bg-[#FAF7F0] p-3.5 rounded-2xl border border-[#E4DCC8] shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#1B2E24] flex items-center space-x-1.5 mr-1">
                    <Send className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <span>Disparos Rápidos em Lote:</span>
                  </span>

                  {/* Button: Buscar na Agenda */}
                  <button
                    id="btn-whatsapp-batch-search-agenda"
                    onClick={() => setShowAgendaSearchModal(true)}
                    className="px-3.5 py-1.5 bg-white hover:bg-[#F3EEE2] text-[#1B2E24] text-xs font-bold rounded-xl border-2 border-[#B08A3E] shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    title="Buscar qualquer paciente na agenda para disparar lembrete ou confirmação"
                  >
                    <Search className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <span>🔍 Buscar Nome na Agenda ({clinicAppointments.length + clinicPatients.length})</span>
                  </button>

                  {/* Button: Lembretes de Hoje with Dynamic Urgency Colors */}
                  <button
                    id="btn-whatsapp-batch-today"
                    onClick={() => {
                      setAutoMsgFilterMode('today');
                      setShowAutoMsgModal(true);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border ${
                      hasHighUrgencyToday
                        ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/60 shadow-md animate-pulse'
                        : pendingTodayCount > 0
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-white hover:bg-[#F3EEE2] text-[#1B2E24] border-[#E4DCC8]'
                    }`}
                    title={
                      hasHighUrgencyToday
                        ? `🚨 URGÊNCIA ALTA: ${pendingTodayCount} agendamentos pendentes para hoje! Clique para disparar confirmações imediatamente.`
                        : `Filtrar pacientes com sessão agendada para hoje (${pendingTodayCount} agendados) e abrir disparo em lote`
                    }
                  >
                    <Clock className={`w-3.5 h-3.5 ${hasHighUrgencyToday ? 'text-white' : 'text-emerald-600'}`} />
                    <span>
                      {hasHighUrgencyToday
                        ? `🔥 Lembretes de Hoje (${pendingTodayCount} Pendentes)`
                        : `Lembretes de Hoje${pendingTodayCount > 0 ? ` (${pendingTodayCount})` : ''}`}
                    </span>
                    {hasHighUrgencyToday && (
                      <span className="px-1.5 py-0.2 bg-white text-rose-700 font-black rounded-full text-[9px] uppercase tracking-wider">
                        Urgente
                      </span>
                    )}
                  </button>

                  {/* Button: Lembretes de Amanhã */}
                  <button
                    id="btn-whatsapp-batch-tomorrow"
                    onClick={() => {
                      setAutoMsgFilterMode('tomorrow');
                      setShowAutoMsgModal(true);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-[#F3EEE2] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    title="Filtrar pacientes com sessão agendada para amanhã e abrir disparo em lote"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lembretes de Amanhã</span>
                  </button>

                  {/* Button: Disparo de Aniversariantes do Mês (Requested) */}
                  <button
                    id="btn-whatsapp-batch-birthdays"
                    onClick={() => {
                      setAutoMsgFilterMode('birthdays');
                      setShowAutoMsgModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-bold rounded-xl border border-rose-200 shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    title="Filtrar pacientes aniversariantes do mês atual e disparar felicitações carinhosas"
                  >
                    <Cake className="w-4 h-4 text-rose-600 animate-bounce" />
                    <span>🎂 Disparo de Aniversariantes do Mês</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDailyWisdomModal(true)}
                    className="px-3 py-1.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    title="Enviar pílulas diárias com versículos bíblicos e frases motivacionais"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>📖 Pílula Diária</span>
                  </button>

                  <button
                    onClick={() => setShowComplianceModal(true)}
                    className="px-3 py-1.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-[#DCC58F]/40"
                    title="Verificar integridade criptográfica de assinaturas digitais"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>🛡️ Conformidade & TCLE</span>
                  </button>
                </div>
              </div>

              {/* Agenda Quick Search Helper Banner */}
              {searchQuery && (
                <div className="bg-amber-50/90 border border-amber-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center space-x-2 text-amber-900">
                    <Search className="w-4 h-4 text-[#B08A3E] shrink-0" />
                    <span>
                      Filtrando leads por "<strong>{searchQuery}</strong>". Se você deseja buscar o paciente diretamente na agenda clínica geral:
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAgendaSearchModal(true)}
                    className="px-3.5 py-1.5 bg-[#1B2E24] text-[#DCC58F] rounded-xl font-bold hover:bg-[#243F30] transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center space-x-1.5"
                  >
                    <Search className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Buscar "{searchQuery}" na Agenda Clínica</span>
                  </button>
                </div>
              )}

              {/* Leads Grid / Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="bg-[#FAF7F0] rounded-2xl p-4 border border-[#E4DCC8] shadow-xs hover:shadow-md transition-all space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#1B2E24]">{lead.nome}</h4>
                        <span className="text-xs text-[#736B5E] font-mono">{lead.telefone}</span>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {getStatusBadge(lead.status)}
                        {getPriorityBadge(lead.prioridade)}
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#F3EEE2] rounded-xl text-xs space-y-1 border border-[#E4DCC8]/60">
                      <div className="flex justify-between text-[#736B5E]">
                        <span>Tratamento / Interesse:</span>
                        <span className="font-bold text-[#1B2E24]">{lead.protocolo}</span>
                      </div>
                      <div className="flex justify-between text-[#736B5E]">
                        <span>Origem do Contato:</span>
                        <span className="font-medium text-[#1B2E24]">{lead.origem}</span>
                      </div>
                      {lead.notas && (
                        <p className="text-[11px] text-[#5B5A52] pt-1 border-t border-[#E4DCC8] italic">
                          "{lead.notas}"
                        </p>
                      )}
                    </div>

                    {/* Action Triggers */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#E4DCC8]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-2xs"
                          title="Chamar no WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          id={`btn-lead-direct-agenda-${lead.id}`}
                          onClick={() => handleDirectTouchScheduleForLead(lead)}
                          className="px-2 py-1.5 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-[11px] font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer border border-[#DCC58F]/40 shadow-2xs"
                          title="📱 Agenda nativa por toque direto no Google Chrome no celular (Google Agenda)"
                        >
                          <Smartphone className="w-3 h-3 text-[#DCC58F]" />
                          <span>📱 Agenda</span>
                        </button>
                        <button
                          onClick={() => handleOpenAiMsg(lead)}
                          className="px-2 py-1.5 bg-[#243F30] hover:bg-[#2D4E3C] text-[#DCC58F] text-[11px] font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer border border-[#3E6550]"
                          title="Gerar Mensagem com IA"
                        >
                          <Brain className="w-3 h-3 text-[#DCC58F]" />
                          <span>IA</span>
                        </button>
                      </div>

                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleOpenLeadModal(lead)}
                          className="p-1.5 text-[#736B5E] hover:text-[#1B2E24] rounded-lg hover:bg-[#F3EEE2]"
                          title="Editar Lead"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                          title="Excluir Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MENSAGENS & DISPAROS */}
          {/* ========================================================================= */}
          {activeTab === 'mensagens' && (
            <section className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] p-6 rounded-3xl border border-[#E4DCC8] shadow-sm">
                <div className="max-w-3xl space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-bold text-[#1B2E24]">Central de Disparo Automático WhatsApp</h3>
                      <p className="text-xs text-[#736B5E]">Envie mensagens personalizadas em lote com um clique para pacientes e leads.</p>
                    </div>
                  </div>
                  <CrmAutomatedLeadMessenger 
                    leads={leads} 
                    appointments={appointments}
                    onReload={loadData} 
                    initialFilterMode="all"
                  />
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AUTOMAÇÕES DE DISPAROS EM LOTE & INTEGRAÇÃO VIA WEBHOOKS */}
          {/* ========================================================================= */}
          {activeTab === 'automacoes' && (
            <section className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] p-6 rounded-3xl border border-[#E4DCC8] shadow-sm space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#DCC58F]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#1B2E24]">Automações de Disparos em Lote & Integração via Webhooks</h3>
                    <p className="text-xs text-[#736B5E]">Configure regras de disparo automático para confirmação, lembretes de sessão e integração externa (n8n, Make, Z-API, Evolution API).</p>
                  </div>
                </div>

                {/* Webhook Configuration Module */}
                <AdminWebhook clinic={clinicConfig as ClinicConfig} onReload={loadData} />
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AGENDA CLÍNICA */}
          {/* ========================================================================= */}
          {activeTab === 'agendamentos' && (
            <section className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] p-6 rounded-3xl border border-[#E4DCC8] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#1B2E24]">Agenda de Consultas & Turmas de Pilates</h3>
                    <p className="text-xs text-[#736B5E]">Sincronização por toque direto com o Google Chrome no celular e Google Agenda.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      id="btn-sync-contacts-and-agenda"
                      onClick={() => setShowContactSyncModal(true)}
                      className="px-3.5 py-2 bg-[#FAF7F0] hover:bg-white text-[#1B2E24] rounded-xl text-xs font-bold flex items-center space-x-1.5 border-2 border-[#B08A3E] shadow-xs cursor-pointer"
                      title="Sincronizar com Contatos do Google e Agenda Nativa do Celular (Google Chrome)"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#B08A3E]" />
                      <span>📱 Sincronizar Google Contatos & Agenda</span>
                    </button>

                    <button
                      onClick={handleDownloadFullClinicIcs}
                      className="px-3.5 py-2 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-[#E4DCC8] shadow-xs cursor-pointer"
                      title="Baixar todos os compromissos para a agenda do celular (.ics)"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#B08A3E]" />
                      <span>Sincronizar Tudo (.ics)</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingAppt(null);
                        setShowApptModal(true);
                      }}
                      className="px-4 py-2 bg-[#1B2E24] text-[#FAF7F0] rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm border border-[#DCC58F]/40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#DCC58F]" />
                      <span>Novo Agendamento</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="p-4 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] space-y-3 shadow-xs hover:border-[#B08A3E] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1B2E24]">{getLeadName(appt.leadId, appt.leadNomeAvulso)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.situacao === 'confirmado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {appt.situacao === 'confirmado' ? 'Confirmado' : 'Pendente'}
                        </span>
                      </div>
                      <div className="text-xs text-[#5B5A52] space-y-0.5">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#B08A3E]" />
                          <span className="font-semibold text-[#1B2E24]">{appt.data} às {appt.horario}</span>
                        </div>
                        <p className="text-[#736B5E]">{appt.protocolo}</p>
                      </div>

                      {/* Direct Touch Mobile Calendar Trigger */}
                      <div className="pt-2 border-t border-[#E4DCC8] flex items-center justify-between gap-1">
                        <button
                          onClick={() => handleOpenDirectTouchCalendar(appt)}
                          className="flex-1 px-2.5 py-1.5 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-[11px] font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-xs border border-[#DCC58F]/40 cursor-pointer"
                          title="Toque direto disponível no Google Chrome no celular para abrir a agenda nativa"
                        >
                          <Smartphone className="w-3 h-3 text-[#DCC58F]" />
                          <span>📱 Abrir Agenda Celular</span>
                        </button>

                        <button
                          onClick={() => handleDownloadSingleIcs(appt)}
                          className="p-1.5 bg-white hover:bg-[#FAF7F0] text-[#736B5E] hover:text-[#1B2E24] rounded-xl border border-[#E4DCC8] shadow-xs cursor-pointer"
                          title="Baixar evento .ics para iPhone / Android"
                        >
                          <Download className="w-3.5 h-3.5 text-[#B08A3E]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: LEMBRETES & TAREFAS */}
          {/* ========================================================================= */}
          {activeTab === 'tarefas' && (
            <section className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] p-6 rounded-3xl border border-[#E4DCC8] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#1B2E24]">Lembretes & Tarefas Clínicas</h3>
                    <p className="text-xs text-[#736B5E]">Acompanhe pendências de follow-up, recibos e retornos de pacientes.</p>
                  </div>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="px-4 py-2 bg-[#1B2E24] text-[#FAF7F0] rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm border border-[#DCC58F]/40"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Nova Tarefa</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  {tasks.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        task.concluida 
                          ? 'bg-[#F3EEE2]/60 border-[#E4DCC8] opacity-60' 
                          : 'bg-[#FAF7F0] border-[#E4DCC8] hover:border-[#B08A3E] shadow-xs'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                          task.concluida ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[#8C8270] bg-white'
                        }`}>
                          {task.concluida && <Check className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`text-xs sm:text-sm font-bold ${task.concluida ? 'line-through text-[#8C8270]' : 'text-[#1B2E24]'}`}>
                            {task.titulo}
                          </p>
                          <span className="text-[11px] text-[#736B5E]">Paciente / Alvo: <strong>{task.pacienteOuLead}</strong> • Prazo: {task.dataLimite}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(task.prioridade)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: FICHAS DE AVALIAÇÃO & CONTRATOS */}
          {/* ========================================================================= */}
          {activeTab === 'avaliacoes' && (
            <section className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] p-6 rounded-3xl border border-[#E4DCC8] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#1B2E24]">Fichas de Avaliação Clínica & Contratos</h3>
                    <p className="text-xs text-[#736B5E]">Anamnese ortopédica, escala EVA, termos de imagem/voz (COFFITO 532/2021 & LGPD) e contrato de serviços em PDF.</p>
                  </div>
                  <button
                    onClick={() => handleOpenAvalModal()}
                    className="px-4 py-2 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm border border-[#DCC58F]/40 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Nova Avaliação & Contrato</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {avaliacoes.map((aval) => (
                    <div key={aval.id} className="p-5 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] space-y-3.5 shadow-xs hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-[#1B2E24]">{getLeadName(aval.leadId, aval.leadNomeAvulso)}</h4>
                          <span className="text-xs text-[#736B5E]">
                            {aval.idade ? `${aval.idade} anos` : 'Idade ñ inf.'} {aval.profissao ? `• ${aval.profissao}` : ''} • Data: {aval.data}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            EVA: {aval.escalaDor}/10
                          </span>
                          <button
                            onClick={() => handleOpenAvalModal(aval)}
                            className="p-1 text-[#736B5E] hover:text-[#1B2E24] rounded-lg hover:bg-white transition-colors"
                            title="Editar Ficha de Avaliação"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAval(aval.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Excluir Avaliação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-[#5B5A52] space-y-1 bg-white/70 p-3 rounded-xl border border-[#E4DCC8]/60">
                        <p><strong>Queixa Principal:</strong> {aval.queixaPrincipal || 'Não informada'}</p>
                        <p><strong>Diagnóstico Funcional:</strong> {aval.diagnosticoFuncional || 'Em elaboração'}</p>
                        <p><strong>Plano Terapêutico:</strong> {aval.planoTerapeutico || 'A definir'}</p>
                        {aval.valorTratamento && (
                          <p className="text-[#1B2E24] font-semibold pt-1 border-t border-[#E4DCC8]/50">
                            💰 <strong>Honorários / Plano:</strong> {aval.valorTratamento} {aval.frequenciaSemanal ? `(${aval.frequenciaSemanal})` : ''}
                          </p>
                        )}
                      </div>

                      {/* Exames Anexados Status Badge */}
                      <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#E4DCC8] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center space-x-1.5 text-[#1B2E24] font-bold">
                            <Paperclip className="w-3.5 h-3.5 text-[#B08A3E]" />
                            <span>Exames Anexados:</span>
                          </span>
                          {aval.examesAnexados && aval.examesAnexados.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px] border border-emerald-300">
                              📎 {aval.examesAnexados.length} exame{aval.examesAnexados.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#736B5E] italic">Nenhum exame anexado</span>
                          )}
                        </div>

                        {aval.examesAnexados && aval.examesAnexados.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {aval.examesAnexados.map((exam) => (
                              <button
                                key={exam.id}
                                type="button"
                                onClick={() => setPreviewExam(exam)}
                                className="px-2 py-1 bg-white hover:bg-[#F3EEE2] border border-[#E4DCC8] rounded-lg text-[11px] text-[#1B2E24] font-medium flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                                title="Visualizar Exame / Laudo"
                              >
                                <span>
                                  {exam.tipo === 'raio_x' && '🦴'}
                                  {exam.tipo === 'ressonancia' && '🧠'}
                                  {exam.tipo === 'tomografia' && '🔬'}
                                  {exam.tipo === 'ultrassom' && '📡'}
                                  {exam.tipo === 'laudo_medico' && '📋'}
                                  {exam.tipo === 'outro' && '📁'}
                                </span>
                                <span className="truncate max-w-[140px] font-semibold">{exam.nome}</span>
                                <Eye className="w-3 h-3 text-[#B08A3E] shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Termo de Imagem e Voz Status Badge (COFFITO 532/2021 & LGPD) */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#FAF7F0] rounded-xl border border-[#E4DCC8] text-[11px]">
                        <span className="flex items-center space-x-1.5 text-[#1B2E24] font-medium">
                          <Camera className="w-3.5 h-3.5 text-[#B08A3E]" />
                          <span>Termo Imagem & Voz:</span>
                        </span>
                        {aval.termoImagemVozAceito !== false ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✅ Autorizado ({aval.termoImagemVozTipo === 'interno' ? 'Científico' : 'Completo'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            ❌ Não Autorizado
                          </span>
                        )}
                      </div>

                      {/* Digital Signature Status & Trigger */}
                      <div className="p-3 bg-white rounded-xl border border-[#E4DCC8] space-y-2">
                        {aval.assinaturaPacienteUrl ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-14 h-9 bg-[#FAF7F0] border border-[#E4DCC8] rounded-lg overflow-hidden p-0.5 shrink-0 flex items-center justify-center">
                                <img
                                  src={aval.assinaturaPacienteUrl}
                                  alt="Assinatura"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div>
                                <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Plano Assinado Eletronicamente</span>
                                </span>
                                <span className="block text-[10px] text-[#736B5E] font-mono">
                                  {aval.assinaturaHash ? `Hash: ${aval.assinaturaHash.slice(0, 16)}...` : aval.assinaturaData}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleOpenSignatureModal(aval)}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#1B2E24] hover:text-[#B08A3E] bg-[#FAF7F0] hover:bg-[#F3EEE2] border border-[#E4DCC8] rounded-lg transition-all cursor-pointer"
                              title="Reassinar ou visualizar"
                            >
                              Ver / Alterar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-[11px] text-amber-900 font-semibold">
                              <PenTool className="w-3.5 h-3.5 text-amber-700" />
                              <span>Pendente de Assinatura do Paciente</span>
                            </div>

                            <button
                              onClick={() => handleOpenSignatureModal(aval)}
                              className="px-3 py-1.5 bg-[#B08A3E] hover:bg-[#97732E] text-white text-[11px] font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                            >
                              <PenTool className="w-3 h-3" />
                              <span>✍️ Assinar Plano</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* PDF and Sharing Actions */}
                      <div className="pt-2 border-t border-[#E4DCC8] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          {/* Contrato de Prestação de Serviços PDF */}
                          <button
                            onClick={() => handleGenerateContractPdf(aval)}
                            disabled={generatingContractId === aval.id}
                            className="px-3 py-1.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer border border-[#DCC58F]/40"
                            title="Gerar Contrato de Prestação de Serviços Fisioterapêuticos em PDF (COFFITO / LGPD)"
                          >
                            <ScrollText className="w-3.5 h-3.5 text-[#DCC58F]" />
                            <span>{generatingContractId === aval.id ? 'Gerando...' : 'Contrato PDF'}</span>
                          </button>

                          {/* Share Contract WhatsApp */}
                          <button
                            onClick={() => handleShareContractWhatsApp(aval)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
                            title="Enviar Contrato via WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Laudo Clínico PDF */}
                          <button
                            onClick={() => handleGeneratePdfReport(aval)}
                            disabled={generatingPdfId === aval.id}
                            className="px-2.5 py-1.5 bg-white hover:bg-[#FAF7F0] text-[#1B2E24] text-xs font-bold rounded-xl flex items-center space-x-1 border border-[#E4DCC8] shadow-xs transition-all cursor-pointer"
                            title="Baixar laudo e ficha de avaliação completa"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#B08A3E]" />
                            <span>{generatingPdfId === aval.id ? '...' : 'Laudo PDF'}</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedAvalForEvol(aval);
                            setActiveTab('evolucoes');
                          }}
                          className="text-xs text-[#1B2E24] font-bold hover:underline"
                        >
                          Ver Evoluções ({aval.evolucoes?.length || 0}) →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: EVOLUÇÕES (PRONTUÁRIO & FREQUÊNCIA) */}
          {/* ========================================================================= */}
          {activeTab === 'evolucoes' && (
            <section className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] p-6 rounded-3xl border border-[#E4DCC8] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#1B2E24]">Prontuário de Evoluções & Frequência</h3>
                    <p className="text-xs text-[#736B5E]">Acompanhe tag de frequência (presença/realizadas ex: 1/10), datas e evolução da dor.</p>
                  </div>
                </div>

                {selectedAvalForEvol ? (
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 bg-[#1B2E24] text-[#FAF7F0] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-[#DCC58F]/30">
                      <div>
                        <span className="text-[10px] uppercase text-[#DCC58F] font-bold tracking-wider">Paciente Selecionado:</span>
                        <h4 className="text-base sm:text-lg font-serif font-bold">{getLeadName(selectedAvalForEvol.leadId, selectedAvalForEvol.leadNomeAvulso)}</h4>
                        <span className="text-xs text-[#E4DCC8]/80 block">
                          Diagnóstico: {selectedAvalForEvol.diagnosticoFuncional || 'Lombalgia / Pilates Clínico'} • {selectedAvalForEvol.frequenciaSemanal || '2x por semana'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEvolModal(undefined, selectedAvalForEvol)}
                          className="px-4 py-2 bg-[#DCC58F] hover:bg-[#c9b27b] text-[#1B2E24] text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Registrar Nova Sessão / Frequência</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedAvalForEvol.evolucoes && selectedAvalForEvol.evolucoes.length > 0 ? (
                        selectedAvalForEvol.evolucoes.map((ev) => {
                          const tagLabel = ev.quantidadeRealizada || `${ev.sessao}/${ev.totalSessoesPlano || 10}`;
                          const status = ev.presencaStatus || 'presente';

                          return (
                            <div key={ev.id} className="p-4 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] hover:border-[#B08A3E] transition-all space-y-2.5 shadow-2xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Tag de Frequência / Sessões Realizadas */}
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#1B2E24] text-[#DCC58F] border border-[#DCC58F]/40 flex items-center space-x-1">
                                    <span>🏷️</span>
                                    <span>Frequência: {tagLabel}</span>
                                  </span>

                                  {/* Tag de Presença */}
                                  {status === 'presente' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      ✅ Presente
                                    </span>
                                  )}
                                  {status === 'falta_justificada' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      ⚠️ Falta Justificada
                                    </span>
                                  )}
                                  {status === 'falta_sem_aviso' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                      ❌ Falta sem Aviso
                                    </span>
                                  )}
                                  {status === 'reposicao' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                      🔄 Sessão de Reposição
                                    </span>
                                  )}

                                  <span className="text-xs text-[#736B5E] font-medium">
                                    📅 Data: <strong>{ev.data}</strong> (Sessão #{ev.sessao})
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-[#1B2E24] border border-[#E4DCC8]">
                                    Dor: <strong className="text-rose-700">{ev.dorAntes}</strong> ➔ <strong className="text-emerald-700">{ev.dorDepois}</strong>
                                  </span>
                                  <button
                                    onClick={() => handleOpenEvolModal(ev, selectedAvalForEvol)}
                                    className="p-1 text-[#736B5E] hover:text-[#1B2E24] rounded-lg hover:bg-white transition-colors"
                                    title="Editar Evolução"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvol(selectedAvalForEvol.id, ev.id)}
                                    className="p-1 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                                    title="Excluir Evolução"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-[#E4DCC8]/70 text-xs text-[#5B5A52] space-y-1">
                                <p><strong>Procedimentos Realizados:</strong> {ev.procedimentos}</p>
                                {ev.observacoes && (
                                  <p className="text-[#736B5E] italic pt-1 border-t border-[#E4DCC8]/40">
                                    <strong>Obs:</strong> {ev.observacoes}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] space-y-2">
                          <Activity className="w-8 h-8 text-[#8C8270] mx-auto opacity-50" />
                          <p className="text-xs text-[#736B5E] font-bold">Nenhuma evolução registrada para este paciente ainda.</p>
                          <button
                            onClick={() => handleOpenEvolModal(undefined, selectedAvalForEvol)}
                            className="px-4 py-2 bg-[#1B2E24] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#DCC58F]" />
                            <span>Registrar Primeira Sessão (Ex: 1/10)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] space-y-3">
                    <p className="text-xs text-[#736B5E] font-medium">Selecione um paciente na aba de Avaliações para gerenciar o prontuário de frequência e sessões.</p>
                    <button
                      onClick={() => setActiveTab('avaliacoes')}
                      className="px-4 py-2 bg-[#1B2E24] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Ir para Fichas de Avaliação →
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: AUDITORIA & TCLE (PAINEL DE CONFORMIDADE E ASSINATURAS DIGITAIS) */}
          {/* ========================================================================= */}
          {activeTab === 'tcle' && (
            <section className="space-y-4 animate-in fade-in duration-200">
              <CrmComplianceDashboard
                avaliacoes={avaliacoes}
                getLeadName={getLeadName}
                clinicConfig={clinicConfig}
                onOpenSignatureModal={handleOpenSignatureModal}
                isEmbedded={true}
              />
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: ASSISTENTE FISIOLYS (IA PRO) */}
          {/* ========================================================================= */}
          {activeTab === 'ia_clinica' && (
            <section className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] p-6 rounded-3xl border border-[#E4DCC8] shadow-sm space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center">
                    <Brain className="w-5 h-5 text-[#DCC58F]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#1B2E24]">Assistente Clínico Gemini com High Thinking</h3>
                    <p className="text-xs text-[#736B5E]">Tire dúvidas biomecânicas, elabore notas SOAP e receba sugestões terapêuticas da Dra. Elays.</p>
                  </div>
                </div>

                <div className="h-[600px] rounded-2xl overflow-hidden border border-[#E4DCC8]">
                  <GeminiChatbot className="h-full" />
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 9: CENTRAL DE TEMPLATES DA DRA. ELAYS */}
          {/* ========================================================================= */}
          {activeTab === 'templates' && (
            <section className="space-y-4 animate-in fade-in duration-200">
              <CrmTemplatesLibrary clinicConfig={clinicConfig} />
            </section>
          )}

          {/* ========================================================================= */}
          {/* TAB 10: ANALYTICS & MÉTRICAS DEDICADAS */}
          {/* ========================================================================= */}
          {activeTab === 'analytics' && (
            <section className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-[#FAF7F0] p-6 rounded-3xl border border-[#E4DCC8] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center">
                      <Activity className="w-5 h-5 text-[#DCC58F]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-bold text-[#1B2E24]">Desempenho & Métricas Clínicas da Dra. Elays</h3>
                      <p className="text-xs text-[#736B5E]">Estatísticas detalhadas de retenção, novos agendamentos e adesão ao tratamento.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8]">
                    <span className="text-xs font-bold text-[#736B5E] block uppercase">Taxa de Conversão</span>
                    <span className="text-2xl font-bold font-mono text-[#1B2E24]">33.3%</span>
                    <span className="text-[11px] text-emerald-700 block mt-1">Leads para Pacientes Ativos</span>
                  </div>
                  <div className="p-4 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8]">
                    <span className="text-xs font-bold text-[#736B5E] block uppercase">Fichas de Avaliação</span>
                    <span className="text-2xl font-bold font-mono text-[#1B2E24]">{avaliacoes.length}</span>
                    <span className="text-[11px] text-purple-700 block mt-1">Com TCLE e contrato COFFITO</span>
                  </div>
                  <div className="p-4 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8]">
                    <span className="text-xs font-bold text-[#736B5E] block uppercase">Evoluções Registradas</span>
                    <span className="text-2xl font-bold font-mono text-[#1B2E24]">6</span>
                    <span className="text-[11px] text-emerald-700 block mt-1">Sessões acompanhadas</span>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* MODAL: NOVO / EDITAR LEAD */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#E4DCC8] space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <h3 className="text-base font-serif font-bold text-[#1B2E24]">
                {editingLead ? 'Editar Lead' : 'Cadastrar Novo Lead'}
              </h3>
              <button onClick={() => setShowLeadModal(false)} className="p-1 rounded-full text-[#736B5E] hover:text-[#1B2E24]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Vasconcelos"
                  value={leadForm.nome}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(93) 99123-4567"
                    value={leadForm.telefone}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, telefone: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Prioridade</label>
                  <select
                    value={leadForm.prioridade || 'media'}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, prioridade: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                  >
                    <option value="alta">🔥 Alta Prioridade</option>
                    <option value="media">⚡ Média</option>
                    <option value="baixa">🌱 Baixa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Tratamento / Interesse</label>
                  <input
                    type="text"
                    value={leadForm.protocolo}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, protocolo: e.target.value }))}
                    placeholder="Ex: Pilates clássico, Dor lombar"
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Status no Funil</label>
                  <select
                    value={leadForm.status}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                  >
                    <option value="novo">Novo Lead</option>
                    <option value="conversa">Em Conversa</option>
                    <option value="agendado">Agendado</option>
                    <option value="paciente">Paciente Fisiolys</option>
                    <option value="perdido">Perdido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Observações Clínicas / Queixa</label>
                <textarea
                  rows={2}
                  value={leadForm.notas}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Relato de dor, horários de preferência..."
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E4DCC8]">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2 bg-[#F3EEE2] text-[#1B2E24] rounded-full text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B2E24] text-[#FAF7F0] rounded-full text-xs font-bold shadow-md"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA TAREFA */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#E4DCC8] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <h3 className="text-base font-serif font-bold text-[#1B2E24]">Cadastrar Nova Tarefa</h3>
              <button onClick={() => setShowTaskModal(false)} className="p-1 rounded-full text-[#736B5E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Título da Tarefa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Enviar orientações posturais..."
                  value={newTaskForm.titulo}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Paciente ou Lead</label>
                <input
                  type="text"
                  placeholder="Ex: Maria Fernanda"
                  value={newTaskForm.pacienteOuLead}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, pacienteOuLead: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Prioridade</label>
                  <select
                    value={newTaskForm.prioridade}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, prioridade: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                  >
                    <option value="alta">🔥 Alta</option>
                    <option value="media">⚡ Média</option>
                    <option value="baixa">🌱 Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Data Limite</label>
                  <input
                    type="date"
                    value={newTaskForm.dataLimite}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, dataLimite: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E4DCC8]">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-[#F3EEE2] text-[#1B2E24] rounded-full text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B2E24] text-[#FAF7F0] rounded-full text-xs font-bold shadow-md"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MENSAGEM IA SUGERIDA */}
      {aiMsgModalLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#E4DCC8] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-[#B08A3E]" />
                <h3 className="text-base font-serif font-bold text-[#1B2E24]">Mensagem Inteligente Gemini</h3>
              </div>
              <button onClick={() => setAiMsgModalLead(null)} className="p-1 rounded-full text-[#736B5E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingAiMsg ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#B08A3E] mx-auto" />
                <p className="text-xs text-[#736B5E] font-medium">Elaborando mensagem personalizada para {aiMsgModalLead.nome}...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#736B5E]">Mensagem gerada com base no interesse ({aiMsgModalLead.protocolo}):</p>
                <textarea
                  rows={4}
                  value={suggestedMsgText}
                  onChange={(e) => setSuggestedMsgText(e.target.value)}
                  className="w-full p-3 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-2xl text-[#1B2E24] font-medium"
                />
                <div className="flex justify-end space-x-2 pt-2">
                  <a
                    href={`https://wa.me/55${aiMsgModalLead.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(suggestedMsgText)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-md flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar no WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DISPARO AUTOMÁTICO */}
      {showAutoMsgModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-[#E4DCC8] space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <h3 className="text-base font-serif font-bold text-[#1B2E24]">Respostas Rápidas & Disparo de Mensagens WhatsApp</h3>
              <button 
                onClick={() => {
                  setShowAutoMsgModal(false);
                  setAutoMsgLead(null);
                }} 
                className="p-1 rounded-full text-[#736B5E] hover:text-[#1B2E24]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CrmAutomatedLeadMessenger 
              lead={autoMsgLead || undefined}
              leads={leads} 
              appointments={appointments}
              onReload={loadData}
              initialFilterMode={autoMsgFilterMode}
              onOpenAgendaSearch={() => {
                setShowAutoMsgModal(false);
                setAutoMsgLead(null);
                setShowAgendaSearchModal(true);
              }}
              onClose={() => {
                setShowAutoMsgModal(false);
                setAutoMsgLead(null);
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL: BUSCA DE PACIENTES NA AGENDA (INTEGRADA AO CRM & WHATSAPP) */}
      {showAgendaSearchModal && (
        <CrmAgendaPatientSearchModal
          isOpen={showAgendaSearchModal}
          clinicAppointments={clinicAppointments}
          clinicPatients={clinicPatients}
          existingLeads={leads}
          clinicConfig={clinicConfig}
          initialSearchQuery={searchQuery}
          onClose={() => setShowAgendaSearchModal(false)}
          onSelectForMessage={handleSelectAgendaPatientForMessage}
          onImportAsLead={handleImportAgendaPatientAsLead}
          onImportBatchAsLeads={handleImportBatchAgendaPatientsAsLeads}
        />
      )}

      {/* MODAL: PÍLULA DE SABEDORIA DIÁRIA */}
      {showDailyWisdomModal && (
        <CrmDailyWisdomModal
          leads={leads}
          isOpen={showDailyWisdomModal}
          onClose={() => setShowDailyWisdomModal(false)}
        />
      )}

      {/* MODAL: PAINEL DE CONFORMIDADE E AUDITORIA TCLE */}
      {showComplianceModal && (
        <CrmComplianceDashboard
          avaliacoes={avaliacoes}
          getLeadName={getLeadName}
          clinicConfig={clinicConfig}
          onClose={() => setShowComplianceModal(false)}
          onOpenSignatureModal={(aval) => {
            setShowComplianceModal(false);
            handleOpenSignatureModal(aval);
          }}
        />
      )}

      {/* MODAL: SINCRONIZAÇÃO DE CONTATOS (WHATSAPP & GOOGLE CONTACTS PICKER) */}
      {showContactSyncModal && (
        <CrmContactSyncModal
          existingLeads={leads}
          onImportContacts={handleImportContacts}
          onClose={() => setShowContactSyncModal(false)}
        />
      )}

      {/* MODAL: CAPTURA DE ASSINATURA DIGITAL DO PACIENTE */}
      {showSignatureModal && signingAval && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <DigitalSignaturePad
            patientName={getLeadName(signingAval.leadId, signingAval.leadNomeAvulso)}
            treatmentName={signingAval.planoTerapeutico || 'Plano Fisioterapêutico & Pilates'}
            initialSignatureUrl={signingAval.assinaturaPacienteUrl}
            initialSignatureDate={signingAval.assinaturaData}
            initialSignatureHash={signingAval.assinaturaHash}
            initialDoctorSignatureUrl={signingAval.assinaturaProfissionalUrl}
            onSave={handleSaveSignature}
            onCancel={() => {
              setShowSignatureModal(false);
              setSigningAval(null);
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVA / EDITAR AVALIAÇÃO CLÍNICA & CONTRATO TERAPÊUTICO */}
      {/* ========================================================================= */}
      {showAvalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FAF7F0] rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl border border-[#E4DCC8] space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#1B2E24]">
                    {editingAval ? 'Editar Ficha de Avaliação & Contrato' : 'Nova Avaliação Clínica & Contrato Terapêutico'}
                  </h3>
                  <p className="text-xs text-[#736B5E]">
                    Anamnese ortopédica, escala EVA, TCLE Imagem & Voz (COFFITO 532/2021) e Contrato de Serviços.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAvalModal(false)}
                className="p-1.5 rounded-full text-[#736B5E] hover:text-[#1B2E24] hover:bg-[#F3EEE2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveAval(e)} className="space-y-6">
              
              {/* SECTION 1: IDENTIFICAÇÃO DO PACIENTE */}
              <div className="bg-white/80 p-4 rounded-2xl border border-[#E4DCC8] space-y-3">
                <h4 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-2">
                  <Users className="w-4 h-4 text-[#B08A3E]" />
                  <span>1. Identificação do Paciente</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Vincular a Lead do CRM</label>
                    <select
                      value={avalForm.leadId || ''}
                      onChange={(e) => {
                        const lId = e.target.value;
                        const selLead = leads.find(l => l.id === lId);
                        setAvalForm(prev => ({
                          ...prev,
                          leadId: lId,
                          leadNomeAvulso: selLead ? selLead.nome : prev.leadNomeAvulso,
                          telefone: selLead ? selLead.telefone : prev.telefone,
                          queixaPrincipal: selLead?.notas || prev.queixaPrincipal,
                          planoTerapeutico: selLead ? `Plano personalizado de ${selLead.protocolo}` : prev.planoTerapeutico
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                    >
                      <option value="">-- Paciente Avulso / Não Listado --</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.nome} ({l.protocolo})</option>
                      ))}
                    </select>
                  </div>

                  {!avalForm.leadId && (
                    <div>
                      <label className="block text-xs font-bold text-[#1B2E24] mb-1">Nome do Paciente *</label>
                      <input
                        type="text"
                        required={!avalForm.leadId}
                        placeholder="Nome completo do paciente"
                        value={avalForm.leadNomeAvulso || ''}
                        onChange={(e) => setAvalForm(prev => ({ ...prev, leadNomeAvulso: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">CPF do Paciente (para Contrato)</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={avalForm.cpf || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, cpf: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      placeholder="(93) 99123-4567"
                      value={avalForm.telefone || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, telefone: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Idade</label>
                    <input
                      type="text"
                      placeholder="Ex: 34"
                      value={avalForm.idade || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, idade: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Profissão / Ocupação</label>
                    <input
                      type="text"
                      placeholder="Ex: Arquiteta, Advogado"
                      value={avalForm.profissao || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, profissao: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Data da Avaliação</label>
                    <input
                      type="date"
                      value={avalForm.data || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, data: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Fisioterapeuta Avaliadora</label>
                    <input
                      type="text"
                      value={avalForm.avaliador || 'Dra. Elays Marinho (CREFITO 208058)'}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, avaliador: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold text-[#1B2E24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Endereço Residencial (opcional para contrato)</label>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro, cidade - UF"
                    value={avalForm.endereco || ''}
                    onChange={(e) => setAvalForm(prev => ({ ...prev, endereco: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                  />
                </div>
              </div>

              {/* SECTION 2: ANAMNESE & ESCALA DE DOR EVA */}
              <div className="bg-white/80 p-4 rounded-2xl border border-[#E4DCC8] space-y-4">
                <h4 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#B08A3E]" />
                  <span>2. Anamnese & Escala Visual Analógica (EVA)</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Queixa Principal (QP) *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Descreva a queixa do paciente, tempo de evolução e fatores de alívio/piora..."
                      value={avalForm.queixaPrincipal || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, queixaPrincipal: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                    />
                  </div>

                  {/* Escala de Dor EVA Interativa */}
                  <div className="p-3.5 bg-[#FAF7F0] rounded-xl border border-[#E4DCC8] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#1B2E24] flex items-center space-x-1.5">
                        <span>Intensidade da Dor (Escala EVA):</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          (avalForm.escalaDor || 0) === 0 ? 'bg-emerald-100 text-emerald-800' :
                          (avalForm.escalaDor || 0) <= 3 ? 'bg-emerald-50 text-emerald-700' :
                          (avalForm.escalaDor || 0) <= 6 ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {avalForm.escalaDor || 0} / 10 - {
                            (avalForm.escalaDor || 0) === 0 ? 'Sem Dor' :
                            (avalForm.escalaDor || 0) <= 3 ? 'Dor Leve' :
                            (avalForm.escalaDor || 0) <= 6 ? 'Dor Moderada' :
                            (avalForm.escalaDor || 0) <= 8 ? 'Dor Intensa' : 'Dor Insuportável'
                          }
                        </span>
                      </label>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={avalForm.escalaDor !== undefined ? avalForm.escalaDor : 5}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, escalaDor: parseInt(e.target.value) }))}
                      className="w-full accent-[#B08A3E] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#736B5E] font-bold">
                      <span>0 (Sem dor)</span>
                      <span>3 (Leve)</span>
                      <span>5 (Moderada)</span>
                      <span>7 (Intensa)</span>
                      <span>10 (Máxima)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1B2E24] mb-1">Medicamentos em Uso</label>
                      <input
                        type="text"
                        placeholder="Ex: Anti-inflamatório, relaxante muscular..."
                        value={avalForm.medicamentos || ''}
                        onChange={(e) => setAvalForm(prev => ({ ...prev, medicamentos: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1B2E24] mb-1">Comorbidades / Antecedentes</label>
                      <input
                        type="text"
                        placeholder="Ex: Hipertensão, hérnia de disco L5-S1..."
                        value={avalForm.comorbidades || ''}
                        onChange={(e) => setAvalForm(prev => ({ ...prev, comorbidades: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: EXAME FÍSICO & CINESIOLÓGICO */}
              <div className="bg-white/80 p-4 rounded-2xl border border-[#E4DCC8] space-y-3">
                <h4 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#B08A3E]" />
                  <span>3. Exame Físico & Funcional</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Inspeção, Palpação & Postura</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Edema em tornozelo, ponto-gatilho em trapézio..."
                      value={avalForm.inspecao || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, inspecao: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Amplitude de Movimento (ADM) & Testes Especiais</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Teste de Lasègue negativo, ADM de flexão lombar limitada..."
                      value={avalForm.adm || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, adm: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: ANEXAR EXAMES COMPLEMENTARES (RAIO-X, RM, USG, TOMOGRAFIA, LAUDOS) */}
              <div className="bg-white/90 p-4 rounded-2xl border border-[#E4DCC8] space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4DCC8] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-[#B08A3E]" />
                    <h4 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider">
                      4. Exames Complementares & Anexos Clínicos
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#736B5E] font-medium">
                    {(avalForm.examesAnexados || []).length} exame(s) anexado(s)
                  </span>
                </div>

                {/* File Upload Box & Details */}
                <div className="p-3.5 bg-[#FAF7F0] rounded-xl border border-[#E4DCC8] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">Tipo de Exame</label>
                      <select
                        value={examInputTipo}
                        onChange={(e) => setExamInputTipo(e.target.value as any)}
                        className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4DCC8] rounded-xl font-medium"
                      >
                        <option value="raio_x">🦴 Raio-X</option>
                        <option value="ressonancia">🧠 Ressonância Magnética (RM)</option>
                        <option value="ultrassom">📡 Ultrassonografia (USG)</option>
                        <option value="tomografia">🔬 Tomografia (TC)</option>
                        <option value="laudo_medico">📋 Laudo Médico / Parecer</option>
                        <option value="outro">📁 Outro Documento</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">Nome / Descrição do Exame</label>
                      <input
                        type="text"
                        placeholder="Ex: RM Coluna Lombar L4-L5"
                        value={examInputNome}
                        onChange={(e) => setExamInputNome(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E4DCC8] rounded-xl font-medium"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">Arquivo (Imagem ou PDF)</label>
                      <label className="w-full px-3 py-2 text-xs bg-white hover:bg-[#F3EEE2] border border-dashed border-[#B08A3E] rounded-xl text-[#1B2E24] font-medium flex items-center justify-center space-x-1.5 cursor-pointer truncate transition-all">
                        <Upload className="w-3.5 h-3.5 text-[#B08A3E] shrink-0" />
                        <span className="truncate">{examInputFileName || 'Escolher Arquivo...'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleExamFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddExamToAval}
                        className="w-full px-3 py-2 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] text-xs font-bold rounded-xl flex items-center justify-center space-x-1 shadow-xs border border-[#DCC58F]/40 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#DCC58F]" />
                        <span>Anexar</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Observações do exame (Ex: Abaúla discal posterior tocando o saco dural)..."
                      value={examInputObs}
                      onChange={(e) => setExamInputObs(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4DCC8] rounded-xl text-[#5B5A52]"
                    />
                  </div>
                </div>

                {/* List of Attached Exams */}
                {(avalForm.examesAnexados || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(avalForm.examesAnexados || []).map((exam) => (
                      <div
                        key={exam.id}
                        className="p-3 bg-[#FAF7F0] rounded-xl border border-[#E4DCC8] flex items-center justify-between gap-2 shadow-2xs hover:border-[#B08A3E] transition-all"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          {exam.arquivoUrl && exam.arquivoUrl.startsWith('data:image') ? (
                            <img
                              src={exam.arquivoUrl}
                              alt={exam.nome}
                              className="w-10 h-10 object-cover rounded-lg border border-[#E4DCC8] shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#EAE2D0] border border-[#D4C8AE] flex items-center justify-center shrink-0 text-base">
                              {exam.tipo === 'raio_x' && '🦴'}
                              {exam.tipo === 'ressonancia' && '🧠'}
                              {exam.tipo === 'tomografia' && '🔬'}
                              {exam.tipo === 'ultrassom' && '📡'}
                              {exam.tipo === 'laudo_medico' && '📋'}
                              {exam.tipo === 'outro' && '📁'}
                            </div>
                          )}

                          <div className="overflow-hidden">
                            <h5 className="text-xs font-bold text-[#1B2E24] truncate">{exam.nome}</h5>
                            <span className="text-[10px] text-[#736B5E] block truncate">
                              {exam.data || exam.dataUpload} • {exam.observacoes || 'Sem observações adicionais'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewExam(exam)}
                            className="p-1 text-[#1B2E24] hover:text-[#B08A3E] hover:bg-white rounded-lg transition-colors cursor-pointer"
                            title="Visualizar Exame"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExamFromAval(exam.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover Anexo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#736B5E] italic text-center py-2">
                    Nenhum exame anexado ainda. Adicione Raio-X, RM, USG ou laudos complementares acima.
                  </p>
                )}
              </div>

              {/* SECTION 5: RACIOCÍNIO CLÍNICO GEMINI AI & PLANO */}
              <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#B08A3E]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-[#B08A3E]" />
                    <span>5. Diagnóstico Funcional & Plano Terapêutico</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleAiClinicalReasoning}
                    disabled={aiGeneratingReasoning}
                    className="px-3 py-1.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#DCC58F] text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs border border-[#DCC58F]/40 cursor-pointer transition-all"
                    title="Utiliza o modelo Gemini para sugerir diagnóstico cinesiológico, metas e condutas"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${aiGeneratingReasoning ? 'animate-spin' : 'text-[#DCC58F]'}`} />
                    <span>{aiGeneratingReasoning ? 'Pensando com IA...' : '✨ Sugerir Raciocínio Clínico IA'}</span>
                  </button>
                </div>

                {aiGeneratedThinking && (
                  <div className="p-3 bg-[#EAE2D0] rounded-xl text-xs text-[#5B5A52] border border-[#D4C8AE] space-y-1">
                    <span className="font-bold text-[#1B2E24] flex items-center space-x-1">
                      <Sparkle className="w-3 h-3 text-[#B08A3E]" />
                      <span>Raciocínio Clínico Estruturado (Gemini High Thinking):</span>
                    </span>
                    <p className="text-[11px] whitespace-pre-line leading-relaxed">{aiGeneratedThinking}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Diagnóstico Cinesiológico / Funcional</label>
                    <input
                      type="text"
                      placeholder="Ex: Lombalgia mecânica crônica secundária a encurtamento de cadeia posterior"
                      value={avalForm.diagnosticoFuncional || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, diagnosticoFuncional: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E4DCC8] rounded-xl font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1B2E24] mb-1">Objetivos Terapêuticos</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Analgesia, fortalecimento de core e estabilizadores, melhora postural..."
                        value={avalForm.objetivos || ''}
                        onChange={(e) => setAvalForm(prev => ({ ...prev, objetivos: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E4DCC8] rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1B2E24] mb-1">Plano Terapêutico / Conduta</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Pilates Studio personalizado, cinesioterapia específica, terapia manual..."
                        value={avalForm.planoTerapeutico || ''}
                        onChange={(e) => setAvalForm(prev => ({ ...prev, planoTerapeutico: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E4DCC8] rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: CONTRATO DE PRESTAÇÃO DE SERVIÇOS & HONORÁRIOS */}
              <div className="bg-white/80 p-4 rounded-2xl border border-[#E4DCC8] space-y-3">
                <h4 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-2">
                  <ScrollText className="w-4 h-4 text-[#B08A3E]" />
                  <span>6. Dados do Contrato de Prestação de Serviços (COFFITO)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Frequência Semanal / Sessões</label>
                    <input
                      type="text"
                      placeholder="Ex: 2x por semana (8 sessões/mês)"
                      value={avalForm.frequenciaSemanal || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, frequenciaSemanal: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Honorários / Valor do Plano</label>
                    <input
                      type="text"
                      placeholder="Ex: R$ 99,00/mês (Clube de Fidelidade Fisiolys)"
                      value={avalForm.valorTratamento || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, valorTratamento: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold text-[#1B2E24]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2E24] mb-1">Forma de Pagamento</label>
                    <input
                      type="text"
                      placeholder="Ex: Cartão Recorrente / PIX / Mensalidade"
                      value={avalForm.formaPagamento || ''}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, formaPagamento: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 6: TERMO DE CONSENTIMENTO DE IMAGEM E VOZ (COFFITO 532/2021 & LGPD) */}
              <div className="bg-[#FAF7F0] p-4 sm:p-5 rounded-2xl border-2 border-[#B08A3E]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-2">
                    <Camera className="w-4 h-4 text-[#B08A3E]" />
                    <span>6. Termo de Consentimento de Uso de Imagem e Voz (COFFITO 532/2021 & LGPD)</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Res. COFFITO 532/2021 & 424/2013
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#E4DCC8] space-y-3 text-xs text-[#5B5A52]">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={avalForm.termoImagemVozAceito !== false}
                      onChange={(e) => setAvalForm(prev => ({ ...prev, termoImagemVozAceito: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 accent-[#1B2E24] rounded cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-[#1B2E24] block">
                        Autorizo expressamente o uso e veiculação de minha imagem e voz para fins éticos, técnico-científicos, pedagógicos e divulgação institucional da Fisiolys.
                      </span>
                      <p className="text-[11px] text-[#736B5E]">
                        Declaro estar ciente de que as divulgações respeitarão estritamente a dignidade, sigilo de dados sensíveis e o Código de Ética da Fisioterapia, sendo vedada qualquer promessa de resultado garantido. Posso revogar este consentimento a qualquer momento mediante manifestação por escrito.
                      </p>
                    </div>
                  </label>

                  {avalForm.termoImagemVozAceito !== false && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E4DCC8]">
                      <div>
                        <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">Âmbito da Autorização</label>
                        <select
                          value={avalForm.termoImagemVozTipo || 'completo'}
                          onChange={(e) => setAvalForm(prev => ({ ...prev, termoImagemVozTipo: e.target.value as any }))}
                          className="w-full px-3 py-1.5 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                        >
                          <option value="completo">🌐 Completo (Redes Sociais, Site da Clínica & Prontuário)</option>
                          <option value="interno">🔬 Apenas Científico / Interno (Prontuário & Estudos de Caso)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">Restrições ou Observações do Paciente</label>
                        <input
                          type="text"
                          placeholder="Ex: Não focar no rosto / Apenas postura e coluna"
                          value={avalForm.termoImagemVozObservacoes || ''}
                          onChange={(e) => setAvalForm(prev => ({ ...prev, termoImagemVozObservacoes: e.target.value }))}
                          className="w-full px-3 py-1.5 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E4DCC8]">
                <button
                  type="button"
                  onClick={() => setShowAvalModal(false)}
                  className="px-4 py-2.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Salvar Ficha */}
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border border-[#DCC58F]/40"
                  >
                    💾 Salvar Avaliação
                  </button>

                  {/* Salvar & Assinar Agora */}
                  <button
                    type="button"
                    onClick={(e) => handleSaveAval(e, 'sign')}
                    className="px-5 py-2.5 bg-[#B08A3E] hover:bg-[#97732E] text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>✍️ Salvar & Assinar Agora</span>
                  </button>

                  {/* Salvar & Gerar Contrato PDF */}
                  <button
                    type="button"
                    onClick={(e) => handleSaveAval(e, 'contract')}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                    <span>📄 Salvar & Gerar Contrato PDF</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR AGENDAMENTO */}
      {/* ========================================================================= */}
      {showApptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#E4DCC8] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <h3 className="text-base font-serif font-bold text-[#1B2E24]">
                {editingAppt ? 'Editar Agendamento' : 'Novo Agendamento Clínico'}
              </h3>
              <button onClick={() => setShowApptModal(false)} className="p-1 rounded-full text-[#736B5E] hover:text-[#1B2E24]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppt} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Paciente / Lead *</label>
                <select
                  value={apptForm.leadId || ''}
                  onChange={(e) => {
                    const lId = e.target.value;
                    const selLead = leads.find(l => l.id === lId);
                    setApptForm(prev => ({
                      ...prev,
                      leadId: lId,
                      leadNomeAvulso: selLead ? selLead.nome : '',
                      protocolo: selLead?.protocolo || prev.protocolo
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                >
                  <option value="">-- Paciente Avulso --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.nome} ({l.protocolo})</option>
                  ))}
                </select>
              </div>

              {!apptForm.leadId && (
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Nome do Paciente Avulso</label>
                  <input
                    type="text"
                    required={!apptForm.leadId}
                    placeholder="Nome completo..."
                    value={apptForm.leadNomeAvulso || ''}
                    onChange={(e) => setApptForm(prev => ({ ...prev, leadNomeAvulso: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Protocolo / Atendimento</label>
                <input
                  type="text"
                  value={apptForm.protocolo || ''}
                  onChange={(e) => setApptForm(prev => ({ ...prev, protocolo: e.target.value }))}
                  placeholder="Ex: Pilates clássico, Fisioterapia Ortopédica"
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={apptForm.data || ''}
                    onChange={(e) => setApptForm(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Horário *</label>
                  <input
                    type="time"
                    required
                    value={apptForm.horario || '09:00'}
                    onChange={(e) => setApptForm(prev => ({ ...prev, horario: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Situação do Agendamento</label>
                <select
                  value={apptForm.situacao || 'pendente'}
                  onChange={(e) => setApptForm(prev => ({ ...prev, situacao: e.target.value as any }))}
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                >
                  <option value="confirmado">✅ Confirmado</option>
                  <option value="pendente">⏳ Pendente de Confirmação</option>
                  <option value="cancelado">❌ Cancelado</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E4DCC8]">
                <button
                  type="button"
                  onClick={() => setShowApptModal(false)}
                  className="px-4 py-2 bg-[#F3EEE2] text-[#1B2E24] rounded-full text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B2E24] text-[#FAF7F0] rounded-full text-xs font-bold shadow-md cursor-pointer border border-[#DCC58F]/40"
                >
                  Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVA / EDITAR EVOLUÇÃO (PRONTUÁRIO SESSÃO A SESSÃO) */}
      {/* ========================================================================= */}
      {showEvolModal && selectedAvalForEvol && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#E4DCC8] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-[#1B2E24]">
                  {editingEvol ? 'Editar Evolução Clínica' : 'Nova Evolução de Sessão'}
                </h3>
                <span className="text-xs text-[#736B5E]">Paciente: {getLeadName(selectedAvalForEvol.leadId, selectedAvalForEvol.leadNomeAvulso)}</span>
              </div>
              <button onClick={() => setShowEvolModal(false)} className="p-1 rounded-full text-[#736B5E] hover:text-[#1B2E24]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvol} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Data do Atendimento *</label>
                  <input
                    type="date"
                    required
                    value={evolForm.data || ''}
                    onChange={(e) => setEvolForm(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2E24] mb-1">Status de Presença *</label>
                  <select
                    value={evolForm.presencaStatus || 'presente'}
                    onChange={(e) => setEvolForm(prev => ({ ...prev, presencaStatus: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold text-[#1B2E24]"
                  >
                    <option value="presente">✅ Presente (Atendimento Realizado)</option>
                    <option value="falta_justificada">⚠️ Falta Justificada (Avisou)</option>
                    <option value="falta_sem_aviso">❌ Falta sem Aviso</option>
                    <option value="reposicao">🔄 Sessão de Reposição</option>
                  </select>
                </div>
              </div>

              {/* Tag de Frequência e Quantidade Realizada (Ex: 1/10) */}
              <div className="p-3 bg-white rounded-2xl border border-[#B08A3E]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#1B2E24] flex items-center space-x-1">
                    <span>🏷️</span>
                    <span>Controle de Frequência & Sessões (Ex: 1/10)</span>
                  </label>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#1B2E24] text-[#DCC58F] border border-[#DCC58F]/40">
                    Tag: {evolForm.sessao || 1}/{evolForm.totalSessoesPlano || 10}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#736B5E] font-medium mb-1">Sessão Realizada Nº</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={evolForm.sessao || 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        const tot = evolForm.totalSessoesPlano || 10;
                        setEvolForm(prev => ({
                          ...prev,
                          sessao: val,
                          quantidadeRealizada: `${val}/${tot}`
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#736B5E] font-medium mb-1">Total do Plano Contratado</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={evolForm.totalSessoesPlano || 10}
                      onChange={(e) => {
                        const tot = parseInt(e.target.value) || 10;
                        const val = evolForm.sessao || 1;
                        setEvolForm(prev => ({
                          ...prev,
                          totalSessoesPlano: tot,
                          quantidadeRealizada: `${val}/${tot}`
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Procedimentos Realizados & Conduta *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Cinesioterapia motora, Pilates Studio (Reformer/Cadillac), Terapia Manual miofascial em coluna lombar, eletroanalgesia..."
                  value={evolForm.procedimentos || ''}
                  onChange={(e) => setEvolForm(prev => ({ ...prev, procedimentos: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-[#E4DCC8]">
                <div>
                  <label className="block text-xs font-bold text-rose-800 mb-1">Dor Antes (EVA 0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={evolForm.dorAntes !== undefined ? evolForm.dorAntes : 5}
                    onChange={(e) => setEvolForm(prev => ({ ...prev, dorAntes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold text-rose-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Dor Depois (EVA 0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={evolForm.dorDepois !== undefined ? evolForm.dorDepois : 2}
                    onChange={(e) => setEvolForm(prev => ({ ...prev, dorDepois: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2E24] mb-1">Observações & Resposta do Paciente</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Paciente relatou alívio imediato e maior mobilidade lombar..."
                  value={evolForm.observacoes || ''}
                  onChange={(e) => setEvolForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E4DCC8]">
                <button
                  type="button"
                  onClick={() => setShowEvolModal(false)}
                  className="px-4 py-2 bg-[#F3EEE2] text-[#1B2E24] rounded-full text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B2E24] text-[#FAF7F0] rounded-full text-xs font-bold shadow-md cursor-pointer border border-[#DCC58F]/40"
                >
                  Salvar Evolução & Frequência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / LIGHTBOX: VISUALIZAÇÃO DE EXAME ANEXADO */}
      {/* ========================================================================= */}
      {previewExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E4DCC8] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-5 h-5 text-[#B08A3E]" />
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1B2E24]">{previewExam.nome}</h3>
                  <span className="text-xs text-[#736B5E]">
                    Tipo: {previewExam.tipo.toUpperCase()} • Data do Anexo: {previewExam.dataUpload}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewExam(null)}
                className="p-1 rounded-full text-[#736B5E] hover:text-[#1B2E24] bg-[#F3EEE2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto flex items-center justify-center bg-[#1B2E24] rounded-2xl p-4 border border-[#DCC58F]/20">
              {previewExam.arquivoUrl && previewExam.arquivoUrl.startsWith('data:image') ? (
                <img
                  src={previewExam.arquivoUrl}
                  alt={previewExam.nome}
                  className="max-h-[50vh] max-w-full object-contain rounded-lg"
                />
              ) : previewExam.arquivoUrl && previewExam.arquivoUrl.startsWith('data:application/pdf') ? (
                <div className="text-center p-8 space-y-3 text-white">
                  <FileText className="w-16 h-16 text-[#DCC58F] mx-auto" />
                  <p className="text-sm font-bold">Documento PDF Anexado ({previewExam.nomeArquivo || 'exame.pdf'})</p>
                  <a
                    href={previewExam.arquivoUrl}
                    download={previewExam.nomeArquivo || 'exame.pdf'}
                    className="inline-block px-4 py-2 bg-[#DCC58F] text-[#1B2E24] font-bold rounded-xl text-xs"
                  >
                    Baixar PDF do Exame
                  </a>
                </div>
              ) : (
                <div className="text-center p-8 text-[#E4DCC8]">
                  <p className="text-sm font-medium">Exame cadastrado com sucesso.</p>
                </div>
              )}
            </div>

            {previewExam.observacoes && (
              <div className="p-3 bg-white rounded-xl border border-[#E4DCC8] text-xs text-[#5B5A52]">
                <strong className="text-[#1B2E24]">Observações Clínicas:</strong> {previewExam.observacoes}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#E4DCC8]">
              <button
                type="button"
                onClick={() => setPreviewExam(null)}
                className="px-5 py-2 bg-[#1B2E24] text-[#FAF7F0] text-xs font-bold rounded-full cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BUSCA RÁPIDA DE PACIENTES DA CLÍNICA & AGENDAS */}
      {/* ========================================================================= */}
      {showAgendaSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E4DCC8] space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center font-bold">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1B2E24]">
                    Busca Geral de Pacientes & Agendamentos
                  </h3>
                  <p className="text-xs text-[#736B5E]">
                    Encontre pacientes cadastrados, histórico de consultas e envie mensagens instantâneas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAgendaSearchModal(false);
                  setAgendaSearchQuery('');
                }}
                className="p-1.5 rounded-full text-[#736B5E] hover:text-[#1B2E24] bg-[#F3EEE2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campo de Busca em Tempo Real */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#B08A3E]" />
              <input
                type="text"
                autoFocus
                placeholder="Digite o nome do paciente, telefone ou CPF..."
                value={agendaSearchQuery}
                onChange={(e) => setAgendaSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs bg-white border border-[#E4DCC8] rounded-xl font-medium text-[#1B2E24] focus:ring-2 focus:ring-[#1B2E24] shadow-2xs"
              />
              {agendaSearchQuery && (
                <button
                  onClick={() => setAgendaSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Lista de Resultados */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                const query = agendaSearchQuery.trim().toLowerCase();
                const cleanQuery = query.replace(/\D/g, '');

                // Agrega pacientes da lista geral + leads
                const results: {
                  id: string;
                  nome: string;
                  telefone: string;
                  origem: string;
                  cpf?: string;
                  categoria?: string;
                  tipo: 'paciente' | 'lead' | 'agendamento';
                  detalhes?: string;
                }[] = [];

                // 1. Pacientes cadastrados
                clinicPatients.forEach(p => {
                  const matchName = p.name.toLowerCase().includes(query);
                  const matchPhone = p.phone.includes(query) || (cleanQuery && p.phone.replace(/\D/g, '').includes(cleanQuery));
                  const matchCpf = p.cpf ? p.cpf.toLowerCase().includes(query) : false;
                  if (!query || matchName || matchPhone || matchCpf) {
                    results.push({
                      id: p.id,
                      nome: p.name,
                      telefone: p.phone,
                      origem: 'Prontuário da Clínica',
                      cpf: p.cpf,
                      categoria: p.category || 'Fisioterapia / Pilates',
                      tipo: 'paciente',
                      detalhes: p.notes || `Última sessão: ${p.lastSessionDate || 'Recente'}`
                    });
                  }
                });

                // 2. Leads do Funil
                leads.forEach(l => {
                  const matchName = l.nome.toLowerCase().includes(query);
                  const matchPhone = l.telefone.includes(query) || (cleanQuery && l.telefone.replace(/\D/g, '').includes(cleanQuery));
                  if (!query || matchName || matchPhone) {
                    if (!results.some(r => r.nome.toLowerCase() === l.nome.toLowerCase())) {
                      results.push({
                        id: l.id,
                        nome: l.nome,
                        telefone: l.telefone,
                        origem: 'Funil CRM & WhatsApp',
                        categoria: l.protocolo,
                        tipo: 'lead',
                        detalhes: `Status: ${l.status.toUpperCase()} • Prioridade: ${l.prioridade}`
                      });
                    }
                  }
                });

                if (results.length === 0) {
                  return (
                    <div className="text-center py-8 bg-white rounded-2xl border border-[#E4DCC8] space-y-2">
                      <Search className="w-8 h-8 text-amber-600 mx-auto opacity-70" />
                      <p className="text-xs font-bold text-[#1B2E24]">Nenhum paciente encontrado para "{agendaSearchQuery}"</p>
                      <p className="text-[11px] text-[#736B5E]">Verifique a grafia ou cadastre um novo paciente/lead.</p>
                      <button
                        onClick={() => {
                          setShowAgendaSearchModal(false);
                          handleOpenLeadModal();
                        }}
                        className="px-3.5 py-1.5 bg-[#1B2E24] text-[#FAF7F0] rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        + Cadastrar Novo Paciente / Lead
                      </button>
                    </div>
                  );
                }

                return results.map(item => (
                  <div
                    key={`${item.tipo}-${item.id}`}
                    className="p-3.5 bg-white rounded-2xl border border-[#E4DCC8] hover:border-[#B08A3E] shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#1B2E24]">{item.nome}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.tipo === 'paciente' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.origem}
                        </span>
                        {item.categoria && (
                          <span className="text-[10px] font-medium text-[#736B5E] bg-[#F3EEE2] px-2 py-0.5 rounded-md">
                            {item.categoria}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-[#736B5E]">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-[#B08A3E]" />
                          <span>{item.telefone}</span>
                        </span>
                        {item.cpf && (
                          <span>CPF: {item.cpf}</span>
                        )}
                      </div>
                      {item.detalhes && (
                        <p className="text-[11px] text-[#5B5A52] italic">{item.detalhes}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* WhatsApp Direto */}
                      <button
                        onClick={() => {
                          const cleanTel = item.telefone.replace(/\D/g, '');
                          const url = `https://wa.me/55${cleanTel}?text=${encodeURIComponent(`Olá, ${item.nome}! Aqui é da Clínica Fisiolys da Dra. Elays Marinho. Como você está se sentindo hoje?`)}`;
                          window.open(url, '_blank');
                        }}
                        className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-2xs cursor-pointer"
                        title="Conversar via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      {/* Abrir Ficha de Avaliação */}
                      <button
                        onClick={() => {
                          setShowAgendaSearchModal(false);
                          handleOpenAvalModal({
                            id: `aval-${Date.now()}`,
                            leadId: item.tipo === 'lead' ? item.id : '',
                            leadNomeAvulso: item.nome,
                            telefone: item.telefone,
                            cpf: item.cpf || '',
                            data: new Date().toISOString().split('T')[0],
                            avaliador: 'Dra. Elays Marinho (CREFITO 208058)',
                            queixaPrincipal: '',
                            escalaDor: 5,
                            planoTerapeutico: `Plano Fisiolys para ${item.nome}`,
                            termoImagemVozAceito: true
                          } as any);
                        }}
                        className="px-2.5 py-1.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] rounded-xl text-xs font-bold flex items-center space-x-1 shadow-2xs cursor-pointer"
                        title="Criar Ficha de Avaliação Clínica"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-[#DCC58F]" />
                        <span>Ficha Clínica</span>
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-2 border-t border-[#E4DCC8] flex items-center justify-between text-xs text-[#736B5E]">
              <span>Total de pacientes indexados: <strong>{clinicPatients.length + leads.length}</strong></span>
              <button
                type="button"
                onClick={() => setShowAgendaSearchModal(false)}
                className="px-4 py-1.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] font-bold rounded-xl cursor-pointer"
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
