import React, { useState, useEffect, useMemo } from 'react';
import {
  ClinicConfig,
  Service,
  Appointment,
  Patient,
  LoyaltyMember,
  CrmAvaliacao,
  CrmEvolucao,
  CrmExamAttachment,
  PaymentMethod
} from '../../types';
import { api } from '../../services/api';
import { formatDatePtBR, formatPhoneMask, formatCurrency } from '../../utils/qrUtils';
import { getDoctorCpf, DEFAULT_DOCTOR_CPF, getProfessionalSignature } from '../../utils/securityUtils';
import {
  createClinicalEvaluationPDF,
  createServiceContractPDF,
  downloadReceiptPDF,
  shareReceiptViaWhatsApp,
  generatePatientAnnualReport
} from '../../utils/pdfGenerator';
import { PatientFrequency } from './PatientFrequency';
import { PatientCheckIn } from './PatientCheckIn';
import { Logo } from '../Logo';
import { BotanicalVineAccents } from '../common/BotanicalVineAccents';
import { DigitalSignaturePad } from '../crm/DigitalSignaturePad';
import {
  User,
  Users,
  Activity,
  Heart,
  DollarSign,
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Phone,
  ShieldCheck,
  ChevronRight,
  Receipt,
  CreditCard,
  Building2,
  CalendarDays,
  UserCheck,
  Award,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  TrendingUp,
  QrCode,
  Flame,
  Check,
  MessageSquare,
  X,
  Mail,
  Copy,
  FileSignature,
  PenTool,
  Paperclip,
  Image as ImageIcon,
  ZoomIn,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Stethoscope,
  FolderHeart,
  ClipboardList,
  FileCheck2,
  Upload,
  PlusCircle,
  Smile,
  Frown,
  Meh,
  CheckSquare
} from 'lucide-react';

interface PatientPortalProps {
  clinic: ClinicConfig;
  services: Service[];
  appointments: Appointment[];
  patients: Patient[];
  loyaltyMembers?: LoyaltyMember[];
  initialTab?: string;
  onNavigateToBooking?: () => void;
  onReload?: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  clinic,
  services,
  appointments,
  patients,
  loyaltyMembers = [],
  initialTab = 'avaliacao',
  onNavigateToBooking,
  onReload,
}) => {
  // Authentication State via Patient CPF (acting as password)
  const [cpfPasswordInput, setCpfPasswordInput] = useState<string>('');
  const [showPasswordMask, setShowPasswordMask] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Authenticated Patient CPF in session storage
  const [authenticatedCpf, setAuthenticatedCpf] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const cpfParam = urlParams.get('cpf');
        if (cpfParam) return cpfParam.replace(/\D/g, '');
        const saved = sessionStorage.getItem('fisiolys_patient_auth_cpf');
        if (saved) return saved.replace(/\D/g, '');
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Selected Patient ID
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // CRM Evaluations and History Loaded from Storage/Backend
  const [crmAvaliacoes, setCrmAvaliacoes] = useState<CrmAvaliacao[]>([]);
  const [isLoadingCrm, setIsLoadingCrm] = useState<boolean>(false);

  // Active Tab inside Prontuário
  const [activeTab, setActiveTab] = useState<
    'avaliacao' | 'exames' | 'evolucoes' | 'contratos' | 'extrato' | 'frequencia' | 'checkin' | 'fidelidade' | 'proximos'
  >(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (
          tabParam &&
          ['avaliacao', 'exames', 'evolucoes', 'contratos', 'extrato', 'frequencia', 'checkin', 'fidelidade', 'proximos'].includes(tabParam)
        ) {
          return tabParam as any;
        }
      }
    } catch (e) {}
    return (initialTab as any) || 'avaliacao';
  });

  // Lightbox Modal for Exam Attachments Zoom
  const [selectedExamLightbox, setSelectedExamLightbox] = useState<CrmExamAttachment | null>(null);

  // New Exam Upload Modal for Patient
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [newExamName, setNewExamName] = useState<string>('');
  const [newExamTipo, setNewExamTipo] = useState<any>('raio_x');
  const [newExamData, setNewExamData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newExamObs, setNewExamObs] = useState<string>('');
  const [newExamFileUrl, setNewExamFileUrl] = useState<string>('');
  const [newExamFileName, setNewExamFileName] = useState<string>('');

  // Digital Signature Modal for Pending Contracts
  const [selectedAvalForSignature, setSelectedAvalForSignature] = useState<CrmAvaliacao | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Financial Modality & Period Filters
  const [modalityFilter, setModalityFilter] = useState<'all' | 'fisioterapia' | 'pilates' | 'outros'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'year'>('all');
  const [selectedReceiptAppt, setSelectedReceiptAppt] = useState<Appointment | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Expanded Clauses in Contract
  const [expandedClauses, setExpandedClauses] = useState<boolean>(false);

  // In-Portal Appointment Rescheduling & Check-in States
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [rescheduleNewDate, setRescheduleNewDate] = useState<string>('');
  const [rescheduleNewTime, setRescheduleNewTime] = useState<string>('08:00');
  const [rescheduleNotes, setRescheduleNotes] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<boolean>(false);
  const [portalCheckInLoadingId, setPortalCheckInLoadingId] = useState<string | null>(null);
  const [portalCheckInSuccess, setPortalCheckInSuccess] = useState<{ name: string; time: string; service: string } | null>(null);

  // Handler for Patient In-Portal Check-in
  const handlePortalDirectCheckIn = async (appt: Appointment) => {
    setPortalCheckInLoadingId(appt.id);
    try {
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      await api.checkInPatient({
        appointmentId: appt.id,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        method: 'portal'
      });
      await api.updateAppointmentStatus(appt.id, 'concluido', `Check-in confirmado pelo paciente no prontuário às ${nowTime}`);
      
      setPortalCheckInSuccess({
        name: appt.patientName,
        time: nowTime,
        service: appt.serviceName
      });
      if (onReload) onReload();
    } catch (err) {
      console.error('Error during in-portal checkin:', err);
    } finally {
      setPortalCheckInLoadingId(null);
    }
  };

  // Handler for In-Portal Rescheduling
  const handleSavePortalReschedule = async () => {
    if (!rescheduleModalAppt || !rescheduleNewDate || !rescheduleNewTime) return;
    setIsRescheduling(true);
    try {
      await api.updateAppointmentDetails(rescheduleModalAppt.id, {
        date: rescheduleNewDate,
        time: rescheduleNewTime,
        status: 'agendado',
        notes: `${rescheduleModalAppt.notes || ''} [Reagendado pelo paciente no portal para ${rescheduleNewDate} às ${rescheduleNewTime}${rescheduleNotes ? `: ${rescheduleNotes}` : ''}]`
      });
      setRescheduleSuccess(true);
      if (onReload) onReload();
    } catch (e) {
      console.error('Error during in-portal rescheduling:', e);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Load CRM Evaluations on Mount
  const loadCrmData = async () => {
    setIsLoadingCrm(true);
    try {
      const data = await api.getCrmData();
      if (data && data.avaliacoes) {
        setCrmAvaliacoes(data.avaliacoes);
      }
    } catch (e) {
      console.error('Error loading CRM data in PatientPortal:', e);
    } finally {
      setIsLoadingCrm(false);
    }
  };

  useEffect(() => {
    loadCrmData();
  }, []);

  // Sync activeTab when initialTab prop changes from parent
  useEffect(() => {
    if (initialTab) {
      const allowed = ['avaliacao', 'exames', 'evolucoes', 'contratos', 'extrato', 'frequencia', 'checkin', 'fidelidade', 'proximos'];
      if (allowed.includes(initialTab)) {
        setActiveTab(initialTab as any);
      } else if (initialTab === 'prontuario') {
        setActiveTab('avaliacao');
      } else if (initialTab === 'reagendar') {
        setActiveTab('proximos');
      }
    }
  }, [initialTab]);

  // Format CPF Input on type
  const handleCpfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}`;
    }
    setCpfPasswordInput(formatted);
    if (authError) setAuthError(null);
  };

  // Perform CPF Authentication
  const handleAuthenticateCpf = (targetCpf?: string) => {
    const rawCpf = (targetCpf || cpfPasswordInput).replace(/\D/g, '');
    if (!rawCpf || rawCpf.length < 11) {
      setAuthError('Por favor, informe os 11 dígitos do CPF para validar o acesso ao prontuário.');
      return;
    }

    setIsAuthenticating(true);

    // Look for matching patient in patients, appointments, or CRM evaluations
    const cleanAuthCpf = rawCpf;

    const matchedPatient = patients.find(p => p.cpf && p.cpf.replace(/\D/g, '') === cleanAuthCpf);
    const matchedAppt = appointments.find(a => a.patientCpf && a.patientCpf.replace(/\D/g, '') === cleanAuthCpf);
    const matchedAval = crmAvaliacoes.find(
      a => (a.pacienteCpf && a.pacienteCpf.replace(/\D/g, '') === cleanAuthCpf) || (a.cpf && a.cpf.replace(/\D/g, '') === cleanAuthCpf)
    );

    // Fallback: If not explicitly found, check if it's one of demo patients or create fallback
    let finalPatient: Patient | null = matchedPatient || null;

    if (!finalPatient && matchedAppt) {
      finalPatient = {
        id: matchedAppt.id,
        name: matchedAppt.patientName,
        phone: matchedAppt.patientPhone,
        cpf: matchedAppt.patientCpf,
        totalSessions: 1,
        createdAt: matchedAppt.createdAt
      };
    } else if (!finalPatient && matchedAval) {
      finalPatient = {
        id: matchedAval.id,
        name: matchedAval.pacienteNome || matchedAval.leadNomeAvulso || 'Paciente Fisiolys',
        phone: matchedAval.telefone || '(93) 99126-5006',
        cpf: matchedAval.pacienteCpf || matchedAval.cpf || '123.456.789-00',
        totalSessions: (matchedAval.evolucoes || []).length || 1,
        createdAt: matchedAval.data
      };
    }

    // Default test fallback if demo test button clicked
    if (!finalPatient) {
      finalPatient = patients[0] || {
        id: 'pat-1',
        name: 'Mariana Silva Santos',
        phone: '(11) 99876-5432',
        cpf: '341.892.108-45',
        totalSessions: 4,
        createdAt: '2026-07-25'
      };
    }

    try {
      sessionStorage.setItem('fisiolys_patient_auth_cpf', cleanAuthCpf);
    } catch (e) {}

    setAuthenticatedCpf(cleanAuthCpf);
    setSelectedPatientId(finalPatient.id);
    setIsAuthenticating(false);
    setAuthError(null);
  };

  // Quick Demo Login Handler
  const handleQuickDemoLogin = (demoCpf: string) => {
    setCpfPasswordInput(demoCpf);
    handleAuthenticateCpf(demoCpf);
  };

  // Logout / Lock Prontuário
  const handleLockProntuario = () => {
    try {
      sessionStorage.removeItem('fisiolys_patient_auth_cpf');
    } catch (e) {}
    setAuthenticatedCpf(null);
    setSelectedPatientId('');
    setCpfPasswordInput('');
    setAuthError(null);
  };

  // Find Current Authenticated Patient Object
  const currentPatient: Patient | null = useMemo(() => {
    if (!authenticatedCpf) return null;
    const cleanCpf = authenticatedCpf.replace(/\D/g, '');

    // Match in patients list
    const pMatch = patients.find(p => p.cpf && p.cpf.replace(/\D/g, '') === cleanCpf);
    if (pMatch) return pMatch;

    // Match in appointments
    const aMatch = appointments.find(a => a.patientCpf && a.patientCpf.replace(/\D/g, '') === cleanCpf);
    if (aMatch) {
      return {
        id: aMatch.id,
        name: aMatch.patientName,
        phone: aMatch.patientPhone,
        cpf: aMatch.patientCpf,
        totalSessions: 1,
        createdAt: aMatch.createdAt
      };
    }

    // Match in CRM evaluations
    const avalMatch = crmAvaliacoes.find(
      a => (a.pacienteCpf && a.pacienteCpf.replace(/\D/g, '') === cleanCpf) || (a.cpf && a.cpf.replace(/\D/g, '') === cleanCpf)
    );
    if (avalMatch) {
      return {
        id: avalMatch.id,
        name: avalMatch.pacienteNome || avalMatch.leadNomeAvulso || 'Paciente Fisiolys',
        phone: avalMatch.telefone || '(93) 99126-5006',
        cpf: avalMatch.pacienteCpf || avalMatch.cpf || '123.456.789-00',
        totalSessions: (avalMatch.evolucoes || []).length || 1,
        createdAt: avalMatch.data
      };
    }

    return (
      patients[0] || {
        id: 'pat-default',
        name: 'Mariana Silva Santos',
        phone: '(11) 99876-5432',
        cpf: '341.892.108-45',
        totalSessions: 4,
        createdAt: '2026-07-25'
      }
    );
  }, [authenticatedCpf, patients, appointments, crmAvaliacoes]);

  // Find Patient's CRM Evaluation Data (Ficha, Evoluções, Anexos)
  const currentEvaluation: CrmAvaliacao | null = useMemo(() => {
    if (!currentPatient) return null;
    const cleanCpf = (currentPatient.cpf || authenticatedCpf || '').replace(/\D/g, '');
    const patientNameLower = currentPatient.name.toLowerCase().trim();

    // Match by CPF first
    const byCpf = crmAvaliacoes.find(
      a => (a.pacienteCpf && a.pacienteCpf.replace(/\D/g, '') === cleanCpf) || (a.cpf && a.cpf.replace(/\D/g, '') === cleanCpf)
    );
    if (byCpf) return byCpf;

    // Match by Name
    const byName = crmAvaliacoes.find(a => {
      const n1 = (a.pacienteNome || a.leadNomeAvulso || '').toLowerCase().trim();
      return n1 && (n1.includes(patientNameLower) || patientNameLower.includes(n1));
    });
    if (byName) return byName;

    // Return the first evaluation if available as rich default
    return crmAvaliacoes[0] || null;
  }, [currentPatient, authenticatedCpf, crmAvaliacoes]);

  // Patient Appointments List
  const patientAppointments = useMemo(() => {
    if (!currentPatient) return [];
    const patientNameLower = currentPatient.name.toLowerCase().trim();
    const patientPhoneClean = currentPatient.phone.replace(/\D/g, '');

    return appointments.filter(appt => {
      const apptNameLower = appt.patientName.toLowerCase().trim();
      const apptPhoneClean = appt.patientPhone.replace(/\D/g, '');

      return (
        apptNameLower === patientNameLower ||
        (apptPhoneClean && patientPhoneClean && apptPhoneClean === patientPhoneClean) ||
        apptNameLower.includes(patientNameLower) ||
        patientNameLower.includes(apptNameLower)
      );
    });
  }, [appointments, currentPatient]);

  // Category determination helper
  const getApptCategory = (appt: Appointment): 'fisioterapia' | 'pilates' | 'outros' => {
    const sName = (appt.serviceName || '').toLowerCase();
    if (sName.includes('pilates')) return 'pilates';
    if (sName.includes('fisio') || sName.includes('reabilitação') || sName.includes('postur') || sName.includes('coluna') || sName.includes('joelho') || sName.includes('dor')) return 'fisioterapia';
    return 'outros';
  };

  // Financial summary
  const financialSummary = useMemo(() => {
    let totalFisioterapia = 0;
    let countFisioterapia = 0;
    let totalPilates = 0;
    let countPilates = 0;
    let totalOutros = 0;
    let countOutros = 0;

    patientAppointments.forEach(appt => {
      if (appt.status === 'cancelado') return;
      const cat = getApptCategory(appt);
      const val = appt.servicePrice || 0;

      if (cat === 'fisioterapia') {
        totalFisioterapia += val;
        countFisioterapia++;
      } else if (cat === 'pilates') {
        totalPilates += val;
        countPilates++;
      } else {
        totalOutros += val;
        countOutros++;
      }
    });

    const totalGeral = totalFisioterapia + totalPilates + totalOutros;
    const totalSessoes = countFisioterapia + countPilates + countOutros;

    return {
      totalFisioterapia,
      countFisioterapia,
      totalPilates,
      countPilates,
      totalOutros,
      countOutros,
      totalGeral,
      totalSessoes
    };
  }, [patientAppointments]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return patientAppointments
      .filter(appt => {
        if (modalityFilter !== 'all') {
          const cat = getApptCategory(appt);
          if (cat !== modalityFilter) return false;
        }
        if (periodFilter !== 'all' && appt.date) {
          const apptDate = new Date(appt.date + 'T00:00:00');
          if (periodFilter === 'year' && apptDate.getFullYear() !== currentYear) return false;
          if (periodFilter === 'month' && (apptDate.getFullYear() !== currentYear || apptDate.getMonth() !== currentMonth)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [patientAppointments, modalityFilter, periodFilter]);

  // Attendance stats
  const attendanceStats = useMemo(() => {
    let presencas = 0;
    let faltas = 0;
    patientAppointments.forEach(appt => {
      if (appt.attendanceStatus === 'presenca' || appt.status === 'concluido') {
        presencas++;
      } else if (appt.attendanceStatus === 'falta' || appt.status === 'falta') {
        faltas++;
      }
    });
    const total = presencas + faltas;
    const taxa = total > 0 ? Math.round((presencas / total) * 100) : 100;
    return { presencas, faltas, taxa, total };
  }, [patientAppointments]);

  // Upcoming appointments
  const upcomingAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return patientAppointments
      .filter(a => a.date >= todayStr && a.status !== 'cancelado')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [patientAppointments]);

  // Loyalty member
  const currentLoyaltyMember = useMemo(() => {
    if (!currentPatient) return null;
    const phoneClean = currentPatient.phone.replace(/\D/g, '');
    const nameLower = currentPatient.name.toLowerCase().trim();

    return (
      loyaltyMembers.find(
        m =>
          m.patientPhone.replace(/\D/g, '') === phoneClean ||
          m.patientName.toLowerCase().trim() === nameLower
      ) || null
    );
  }, [loyaltyMembers, currentPatient]);

  // Handle PDF Generation of Full Clinical Evaluation & History
  const handleDownloadFullProntuarioPDF = async () => {
    if (!currentEvaluation || !currentPatient) return;
    setIsDownloadingPdf(true);
    try {
      const { doc, fileName } = await createClinicalEvaluationPDF(currentEvaluation, currentPatient.name, clinic);
      doc.save(fileName);
    } catch (e) {
      console.error('Error generating Prontuario PDF:', e);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle PDF Generation of Signed Service Contract & TCLE
  const handleDownloadSignedContractPDF = async () => {
    if (!currentEvaluation || !currentPatient) return;
    setIsDownloadingPdf(true);
    try {
      const { doc, fileName } = await createServiceContractPDF(currentEvaluation, currentPatient.name, clinic);
      doc.save(fileName);
    } catch (e) {
      console.error('Error generating Contract PDF:', e);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle Annual Income Tax (IRPF) Statement PDF
  const handleDownloadTaxStatementPDF = async () => {
    if (!currentPatient) return;
    setIsDownloadingPdf(true);
    try {
      const doc = await generatePatientAnnualReport(currentPatient, patientAppointments, clinic, new Date().getFullYear().toString());
      doc.save(`Declaracao_IR_${currentPatient.name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
    } catch (e) {
      console.error('Error generating Tax Statement:', e);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle Download Single Receipt PDF
  const handleDownloadApptReceiptPDF = async (appt: Appointment) => {
    try {
      const receiptData = {
        title: `Recibo de Atendimento - ${appt.serviceName}`,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        patientCpf: appt.patientCpf || currentPatient?.cpf,
        serviceName: appt.serviceName,
        amount: appt.servicePrice || 0,
        date: appt.date,
        paymentMethod: (appt.paymentMethod || 'PIX').toUpperCase(),
        receiptNumber: `REC-${appt.id.replace(/\D/g, '').slice(0, 6) || Math.floor(100000 + Math.random() * 900000)}`,
        status: 'concluido' as const,
      };
      await downloadReceiptPDF(receiptData, clinic, getDoctorCpf(clinic.managerCpf || DEFAULT_DOCTOR_CPF));
    } catch (e) {
      console.error('Error generating receipt PDF for patient', e);
      window.print();
    }
  };

  // Handle Add Exam Attachment from Patient Portal
  const handleAddExamAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvaluation || !newExamName.trim()) return;

    const newAttachment: CrmExamAttachment = {
      id: `exam-${Date.now()}`,
      nome: newExamName.trim(),
      tipo: newExamTipo,
      data: newExamData,
      arquivoUrl:
        newExamFileUrl ||
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800',
      tamanhoFormatado: newExamFileName ? `${newExamFileName} (Anexado)` : '2.1 MB (Imagem/Laudo)',
      observacoes: newExamObs.trim() || undefined,
    };

    const updatedEvaluation: CrmAvaliacao = {
      ...currentEvaluation,
      examesAnexados: [...(currentEvaluation.examesAnexados || []), newAttachment],
    };

    try {
      await api.saveCrmAvaliacao(updatedEvaluation);
      setCrmAvaliacoes(prev => prev.map(a => (a.id === updatedEvaluation.id ? updatedEvaluation : a)));
      setIsUploadModalOpen(false);
      setNewExamName('');
      setNewExamObs('');
      setNewExamFileUrl('');
      setNewExamFileName('');
    } catch (err) {
      console.error('Error saving exam attachment:', err);
    }
  };

  // Handle File Upload to Base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewExamFileName(file.name);
      if (!newExamName) {
        setNewExamName(file.name.replace(/\.[^/.]+$/, ''));
      }
      const reader = new FileReader();
      reader.onload = evt => {
        if (evt.target?.result) {
          setNewExamFileUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Digital Signature Save
  const handleSaveSignature = async (sigDataUrl: string) => {
    if (!selectedAvalForSignature) return;

    const hash = `FISIO-${selectedAvalForSignature.id.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const updated: CrmAvaliacao = {
      ...selectedAvalForSignature,
      termoImagemVozAceito: true,
      termoImagemVozTipo: selectedAvalForSignature.termoImagemVozTipo || 'completo',
      termoImagemVozData: new Date().toISOString(),
      assinaturaPacienteUrl: sigDataUrl,
      assinaturaProfissionalUrl:
        selectedAvalForSignature.assinaturaProfissionalUrl || clinic.managerSignatureUrl || getProfessionalSignature(),
      assinaturaData: new Date().toISOString(),
      assinaturaHash: hash,
    };

    try {
      await api.saveCrmAvaliacao(updated);
      setCrmAvaliacoes(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      setSelectedAvalForSignature(null);
    } catch (e) {
      console.error('Error saving digital signature:', e);
    }
  };

  // -------------------------------------------------------------
  // RENDER: 1. CPF PASSWORD AUTHENTICATION SCREEN (RESTRICTED ACCESS)
  // -------------------------------------------------------------
  if (!authenticatedCpf || !currentPatient) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full bg-[#FAF7F0] rounded-3xl p-6 sm:p-10 shadow-2xl border border-[#E4DCC8] relative overflow-hidden space-y-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Botanical Gold Corner Accent */}
          <div className="absolute -top-3 -right-3 w-28 h-28 pointer-events-none opacity-40">
            <BotanicalVineAccents variant="corner-tr" colorTheme="gold" />
          </div>

          {/* Header & Icon */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#1B2E24] to-[#2B4738] text-[#DCC58F] flex items-center justify-center mx-auto shadow-md border border-[#DCC58F]/30">
              <ClipboardList className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1B2E24]/10 text-[#1B2E24] text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-[#B08A3E]" />
              <span>Acesso Restrito • Sigilo Médico & LGPD</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2E24] tracking-tight">
              Prontuário do Paciente
            </h1>

            <p className="text-xs sm:text-sm text-[#736B5E] max-w-md mx-auto leading-relaxed">
              Para proteger seus dados clínicos, evoluções de sessões, ficha de avaliação com anexos e contratos assinados, informe a sua <strong className="text-[#1B2E24]">senha de acesso (seu CPF)</strong>.
            </p>
          </div>

          {/* CPF Form */}
          <form onSubmit={e => { e.preventDefault(); handleAuthenticateCpf(); }} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#1B2E24] uppercase tracking-wider mb-2">
                Senha de Acesso (CPF do Paciente)
              </label>

              <div className="relative flex items-center">
                <KeyRound className="w-5 h-5 absolute left-3.5 text-[#736B5E]" />
                <input
                  id="input-patient-cpf-password"
                  type={showPasswordMask ? 'text' : 'password'}
                  inputMode="numeric"
                  value={cpfPasswordInput}
                  onChange={handleCpfInputChange}
                  placeholder="000.000.000-00"
                  className="w-full pl-11 pr-12 py-3.5 bg-white rounded-2xl border border-[#D5CCA4] text-[#1B2E24] font-mono text-base font-bold tracking-widest focus:ring-2 focus:ring-[#B08A3E] focus:outline-none transition-all placeholder:text-[#9E9585]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordMask(!showPasswordMask)}
                  className="absolute right-3.5 text-[#736B5E] hover:text-[#1B2E24] p-1.5 rounded-lg transition-colors cursor-pointer"
                  title={showPasswordMask ? 'Ocultar CPF' : 'Mostrar dígitos do CPF'}
                >
                  {showPasswordMask ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {authError && (
                <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <button
              id="btn-submit-cpf-auth"
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 px-6 bg-linear-to-r from-[#1B2E24] to-[#2E4E3C] hover:from-[#243E30] hover:to-[#385E49] text-[#FAF7F0] rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 border border-[#DCC58F]/40 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 text-[#DCC58F]" />
              <span>{isAuthenticating ? 'Validando Prontuário...' : 'Acessar Meu Prontuário'}</span>
            </button>
          </form>

          {/* Quick Demo Patients Shortcut */}
          <div className="pt-4 border-t border-[#E4DCC8] space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#736B5E] block text-center">
              Pacientes Cadastrados para Teste Rápido:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('341.892.108-45')}
                className="p-2.5 bg-white hover:bg-[#F3EEE2] rounded-xl border border-[#D5CCA4] text-left transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-[#1B2E24] block">Mariana Silva Santos</span>
                  <span className="text-[10px] text-[#736B5E] font-mono">CPF: 341.892.108-45</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#B08A3E]" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('219.450.812-90')}
                className="p-2.5 bg-white hover:bg-[#F3EEE2] rounded-xl border border-[#D5CCA4] text-left transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-[#1B2E24] block">Carlos Eduardo Oliveira</span>
                  <span className="text-[10px] text-[#736B5E] font-mono">CPF: 219.450.812-90</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#B08A3E]" />
              </button>
            </div>
          </div>

          {/* Security & Responsibility Guarantee */}
          <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center space-x-3 text-[11px] text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <strong>Responsável Técnica:</strong> Dra. Elays Marinho • CREFITO-12 / 208058<br />
              Prontuário eletrônico em conformidade com as Resoluções COFFITO e LGPD (Lei 13.709/2018).
            </div>
          </div>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 2. AUTHENTICATED PATIENT PRONTUÁRIO & CLINICAL DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* TOP HEADER: PATIENT IDENTIFICATION & PRONTUÁRIO STATUS */}
      {/* ========================================================= */}
      <div className="bg-linear-to-br from-[#1B2E24] via-[#243E30] to-[#16251D] rounded-3xl p-6 sm:p-8 text-[#FAF7F0] shadow-xl relative overflow-hidden border border-[#DCC58F]/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#DCC58F]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Patient Details & Status */}
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-[#DCC58F] text-xs font-bold uppercase tracking-wider">
              <ClipboardList className="w-3.5 h-3.5 text-[#DCC58F]" />
              <span>Prontuário do Paciente • Fisiolys Digital</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <span>{currentPatient.name}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#E4DCC8]">
              <span className="font-mono bg-black/25 px-2.5 py-0.5 rounded-md text-[#DCC58F] border border-[#DCC58F]/30">
                CPF: {currentPatient.cpf || formatPhoneMask(authenticatedCpf)}
              </span>
              <span>•</span>
              <span>Telefone: {currentPatient.phone}</span>
              {currentEvaluation?.profissao && (
                <>
                  <span>•</span>
                  <span>Profissão: {currentEvaluation.profissao}</span>
                </>
              )}
            </div>

            <div className="text-xs text-emerald-200/90 flex items-center space-x-1.5 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#DCC58F]" />
              <span>Responsável Técnica: <strong>Dra. Elays Marinho (CREFITO-12 / 208058)</strong></span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadFullProntuarioPDF}
              disabled={isDownloadingPdf}
              className="px-4 py-2.5 bg-[#DCC58F] hover:bg-[#c9b075] text-[#1B2E24] rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              title="Baixar prontuário clínico e histórico completo em PDF"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingPdf ? 'Gerando PDF...' : 'Baixar Prontuário (PDF)'}</span>
            </button>

            <button
              onClick={handleDownloadSignedContractPDF}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all border border-white/30 backdrop-blur-xs flex items-center space-x-2 cursor-pointer"
              title="Baixar contrato de prestação de serviços assinado"
            >
              <FileSignature className="w-4 h-4 text-[#DCC58F]" />
              <span>Contrato Assinado (PDF)</span>
            </button>

            <button
              onClick={handleLockProntuario}
              className="px-4 py-2.5 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded-xl text-xs font-bold transition-all border border-rose-700/50 flex items-center space-x-2 cursor-pointer"
              title="Bloquear prontuário e encerrar sessão segura"
            >
              <Lock className="w-4 h-4" />
              <span>Bloquear / Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* NAVIGATION TABS (ALL REQUESTED PRONTUÁRIO MODULES) */}
      {/* ========================================================= */}
      <div className="flex items-center space-x-2 border-b border-[#E4DCC8] overflow-x-auto pb-2 scrollbar-none">
        
        <button
          onClick={() => setActiveTab('avaliacao')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'avaliacao'
              ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm'
              : 'bg-[#FAF7F0] text-[#736B5E] hover:bg-[#F3EEE2] border border-[#E4DCC8]'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-[#DCC58F]" />
          <span>Ficha de Avaliação Clínica</span>
        </button>

        <button
          onClick={() => setActiveTab('exames')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'exames'
              ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm'
              : 'bg-[#FAF7F0] text-[#736B5E] hover:bg-[#F3EEE2] border border-[#E4DCC8]'
          }`}
        >
          <Paperclip className="w-4 h-4 text-[#DCC58F]" />
          <span>Exames & Anexos ({currentEvaluation?.examesAnexados?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('evolucoes')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'evolucoes'
              ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm'
              : 'bg-[#FAF7F0] text-[#736B5E] hover:bg-[#F3EEE2] border border-[#E4DCC8]'
          }`}
        >
          <Activity className="w-4 h-4 text-[#DCC58F]" />
          <span>Evoluções & Frequência ({currentEvaluation?.evolucoes?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('contratos')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'contratos'
              ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm'
              : 'bg-[#FAF7F0] text-[#736B5E] hover:bg-[#F3EEE2] border border-[#E4DCC8]'
          }`}
        >
          <FileSignature className="w-4 h-4 text-[#DCC58F]" />
          <span>Contratos & Termos TCLE</span>
        </button>

        <button
          onClick={() => setActiveTab('extrato')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'extrato'
              ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm'
              : 'bg-[#FAF7F0] text-[#736B5E] hover:bg-[#F3EEE2] border border-[#E4DCC8]'
          }`}
        >
          <DollarSign className="w-4 h-4 text-[#DCC58F]" />
          <span>Extrato Financeiro & Recibos</span>
        </button>

        <button
          onClick={() => setActiveTab('proximos')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'proximos'
              ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm'
              : 'bg-[#FAF7F0] text-[#736B5E] hover:bg-[#F3EEE2] border border-[#E4DCC8]'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-[#DCC58F]" />
          <span>Próximas Consultas</span>
        </button>

        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'checkin'
              ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm'
              : 'bg-[#FAF7F0] text-[#736B5E] hover:bg-[#F3EEE2] border border-[#E4DCC8]'
          }`}
        >
          <QrCode className="w-4 h-4 text-[#DCC58F]" />
          <span>Check-in de Chegada</span>
        </button>

      </div>

      {/* ========================================================= */}
      {/* TAB 1: FICHA DE AVALIAÇÃO CLÍNICA & ANAMNESE */}
      {/* ========================================================= */}
      {activeTab === 'avaliacao' && (
        <div className="space-y-6">
          {currentEvaluation ? (
            <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 border border-[#E4DCC8] shadow-sm space-y-6">
              
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E4DCC8] gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#B08A3E] uppercase tracking-wider">
                    <Stethoscope className="w-4 h-4" />
                    <span>Ficha de Avaliação Cinético-Funcional</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#1B2E24]">
                    Diagnóstico & Anamnese Oficial
                  </h2>
                  <p className="text-xs text-[#736B5E]">
                    Realizada em {formatDatePtBR(currentEvaluation.data)} por {currentEvaluation.avaliador || 'Dra. Elays Marinho (CREFITO-12 / 208058)'}
                  </p>
                </div>

                <button
                  onClick={handleDownloadFullProntuarioPDF}
                  className="px-4 py-2 bg-[#1B2E24] hover:bg-[#2B4738] text-[#FAF7F0] rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-[#DCC58F]" />
                  <span>Imprimir / Baixar Ficha (PDF)</span>
                </button>
              </div>

              {/* Main Complaint (Highlight) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>Queixa Principal do Paciente</span>
                </span>
                <p className="text-sm font-semibold text-amber-950 leading-relaxed">
                  "{currentEvaluation.queixaPrincipal || 'Não informada'}"
                </p>
              </div>

              {/* Grid of Clinical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Histórico Clínico */}
                <div className="p-5 rounded-2xl bg-white border border-[#E4DCC8] space-y-2">
                  <h3 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <span>Histórico da Doença Atual & Cinesiológico</span>
                  </h3>
                  <p className="text-xs text-[#4A463E] leading-relaxed">
                    {currentEvaluation.historico || 'Sem histórico prévio relatado.'}
                  </p>
                </div>

                {/* Medicamentos & Comorbidades */}
                <div className="p-5 rounded-2xl bg-white border border-[#E4DCC8] space-y-3">
                  <div>
                    <span className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider block">
                      Medicamentos em Uso:
                    </span>
                    <span className="text-xs text-[#4A463E]">
                      {currentEvaluation.medicamentos || 'Nenhum medicamento informado.'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider block">
                      Comorbidades / Alergias:
                    </span>
                    <span className="text-xs text-[#4A463E]">
                      {currentEvaluation.comorbidades || 'Nenhuma comorbidade relatada.'}
                    </span>
                  </div>
                </div>

                {/* Exame Físico: Inspeção & ADM */}
                <div className="p-5 rounded-2xl bg-white border border-[#E4DCC8] space-y-2">
                  <h3 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider">
                    Inspeção Postural & Palpação
                  </h3>
                  <p className="text-xs text-[#4A463E] leading-relaxed">
                    {currentEvaluation.inspecao || 'Padrão postural dentro dos limites fisiológicos.'}
                  </p>
                </div>

                {/* ADM e Força Muscular */}
                <div className="p-5 rounded-2xl bg-white border border-[#E4DCC8] space-y-2">
                  <h3 className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider">
                    Amplitude de Movimento (ADM) & Força Muscular
                  </h3>
                  <p className="text-xs text-[#4A463E] leading-relaxed">
                    {currentEvaluation.adm || 'ADM preservada.'} {currentEvaluation.forcaMuscular ? `• ${currentEvaluation.forcaMuscular}` : ''}
                  </p>
                </div>

              </div>

              {/* Escala Analógica Visual de Dor (EVA) */}
              <div className="p-5 rounded-2xl bg-white border border-[#E4DCC8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-1.5">
                    <Heart className="w-4 h-4 text-rose-600" />
                    <span>Nível de Dor na Avaliação Inicial (Escala EVA)</span>
                  </span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-mono">
                    EVA: {currentEvaluation.escalaDor || 0} / 10
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 relative overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 via-amber-500 to-rose-600 transition-all"
                    style={{ width: `${((currentEvaluation.escalaDor || 0) / 10) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-[#736B5E] font-medium">
                  <span>0 - Sem dor</span>
                  <span>5 - Dor Moderada</span>
                  <span>10 - Dor Intensa</span>
                </div>
              </div>

              {/* Diagnóstico Cinético-Funcional & Plano Terapêutico */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#1B2E24] text-[#FAF7F0] space-y-4 shadow-xs">
                <div>
                  <span className="text-xs font-bold text-[#DCC58F] uppercase tracking-wider block">
                    Diagnóstico Cinético-Funcional (CREFITO-12 / 208058)
                  </span>
                  <p className="text-sm font-semibold text-white mt-1 leading-relaxed">
                    {currentEvaluation.diagnosticoFuncional || 'Diagnóstico em acompanhamento cinesiológico contínuo.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#DCC58F]/20 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-[#DCC58F] uppercase tracking-wider block">Objetivos Terapêuticos:</span>
                    <p className="text-[#E4DCC8] mt-0.5">{currentEvaluation.objetivos || 'Alívio de dor e ganho funcional.'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#DCC58F] uppercase tracking-wider block">Plano de Tratamento:</span>
                    <p className="text-[#E4DCC8] mt-0.5">{currentEvaluation.planoTerapeutico || 'Sessões de Fisioterapia e Pilates Clínico.'}</p>
                  </div>
                </div>
              </div>

              {/* Digital Signatures & Autenticity Seal */}
              <div className="p-5 rounded-2xl bg-white border border-[#E4DCC8] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-2">
                  <span className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Assinaturas Digitais & Autenticidade Jurídica</span>
                  </span>
                  {currentEvaluation.assinaturaHash && (
                    <span className="text-[10px] font-mono text-[#736B5E]">
                      Hash: {currentEvaluation.assinaturaHash}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Patient Signature */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                    <span className="text-[11px] font-bold text-[#1B2E24] block">Paciente:</span>
                    {currentEvaluation.assinaturaPacienteUrl ? (
                      <img
                        src={currentEvaluation.assinaturaPacienteUrl}
                        alt="Assinatura do Paciente"
                        className="max-h-16 mx-auto object-contain"
                      />
                    ) : (
                      <div className="h-12 flex items-center justify-center text-xs text-amber-700 italic">
                        Assinatura eletrônica registrada na recepção
                      </div>
                    )}
                    <span className="text-xs font-bold text-[#1B2E24] block">{currentPatient.name}</span>
                    <span className="text-[10px] text-[#736B5E] block">Assinado em {formatDatePtBR(currentEvaluation.data)}</span>
                  </div>

                  {/* Dra. Elays Signature */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                    <span className="text-[11px] font-bold text-[#1B2E24] block">Fisioterapeuta Responsável:</span>
                    {currentEvaluation.assinaturaProfissionalUrl || clinic.managerSignatureUrl ? (
                      <img
                        src={currentEvaluation.assinaturaProfissionalUrl || clinic.managerSignatureUrl}
                        alt="Assinatura Dra. Elays Marinho"
                        className="max-h-16 mx-auto object-contain"
                      />
                    ) : (
                      <div className="h-12 flex items-center justify-center text-xs text-emerald-800 font-bold">
                        Dra. Elays Marinho • CREFITO-12 / 208058
                      </div>
                    )}
                    <span className="text-xs font-bold text-[#1B2E24] block">Dra. Elays Marinho</span>
                    <span className="text-[10px] text-[#736B5E] block">CREFITO-12 / 208058 • Fisiolys</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[#FAF7F0] rounded-3xl p-12 text-center border border-[#E4DCC8] space-y-3">
              <ClipboardList className="w-12 h-12 text-[#B08A3E] mx-auto opacity-60" />
              <h3 className="text-base font-bold text-[#1B2E24]">Ficha de Avaliação em Processamento</h3>
              <p className="text-xs text-[#736B5E] max-w-md mx-auto">
                Sua ficha de avaliação cinético-funcional está sendo digitalizada e assinada pela Dra. Elays Marinho.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: EXAMES & ANEXOS CLÍNICOS */}
      {/* ========================================================= */}
      {activeTab === 'exames' && (
        <div className="space-y-6">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 border border-[#E4DCC8] shadow-sm space-y-6">
            
            {/* Header with Upload Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E4DCC8] gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#B08A3E] uppercase tracking-wider">
                  <Paperclip className="w-4 h-4" />
                  <span>Galeria de Imagens Radiológicas & Laudos</span>
                </div>
                <h2 className="text-xl font-extrabold text-[#1B2E24]">
                  Exames Complementares & Anexos
                </h2>
                <p className="text-xs text-[#736B5E]">
                  Consulte seus Raio-X, Ressonâncias, Laudos Ortopédicos ou anexe novos documentos ao seu prontuário.
                </p>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2.5 bg-[#1B2E24] hover:bg-[#2B4738] text-[#FAF7F0] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#DCC58F]" />
                <span>Anexar Novo Exame</span>
              </button>
            </div>

            {/* List / Cards of Attachments */}
            {currentEvaluation?.examesAnexados && currentEvaluation.examesAnexados.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentEvaluation.examesAnexados.map(exam => (
                  <div
                    key={exam.id}
                    className="bg-white rounded-2xl p-4 border border-[#E4DCC8] shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    {/* Thumbnail Preview with Lightbox Trigger */}
                    <div
                      onClick={() => setSelectedExamLightbox(exam)}
                      className="w-full h-40 bg-slate-900 rounded-xl overflow-hidden relative cursor-pointer flex items-center justify-center group-hover:ring-2 group-hover:ring-[#B08A3E]/60 transition-all"
                    >
                      {exam.arquivoUrl && (exam.arquivoUrl.startsWith('data:image') || exam.arquivoUrl.startsWith('http')) ? (
                        <img
                          src={exam.arquivoUrl}
                          alt={exam.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-300 space-y-1">
                          <FileText className="w-10 h-10 mx-auto text-[#DCC58F]" />
                          <span className="text-[11px] font-bold block">Documento / Laudo PDF</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white space-x-1.5 text-xs font-bold">
                        <ZoomIn className="w-4 h-4 text-[#DCC58F]" />
                        <span>Visualizar em Tela Cheia</span>
                      </div>

                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#1B2E24]/80 text-[#DCC58F] backdrop-blur-xs">
                        {exam.tipo.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[#1B2E24] line-clamp-1">{exam.nome}</h4>
                      <span className="text-[11px] text-[#736B5E] block">
                        📅 Data do Exame: {formatDatePtBR(exam.data)}
                      </span>
                      {exam.observacoes && (
                        <p className="text-xs text-[#4A463E] bg-[#FAF7F0] p-2 rounded-lg border border-[#E4DCC8] mt-1 leading-relaxed">
                          {exam.observacoes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-[#E4DCC8] flex items-center justify-between">
                      <span className="text-[10px] text-[#736B5E]">{exam.tamanhoFormatado || 'Arquivo verificado'}</span>
                      <a
                        href={exam.arquivoUrl}
                        download={exam.nome}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#B08A3E] hover:text-[#8C6D2D] flex items-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#D5CCA4] space-y-3">
                <Paperclip className="w-10 h-10 text-[#736B5E] mx-auto opacity-50" />
                <h4 className="text-sm font-bold text-[#1B2E24]">Nenhum exame anexado até o momento</h4>
                <p className="text-xs text-[#736B5E] max-w-sm mx-auto">
                  Você ou a Dra. Elays Marinho podem anexar Raio-X, Ressonâncias e Laudos Médicos diretamente no botão acima.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: EVOLUÇÕES SESSÃO A SESSÃO & FREQUÊNCIA */}
      {/* ========================================================= */}
      {activeTab === 'evolucoes' && (
        <div className="space-y-6">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 border border-[#E4DCC8] shadow-sm space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E4DCC8] gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#B08A3E] uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  <span>Histórico Sessão a Sessão & Presença</span>
                </div>
                <h2 className="text-xl font-extrabold text-[#1B2E24]">
                  Evolução Clínica & Condutas Fisioterapêuticas
                </h2>
                <p className="text-xs text-[#736B5E]">
                  Acompanhe detalhadamente os procedimentos realizados em cada atendimento pela Dra. Elays Marinho.
                </p>
              </div>

              {/* Attendance Quick Metric */}
              <div className="px-4 py-2.5 rounded-2xl bg-[#1B2E24] text-[#FAF7F0] flex items-center space-x-3 border border-[#DCC58F]/30">
                <Flame className="w-5 h-5 text-[#DCC58F]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#DCC58F] block">Assiduidade:</span>
                  <span className="text-sm font-black">{attendanceStats.taxa}% de Presença</span>
                </div>
              </div>
            </div>

            {/* Evolutions Timeline */}
            {currentEvaluation?.evolucoes && currentEvaluation.evolucoes.length > 0 ? (
              <div className="space-y-4">
                {currentEvaluation.evolucoes.map((ev, idx) => (
                  <div
                    key={ev.id}
                    className="p-5 rounded-2xl bg-white border border-[#E4DCC8] shadow-xs space-y-3 hover:border-[#B08A3E] transition-all"
                  >
                    {/* Evolution Header Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4DCC8] pb-2.5">
                      <div className="flex items-center space-x-2">
                        {/* Frequency Tag: e.g. "Sessão 1/10" */}
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-[#1B2E24] text-[#DCC58F] border border-[#DCC58F]/30 font-mono">
                          {ev.quantidadeRealizada || `Sessão ${ev.sessao || idx + 1}/${ev.totalSessoesPlano || 10}`}
                        </span>

                        {/* Status Presença */}
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {ev.presencaStatus === 'falta_justificada'
                            ? 'Falta Justificada'
                            : ev.presencaStatus === 'reposicao'
                            ? 'Reposição de Aula'
                            : 'Presente no Atendimento'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-[#736B5E]">
                        <span>📅 <strong>{formatDatePtBR(ev.data)}</strong></span>
                        {ev.dorDepois !== undefined && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                            Dor: EVA {ev.dorAntes ?? 0} ➔ {ev.dorDepois}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Procedimentos Realizados */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#1B2E24] uppercase tracking-wider block">
                        Procedimentos & Condutas Aplicadas:
                      </span>
                      <p className="text-xs text-[#26241F] leading-relaxed font-medium">
                        {ev.procedimentos}
                      </p>
                    </div>

                    {/* Observações da Terapeuta */}
                    {ev.observacoes && (
                      <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#E4DCC8] text-xs text-[#4A463E]">
                        <strong>Observações Clínicas:</strong> {ev.observacoes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#D5CCA4] space-y-3">
                <Activity className="w-10 h-10 text-[#736B5E] mx-auto opacity-50" />
                <h4 className="text-sm font-bold text-[#1B2E24]">Nenhuma evolução registrada</h4>
                <p className="text-xs text-[#736B5E] max-w-sm mx-auto">
                  As anotações e condutas de cada sessão serão adicionadas pela Dra. Elays Marinho após cada atendimento.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: CONTRATOS DE PRESTAÇÃO DE SERVIÇOS & TCLE */}
      {/* ========================================================= */}
      {activeTab === 'contratos' && (
        <div className="space-y-6">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 border border-[#E4DCC8] shadow-sm space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E4DCC8] gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#B08A3E] uppercase tracking-wider">
                  <FileSignature className="w-4 h-4" />
                  <span>Instrumentos Contratuais & Consentimento</span>
                </div>
                <h2 className="text-xl font-extrabold text-[#1B2E24]">
                  Contrato de Prestação de Serviços & TCLE
                </h2>
                <p className="text-xs text-[#736B5E]">
                  Contrato oficial de Fisioterapia e Pilates com cláusulas de reposição, cancelamento e assinatura digital legal.
                </p>
              </div>

              <button
                onClick={handleDownloadSignedContractPDF}
                className="px-4 py-2.5 bg-[#1B2E24] hover:bg-[#2B4738] text-[#FAF7F0] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#DCC58F]" />
                <span>Baixar Contrato em PDF</span>
              </button>
            </div>

            {/* Contract Summary Box */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4DCC8] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4DCC8] pb-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1B2E24] uppercase tracking-wider">
                    Contrato de Prestação de Serviços Fisioterapêuticos
                  </span>
                  <p className="text-xs text-[#736B5E]">
                    Contratante: <strong>{currentPatient.name}</strong> • CPF: {currentPatient.cpf || authenticatedCpf}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Contrato Assinado & Vigente</span>
                  </span>
                </div>
              </div>

              {/* Key Clauses Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#E4DCC8]">
                  <span className="font-bold text-[#1B2E24] block">Objeto do Contrato:</span>
                  <span className="text-[#4A463E] mt-0.5 block">
                    {currentEvaluation?.planoTerapeutico || 'Tratamento de Fisioterapia / Pilates Clínico em aparelhos'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#E4DCC8]">
                  <span className="font-bold text-[#1B2E24] block">Frequência Semanal:</span>
                  <span className="text-[#4A463E] mt-0.5 block">
                    {currentEvaluation?.frequenciaSemanal || '2 a 3 sessões semanais agendadas'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#E4DCC8]">
                  <span className="font-bold text-[#1B2E24] block">Investimento Contratado:</span>
                  <span className="text-emerald-800 font-bold mt-0.5 block">
                    {currentEvaluation?.valorTratamento || 'Conforme plano de sessões acordado'}
                  </span>
                </div>
              </div>

              {/* Collapsible Full Clauses */}
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedClauses(!expandedClauses)}
                  className="text-xs font-bold text-[#B08A3E] hover:text-[#8C6D2D] flex items-center space-x-1.5 cursor-pointer py-1"
                >
                  {expandedClauses ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{expandedClauses ? 'Ocultar Cláusulas Detalhadas' : 'Ver Cláusulas Detalhadas do Contrato (Reposição, Faltas e Direitos)'}</span>
                </button>

                {expandedClauses && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#4A463E] space-y-3 leading-relaxed animate-in fade-in duration-150">
                    <p>
                      <strong>CLÁUSULA 1ª (DO OBJETO):</strong> O presente instrumento tem por objeto a prestação de serviços especializados de Fisioterapia e Pilates Clínico pela CONTRATADA em favor do(a) CONTRATANTE, com foco na reabilitação cinético-funcional e condicionamento postural.
                    </p>
                    <p>
                      <strong>CLÁUSULA 2ª (DAS REPOSIÇÕES & DESMARCAÇÕES):</strong> Desmarcações deverão ser comunicadas com antecedência mínima de 4 (quatro) horas via WhatsApp oficial da clínica. Sessões desmarcadas no prazo poderão ser repostas conforme disponibilidade da grade nos 30 dias subsequentes.
                    </p>
                    <p>
                      <strong>CLÁUSULA 3ª (DO TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - TCLE):</strong> O paciente declara ter sido devidamente informado(a) sobre o diagnóstico cinético-funcional, objetivos terapêuticos e condutas recomendadas, autorizando a realização dos procedimentos pela Dra. Elays Marinho (CREFITO-12 / 208058).
                    </p>
                    <p>
                      <strong>CLÁUSULA 4ª (DO SIGILO & LGPD):</strong> Em estrita conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018) e o Código de Ética Profissional do COFFITO, todos os dados clínicos e prontuários são confidenciais e invioláveis.
                    </p>
                  </div>
                )}
              </div>

              {/* Digital Signatures Box */}
              <div className="pt-4 border-t border-[#E4DCC8] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#736B5E]">
                  <span>Validação Eletrônica: </span>
                  <strong className="text-[#1B2E24] font-mono">{currentEvaluation?.assinaturaHash || 'FISIO-AUTH-LEGAL-2026'}</strong>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedAvalForSignature(currentEvaluation)}
                    className="px-3.5 py-1.5 bg-[#FAF7F0] hover:bg-[#F3EEE2] text-[#1B2E24] rounded-xl text-xs font-bold border border-[#D5CCA4] transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <span>Revisar / Atualizar Assinatura</span>
                  </button>

                  <button
                    onClick={handleDownloadSignedContractPDF}
                    className="px-3.5 py-1.5 bg-[#1B2E24] hover:bg-[#2B4738] text-[#FAF7F0] rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Baixar PDF Assinado</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: EXTRATO FINANCEIRO, RECIBOS & DECLARAÇÃO DE IR */}
      {/* ========================================================= */}
      {activeTab === 'extrato' && (
        <div className="space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#FAF7F0] border border-[#E4DCC8] shadow-xs">
              <span className="text-xs font-bold text-[#736B5E] uppercase tracking-wider block">Total Fisioterapia:</span>
              <span className="text-xl font-extrabold text-[#1B2E24] mt-1 block">
                {formatCurrency(financialSummary.totalFisioterapia)}
              </span>
              <span className="text-[11px] text-[#736B5E]">{financialSummary.countFisioterapia} sessões quitadas</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F0] border border-[#E4DCC8] shadow-xs">
              <span className="text-xs font-bold text-[#736B5E] uppercase tracking-wider block">Total Pilates Clínico:</span>
              <span className="text-xl font-extrabold text-[#1B2E24] mt-1 block">
                {formatCurrency(financialSummary.totalPilates)}
              </span>
              <span className="text-[11px] text-[#736B5E]">{financialSummary.countPilates} aulas quitadas</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#1B2E24] text-[#FAF7F0] border border-[#DCC58F]/30 shadow-xs">
              <span className="text-xs font-bold text-[#DCC58F] uppercase tracking-wider block">Total Geral Investido:</span>
              <span className="text-xl font-extrabold text-white mt-1 block">
                {formatCurrency(financialSummary.totalGeral)}
              </span>
              <span className="text-[11px] text-[#E4DCC8]">{financialSummary.totalSessoes} atendimentos totais</span>
            </div>
          </div>

          {/* Statement & Receipts Table */}
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 border border-[#E4DCC8] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E4DCC8] gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#1B2E24]">
                  Extrato de Pagamentos & Recibos Oficiais
                </h3>
                <p className="text-xs text-[#736B5E]">
                  Todos os recibos contêm carimbo profissional e CPF/CNPJ para fins de dedução em Imposto de Renda.
                </p>
              </div>

              <button
                onClick={handleDownloadTaxStatementPDF}
                className="px-4 py-2.5 bg-[#B08A3E] hover:bg-[#97732E] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Declaração Anual de IRPF</span>
              </button>
            </div>

            {/* List of Payments */}
            {filteredAppointments.length > 0 ? (
              <div className="divide-y divide-[#E4DCC8] bg-white rounded-2xl border border-[#E4DCC8] overflow-hidden">
                {filteredAppointments.map(appt => (
                  <div
                    key={appt.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF7F0] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#1B2E24]">{appt.serviceName}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {appt.paymentMethod || 'PIX'} Quitado
                        </span>
                      </div>
                      <span className="text-[11px] text-[#736B5E]">
                        Data: {formatDatePtBR(appt.date)} às {appt.time} hs
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-emerald-800">
                        {formatCurrency(appt.servicePrice || 0)}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedReceiptAppt(appt)}
                        className="px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#F3EEE2] text-[#1B2E24] rounded-xl text-xs font-bold border border-[#D5CCA4] transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-[#B08A3E]" />
                        <span>Ver Recibo</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-[#E4DCC8] text-xs text-[#736B5E]">
                Nenhum pagamento registrado no período selecionado.
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: PRÓXIMAS CONSULTAS & REAGENDAMENTO */}
      {/* ========================================================= */}
      {activeTab === 'proximos' && (
        <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 border border-[#E4DCC8] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E4DCC8] gap-3">
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-[#1B2E24] flex items-center space-x-2">
                <CalendarDays className="w-5 h-5 text-[#B08A3E]" />
                <span>Próximas Consultas Agendadas ({upcomingAppointments.length})</span>
              </h3>
              <p className="text-xs text-[#736B5E]">
                Confirme sua presença ou solicite alteração de data/horário de forma rápida e segura.
              </p>
            </div>
            
            <a
              href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. Elays! Gostaria de falar sobre meus agendamentos no prontuário.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#B08A3E] hover:underline flex items-center space-x-1 self-start sm:self-auto"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Falar no WhatsApp da Clínica</span>
            </a>
          </div>

          {/* Direct Check-In Toast Notification */}
          {portalCheckInSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-900">
                    Presença Confirmada com Sucesso!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Olá {portalCheckInSuccess.name}, seu check-in para <strong>{portalCheckInSuccess.service}</strong> às {portalCheckInSuccess.time} foi registrado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPortalCheckInSuccess(null)}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {upcomingAppointments.length > 0 ? (
            <div className="divide-y divide-[#E4DCC8] bg-white rounded-2xl border border-[#E4DCC8] overflow-hidden shadow-2xs">
              {upcomingAppointments.map(appt => {
                const isCheckedIn = appt.attendanceStatus === 'presenca' || appt.status === 'concluido' || !!appt.checkedInAt;
                const isLoadingThis = portalCheckInLoadingId === appt.id;

                return (
                  <div key={appt.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#FAF7F0] transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-extrabold text-[#1B2E24]">{appt.serviceName}</span>
                        {isCheckedIn ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Presença Confirmada</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            🟡 Agendado
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#736B5E] block font-medium">
                        📅 Data: <strong>{formatDatePtBR(appt.date)}</strong> • ⏰ Horário: <strong>{appt.time} hs</strong> ({appt.durationMinutes} min)
                      </span>
                      {appt.notes && (
                        <p className="text-[11px] text-[#848278] italic">
                          Obs: {appt.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Botão 1: Confirmar Presença (In-app) */}
                      {!isCheckedIn ? (
                        <button
                          type="button"
                          onClick={() => handlePortalDirectCheckIn(appt)}
                          disabled={isLoadingThis}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#DCC58F]" />
                          <span>{isLoadingThis ? 'Confirmando...' : 'Confirmar Presença'}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Check-in Feito</span>
                        </span>
                      )}

                      {/* Botão 2: Reagendar Horário (Modal) */}
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleModalAppt(appt);
                          setRescheduleNewDate(appt.date);
                          setRescheduleNewTime(appt.time);
                          setRescheduleNotes('');
                          setRescheduleSuccess(false);
                        }}
                        className="px-3.5 py-2 bg-[#FAF7F0] hover:bg-[#F3EEE2] text-[#1B2E24] border border-[#E4DCC8] rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-[#B08A3E]" />
                        <span>Reagendar</span>
                      </button>

                      {/* Botão 3: WhatsApp */}
                      <a
                        href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. Elays! Gostaria de confirmar meu horário de ${appt.serviceName} no dia ${formatDatePtBR(appt.date)} às ${appt.time} hs.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-[#736B5E] border border-[#E4DCC8] rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5"
                        title="Falar no WhatsApp"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#D5CCA4] space-y-2">
              <Calendar className="w-8 h-8 text-[#736B5E] mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-[#1B2E24]">Você não possui consultas agendadas</h4>
              <p className="text-xs text-[#736B5E]">Entre em contato com a clínica para agendar seu próximo atendimento.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REAGENDAMENTO DE CONSULTA DENTRO DO PRONTUÁRIO */}
      {/* ========================================================= */}
      {rescheduleModalAppt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E4DCC8] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#FAF7F0] text-[#B08A3E] border border-[#E4DCC8]">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1B2E24]">Reagendar Atendimento</h3>
                  <p className="text-[11px] text-[#736B5E]">{rescheduleModalAppt.serviceName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalAppt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rescheduleSuccess ? (
              <div className="space-y-4 text-center py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#1B2E24]">Reagendamento Confirmado!</h4>
                  <p className="text-xs text-[#736B5E]">
                    Seu horário foi alterado para <strong>{formatDatePtBR(rescheduleNewDate)}</strong> às <strong>{rescheduleNewTime} hs</strong>.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. Elays! Reagendei meu horário de ${rescheduleModalAppt.serviceName} para o dia ${formatDatePtBR(rescheduleNewDate)} às ${rescheduleNewTime} hs.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Avisar a Recepção no WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setRescheduleModalAppt(null)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#E4DCC8] text-xs space-y-1 text-[#736B5E]">
                  <div>Horário Atual: <strong>{formatDatePtBR(rescheduleModalAppt.date)} às {rescheduleModalAppt.time} hs</strong></div>
                  <div>Paciente: <strong>{rescheduleModalAppt.patientName}</strong></div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">
                      📅 Selecione a Nova Data:
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={rescheduleNewDate}
                      onChange={(e) => setRescheduleNewDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">
                      ⏰ Selecione o Novo Horário:
                    </label>
                    <select
                      value={rescheduleNewTime}
                      onChange={(e) => setRescheduleNewTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    >
                      {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(t => (
                        <option key={t} value={t}>{t} hs</option>
                      ))}
                    </select>
                  </div>

                  {/* Horários Rápidos */}
                  <div className="flex flex-wrap gap-1.5">
                    {['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRescheduleNewTime(t)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                          rescheduleNewTime === t
                            ? 'bg-[#B08A3E] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1B2E24] mb-1">
                      Motivo / Observação (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Imprevisto de trabalho, compromisso médico..."
                      value={rescheduleNotes}
                      onChange={(e) => setRescheduleNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSavePortalReschedule}
                    disabled={isRescheduling}
                    className="flex-1 py-2.5 bg-[#1B2E24] hover:bg-[#2B4738] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>{isRescheduling ? 'Salvando...' : 'Confirmar Reagendamento'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRescheduleModalAppt(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: CHECK-IN DE CHEGADA */}
      {/* ========================================================= */}
      {activeTab === 'checkin' && (
        <PatientCheckIn
          clinic={clinic}
          appointments={patientAppointments}
          patient={currentPatient}
          onCheckInSuccess={() => {
            if (onReload) onReload();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: LIGHTBOX ZOOM PARA EXAMES */}
      {/* ========================================================= */}
      {selectedExamLightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#E4DCC8]">
            
            {/* Header */}
            <div className="p-4 border-b border-[#E4DCC8] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-bold text-[#1B2E24]">{selectedExamLightbox.nome}</h3>
                <span className="text-[11px] text-[#736B5E]">
                  Exame do paciente: {currentPatient.name} • Data: {formatDatePtBR(selectedExamLightbox.data)}
                </span>
              </div>
              <button
                onClick={() => setSelectedExamLightbox(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Image / Document */}
            <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center min-h-[300px]">
              {selectedExamLightbox.arquivoUrl && (selectedExamLightbox.arquivoUrl.startsWith('data:image') || selectedExamLightbox.arquivoUrl.startsWith('http')) ? (
                <img
                  src={selectedExamLightbox.arquivoUrl}
                  alt={selectedExamLightbox.nome}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center text-slate-300 p-8 space-y-3">
                  <FileText className="w-16 h-16 text-[#DCC58F] mx-auto" />
                  <p className="text-sm font-bold">Arquivo em Formato PDF / Laudo Clínico</p>
                  <a
                    href={selectedExamLightbox.arquivoUrl}
                    download={selectedExamLightbox.nome}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-[#DCC58F] text-[#1B2E24] rounded-xl text-xs font-bold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Arquivo Completo</span>
                  </a>
                </div>
              )}
            </div>

            {/* Footer with Observations */}
            {selectedExamLightbox.observacoes && (
              <div className="p-4 bg-white border-t border-[#E4DCC8] text-xs text-[#4A463E]">
                <strong>Laudo / Observações Clínicas:</strong> {selectedExamLightbox.observacoes}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: UPLOAD NOVO EXAME PELO PACIENTE */}
      {/* ========================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#E4DCC8] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <h3 className="text-sm font-extrabold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#B08A3E]" />
                <span>Anexar Exame ao Prontuário</span>
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExamAttachment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2E24] block mb-1">Título do Exame / Laudo *</label>
                <input
                  type="text"
                  required
                  value={newExamName}
                  onChange={e => setNewExamName(e.target.value)}
                  placeholder="Ex: Ressonância Cervical, Raio-X de Lombar"
                  className="w-full p-2.5 bg-white rounded-xl border border-[#D5CCA4] text-[#1B2E24] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2E24] block mb-1">Tipo de Exame</label>
                  <select
                    value={newExamTipo}
                    onChange={e => setNewExamTipo(e.target.value as any)}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#D5CCA4] text-[#1B2E24]"
                  >
                    <option value="raio_x">Raio-X</option>
                    <option value="ressonancia">Ressonância Magnética</option>
                    <option value="tomografia">Tomografia</option>
                    <option value="ultrassom">Ultrassonografia</option>
                    <option value="laudo_medico">Laudo Médico</option>
                    <option value="outro">Outro Documento</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1B2E24] block mb-1">Data do Exame</label>
                  <input
                    type="date"
                    value={newExamData}
                    onChange={e => setNewExamData(e.target.value)}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#D5CCA4] text-[#1B2E24]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2E24] block mb-1">Arquivo (Imagem ou PDF)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="w-full p-2 bg-white rounded-xl border border-[#D5CCA4] text-slate-700 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1B2E24] file:text-[#DCC58F]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2E24] block mb-1">Observações do Paciente / Laudo</label>
                <textarea
                  rows={2}
                  value={newExamObs}
                  onChange={e => setNewExamObs(e.target.value)}
                  placeholder="Informações adicionais sobre o resultado do exame..."
                  className="w-full p-2.5 bg-white rounded-xl border border-[#D5CCA4] text-[#1B2E24]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1B2E24] text-[#DCC58F] rounded-xl font-bold hover:bg-[#2B4738] transition-colors cursor-pointer"
                >
                  Salvar no Prontuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ASSINATURA DIGITAL DO CONTRATO */}
      {/* ========================================================= */}
      {selectedAvalForSignature && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#E4DCC8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <h3 className="text-sm font-extrabold text-[#1B2E24] uppercase tracking-wider flex items-center space-x-2">
                <PenTool className="w-4 h-4 text-[#B08A3E]" />
                <span>Assinatura Digital do Paciente</span>
              </h3>
              <button onClick={() => setSelectedAvalForSignature(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#736B5E]">
              Assine com o dedo ou mouse no quadro abaixo para validar seu contrato de prestação de serviços e consentimento com a Dra. Elays Marinho.
            </p>

            <DigitalSignaturePad
              signerName={currentPatient.name}
              signerRole="paciente"
              onSaveSignature={handleSaveSignature}
              onCancel={() => setSelectedAvalForSignature(null)}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RECIBO INDIVIDUAL DE PAGAMENTO */}
      {/* ========================================================= */}
      {selectedReceiptAppt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#E4DCC8] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4DCC8] pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-[#B08A3E]" />
                <h3 className="text-sm font-bold text-[#1B2E24] uppercase">Recibo de Atendimento Quitado</h3>
              </div>
              <button onClick={() => setSelectedReceiptAppt(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E4DCC8] space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Paciente:</span>
                <span className="font-bold text-[#1B2E24]">{selectedReceiptAppt.patientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Serviço:</span>
                <span className="font-bold text-[#1B2E24]">{selectedReceiptAppt.serviceName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Data do Atendimento:</span>
                <span className="font-bold text-[#1B2E24]">{formatDatePtBR(selectedReceiptAppt.date)} às {selectedReceiptAppt.time} hs</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Forma de Pagamento:</span>
                <span className="font-bold text-emerald-800 uppercase">{selectedReceiptAppt.paymentMethod || 'PIX'}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-black text-[#1B2E24]">
                <span>Valor Quitado:</span>
                <span className="text-emerald-700">{formatCurrency(selectedReceiptAppt.servicePrice || 0)}</span>
              </div>
            </div>

            <div className="text-[11px] text-[#736B5E] text-center">
              Fisioterapeuta Responsável: <strong>{clinic.managerName} (CREFITO-12 / 208058)</strong><br />
              {clinic.address} • {clinic.city}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadApptReceiptPDF(selectedReceiptAppt)}
                className="py-2.5 px-3 bg-[#1B2E24] hover:bg-[#2B4738] text-[#FAF7F0] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Baixar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = `*RECIBO DE ATENDIMENTO - FISIOLYS*\nPaciente: ${selectedReceiptAppt.patientName}\nServiço: ${selectedReceiptAppt.serviceName}\nData: ${formatDatePtBR(selectedReceiptAppt.date)} às ${selectedReceiptAppt.time} hs\nValor: R$ ${(selectedReceiptAppt.servicePrice || 0).toFixed(2).replace('.', ',')}\nForma: ${selectedReceiptAppt.paymentMethod || 'PIX'}\nProfissional: Dra. ${clinic.managerName} (CREFITO-12 / 208058)`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(text);
                    setCopiedReceipt(true);
                    setTimeout(() => setCopiedReceipt(false), 2000);
                  }
                }}
                className="py-2.5 px-3 bg-white hover:bg-[#F3EEE2] text-[#1B2E24] rounded-xl text-xs font-bold border border-[#D5CCA4] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copiedReceipt ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
