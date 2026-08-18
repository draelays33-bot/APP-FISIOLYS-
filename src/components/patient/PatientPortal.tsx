import React, { useState, useMemo } from 'react';
import {
  ClinicConfig,
  Service,
  Appointment,
  Patient,
  LoyaltyMember,
  PaymentMethod
} from '../../types';
import { formatDatePtBR, formatPhoneMask } from '../../utils/qrUtils';
import { PatientFrequency } from './PatientFrequency';
import { PatientCheckIn } from './PatientCheckIn';
import {
  User,
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
  CalendarCheck,
  TrendingUp,
  QrCode,
  Flame,
  Check,
  MessageSquare,
  X,
  Mail,
  Copy
} from 'lucide-react';

interface PatientPortalProps {
  clinic: ClinicConfig;
  services: Service[];
  appointments: Appointment[];
  patients: Patient[];
  loyaltyMembers?: LoyaltyMember[];
  onNavigateToBooking?: () => void;
  onReload?: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  clinic,
  services,
  appointments,
  patients,
  loyaltyMembers = [],
  onReload,
}) => {
  // Search query (name, phone or CPF)
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected Patient ID - default to first patient with appointments if available
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (patients.length > 0) return patients[0].id;
    return '';
  });

  // Filter by modality: all, fisioterapia, pilates, outros
  const [modalityFilter, setModalityFilter] = useState<'all' | 'fisioterapia' | 'pilates' | 'outros'>('all');
  
  // Filter by period: all, month, year
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'year'>('all');

  // Sub-tab inside patient management: frequencia, checkin, extrato, declaracao_ir, fidelidade, proximos
  const [activeTab, setActiveTab] = useState<'frequencia' | 'checkin' | 'extrato' | 'declaracao_ir' | 'fidelidade' | 'proximos'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const actionParam = urlParams.get('action');
        const checkinParam = urlParams.get('checkin');
        const tabParam = urlParams.get('tab');
        if (actionParam === 'checkin' || checkinParam === 'true' || tabParam === 'checkin') {
          return 'checkin';
        }
        if (tabParam === 'frequencia') {
          return 'frequencia';
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 'frequencia';
  });

  // Individual Receipt Modal
  const [selectedReceiptAppt, setSelectedReceiptAppt] = useState<Appointment | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copiedPatientInfo, setCopiedPatientInfo] = useState(false);

  // Filter patients by search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase().trim();
    return patients.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.cpf && p.cpf.includes(q))
    );
  }, [patients, searchQuery]);

  // Current selected patient object
  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0] || null;
  }, [patients, selectedPatientId]);

  // Find all appointments for this patient
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

  // Determine category for an appointment
  const getApptCategory = (appt: Appointment): 'fisioterapia' | 'pilates' | 'outros' => {
    const service = services.find(s => s.id === appt.serviceId);
    if (service) {
      if (service.category === 'fisioterapia') return 'fisioterapia';
      if (service.category === 'pilates') return 'pilates';
      return 'outros';
    }
    const nameLower = appt.serviceName.toLowerCase();
    if (nameLower.includes('pilates')) return 'pilates';
    if (
      nameLower.includes('fisio') ||
      nameLower.includes('rpg') ||
      nameLower.includes('coluna') ||
      nameLower.includes('reabilita') ||
      nameLower.includes('pediátr')
    ) {
      return 'fisioterapia';
    }
    return 'outros';
  };

  // Compute financial totals for this patient
  const financialSummary = useMemo(() => {
    let totalFisioterapia = 0;
    let countFisioterapia = 0;
    let totalPilates = 0;
    let countPilates = 0;
    let totalOutros = 0;
    let countOutros = 0;

    patientAppointments.forEach(appt => {
      // Ignore cancelled appointments in paid totals
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
  }, [patientAppointments, services]);

  // Filtered appointments list for display
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return patientAppointments.filter(appt => {
      // Modality filter
      if (modalityFilter !== 'all') {
        const cat = getApptCategory(appt);
        if (cat !== modalityFilter) return false;
      }

      // Period filter
      if (periodFilter !== 'all' && appt.date) {
        const apptDate = new Date(appt.date + 'T00:00:00');
        if (periodFilter === 'year' && apptDate.getFullYear() !== currentYear) {
          return false;
        }
        if (
          periodFilter === 'month' &&
          (apptDate.getFullYear() !== currentYear || apptDate.getMonth() !== currentMonth)
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [patientAppointments, modalityFilter, periodFilter, services]);

  // Attendance & frequency stats
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

  // Loyalty member data if registered
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

  // Print Statement / IR handler
  const handlePrintStatement = () => {
    window.print();
  };

  const handleCopyReceipt = (appt: Appointment) => {
    const text = `*COMPROVANTE DE ATENDIMENTO - FISIOLYS*\nPaciente: ${appt.patientName}\nServiço: ${appt.serviceName}\nData: ${formatDatePtBR(appt.date)} às ${appt.time} hs\nValor: R$ ${(appt.servicePrice || 0).toFixed(2).replace('.', ',')}\nForma: ${appt.paymentMethod || 'PIX'}\nResponsável: Dra. ${clinic.managerName} (CREFITO-12)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedReceipt(true);
        setTimeout(() => setCopiedReceipt(false), 2500);
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner: Patient Portal Welcome & Quick Search */}
      <div className="bg-gradient-to-br from-[#31523D] via-[#243E2E] to-[#1B2F23] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#D0A73B]/30">
        
        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D0A73B]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#769E82]/15 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Title & Patient Identification */}
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-[#D0A73B] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Portal do Paciente • Fisiolys</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gestão do Paciente, Frequência & Pagamentos
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-2xl leading-relaxed">
              Acompanhe sua <strong className="text-[#D0A73B]">frequência e assiduidade</strong>, faça <strong className="text-emerald-300">check-in de chegada via QR Code</strong> e consulte valores investidos em <strong className="text-[#D0A73B]">Fisioterapia</strong> e <strong className="text-[#769E82]">Pilates</strong> com recibos e declarações de IR.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('checkin')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 animate-pulse hover:animate-none cursor-pointer"
              title="Acessar Totem e QR Code de Check-in"
            >
              <QrCode className="w-4 h-4 text-emerald-200" />
              <span>📍 Fazer Check-in de Chegada</span>
            </button>

            <button
              onClick={() => setActiveTab('frequencia')}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all border border-white/30 backdrop-blur-xs flex items-center space-x-2 cursor-pointer"
              title="Acessar painel de assiduidade e histórico de presença"
            >
              <CalendarCheck className="w-4 h-4 text-[#D0A73B]" />
              <span>Ver Frequência</span>
            </button>

            <a
              href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. ${clinic.managerName}! Estou acessando a Gestão do Paciente na Fisiolys.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#D0A73B] hover:bg-[#b8912e] text-[#1B2F23] rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2"
              title="Falar diretamente com a clínica no WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Falar no WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Patient Selection Bar */}
        <div className="mt-6 pt-6 border-t border-white/15">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por Nome, CPF ou Telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/25 rounded-xl text-xs text-white placeholder-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#D0A73B] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Patient Switcher Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-xl no-scrollbar">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                Paciente:
              </span>
              {filteredPatients.slice(0, 6).map((p) => {
                const isSelected = p.id === currentPatient?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#D0A73B] text-[#1B2F23] font-bold shadow-md'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    <span>{p.name.split(' ')[0]}</span>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-[#1B2F23]" />}
                  </button>
                );
              })}
            </div>

          </div>
        </div>

      </div>

      {/* Selected Patient Identity Card */}
      {currentPatient && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('frequencia')}
              className="w-14 h-14 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-extrabold text-xl shadow-md shrink-0 hover:scale-105 transition-transform cursor-pointer"
              title="Clique para ver frequência"
            >
              {currentPatient.name.charAt(0)}
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">{currentPatient.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Paciente Ativo
                </span>
                <button
                  onClick={() => setActiveTab('frequencia')}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#F5EED3] text-[#7E611D] border border-[#D0A73B]/40 flex items-center space-x-1 hover:bg-[#ebdcae] transition-colors cursor-pointer"
                  title="Ver estatísticas de presença"
                >
                  <Flame className="w-3 h-3 text-amber-600" />
                  <span>{attendanceStats.taxa}% Assiduidade</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                <a
                  href={`https://wa.me/${currentPatient.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-700 hover:underline flex items-center space-x-1"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>{formatPhoneMask(currentPatient.phone)}</span>
                </a>
                {currentPatient.cpf && (
                  <span className="flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>CPF: {currentPatient.cpf}</span>
                  </span>
                )}
                {currentPatient.email && (
                  <a
                    href={`mailto:${currentPatient.email}`}
                    className="hover:text-emerald-700 hover:underline flex items-center space-x-1"
                  >
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{currentPatient.email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <a
            href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. ${clinic.managerName}, sou o(a) paciente ${currentPatient.name}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 shrink-0 transition-colors"
            title="Contatar fisioterapeuta responsável"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Fisioterapeuta Responsável: <strong>{clinic.managerName}</strong></span>
          </a>
        </div>
      )}

      {/* KEY HIGHLIGHT CARDS: VALORES PAGOS EM FISIOTERAPIA, PILATES, FREQUÊNCIA & CHECK-IN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Fisioterapia (CLICKABLE) */}
        <button
          type="button"
          onClick={() => {
            setModalityFilter('fisioterapia');
            setActiveTab('extrato');
          }}
          className="text-left bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs relative overflow-hidden hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
          title="Clique para ver extrato detalhado de Fisioterapia"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider group-hover:text-emerald-900">
              Total Fisioterapia
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              R$ {financialSummary.totalFisioterapia.toFixed(2).replace('.', ',')}
            </div>
            <div className="flex items-center space-x-1 text-xs text-emerald-700 font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{financialSummary.countFisioterapia} {financialSummary.countFisioterapia === 1 ? 'sessão realizada' : 'sessões realizadas'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tratamentos de Coluna & RPG</span>
            <span className="text-emerald-700 font-bold group-hover:underline flex items-center">
              Ver extrato <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </button>

        {/* Card 2: Pilates (CLICKABLE) */}
        <button
          type="button"
          onClick={() => {
            setModalityFilter('pilates');
            setActiveTab('extrato');
          }}
          className="text-left bg-white rounded-2xl p-5 border border-[#D0A73B]/30 shadow-xs relative overflow-hidden hover:shadow-md hover:border-[#D0A73B] transition-all cursor-pointer group"
          title="Clique para ver extrato detalhado de Pilates"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7E611D] uppercase tracking-wider group-hover:text-[#614a13]">
              Total Pilates
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F5EED3] text-[#7E611D] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              R$ {financialSummary.totalPilates.toFixed(2).replace('.', ',')}
            </div>
            <div className="flex items-center space-x-1 text-xs text-[#7E611D] font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{financialSummary.countPilates} {financialSummary.countPilates === 1 ? 'aula/sessão realizada' : 'aulas/sessões realizadas'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Solo, Aparelhos & Clínico</span>
            <span className="text-[#7E611D] font-bold group-hover:underline flex items-center">
              Ver extrato <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </button>

        {/* Card 3: Total Geral Investido (CLICKABLE) */}
        <button
          type="button"
          onClick={() => {
            setModalityFilter('all');
            setActiveTab('extrato');
          }}
          className="text-left bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden hover:shadow-md hover:border-[#31523D] transition-all cursor-pointer group"
          title="Clique para ver extrato completo"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider group-hover:text-slate-900">
              Investimento Total
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#31523D]">
              R$ {financialSummary.totalGeral.toFixed(2).replace('.', ',')}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Total em {financialSummary.totalSessoes} atendimentos
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Saúde Fisiolys</span>
            <span className="text-[#31523D] font-bold group-hover:underline flex items-center">
              Ver recibos <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </button>

        {/* Card 4: Frequência & Check-in Rápido (CLICKABLE) */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Frequência & Chegada
            </span>
            <button
              onClick={() => setActiveTab('frequencia')}
              className="w-8 h-8 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Acessar painel de frequência"
            >
              <CalendarCheck className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3">
            <button
              onClick={() => setActiveTab('frequencia')}
              className="text-left group"
            >
              <div className="text-2xl font-black text-slate-900 flex items-baseline space-x-1">
                <span>{attendanceStats.taxa}%</span>
                <span className="text-xs text-emerald-700 font-bold group-hover:underline">assiduidade</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('checkin')}
              className="mt-2 w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
              title="Abrir totem de check-in"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>📍 Fazer Check-in Agora</span>
            </button>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
            <button onClick={() => setActiveTab('frequencia')} className="hover:text-slate-700 hover:underline">
              {attendanceStats.presencas} presenças
            </button>
            <button onClick={() => setActiveTab('frequencia')} className="hover:text-slate-700 hover:underline">
              {attendanceStats.faltas} faltas
            </button>
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1 no-scrollbar">
        
        {/* Sub-tab: Frequência do Paciente */}
        <button
          onClick={() => setActiveTab('frequencia')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'frequencia'
              ? 'bg-[#31523D] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-[#D0A73B]" />
          <span>Frequência & Assiduidade ({attendanceStats.presencas})</span>
        </button>

        {/* Sub-tab: Check-in de Chegada & QR Code */}
        <button
          onClick={() => setActiveTab('checkin')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'checkin'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <QrCode className="w-4 h-4 text-emerald-300" />
          <span>Check-in & QR Code Recepção 📍</span>
        </button>

        {/* Sub-tab: Extrato de Pagamentos */}
        <button
          onClick={() => setActiveTab('extrato')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'extrato'
              ? 'bg-[#31523D] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Receipt className="w-4 h-4 text-[#D0A73B]" />
          <span>Extrato de Pagamentos ({filteredAppointments.length})</span>
        </button>

        {/* Sub-tab: Declaração de IR */}
        <button
          onClick={() => setActiveTab('declaracao_ir')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'declaracao_ir'
              ? 'bg-[#31523D] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <FileText className="w-4 h-4 text-[#D0A73B]" />
          <span>Declaração de Quitação / Imposto de Renda</span>
        </button>

        {/* Sub-tab: Clube de Fidelidade */}
        {currentLoyaltyMember && (
          <button
            onClick={() => setActiveTab('fidelidade')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'fidelidade'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Award className="w-4 h-4 text-[#D0A73B]" />
            <span>Clube de Fidelidade Fisiolys</span>
          </button>
        )}

        {/* Sub-tab: Próximos Horários */}
        <button
          onClick={() => setActiveTab('proximos')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'proximos'
              ? 'bg-[#31523D] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Clock className="w-4 h-4 text-[#D0A73B]" />
          <span>Próximos Horários ({upcomingAppointments.length})</span>
        </button>
      </div>

      {/* --- TAB: FREQUÊNCIA DO PACIENTE --- */}
      {activeTab === 'frequencia' && currentPatient && (
        <PatientFrequency
          patient={currentPatient}
          appointments={patientAppointments}
          services={services}
          clinic={clinic}
        />
      )}

      {/* --- TAB: CHECK-IN NA RECEPÇÃO & QR CODE --- */}
      {activeTab === 'checkin' && currentPatient && (
        <PatientCheckIn
          patient={currentPatient}
          appointments={patientAppointments}
          clinic={clinic}
          services={services}
          onReload={onReload}
        />
      )}

      {/* --- TAB 1: EXTRATO DETALHADO DE PAGAMENTOS --- */}
      {activeTab === 'extrato' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            
            {/* Modality Filter Pills */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase mr-1">Modalidade:</span>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'fisioterapia', label: '🌿 Fisioterapia' },
                { id: 'pilates', label: '🧘 Pilates' },
                { id: 'outros', label: 'Outros' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setModalityFilter(item.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    modalityFilter === item.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Period Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase mr-1">Período:</span>
              {[
                { id: 'all', label: 'Histórico Completo' },
                { id: 'month', label: 'Este Mês' },
                { id: 'year', label: 'Este Ano' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPeriodFilter(item.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    periodFilter === item.id
                      ? 'bg-[#31523D] text-white font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

          </div>

          {/* Table / List of Sessions and Payments */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Registros de Atendimento & Pagamentos ({filteredAppointments.length})</span>
              </h3>
              <button
                onClick={handlePrintStatement}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Imprimir Extrato</span>
              </button>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Receipt className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Nenhum atendimento encontrado para o filtro selecionado</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Altere a modalidade ou o período acima para visualizar seus registros.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Data & Horário</th>
                      <th className="py-3 px-4">Serviço / Tratamento</th>
                      <th className="py-3 px-4">Modalidade</th>
                      <th className="py-3 px-4">Valor Pago</th>
                      <th className="py-3 px-4">Forma de Pagamento</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Comprovante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((appt) => {
                      const cat = getApptCategory(appt);
                      const isPaid = appt.status !== 'cancelado';

                      return (
                        <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Date & Time */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatDatePtBR(appt.date)}</span>
                              <span className="text-slate-400 font-normal">às</span>
                              <span className="font-bold text-slate-700">{appt.time} hs</span>
                            </div>
                          </td>

                          {/* Service Name */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {appt.serviceName}
                            {appt.durationMinutes && (
                              <span className="text-[11px] font-normal text-slate-400 block">
                                Duração: {appt.durationMinutes} min
                              </span>
                            )}
                          </td>

                          {/* Modality Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {cat === 'fisioterapia' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Fisioterapia
                              </span>
                            ) : cat === 'pilates' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#F5EED3] text-[#7E611D] border border-[#D0A73B]/40">
                                Pilates
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                                Outros
                              </span>
                            )}
                          </td>

                          {/* Price */}
                          <td className="py-3.5 px-4 font-black text-slate-900 text-sm whitespace-nowrap">
                            R$ {(appt.servicePrice || 0).toFixed(2).replace('.', ',')}
                          </td>

                          {/* Payment Method */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-xs text-slate-600 font-medium capitalize flex items-center space-x-1">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {appt.paymentMethod === 'pix'
                                  ? 'PIX (À Vista)'
                                  : appt.paymentMethod === 'card_link'
                                  ? 'Cartão de Crédito'
                                  : appt.paymentMethod === 'cartao_recorrente'
                                  ? 'Mensalidade Recorrente'
                                  : 'Presencial na Recepção'}
                              </span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {appt.status === 'cancelado' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                                Cancelado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Quitado / Pago</span>
                              </span>
                            )}
                          </td>

                          {/* Individual Receipt Action */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedReceiptAppt(appt)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ver Recibo</span>
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Summary Footer */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-4 text-slate-600">
                <span>Total Fisioterapia: <strong className="text-emerald-800 font-bold">R$ {financialSummary.totalFisioterapia.toFixed(2).replace('.', ',')}</strong></span>
                <span>•</span>
                <span>Total Pilates: <strong className="text-[#7E611D] font-bold">R$ {financialSummary.totalPilates.toFixed(2).replace('.', ',')}</strong></span>
              </div>
              <div className="text-sm font-black text-slate-900">
                Total Geral: <span className="text-[#31523D]">R$ {financialSummary.totalGeral.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB 2: DECLARAÇÃO DE QUITAÇÃO & IMPOSTO DE RENDA (IRPF) --- */}
      {activeTab === 'declaracao_ir' && (
        <div className="space-y-4">
          
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md max-w-4xl mx-auto space-y-6 print:shadow-none print:border-none print:p-0">
            
            {/* Header Document */}
            <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-[#31523D] pb-6 gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-[#31523D] uppercase tracking-wide">
                  {clinic.name}
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  {clinic.tagline}
                </p>
                <p className="text-xs text-slate-500">
                  {clinic.address} • {clinic.city} • Tel: {clinic.phone}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="px-3 py-1 bg-[#F5EED3] text-[#7E611D] border border-[#D0A73B]/40 rounded-full text-xs font-bold uppercase">
                  Declaração de Quitação Anual
                </span>
                <p className="text-[11px] text-slate-400 mt-2">
                  Emissão: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <p>
                Declaramos para os devidos fins de comprovação fiscal, declaração de <strong>Imposto de Renda (IRPF)</strong> e/ou <strong>reembolso junto a operadoras de plano de saúde</strong>, que o(a) paciente abaixo qualificado(a) efetuou os pagamentos referentes a serviços de Fisioterapia e Pilates neste estabelecimento clínico:
              </p>

              {/* Patient Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div><strong>Paciente:</strong> {currentPatient?.name}</div>
                  <div><strong>CPF:</strong> {currentPatient?.cpf || 'Não informado'}</div>
                  <div><strong>Telefone:</strong> {formatPhoneMask(currentPatient?.phone || '')}</div>
                  <div><strong>Profissional Responsável:</strong> {clinic.managerName} (CREFITO-12)</div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Discriminação dos Valores Pagos por Especialidade:
                </h4>
                
                <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-4 border-b border-slate-200">Especialidade / Tratamento</th>
                      <th className="py-2.5 px-4 border-b border-slate-200 text-center">Qtd. Sessões</th>
                      <th className="py-2.5 px-4 border-b border-slate-200 text-right">Valor Total Pago (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        🌿 Fisioterapia Especializada & Reabilitação Funcional
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {financialSummary.countFisioterapia}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-800">
                        R$ {financialSummary.totalFisioterapia.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        🧘 Pilates Clínico, Solo & Aparelhos
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {financialSummary.countPilates}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#7E611D]">
                        R$ {financialSummary.totalPilates.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>

                    {financialSummary.totalOutros > 0 && (
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          💆 Outras Terapias Integradas & Massoterapia
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {financialSummary.countOutros}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-800">
                          R$ {financialSummary.totalOutros.toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    )}

                    <tr className="bg-slate-50 font-black text-sm">
                      <td className="py-3.5 px-4 text-slate-900 uppercase">
                        Total Geral Quitado
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-900">
                        {financialSummary.totalSessoes} sessões
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#31523D]">
                        R$ {financialSummary.totalGeral.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legal Note */}
              <p className="text-[11px] text-slate-500 italic pt-2">
                Os atendimentos foram prestados em conformidade com as normas do Conselho Regional de Fisioterapia e Terapia Ocupacional (CREFITO-12). Por ser verdade, firmamos a presente declaração.
              </p>

              {/* Signature Block */}
              <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-200 text-center">
                <div>
                  <p className="text-xs text-slate-500">Local e Data:</p>
                  <p className="text-xs font-bold text-slate-800">Altamira - PA, {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                <div className="space-y-1">
                  <div className="w-56 border-b border-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-900">{clinic.managerName}</p>
                  <p className="text-[11px] text-slate-500">Fisioterapeuta Responsável • CREFITO-12</p>
                </div>
              </div>

            </div>

            {/* Print Action Button */}
            <div className="pt-4 flex justify-end print:hidden">
              <button
                onClick={handlePrintStatement}
                className="px-5 py-2.5 bg-[#31523D] hover:bg-[#23372B] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#D0A73B]" />
                <span>Imprimir / Salvar em PDF</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB 3: CLUBE DE FIDELIDADE (SE ASSOCIADO) --- */}
      {activeTab === 'fidelidade' && currentLoyaltyMember && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#D0A73B] text-[#1B2F23] flex items-center justify-center font-extrabold text-xl shadow-md">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Clube de Fidelidade Fisiolys
                </h3>
                <p className="text-xs text-slate-500">
                  Assinatura mensal com benefícios exclusivos e cashback em procedimentos.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit">
              Plano Ativo (R$ {currentLoyaltyMember.monthlyFee}/mês)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Saldo Acumulado</span>
              <div className="text-xl font-black text-emerald-700 mt-1">
                R$ {currentLoyaltyMember.accumulatedBalance.toFixed(2).replace('.', ',')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Dia de Vencimento</span>
              <div className="text-xl font-black text-slate-800 mt-1">
                Todo dia {currentLoyaltyMember.dueDay}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Membro desde</span>
              <div className="text-xl font-black text-slate-800 mt-1">
                {formatDatePtBR(currentLoyaltyMember.joinedDate)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: PRÓXIMOS AGENDAMENTOS --- */}
      {activeTab === 'proximos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
                <span>Horários Agendados ({upcomingAppointments.length})</span>
              </h3>
              <a
                href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. Elays! Gostaria de consultar os horários disponíveis para agendar um novo atendimento.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-700 hover:underline font-bold flex items-center space-x-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Falar com a recepção no WhatsApp</span>
              </a>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="p-10 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Você não possui horários futuros marcados</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">Entre em contato pelo WhatsApp com a recepção da Dra. Elays Marinho.</p>
                <a
                  href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. Elays! Gostaria de agendar um horário para meu atendimento.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#D0A73B]" />
                  <span>Agendar via WhatsApp</span>
                </a>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingAppointments.map((appt) => (
                  <div key={appt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{appt.serviceName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          Confirmado
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">📅 {formatDatePtBR(appt.date)}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">⏰ {appt.time} hs</span>
                        <span>•</span>
                        <span>Investimento: R$ {(appt.servicePrice || 0).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. Elays! Gostaria de confirmar meu atendimento de ${appt.serviceName} agendado para o dia ${formatDatePtBR(appt.date)} às ${appt.time} hs.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Confirmar no WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- INDIVIDUAL RECEIPT MODAL --- */}
      {selectedReceiptAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            
            {/* Receipt Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-[#31523D]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase">Recibo de Atendimento</h3>
              </div>
              <button
                onClick={() => setSelectedReceiptAppt(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Estabelecimento:</span>
                <span className="font-bold text-slate-800">{clinic.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Paciente:</span>
                <span className="font-bold text-slate-800">{selectedReceiptAppt.patientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Tratamento:</span>
                <span className="font-bold text-slate-800">{selectedReceiptAppt.serviceName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Data do Atendimento:</span>
                <span className="font-bold text-slate-800">{formatDatePtBR(selectedReceiptAppt.date)} às {selectedReceiptAppt.time} hs</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Forma de Pagamento:</span>
                <span className="font-bold text-slate-800 capitalize">{selectedReceiptAppt.paymentMethod || 'PIX'}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-black text-slate-900">
                <span>Valor Quitado:</span>
                <span className="text-emerald-700">R$ {(selectedReceiptAppt.servicePrice || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              Profissional Responsável: <strong>{clinic.managerName} (CREFITO-12)</strong><br />
              {clinic.address} • {clinic.city}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Imprimir Recibo</span>
              </button>
              
              <button
                onClick={() => handleCopyReceipt(selectedReceiptAppt)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Copiar dados do recibo"
              >
                {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copiedReceipt ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                onClick={() => setSelectedReceiptAppt(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
