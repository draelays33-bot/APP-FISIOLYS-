import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Appointment, Service, ScheduleConfig, ClinicConfig, Patient, AdminTab, AppointmentStatus, LoyaltyMember } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR } from '../../utils/qrUtils';
import { AdminServices } from './AdminServices';
import { AdminSchedule } from './AdminSchedule';
import { AdminPatients } from './AdminPatients';
import { AdminLoyalty } from './AdminLoyalty';
import { AdminFinancial } from './AdminFinancial';
import { AdminQRCode } from './AdminQRCode';
import { AdminWebhook } from './AdminWebhook';
import { AdminWhatsApp } from './AdminWhatsApp';
import { AdminToasts } from './AdminToasts';
import { AdminSettings } from './AdminSettings';
import { AdminGoogleCalendarAgenda, CalendarViewType } from './AdminGoogleCalendarAgenda';
import { FisiolysCRM } from '../crm/FisiolysCRM';
import { verifyFinancialPassword, getFinancialPassword } from '../../utils/securityUtils';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Calendar,
  Briefcase,
  Clock,
  Users,
  Crown,
  QrCode,
  Radio,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Grid,
  List,
  MessageSquare,
  Phone,
  Lock,
  ShieldCheck,
  X,
  Settings,
  Brain,
  ClipboardList,
  Tag,
  Palette,
  Database,
  BookOpen,
  CheckSquare
} from 'lucide-react';

interface AdminDashboardProps {
  clinic: ClinicConfig;
  services: Service[];
  schedule: ScheduleConfig;
  appointments: Appointment[];
  patients: Patient[];
  initialTab?: AdminTab;
  onReload: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clinic,
  services,
  schedule,
  appointments,
  patients,
  initialTab,
  onReload,
}) => {
  // Normalize initialTab to one of the 5 main hubs
  const getNormalizedTab = (tab?: AdminTab): AdminTab => {
    if (!tab) return 'agenda';
    if (tab === 'dashboard' || tab === 'fidelidade') return 'financeiro';
    if (tab === 'horarios') return 'agenda';
    if (tab === 'pacientes' || tab === 'prontuario') return 'pacientes';
    if (tab === 'whatsapp' || tab === 'webhook') return 'crm';
    if (tab === 'qrcode' || tab === 'servicos') return 'configuracoes';
    return tab;
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getNormalizedTab(initialTab));
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateScope, setDateScope] = useState<'day' | 'week' | 'all'>('day');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [agendaViewMode, setAgendaViewMode] = useState<'grid' | 'list'>('grid');
  const [searchPatientQuery, setSearchPatientQuery] = useState<string>('');

  // Subtabs state for the 5 Hubs
  const [agendaSubTab, setAgendaSubTab] = useState<'calendario' | 'tarefas'>('calendario');
  const [pacientesSubTab, setPacientesSubTab] = useState<'lista' | 'avaliacoes' | 'evolucoes' | 'tcle'>('lista');
  const [financeiroSubTab, setFinanceiroSubTab] = useState<'visao_geral' | 'recibos' | 'pendentes' | 'fidelidade'>('visao_geral');
  const [crmSubTab, setCrmSubTab] = useState<'funil' | 'whatsapp' | 'automacoes'>('funil');
  const [configSubTab, setConfigSubTab] = useState<'servicos' | 'ia_clinica' | 'metricas' | 'tarefas' | 'templates' | 'sistema'>('servicos');

  // Synchronize when parent passes updated initialTab
  useEffect(() => {
    if (initialTab) {
      const norm = getNormalizedTab(initialTab);
      setActiveTab(norm);
      if (initialTab === 'horarios') {
        setActiveTab('configuracoes');
        setConfigSubTab('sistema');
      }
      if (initialTab === 'servicos') {
        setActiveTab('configuracoes');
        setConfigSubTab('servicos');
      }
      if (initialTab === 'pacientes' || initialTab === 'prontuario') {
        setActiveTab('pacientes');
        setPacientesSubTab('lista');
      }
      if (initialTab === 'fidelidade') {
        setActiveTab('financeiro');
        setFinanceiroSubTab('fidelidade');
      }
      if (initialTab === 'whatsapp') {
        setActiveTab('crm');
        setCrmSubTab('whatsapp');
      }
      if (initialTab === 'webhook') {
        setActiveTab('crm');
        setCrmSubTab('automacoes');
      }
      if (initialTab === 'qrcode') {
        setActiveTab('configuracoes');
        setConfigSubTab('sistema');
      }
    }
  }, [initialTab]);

  // Calendar direct navigation state
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewType>('day');
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());

  const handleOpenTodayAgenda = () => {
    setActiveTab('agenda');
    setAgendaSubTab('calendario');
    setCalendarViewMode('day');
    setCalendarDate(new Date());
    setTimeout(() => {
      const el = document.getElementById('admin-google-calendar-root');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  // Financial password protection & sub-tab tracking
  const [financialPasswordUnlocked, setFinancialPasswordUnlocked] = useState<boolean>(true);
  const [financialPasswordInput, setFinancialPasswordInput] = useState<string>('');
  const [financialPasswordError, setFinancialPasswordError] = useState<string>('');

  // Shortcut to open financial tab directly at specific sub-view
  const handleGoToFinancial = (subTab: 'pendentes' | 'recebidos' = 'pendentes') => {
    if (subTab === 'recebidos') {
      setFinanceiroSubTab('recibos');
    } else {
      setFinanceiroSubTab('pendentes');
    }
    setFinancialPasswordUnlocked(true);
    setActiveTab('financeiro');
  };

  // Shift date helper
  const shiftSelectedDate = (daysDelta: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + daysDelta);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // WhatsApp Reminder Sender
  const sendWhatsAppReminder = (app: Appointment) => {
    const cleanPhone = app.patientPhone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = `Olá *${app.patientName}*! Tudo bem?\n\nPassando para confirmar seu agendamento de *${app.serviceName}* na Clínica Dra. Elays Marinho:\n\n📅 *Data:* ${formatDatePtBR(app.date)}\n⏰ *Horário:* ${app.time}hs\n\nPodemos confirmar sua presença? Se precisar reagendar, avise-nos! 😊✨`;
    window.open(`https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(message)}`, '_blank');
  };

  // Manual New Appointment Modal State
  const [isManualApptOpen, setIsManualApptOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualServiceId, setManualServiceId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState('09:00');
  const [manualNotes, setManualNotes] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  // Helper to open manual booking modal prefilled with slot date & time
  const handleOpenSlotBooking = (dateStr: string, timeStr: string) => {
    setManualDate(dateStr);
    setManualTime(timeStr);
    if (services.length > 0 && !manualServiceId) {
      setManualServiceId(services[0].id);
    }
    setIsManualApptOpen(true);
  };

  // Generate slots for selectedDate
  const dayTimeSlots = React.useMemo(() => {
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayIndex = dateObj.getDay();
    const dayConfig = schedule.days?.find((d) => d.dayOfWeek === dayIndex);

    let startTime = '07:00';
    let endTime = '19:00';
    let lunchStart = '12:00';
    let lunchEnd = '13:00';
    const step = schedule.slotIntervalMinutes || 60;

    if (dayConfig) {
      if (dayConfig.startTime) startTime = dayConfig.startTime;
      if (dayConfig.endTime) endTime = dayConfig.endTime;
      if (dayConfig.lunchStart) lunchStart = dayConfig.lunchStart;
      if (dayConfig.lunchEnd) lunchEnd = dayConfig.lunchEnd;
    }

    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;

    const slotsSet = new Set<string>();

    for (let m = startMins; m < endMins; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const slotStr = `${hh}:${mm}`;

      if (lunchStart && lunchEnd) {
        const [lsh, lsm] = lunchStart.split(':').map(Number);
        const [leh, lem] = lunchEnd.split(':').map(Number);
        const lStartM = lsh * 60 + lsm;
        const lEndM = leh * 60 + lem;
        if (m >= lStartM && m < lEndM) continue;
      }

      slotsSet.add(slotStr);
    }

    // Include existing appointments' times for selectedDate if not present
    appointments
      .filter((a) => a.date === selectedDate && a.status !== 'cancelado')
      .forEach((a) => slotsSet.add(a.time));

    return Array.from(slotsSet).sort();
  }, [selectedDate, schedule, appointments]);

  // Fetch loyalty members to compute pending payments accurately
  const [loyaltyMembers, setLoyaltyMembers] = useState<LoyaltyMember[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.getLoyaltyMembers().then((members) => {
      if (isMounted) setLoyaltyMembers(members || []);
    }).catch((err) => {
      console.warn("Could not load loyalty members for metrics cards:", err);
    });
    return () => { isMounted = false; };
  }, []);

  // Key Metric Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayStr && a.status !== 'cancelado');
  const completedToday = appointments.filter((a) => a.date === todayStr && a.status === 'concluido');
  const pendingToday = appointments.filter((a) => a.date === todayStr && (a.status === 'agendado' || a.status === 'confirmado'));

  // Pending Payments Calculation (Appointments + Loyalty Overdue)
  const pendingAppointments = appointments.filter(
    (a) => a.status === 'agendado' || (a.status === 'confirmado' && a.attendanceStatus === 'pendente')
  );
  const pendingAppointmentsTotal = pendingAppointments.reduce((sum, a) => sum + (a.servicePrice || 0), 0);

  const overdueLoyaltyMembers = loyaltyMembers.filter(
    (m) => m.status === 'inadimplente' || (m.overdueMonths && m.overdueMonths.length > 0)
  );
  const pendingLoyaltyTotal = overdueLoyaltyMembers.reduce(
    (sum, m) => sum + ((m.overdueMonths?.length || 1) * (m.monthlyFee || 99)),
    0
  );

  const totalPendingPaymentsCount = pendingAppointments.length + overdueLoyaltyMembers.length;
  const totalPendingPaymentsAmount = pendingAppointmentsTotal + pendingLoyaltyTotal;

  const totalRevenueEstimated = appointments
    .filter((a) => a.status !== 'cancelado')
    .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

  const activePatientCount = patients.length;
  const activeLoyaltyCount = loyaltyMembers.filter((m) => m.status === 'ativo').length;

  // Recharts 7-Day Trend Calculation for Strategic Insights
  const last7DaysData = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayNumStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const formattedLabel = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} (${dayNumStr})`;

      const dayAppts = appointments.filter((a) => a.date === dateStr && a.status !== 'cancelado');
      const completedCount = dayAppts.filter((a) => a.status === 'concluido' || a.attendanceStatus === 'presenca').length;
      const scheduledCount = dayAppts.filter((a) => a.status === 'agendado' || a.status === 'confirmado').length;

      result.push({
        dateStr,
        label: formattedLabel,
        total: dayAppts.length,
        concluidos: completedCount,
        agendados: scheduledCount,
      });
    }
    return result;
  }, [appointments]);

  const totalLast7Days = last7DaysData.reduce((acc, curr) => acc + curr.total, 0);

  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      await api.updateAppointmentStatus(id, status);
      onReload();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar agendamento.');
    }
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualPhone || !manualServiceId || !manualDate || !manualTime) {
      setManualError('Preencha todos os campos obrigatórios.');
      return;
    }

    setManualLoading(true);
    setManualError('');
    try {
      await api.createAppointment({
        patientName: manualName,
        patientPhone: manualPhone,
        serviceId: manualServiceId,
        date: manualDate,
        time: manualTime,
        notes: manualNotes,
      });
      setIsManualApptOpen(false);
      setManualName('');
      setManualPhone('');
      setManualNotes('');
      onReload();
    } catch (err: any) {
      setManualError(err.message || 'Erro ao criar agendamento.');
    } finally {
      setManualLoading(false);
    }
  };

  const todayFilterStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((a) => {
    let matchDate = true;
    if (dateScope === 'day') {
      matchDate = selectedDate ? a.date === selectedDate : true;
    } else if (dateScope === 'week') {
      const next7Days = new Date();
      next7Days.setDate(next7Days.getDate() + 7);
      const next7Str = next7Days.toISOString().split('T')[0];
      matchDate = a.date >= todayFilterStr && a.date <= next7Str;
    } else if (dateScope === 'all') {
      matchDate = true;
    }

    const matchStatus = statusFilter !== 'todos' ? a.status === statusFilter : true;
    const matchSearch = searchPatientQuery
      ? a.patientName.toLowerCase().includes(searchPatientQuery.toLowerCase()) ||
        a.patientPhone.includes(searchPatientQuery) ||
        a.serviceName.toLowerCase().includes(searchPatientQuery.toLowerCase())
      : true;
    return matchDate && matchStatus && matchSearch;
  });

  // Sort filtered appointments by date and time
  const sortedFilteredAppointments = [...filteredAppointments].sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const db = `${b.date}T${b.time}`;
    return da.localeCompare(db);
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/60 pb-12 pt-4 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* ========================================================================= */}
        {/* REORGANIZAÇÃO: 5 HUBS PRINCIPAIS DA ÁREA DA DRA. ELAYS                   */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-2 shadow-2xs border border-[#C9D8CB] mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar flex-1">
            {/* Hub 1: Agenda */}
            <button
              id="tab-agenda"
              onClick={() => setActiveTab('agenda')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'agenda'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <CalendarIcon className={`w-4 h-4 ${activeTab === 'agenda' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>1. Agenda</span>
            </button>

            {/* Hub 2: Pacientes */}
            <button
              id="tab-pacientes"
              onClick={() => setActiveTab('pacientes')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'pacientes' || activeTab === 'prontuario'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === 'pacientes' || activeTab === 'prontuario' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>2. Pacientes</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'pacientes' || activeTab === 'prontuario'
                  ? 'bg-[#DCC58F]/20 text-[#DCC58F]'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {patients.length}
              </span>
            </button>

            {/* Hub 3: Financeiro */}
            <button
              id="tab-financeiro"
              onClick={() => setActiveTab('financeiro')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'financeiro'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <DollarSign className={`w-4 h-4 ${activeTab === 'financeiro' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>3. Financeiro</span>
              {totalPendingPaymentsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>

            {/* Hub 4: CRM */}
            <button
              id="tab-crm"
              onClick={() => setActiveTab('crm')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'crm'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <MessageSquare className={`w-4 h-4 ${activeTab === 'crm' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>4. CRM</span>
            </button>

            {/* Hub 5: Administração / Configuração */}
            <button
              id="tab-configuracoes"
              onClick={() => setActiveTab('configuracoes')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'configuracoes'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Settings className={`w-4 h-4 ${activeTab === 'configuracoes' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>5. Configuração</span>
            </button>
          </div>

          {/* Toast & Notification Bell Component */}
          <div className="shrink-0 pl-2 border-l border-slate-100 flex items-center">
            <AdminToasts
              appointments={appointments}
              onNavigateTab={(tab) => {
                if (tab === 'fidelidade') {
                  setActiveTab('financeiro');
                  setFinanceiroSubTab('fidelidade');
                } else if (tab === 'horarios') {
                  setActiveTab('configuracoes');
                  setConfigSubTab('sistema');
                } else if (tab === 'pacientes' || tab === 'prontuario') {
                  setActiveTab('pacientes');
                  setPacientesSubTab('lista');
                } else if (tab === 'whatsapp') {
                  setActiveTab('crm');
                  setCrmSubTab('whatsapp');
                } else if (tab === 'webhook') {
                  setActiveTab('crm');
                  setCrmSubTab('automacoes');
                } else if (tab === 'servicos') {
                  setActiveTab('configuracoes');
                  setConfigSubTab('servicos');
                } else {
                  setActiveTab(getNormalizedTab(tab));
                }
              }}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HUB 1: AGENDA (Agenda Eletrônica, Encaixes, Lembretes & Tarefas)           */}
        {/* ========================================================================= */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            {/* Sub-nav pills for Agenda */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setAgendaSubTab('calendario')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    agendaSubTab === 'calendario'
                      ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#DCC58F]" />
                  <span>Agenda Eletrônica (Google Calendar / Grade)</span>
                </button>

                <button
                  onClick={() => setAgendaSubTab('tarefas')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    agendaSubTab === 'tarefas'
                      ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#DCC58F]" />
                  <span>Lembretes & Tarefas Clínicas</span>
                </button>
              </div>

              <button
                id="btn-open-manual-booking-agenda"
                onClick={() => setIsManualApptOpen(true)}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-xs flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Novo Encaixe / Agendamento</span>
              </button>
            </div>

            {/* Sub-view Content */}
            {agendaSubTab === 'calendario' && (
              <AdminGoogleCalendarAgenda
                appointments={appointments}
                patients={patients}
                services={services}
                schedule={schedule}
                clinic={clinic}
                initialViewMode={calendarViewMode}
                initialDate={calendarDate}
                onReload={onReload}
              />
            )}

            {agendaSubTab === 'tarefas' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-serif font-bold text-[#1B2E24]">
                      Tarefas Clínicas & Follow-up de Atendimentos
                    </h3>
                    <p className="text-xs text-slate-500">
                      Acompanhamento de retornos, envio de planos e orientações pós-atendimento da Dra. Elays.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Follow-up pós-avaliação (Pilates Studio)</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">Paciente: Maria Fernanda Silva • Enviar plano sugerido de 2x na semana.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                        Prioridade Alta
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Confirmar retorno de reavaliação de coluna</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">Paciente: Carlos Eduardo Santos • 30 dias de evolução concluídos.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                        Agendado
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Lembrar de exercícios para casa (Cinesioterapia)</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">Paciente: Juliana Mendes Rocha • Fortalecimento de manguito rotador.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                        Pendente Envio
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex items-start gap-3">
                    <Users className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Confirmar turma de Pilates das 18h</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">Turma 02 • 3 alunas confirmadas para hoje com frequência regular.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">
                        Hoje
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* HUB 2: PACIENTES (Lista, Avaliações, Evoluções, TCLE)                      */}
        {/* ========================================================================= */}
        {(activeTab === 'pacientes' || activeTab === 'prontuario') && (
          <div className="space-y-4">
            {/* Sub-nav pills for Pacientes */}
            <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto pb-1 sm:pb-0">
              <button
                id="tab-pacientes-sub-lista"
                onClick={() => setPacientesSubTab('lista')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  pacientesSubTab === 'lista'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Lista de Pacientes & Tags ({patients.length})</span>
              </button>

              <button
                id="tab-pacientes-sub-avaliacoes"
                onClick={() => setPacientesSubTab('avaliacoes')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  pacientesSubTab === 'avaliacoes'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Fichas de Avaliação Clínica</span>
              </button>

              <button
                id="tab-pacientes-sub-evolucoes"
                onClick={() => setPacientesSubTab('evolucoes')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  pacientesSubTab === 'evolucoes'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Evoluções das Sessões</span>
              </button>

              <button
                id="tab-pacientes-sub-tcle"
                onClick={() => setPacientesSubTab('tcle')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  pacientesSubTab === 'tcle'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>TCLE & Contratos Assinados</span>
              </button>
            </div>

            {/* Sub-view rendering for Pacientes */}
            {pacientesSubTab === 'lista' && (
              <AdminPatients
                patients={patients}
                appointments={appointments}
                services={services}
                clinic={clinic}
                onReload={onReload}
              />
            )}

            {pacientesSubTab === 'avaliacoes' && (
              <FisiolysCRM 
                hub="pacientes" 
                initialTab="avaliacoes" 
                onTabChange={(t) => {
                  if (t === 'avaliacoes' || t === 'evolucoes' || t === 'tcle') {
                    setPacientesSubTab(t);
                  }
                }}
              />
            )}

            {pacientesSubTab === 'evolucoes' && (
              <FisiolysCRM 
                hub="pacientes" 
                initialTab="evolucoes" 
                onTabChange={(t) => {
                  if (t === 'avaliacoes' || t === 'evolucoes' || t === 'tcle') {
                    setPacientesSubTab(t);
                  }
                }}
              />
            )}

            {pacientesSubTab === 'tcle' && (
              <FisiolysCRM 
                hub="pacientes" 
                initialTab="tcle" 
                onTabChange={(t) => {
                  if (t === 'avaliacoes' || t === 'evolucoes' || t === 'tcle') {
                    setPacientesSubTab(t);
                  }
                }}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* HUB 3: FINANCEIRO (Receita & Recibos, Cobranças Pendentes, Faturamento)    */}
        {/* ========================================================================= */}
        {activeTab === 'financeiro' && (
          !financialPasswordUnlocked ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md mx-auto my-8 border border-slate-200/90 shadow-sm text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center mx-auto shadow-md border border-[#D0A73B]/40">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 inline-block mb-2">
                  🔒 Acesso Restrito ao Administrador
                </span>
                <h3 className="text-xl font-serif font-extrabold text-[#23372B]">
                  Área de Gestão Financeira
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Esta área contém relatórios e faturamento restrito. Digite a senha da Dra. Elays para acessar.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (verifyFinancialPassword(financialPasswordInput)) {
                    setFinancialPasswordUnlocked(true);
                    setFinancialPasswordError('');
                  } else {
                    setFinancialPasswordError('Senha incorreta! Digite a senha válida de Gestão Financeira.');
                  }
                }}
                className="space-y-4 pt-2"
              >
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                    Digite a Senha do Gestor
                  </label>
                  <input
                    type="password"
                    placeholder="Sua senha de gestor..."
                    value={financialPasswordInput}
                    onChange={(e) => {
                      setFinancialPasswordInput(e.target.value);
                      setFinancialPasswordError('');
                    }}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-center font-mono font-extrabold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D] bg-slate-50"
                    autoFocus
                  />
                  {financialPasswordError && (
                    <p className="text-xs font-bold text-rose-600 mt-2 flex items-center justify-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{financialPasswordError}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1 text-center font-medium">
                    (Senha configurável da Dra. Elays • Padrão: <code className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">011809</code>)
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-[#31523D] hover:bg-[#23372B] text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#D0A73B]" />
                    <span>Acessar Gestão Financeira & Recibos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFinancialPasswordUnlocked(true);
                      setFinancialPasswordError('');
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-200 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>🔓 Desbloquear com 1-Clique (Dra. Elays)</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sub-nav pills for Financeiro */}
              <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto pb-1 sm:pb-0">
                <button
                  id="tab-fin-sub-visao"
                  onClick={() => setFinanceiroSubTab('visao_geral')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    financeiroSubTab === 'visao_geral'
                      ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#DCC58F]" />
                  <span>Visão Geral & Faturamento</span>
                </button>

                <button
                  id="tab-fin-sub-recibos"
                  onClick={() => setFinanceiroSubTab('recibos')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    financeiroSubTab === 'recibos'
                      ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#DCC58F]" />
                  <span>Receita & Recibos em PDF</span>
                </button>

                <button
                  id="tab-fin-sub-pendentes"
                  onClick={() => setFinanceiroSubTab('pendentes')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    financeiroSubTab === 'pendentes'
                      ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pagamentos & Cobranças Pendentes</span>
                  {totalPendingPaymentsCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
                      {totalPendingPaymentsCount}
                    </span>
                  )}
                </button>

                <button
                  id="tab-fin-sub-fidelidade"
                  onClick={() => setFinanceiroSubTab('fidelidade')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    financeiroSubTab === 'fidelidade'
                      ? 'bg-[#B08A3E] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-[#FAF7F0]" />
                  <span>Clube Fidelidade R$ 99</span>
                </button>
              </div>

              {financeiroSubTab === 'visao_geral' && (
                <div className="space-y-6">
                  {/* Quick Metrics Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-semibold">Sessões Hoje</span>
                        <CalendarIcon className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-extrabold text-slate-800">{todayAppointments.length}</span>
                        <span className="text-[11px] font-semibold text-emerald-700">
                          ({completedToday.length} concluídas)
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-semibold">Total Agendamentos</span>
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-2xl font-extrabold text-slate-800">{appointments.length}</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-semibold">Faturamento Estimado</span>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-2xl font-extrabold text-teal-800">{formatCurrency(totalRevenueEstimated)}</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-semibold">Pacientes Cadastrados</span>
                        <UserCheck className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-2xl font-extrabold text-slate-800">{activePatientCount}</span>
                    </div>
                  </div>

                  {/* Recharts Chart: Tendência de Agendamentos */}
                  <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
                    <div className="sm:flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#31523D]/10 text-[#31523D] flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">
                            Tendência de Atendimentos & Demanda (Última Semana)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Evolução diária de novas sessões agendadas e presenças concluídas.
                        </p>
                      </div>

                      <div className="mt-2 sm:mt-0 flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#31523D]"></span>
                          <span>Total na Semana: <strong className="text-slate-900 font-extrabold">{totalLast7Days} sessões</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-64 pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#31523D" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#31523D" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorConcluidos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#D0A73B" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#D0A73B" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1">
                                    <p className="font-extrabold text-[#D0A73B] border-b border-slate-800 pb-1">{label}</p>
                                    <div className="flex items-center justify-between gap-4 pt-0.5">
                                      <span className="text-slate-300">Total Agendado:</span>
                                      <strong className="text-white font-bold">{data.total} sessões</strong>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-emerald-400">Presenças Concluídas:</span>
                                      <strong className="text-emerald-300 font-bold">{data.concluidos}</strong>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            name="Total Agendado"
                            stroke="#31523D"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            dot={{ r: 4, fill: '#31523D', strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 6, fill: '#31523D' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="concluidos"
                            name="Presenças Concluídas"
                            stroke="#D0A73B"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fillOpacity={1}
                            fill="url(#colorConcluidos)"
                            dot={{ r: 3, fill: '#D0A73B' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {financeiroSubTab === 'recibos' && (
                <AdminFinancial
                  clinic={clinic}
                  appointments={appointments}
                  patients={patients}
                  initialTab="recebidos"
                  onReload={onReload}
                />
              )}

              {financeiroSubTab === 'pendentes' && (
                <AdminFinancial
                  clinic={clinic}
                  appointments={appointments}
                  patients={patients}
                  initialTab="pendentes"
                  onReload={onReload}
                />
              )}

              {financeiroSubTab === 'fidelidade' && (
                <AdminLoyalty clinicPhone={clinic.whatsapp} />
              )}
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* HUB 4: CRM (Funil de Leads, Disparos WhatsApp, Automações & Webhooks)     */}
        {/* ========================================================================= */}
        {activeTab === 'crm' && (
          <div className="space-y-4">
            {/* Sub-nav pills for CRM */}
            <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto pb-1 sm:pb-0">
              <button
                id="tab-crm-sub-funil"
                onClick={() => setCrmSubTab('funil')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  crmSubTab === 'funil'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Funil de Leads & Pacientes</span>
              </button>

              <button
                id="tab-crm-sub-whatsapp"
                onClick={() => setCrmSubTab('whatsapp')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  crmSubTab === 'whatsapp'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Disparos WhatsApp 1-Clique & Lembretes</span>
              </button>

              <button
                id="tab-crm-sub-automacoes"
                onClick={() => setCrmSubTab('automacoes')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  crmSubTab === 'automacoes'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Automações & Webhooks de Conversão</span>
              </button>
            </div>

            {/* Sub-view content */}
            {crmSubTab === 'funil' && (
              <FisiolysCRM 
                hub="crm" 
                initialTab="leads" 
                onTabChange={(t) => {
                  if (t === 'leads') setCrmSubTab('funil');
                  if (t === 'mensagens') setCrmSubTab('whatsapp');
                  if (t === 'automacoes') setCrmSubTab('automacoes');
                }}
              />
            )}

            {crmSubTab === 'whatsapp' && (
              <AdminWhatsApp clinic={clinic} appointments={appointments} onReload={onReload} />
            )}

            {crmSubTab === 'automacoes' && (
              <AdminWebhook clinic={clinic} onReload={onReload} />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* HUB 5: ADMINISTRAÇÃO / CONFIGURAÇÃO (Serviços, IA, Métricas, Tarefas, Templates, Sistema) */}
        {/* ========================================================================= */}
        {activeTab === 'configuracoes' && (
          <div className="space-y-4">
            {/* Sub-nav pills for Administração */}
            <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto pb-1 sm:pb-0">
              <button
                id="tab-config-sub-servicos"
                onClick={() => setConfigSubTab('servicos')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  configSubTab === 'servicos'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Serviços & Planos ({services.length})</span>
              </button>

              <button
                id="tab-config-sub-ia"
                onClick={() => setConfigSubTab('ia_clinica')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  configSubTab === 'ia_clinica'
                    ? 'bg-[#B44A2E] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-[#FDE68A]" />
                <span>Assistente IA Clínica (Gemini)</span>
              </button>

              <button
                id="tab-config-sub-metricas"
                onClick={() => setConfigSubTab('metricas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  configSubTab === 'metricas'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Desempenho & Métricas Clínicas</span>
              </button>

              <button
                id="tab-config-sub-tarefas"
                onClick={() => setConfigSubTab('tarefas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  configSubTab === 'tarefas'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Lembretes & Tarefas</span>
              </button>

              <button
                id="tab-config-sub-templates"
                onClick={() => setConfigSubTab('templates')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  configSubTab === 'templates'
                    ? 'bg-[#B08A3E] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#FAF7F0]" />
                <span>Templates da Dra. Elays</span>
              </button>

              <button
                id="tab-config-sub-sistema"
                onClick={() => setConfigSubTab('sistema')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  configSubTab === 'sistema'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Configurações Gerais do Sistema</span>
              </button>
            </div>

            {/* Sub-view content */}
            {configSubTab === 'servicos' && (
              <AdminServices services={services} onReload={onReload} />
            )}

            {configSubTab === 'ia_clinica' && (
              <FisiolysCRM 
                hub="configuracoes" 
                initialTab="ia_clinica" 
                onTabChange={(t) => {
                  if (t === 'ia_clinica') setConfigSubTab('ia_clinica');
                  if (t === 'analytics') setConfigSubTab('metricas');
                  if (t === 'tarefas') setConfigSubTab('tarefas');
                  if (t === 'templates') setConfigSubTab('templates');
                }}
              />
            )}

            {configSubTab === 'metricas' && (
              <FisiolysCRM 
                hub="configuracoes" 
                initialTab="analytics" 
                onTabChange={(t) => {
                  if (t === 'ia_clinica') setConfigSubTab('ia_clinica');
                  if (t === 'analytics') setConfigSubTab('metricas');
                  if (t === 'tarefas') setConfigSubTab('tarefas');
                  if (t === 'templates') setConfigSubTab('templates');
                }}
              />
            )}

            {configSubTab === 'tarefas' && (
              <FisiolysCRM 
                hub="configuracoes" 
                initialTab="tarefas" 
                onTabChange={(t) => {
                  if (t === 'ia_clinica') setConfigSubTab('ia_clinica');
                  if (t === 'analytics') setConfigSubTab('metricas');
                  if (t === 'tarefas') setConfigSubTab('tarefas');
                  if (t === 'templates') setConfigSubTab('templates');
                }}
              />
            )}

            {configSubTab === 'templates' && (
              <FisiolysCRM 
                hub="configuracoes" 
                initialTab="templates" 
                onTabChange={(t) => {
                  if (t === 'ia_clinica') setConfigSubTab('ia_clinica');
                  if (t === 'analytics') setConfigSubTab('metricas');
                  if (t === 'tarefas') setConfigSubTab('tarefas');
                  if (t === 'templates') setConfigSubTab('templates');
                }}
              />
            )}

            {configSubTab === 'sistema' && (
              <div className="space-y-6">
                <AdminSettings clinic={clinic} onReload={onReload} />
                <AdminSchedule schedule={schedule} onReload={onReload} />
                <AdminQRCode clinic={clinic} />
              </div>
            )}
          </div>
        )}

        {/* MANUAL BOOKING MODAL */}
        {isManualApptOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative">
              
              <button
                onClick={() => setIsManualApptOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Novo Agendamento Manual / Encaixe
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Registre um atendimento presencial ou agendado por telefone.
              </p>

              {manualError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <form onSubmit={handleManualBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Nome do Paciente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Ferreira"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98888-7777"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Serviço / Tratamento *
                  </label>
                  <select
                    required
                    value={manualServiceId}
                    onChange={(e) => setManualServiceId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  >
                    <option value="">Selecione o serviço...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(s.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Horário *
                    </label>
                    <input
                      type="time"
                      required
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Sintomas, encaminhamento médico..."
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsManualApptOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={manualLoading}
                    className="px-5 py-2 rounded-xl font-bold text-xs bg-teal-700 text-white hover:bg-teal-800 shadow-xs"
                  >
                    {manualLoading ? 'Salvando...' : 'Confirmar Encaixe'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
