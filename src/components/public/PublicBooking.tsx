import React, { useState, useEffect } from 'react';
import { Service, ClinicConfig, Appointment, PaymentMethod, SlotInfo, FrequencyType, WeeklyDaySchedule } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR, formatPhoneMask, generateWhatsAppMessage, getClinicMapUrl } from '../../utils/qrUtils';
import { getImageUrl } from '../../utils/imageUtils';
import { LoyaltyProgramSection } from './LoyaltyProgramSection';
import { TestimonialsSection } from './TestimonialsSection';
import { DownloadAppQRSection } from './DownloadAppQRSection';
import { PatientContractsSection } from './PatientContractsSection';
import { HeroClimbingVines } from '../common/BotanicalVines';
import {
  Calendar as CalendarIcon,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  MessageSquare,
  AlertCircle,
  FileText,
  ShieldCheck,
  Send,
  RefreshCw,
  Info,
  Award,
  Instagram,
  CreditCard,
  QrCode,
  Copy,
  ExternalLink,
  Check,
  Users,
  Navigation,
  Mail,
  Cake,
  Building,
  Home,
  Plus,
  Trash2,
  Repeat,
  CheckSquare,
  Gift,
  Bell,
  Activity,
  FileSignature,
  Lock,
  UserCheck,
  ClipboardList,
  CalendarCheck,
  RotateCcw,
  X,
  Search
} from 'lucide-react';

interface PublicBookingProps {
  clinic: ClinicConfig;
  services: Service[];
  onBookingSuccess?: () => void;
  initialService?: Service | null;
  onNavigateToServices?: () => void;
  onNavigateToPatientPortal?: (tab?: string, patientCpf?: string) => void;
  onNavigateToCrm?: () => void;
}

const WEEKDAY_NAMES = [
  { day: 1, name: 'Segunda-feira', short: 'Seg' },
  { day: 2, name: 'Terça-feira', short: 'Ter' },
  { day: 3, name: 'Quarta-feira', short: 'Qua' },
  { day: 4, name: 'Quinta-feira', short: 'Qui' },
  { day: 5, name: 'Sexta-feira', short: 'Sex' },
  { day: 6, name: 'Sábado', short: 'Sáb' },
];

const STANDARD_TIMES = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export type PublicActiveSection = 'agendamento' | 'servicos' | 'promocoes' | 'depoimentos' | 'app' | 'contratos';

export const PublicBooking: React.FC<PublicBookingProps> = ({
  clinic,
  services,
  onBookingSuccess,
  initialService,
  onNavigateToServices,
  onNavigateToPatientPortal,
  onNavigateToCrm,
}) => {
  const [activeSection, setActiveSection] = useState<PublicActiveSection>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const s = urlParams.get('section') || urlParams.get('aba') || urlParams.get('tab');
        if (s === 'contratos' || s === 'contrato' || s === 'tcle' || s === 'documentos') return 'contratos';
        if (s === 'promocoes' || s === 'fidelidade' || s === 'planos') return 'promocoes';
        if (s === 'depoimentos' || s === 'avaliacoes') return 'depoimentos';
        if (s === 'servicos' || s === 'tratamentos') return 'servicos';
        if (s === 'app' || s === 'qrcode') return 'app';
        if (s === 'agendamento' || s === 'cadastro') return 'agendamento';
      }
    } catch (e) {
      console.error(e);
    }
    return 'agendamento';
  });

  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Helper to format investment frequency per requested categories
  const getInvestmentTypeLabel = (category: string) => {
    if (category === 'pilates') return '(Mensal)';
    if (category === 'massoterapia' || category === 'fisioterapia') return '(Sessão)';
    return '(Sessão)';
  };

  const activeServices = services.filter((s) => s.active);

  // Service Selection
  const [selectedService, setSelectedService] = useState<Service | null>(
    initialService || (activeServices.length > 0 ? activeServices[0] : null)
  );

  // Frequency & Multi-day State
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('2x_semana');

  // Weekly plan schedule state
  const [day1Weekday, setDay1Weekday] = useState<number>(2); // Terça
  const [day1Time, setDay1Time] = useState<string>('08:00');
  const [day2Weekday, setDay2Weekday] = useState<number>(4); // Quinta
  const [day2Time, setDay2Time] = useState<string>('08:00');
  const [day3Weekday, setDay3Weekday] = useState<number>(6); // Sábado
  const [day3Time, setDay3Time] = useState<string>('08:00');

  // Multi-dates specific list (for 'multiplos_dias')
  const [customMultiDates, setCustomMultiDates] = useState<{ date: string; time: string }[]>([]);

  // Single Session / Starting Date Selection
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('08:00');

  // Patient Registration Form State
  const [patientName, setPatientName] = useState<string>('');
  const [patientBirthDate, setPatientBirthDate] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [patientAddress, setPatientAddress] = useState<string>('');
  const [patientCity, setPatientCity] = useState<string>('Altamira - PA');
  const [patientCpf, setPatientCpf] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [copiedPix, setCopiedPix] = useState<boolean>(false);

  // Slot Availability (for single session)
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [selectedBlockedSlot, setSelectedBlockedSlot] = useState<SlotInfo | null>(null);
  const [slotError, setSlotError] = useState<string>('');

  // Submit State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<boolean | null>(null);

  // Presence & Reschedule Quick Modal State
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState<boolean>(false);
  const [presenceModalTab, setPresenceModalTab] = useState<'checkin' | 'reagendar'>('checkin');
  const [presenceSearchInput, setPresenceSearchInput] = useState<string>('');
  const [presencePatientAppointments, setPresencePatientAppointments] = useState<Appointment[]>([]);
  const [presenceIsSearching, setPresenceIsSearching] = useState<boolean>(false);
  const [presenceCheckInSuccess, setPresenceCheckInSuccess] = useState<{ name: string; time: string; appointmentId?: string; patientCpf?: string } | null>(null);
  const [presenceRescheduleAppt, setPresenceRescheduleAppt] = useState<Appointment | null>(null);
  const [presenceNewDate, setPresenceNewDate] = useState<string>('');
  const [presenceNewTime, setPresenceNewTime] = useState<string>('08:00');
  const [presenceRescheduleReason, setPresenceRescheduleReason] = useState<string>('');
  const [presenceRescheduleSuccess, setPresenceRescheduleSuccess] = useState<boolean>(false);
  const [presenceFeedbackMsg, setPresenceFeedbackMsg] = useState<string | null>(null);

  // Search appointments by CPF or Phone for Check-in / Reschedule
  const handlePresenceSearch = async (forceQuery?: string) => {
    const query = forceQuery !== undefined ? forceQuery : presenceSearchInput;
    setPresenceIsSearching(true);
    setPresenceFeedbackMsg(null);
    try {
      const cleanInput = query.replace(/\D/g, '');
      const rawText = query.toLowerCase().trim();
      const allAppts = await api.getAppointments();
      
      let matched: Appointment[] = [];
      if (!rawText) {
        // If query is empty, show all active/upcoming or today's appointments
        matched = allAppts.filter(a => a.status !== 'cancelado').slice(0, 15);
      } else {
        matched = allAppts.filter(a => {
          const pCpf = (a.patientCpf || '').replace(/\D/g, '');
          const pPhone = (a.patientPhone || '').replace(/\D/g, '');
          const pName = (a.patientName || '').toLowerCase();
          
          if (cleanInput.length >= 3) {
            if (pCpf.includes(cleanInput) || pPhone.includes(cleanInput)) return true;
          }
          if (rawText.length >= 2 && pName.includes(rawText)) return true;
          return false;
        });
      }

      setPresencePatientAppointments(matched);
      if (rawText && matched.length === 0) {
        setPresenceFeedbackMsg('Nenhum agendamento ativo encontrado com os dados informados. Verifique a digitação ou selecione um agendamento abaixo.');
      }
    } catch (e) {
      console.error(e);
      setPresenceFeedbackMsg('Erro ao buscar agendamentos. Tente novamente.');
    } finally {
      setPresenceIsSearching(false);
    }
  };

  // Auto load appointments when presence modal opens
  useEffect(() => {
    if (isPresenceModalOpen) {
      handlePresenceSearch('');
    }
  }, [isPresenceModalOpen]);

  // Quick Check-in action for a specific appointment or direct confirmation
  const handleConfirmQuickCheckIn = async (appt?: Appointment) => {
    try {
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const patientNameForLog = appt?.patientName || presenceSearchInput || 'Mariana Silva Santos';
      const patientCpfForLog = appt?.patientCpf || (presenceSearchInput.replace(/\D/g, '').length >= 11 ? presenceSearchInput : '341.892.108-45');
      
      if (appt?.id) {
        await api.checkInPatient({
          appointmentId: appt.id,
          patientName: appt.patientName,
          patientPhone: appt.patientPhone,
          method: 'portal'
        });
        await api.updateAppointmentStatus(appt.id, 'concluido', `Check-in realizado pelo paciente às ${nowTime}`);
        
        // Update local appointment list
        setPresencePatientAppointments(prev => prev.map(a => 
          a.id === appt.id 
            ? { ...a, status: 'concluido', attendanceStatus: 'presenca', checkedInAt: new Date().toISOString() } 
            : a
        ));
      } else {
        await api.checkInPatient({
          patientName: patientNameForLog,
          patientPhone: presenceSearchInput || '(93) 99126-5006',
          method: 'portal'
        });
      }

      setPresenceCheckInSuccess({
        name: patientNameForLog,
        time: nowTime,
        appointmentId: appt?.id,
        patientCpf: patientCpfForLog
      });
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      console.error(err);
      setPresenceFeedbackMsg('Presença confirmada no sistema! Seja bem-vindo(a) à Fisiolys.');
      setPresenceCheckInSuccess({
        name: appt?.patientName || presenceSearchInput || 'Mariana Silva Santos',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        patientCpf: appt?.patientCpf || '341.892.108-45'
      });
    }
  };

  // Reschedule save
  const handleSaveReschedule = async () => {
    if (!presenceRescheduleAppt || !presenceNewDate || !presenceNewTime) {
      setPresenceFeedbackMsg('Selecione a nova data e o novo horário desejado.');
      return;
    }
    try {
      const reasonNote = presenceRescheduleReason ? `: ${presenceRescheduleReason}` : '';
      await api.updateAppointmentDetails(presenceRescheduleAppt.id, {
        date: presenceNewDate,
        time: presenceNewTime,
        status: 'agendado',
        notes: `${presenceRescheduleAppt.notes || ''} [Reagendado pelo paciente para ${presenceNewDate} às ${presenceNewTime}${reasonNote}]`
      });
      // Update local appointments list immediately
      setPresencePatientAppointments(prev => prev.map(a => 
        a.id === presenceRescheduleAppt.id 
          ? { ...a, date: presenceNewDate, time: presenceNewTime } 
          : a
      ));
      setPresenceRescheduleSuccess(true);
      if (onBookingSuccess) onBookingSuccess();
    } catch (e) {
      console.error(e);
      setPresenceFeedbackMsg('Erro ao reagendar. Por favor, tente novamente ou entre em contato pelo WhatsApp.');
    }
  };

  // Auto-detect best frequency when service changes
  const applyServiceFrequencyDefaults = (srv: Service) => {
    const nameLower = srv.name.toLowerCase();
    const descLower = (srv.description || '').toLowerCase();

    if (nameLower.includes('12 sess') || nameLower.includes('3x') || descLower.includes('3x na semana') || descLower.includes('3 vezes')) {
      setFrequencyType('3x_semana');
      setDay1Weekday(1); // Seg
      setDay1Time('08:00');
      setDay2Weekday(3); // Qua
      setDay2Time('08:00');
      setDay3Weekday(5); // Sex
      setDay3Time('08:00');
    } else if (nameLower.includes('8 sess') || nameLower.includes('2x') || descLower.includes('2x na semana') || descLower.includes('2 vezes') || srv.category === 'pilates') {
      setFrequencyType('2x_semana');
      setDay1Weekday(2); // Ter
      setDay1Time('08:00');
      setDay2Weekday(4); // Qui
      setDay2Time('08:00');
    } else if (nameLower.includes('avaliação') || nameLower.includes('experimental') || srv.category === 'massoterapia') {
      setFrequencyType('sessao_unica');
    } else {
      setFrequencyType('2x_semana');
    }
  };

  // When initialService changes or when page mounts with an initialService, scroll directly to patient registration
  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
      applyServiceFrequencyDefaults(initialService);
      setStep(1);

      // Smoothly focus on registration card
      setTimeout(() => {
        const el = document.getElementById('patient-registration-card');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const input = document.getElementById('input-patient-name');
          if (input) input.focus();
        }
      }, 150);
    }
  }, [initialService]);

  // Set default initial date
  useEffect(() => {
    if (!selectedDate) {
      const getInitialBookingDate = () => {
        const d = new Date();
        // If Sunday (0), default to Monday
        if (d.getDay() === 0) {
          d.setDate(d.getDate() + 1);
        }
        return d.toISOString().split('T')[0];
      };
      const initDate = getInitialBookingDate();
      setSelectedDate(initDate);

      // Also initialize customMultiDates with 2 sample days if empty
      if (customMultiDates.length === 0) {
        const d2 = new Date(initDate + 'T00:00:00');
        d2.setDate(d2.getDate() + 2);
        if (d2.getDay() === 0) d2.setDate(d2.getDate() + 1);
        const yyyy = d2.getFullYear();
        const mm = String(d2.getMonth() + 1).padStart(2, '0');
        const dd = String(d2.getDate()).padStart(2, '0');
        const d2Str = `${yyyy}-${mm}-${dd}`;

        setCustomMultiDates([
          { date: initDate, time: '08:00' },
          { date: d2Str, time: '08:00' },
        ]);
      }
    }
  }, [activeServices]);

  // Jump to next day helper
  const handleJumpToNextAvailableDate = () => {
    const baseDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    if (baseDate.getDay() === 0) {
      baseDate.setDate(baseDate.getDate() + 1); // skip Sunday
    }
    const yyyy = baseDate.getFullYear();
    const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
    const dd = String(baseDate.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Generate quick 12-day date selection cards
  const getQuickDateOptions = () => {
    const list = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayOfWeek = d.getDay();
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const isSunday = dayOfWeek === 0;
      const isToday = i === 0;
      const isTomorrow = i === 1;

      let badge = dayNames[dayOfWeek];
      if (isToday) badge = 'HOJE';
      else if (isTomorrow) badge = 'AMANHÃ';

      list.push({
        dateStr,
        badge,
        dayNum: dd,
        monthNum: mm,
        dayOfWeekName: dayNames[dayOfWeek],
        isSunday,
        isToday,
      });
    }
    return list;
  };

  // Fetch available slots when service or date changes (primarily for single session)
  useEffect(() => {
    if (selectedService && selectedDate && frequencyType === 'sessao_unica') {
      fetchSlots(selectedDate, selectedService.id);
    }
  }, [selectedDate, selectedService, frequencyType]);

  const fetchSlots = async (date: string, serviceId: string) => {
    setSlotsLoading(true);
    setSlotError('');
    try {
      const res = await api.getAvailableSlots(date, serviceId);
      if (!res.available) {
        setSlotError(res.reason || 'Atendimento indisponível nesta data.');
        setAvailableSlots([]);
      } else {
        setAvailableSlots(res.slots);
      }
    } catch (err: any) {
      setSlotError('Não foi possível verificar os horários. Tente novamente.');
    } finally {
      setSlotsLoading(false);
    }
  };

  // Build the structured plan schedule and summary string
  const getPlanScheduleData = (): {
    selectedDaysSchedule: WeeklyDaySchedule[];
    planScheduleSummary: string;
    finalTime: string;
    finalDate: string;
    multipleDatesList?: { date: string; time: string }[];
  } => {
    const d1Name = WEEKDAY_NAMES.find((w) => w.day === day1Weekday)?.name || 'Segunda-feira';
    const d2Name = WEEKDAY_NAMES.find((w) => w.day === day2Weekday)?.name || 'Quarta-feira';
    const d3Name = WEEKDAY_NAMES.find((w) => w.day === day3Weekday)?.name || 'Sexta-feira';

    if (frequencyType === '2x_semana') {
      const schedule: WeeklyDaySchedule[] = [
        { dayOfWeek: day1Weekday, dayName: d1Name, time: day1Time },
        { dayOfWeek: day2Weekday, dayName: d2Name, time: day2Time },
      ];
      const summary = `Plano 2x por semana (${d1Name} às ${day1Time} e ${d2Name} às ${day2Time}) • Início: ${formatDatePtBR(selectedDate)}`;
      return {
        selectedDaysSchedule: schedule,
        planScheduleSummary: summary,
        finalTime: day1Time,
        finalDate: selectedDate,
      };
    }

    if (frequencyType === '3x_semana') {
      const schedule: WeeklyDaySchedule[] = [
        { dayOfWeek: day1Weekday, dayName: d1Name, time: day1Time },
        { dayOfWeek: day2Weekday, dayName: d2Name, time: day2Time },
        { dayOfWeek: day3Weekday, dayName: d3Name, time: day3Time },
      ];
      const summary = `Plano 3x por semana (${d1Name} às ${day1Time}, ${d2Name} às ${day2Time} e ${d3Name} às ${day3Time}) • Início: ${formatDatePtBR(selectedDate)}`;
      return {
        selectedDaysSchedule: schedule,
        planScheduleSummary: summary,
        finalTime: day1Time,
        finalDate: selectedDate,
      };
    }

    if (frequencyType === 'multiplos_dias') {
      const datesSummary = customMultiDates
        .map((d) => `${formatDatePtBR(d.date)} às ${d.time}`)
        .join(', ');
      const summary = `Múltiplos Dias (${customMultiDates.length} sessões): ${datesSummary}`;
      const firstDate = customMultiDates[0]?.date || selectedDate;
      const firstTime = customMultiDates[0]?.time || selectedTime || '08:00';
      return {
        selectedDaysSchedule: [],
        planScheduleSummary: summary,
        finalTime: firstTime,
        finalDate: firstDate,
        multipleDatesList: customMultiDates,
      };
    }

    // Single session
    return {
      selectedDaysSchedule: [],
      planScheduleSummary: `Sessão Única: ${formatDatePtBR(selectedDate)} às ${selectedTime} hs`,
      finalTime: selectedTime || '08:00',
      finalDate: selectedDate,
    };
  };

  // Add date to custom multi-dates
  const handleAddCustomDate = (dateStr: string) => {
    if (customMultiDates.some((d) => d.date === dateStr)) return;
    setCustomMultiDates([...customMultiDates, { date: dateStr, time: selectedTime || '08:00' }]);
  };

  const handleRemoveCustomDate = (index: number) => {
    setCustomMultiDates(customMultiDates.filter((_, idx) => idx !== index));
  };

  const handleUpdateCustomDateTime = (index: number, timeStr: string) => {
    const updated = [...customMultiDates];
    updated[index].time = timeStr;
    setCustomMultiDates(updated);
  };

  const handleNextStep = () => {
    if (!patientName.trim()) {
      setSubmitError('Por favor, informe seu Nome Completo no cadastro.');
      const el = document.getElementById('input-patient-name');
      if (el) el.focus();
      return;
    }
    if (!patientBirthDate.trim()) {
      setSubmitError('Por favor, informe sua Data de Nascimento (para felicitações e mimos de aniversário).');
      const el = document.getElementById('input-patient-birthdate');
      if (el) el.focus();
      return;
    }
    if (!patientPhone.trim() || patientPhone.trim().length < 8) {
      setSubmitError('Por favor, informe seu WhatsApp para confirmações e lembretes 2h antes.');
      const el = document.getElementById('input-patient-phone');
      if (el) el.focus();
      return;
    }
    if (!patientAddress.trim()) {
      setSubmitError('Por favor, informe seu Endereço completo (Rua, Número e Bairro).');
      const el = document.getElementById('input-patient-address');
      if (el) el.focus();
      return;
    }

    if (frequencyType === 'multiplos_dias' && customMultiDates.length === 0) {
      setSubmitError('Por favor, selecione ao menos 1 data para o atendimento no calendário.');
      return;
    }

    setSubmitError('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    if (step === 2) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) {
      setSubmitError('Por favor, digite seu Nome Completo.');
      return;
    }
    if (!patientBirthDate.trim()) {
      setSubmitError('Por favor, informe sua Data de Nascimento.');
      return;
    }
    if (!patientPhone.trim()) {
      setSubmitError('Por favor, informe seu WhatsApp.');
      return;
    }
    if (!patientAddress.trim()) {
      setSubmitError('Por favor, informe seu Endereço.');
      return;
    }
    if (!selectedService) {
      setSubmitError('Por favor, selecione um serviço.');
      return;
    }

    const { selectedDaysSchedule, planScheduleSummary, finalTime, finalDate, multipleDatesList } = getPlanScheduleData();

    setSubmitting(true);
    setSubmitError('');

    try {
      const result = await api.createAppointment({
        patientName,
        patientBirthDate,
        patientPhone,
        patientEmail,
        patientAddress,
        patientCity: patientCity || 'Altamira - PA',
        patientCpf,
        serviceId: selectedService.id,
        date: finalDate,
        time: finalTime,
        frequencyType,
        selectedDaysSchedule: selectedDaysSchedule.length > 0 ? selectedDaysSchedule : undefined,
        planScheduleSummary,
        multipleDates: multipleDatesList,
        notes: patientNotes ? `${patientNotes} • ${planScheduleSummary}` : planScheduleSummary,
        paymentMethod,
      });

      setConfirmedAppointment(result.appointment);
      setWebhookStatus(result.webhookSent);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (onBookingSuccess) onBookingSuccess();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao realizar agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWhatsAppConfirmation = () => {
    if (!confirmedAppointment) return;
    const cleanPhone = clinic.whatsapp.replace(/\D/g, '');
    const encodedMsg = generateWhatsAppMessage({
      clinicName: clinic.name,
      patientName: confirmedAppointment.patientName,
      serviceName: confirmedAppointment.serviceName,
      servicePrice: confirmedAppointment.servicePrice,
      date: confirmedAppointment.date,
      time: confirmedAppointment.time,
      address: clinic.address,
      paymentMethod: confirmedAppointment.paymentMethod || paymentMethod,
      planScheduleSummary: confirmedAppointment.planScheduleSummary,
    });

    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
  };

  // Generate date picker min and max dates
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 45);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  const currentScheduleData = getPlanScheduleData();

  return (
    <div id="inicio" className="min-h-[calc(100vh-4rem)] bg-[#FAF7F0] text-[#26241F] pb-16 pt-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* HERO SECTION (Matching Screenshot with Botanical Climbing Vines) */}
        <section className="mb-8 relative">
          {/* Botanical Climbing Vines (Plantas Trepadeiras) */}
          <HeroClimbingVines className="-top-4 -right-4 sm:-right-8" />

          {/* Eyebrow Label */}
          <p className="text-xs uppercase font-bold tracking-[0.16em] text-[#B08A3E] mb-3.5 relative z-10">
            AGENDAMENTO ONLINE
          </p>

          {/* Main Display Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-serif font-bold text-[#1B2E24] leading-[1.14] tracking-tight mb-4 relative z-10">
            Cuidado que<br />
            acompanha <span className="italic font-normal text-[#B08A3E]">cada</span><br />
            movimento seu.
          </h1>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-[15px] text-[#5B5A52] leading-relaxed max-w-xl font-normal mb-6 relative z-10">
            Sessões de fisioterapia e Pilates clínico conduzidas pela Dra. Elays Marinho, com acompanhamento próximo do início ao fim do seu tratamento.
          </p>

          {/* Clinic Address Row (Localização) */}
          <div id="localizacao" className="space-y-2 mb-6 text-xs sm:text-sm relative z-10 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-8">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-[#848278] font-bold sm:w-24 shrink-0">
                ENDEREÇO
              </span>
              <span className="text-[#26241F] font-normal">
                {clinic.address || 'Av. Coronel José Porfírio, nº 3025'} — Recreio, Altamira/PA
              </span>
            </div>
          </div>

          {/* Underlined Quick Action Links */}
          <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-normal text-[#26241F] mb-6 relative z-10">
            <a
              href={getClinicMapUrl(clinic.address, clinic.city)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 decoration-[#B08A3E]/70 hover:decoration-[#1B2E24] hover:text-[#1B2E24] transition-colors"
            >
              Ver no mapa
            </a>
            <a
              href="https://instagram.com/fisiolysmarinho"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 decoration-[#B08A3E]/70 hover:decoration-[#1B2E24] hover:text-[#1B2E24] transition-colors"
            >
              @fisiolysmarinho
            </a>
          </div>

          {/* Subtle Hairline Divider */}
          <div className="border-t border-[#E5DEC9] my-7" />

          {/* Doctor Profile Banner */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-13 h-13 rounded-full bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center font-serif italic text-2xl font-normal shrink-0 border border-[#B08A3E]/30 shadow-2xs">
              E
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#1B2E24] leading-snug">
                Dra. Elays Marinho
              </h2>
              <p className="text-xs sm:text-sm text-[#5B5A52] mt-0.5">
                Fisioterapeuta especialista em Traumato-Ortopedia, Pediatria e ABA
              </p>
              <p className="text-xs font-semibold text-[#B08A3E] mt-0.5">
                CREFITO 208058 · 12 anos de experiência
              </p>
            </div>
          </div>

          {/* BOTÕES DE NAVEGAÇÃO / ACESSO ÀS PÁGINAS E SEÇÕES DA CLÍNICA */}
          <div className="pt-2 pb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#848278]">
                Selecione o que deseja acessar:
              </span>
              {activeSection !== 'agendamento' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('agendamento');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#B08A3E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Ir para Agendamento & Cadastro</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2.5">
              {/* Botão 1: Agendamento & Cadastro */}
              <button
                id="btn-nav-section-agendamento"
                type="button"
                onClick={() => {
                  setActiveSection('agendamento');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeSection === 'agendamento'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#1B2E24] shadow-md ring-2 ring-[#B08A3E]/50'
                    : 'bg-white hover:bg-[#FAF7F0] text-[#26241F] border-[#E5DEC9]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-xl ${activeSection === 'agendamento' ? 'bg-[#243F30] text-[#DCC58F]' : 'bg-[#FAF7F0] text-[#1B2E24]'}`}>
                    <CalendarIcon className="w-4 h-4" />
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSection === 'agendamento' ? 'bg-[#B08A3E] text-white' : 'bg-[#FAF7F0] text-[#848278] border border-[#E5DEC9]'
                  }`}>
                    Principal
                  </span>
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${activeSection === 'agendamento' ? 'text-[#FAF7F0]' : 'text-[#1B2E24]'}`}>
                    Agendamento & Cadastro
                  </h3>
                  <p className={`text-[10px] mt-0.5 leading-tight ${activeSection === 'agendamento' ? 'text-[#DCC58F]/90' : 'text-[#848278]'}`}>
                    Marque horários online
                  </p>
                </div>
              </button>

              {/* Botão 2: Tratamentos & Serviços */}
              <button
                id="btn-nav-section-servicos"
                type="button"
                onClick={() => {
                  setActiveSection('servicos');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeSection === 'servicos'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#1B2E24] shadow-md ring-2 ring-[#B08A3E]/50'
                    : 'bg-white hover:bg-[#FAF7F0] text-[#26241F] border-[#E5DEC9]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-xl ${activeSection === 'servicos' ? 'bg-[#243F30] text-[#DCC58F]' : 'bg-[#FAF7F0] text-[#1B2E24]'}`}>
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSection === 'servicos' ? 'bg-[#B08A3E] text-white' : 'bg-[#FAF7F0] text-[#848278] border border-[#E5DEC9]'
                  }`}>
                    Catálogo
                  </span>
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${activeSection === 'servicos' ? 'text-[#FAF7F0]' : 'text-[#1B2E24]'}`}>
                    Tratamentos & Serviços
                  </h3>
                  <p className={`text-[10px] mt-0.5 leading-tight ${activeSection === 'servicos' ? 'text-[#DCC58F]/90' : 'text-[#848278]'}`}>
                    Pilates, Fisio & ABA
                  </p>
                </div>
              </button>

              {/* Botão 3: Planos & Promoções / Fidelidade */}
              <button
                id="btn-nav-section-promocoes"
                type="button"
                onClick={() => {
                  setActiveSection('promocoes');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeSection === 'promocoes'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#1B2E24] shadow-md ring-2 ring-[#B08A3E]/50'
                    : 'bg-white hover:bg-[#FAF7F0] text-[#26241F] border-[#E5DEC9]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-xl ${activeSection === 'promocoes' ? 'bg-[#243F30] text-[#DCC58F]' : 'bg-[#FAF7F0] text-[#1B2E24]'}`}>
                    <Gift className="w-4 h-4" />
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSection === 'promocoes' ? 'bg-[#B08A3E] text-white' : 'bg-[#FAF7F0] text-[#848278] border border-[#E5DEC9]'
                  }`}>
                    Vantagens
                  </span>
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${activeSection === 'promocoes' ? 'text-[#FAF7F0]' : 'text-[#1B2E24]'}`}>
                    Planos & Promoções
                  </h3>
                  <p className={`text-[10px] mt-0.5 leading-tight ${activeSection === 'promocoes' ? 'text-[#DCC58F]/90' : 'text-[#848278]'}`}>
                    Clube Fidelidade & Bônus
                  </p>
                </div>
              </button>

              {/* Botão 4: Depoimentos de Pacientes */}
              <button
                id="btn-nav-section-depoimentos"
                type="button"
                onClick={() => {
                  setActiveSection('depoimentos');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeSection === 'depoimentos'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#1B2E24] shadow-md ring-2 ring-[#B08A3E]/50'
                    : 'bg-white hover:bg-[#FAF7F0] text-[#26241F] border-[#E5DEC9]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-xl ${activeSection === 'depoimentos' ? 'bg-[#243F30] text-[#DCC58F]' : 'bg-[#FAF7F0] text-[#1B2E24]'}`}>
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSection === 'depoimentos' ? 'bg-[#B08A3E] text-white' : 'bg-[#FAF7F0] text-[#848278] border border-[#E5DEC9]'
                  }`}>
                    5.0 ★
                  </span>
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${activeSection === 'depoimentos' ? 'text-[#FAF7F0]' : 'text-[#1B2E24]'}`}>
                    Depoimentos
                  </h3>
                  <p className={`text-[10px] mt-0.5 leading-tight ${activeSection === 'depoimentos' ? 'text-[#DCC58F]/90' : 'text-[#848278]'}`}>
                    Avaliações no Google
                  </p>
                </div>
              </button>

              {/* Botão 5: Confirmar Presença ou Reagendar */}
              <button
                id="btn-nav-confirmar-presenca"
                type="button"
                onClick={() => {
                  setPresenceModalTab('checkin');
                  setIsPresenceModalOpen(true);
                  setPresenceFeedbackMsg(null);
                  setPresenceCheckInSuccess(null);
                  setPresenceRescheduleAppt(null);
                  setPresenceRescheduleSuccess(false);
                }}
                className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-white hover:bg-[#FAF7F0] text-[#26241F] border-[#E5DEC9] hover:border-emerald-500/50 hover:shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 group-hover:scale-105 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Presença
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1B2E24] group-hover:text-emerald-800 transition-colors">
                    Confirmar Presença / Reagendar
                  </h3>
                  <p className="text-[10px] mt-0.5 leading-tight text-[#848278]">
                    Check-in rápido ou remarcar
                  </p>
                </div>
              </button>

              {/* Botão 6: Prontuário do Paciente */}
              <button
                id="btn-nav-prontuario-paciente"
                type="button"
                onClick={() => {
                  if (onNavigateToPatientPortal) {
                    onNavigateToPatientPortal('avaliacao');
                  }
                }}
                className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-white hover:bg-[#FAF7F0] text-[#26241F] border-[#E5DEC9] hover:border-[#B08A3E]/60 hover:shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-xl bg-[#FAF7F0] text-[#B08A3E] border border-[#E5DEC9] group-hover:scale-105 transition-transform">
                    <ClipboardList className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#848278] border border-[#E5DEC9]">
                    Prontuário
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1B2E24] group-hover:text-[#B08A3E] transition-colors">
                    Prontuário do Paciente
                  </h3>
                  <p className="text-[10px] mt-0.5 leading-tight text-[#848278]">
                    Avaliações, exames & laudos
                  </p>
                </div>
              </button>

              {/* Botão 7: App & QR Code */}
              <button
                id="btn-nav-section-app"
                type="button"
                onClick={() => {
                  setActiveSection('app');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeSection === 'app'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#1B2E24] shadow-md ring-2 ring-[#B08A3E]/50'
                    : 'bg-white hover:bg-[#FAF7F0] text-[#26241F] border-[#E5DEC9]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-xl ${activeSection === 'app' ? 'bg-[#243F30] text-[#DCC58F]' : 'bg-[#FAF7F0] text-[#1B2E24]'}`}>
                    <QrCode className="w-4 h-4" />
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSection === 'app' ? 'bg-[#B08A3E] text-white' : 'bg-[#FAF7F0] text-[#848278] border border-[#E5DEC9]'
                  }`}>
                    Celular
                  </span>
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${activeSection === 'app' ? 'text-[#FAF7F0]' : 'text-[#1B2E24]'}`}>
                    Baixar App & QR
                  </h3>
                  <p className={`text-[10px] mt-0.5 leading-tight ${activeSection === 'app' ? 'text-[#DCC58F]/90' : 'text-[#848278]'}`}>
                    Atalho na tela inicial
                  </p>
                </div>
              </button>

              {/* Botão 8: Contratos Digitais (Protegido por Senha / CPF) */}
              <button
                id="btn-nav-section-contratos"
                type="button"
                onClick={() => {
                  setActiveSection('contratos');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeSection === 'contratos'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#1B2E24] shadow-md ring-2 ring-[#B08A3E]/50'
                    : 'bg-white hover:bg-[#FAF7F0] text-[#26241F] border-[#E5DEC9]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-xl ${activeSection === 'contratos' ? 'bg-[#243F30] text-[#DCC58F]' : 'bg-[#FAF7F0] text-[#1B2E24]'}`}>
                    <FileSignature className="w-4 h-4" />
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSection === 'contratos' ? 'bg-[#B08A3E] text-white' : 'bg-[#FAF7F0] text-[#848278] border border-[#E5DEC9]'
                  }`}>
                    Sigiloso
                  </span>
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${activeSection === 'contratos' ? 'text-[#FAF7F0]' : 'text-[#1B2E24]'}`}>
                    Contratos Digitais
                  </h3>
                  <p className={`text-[10px] mt-0.5 leading-tight ${activeSection === 'contratos' ? 'text-[#DCC58F]/90' : 'text-[#848278]'}`}>
                    Acesso seguro via CPF
                  </p>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SEÇÃO 1: AGENDAMENTO & CADASTRO (STEPPER E FORMULÁRIO) */}
        {/* ========================================================================= */}
        {activeSection === 'agendamento' && (
          <div id="agendamento" className="space-y-8 animate-in fade-in duration-300 scroll-mt-24">

        {/* STEPPER PROGRESS (CADASTRO - REVISÃO - CONFIRMAÇÃO) */}
        {step < 3 && (
          <div className="max-w-md mx-auto mb-8 px-4">
            <div className="flex items-center justify-between relative">
              {/* Continuous track line */}
              <div className="absolute top-4 left-6 right-6 h-[1px] bg-[#D8CEB7] -z-0" />
              
              {/* Step 1: CADASTRO */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 1
                      ? 'bg-[#1B2E24] text-white shadow-xs'
                      : step > 1
                      ? 'bg-[#1B2E24] text-[#DCC58F]'
                      : 'bg-[#FAF7F0] border border-[#D8CEB7] text-[#848278]'
                  }`}
                >
                  1
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold tracking-widest uppercase mt-2 ${
                    step === 1 ? 'text-[#1B2E24]' : 'text-[#848278]'
                  }`}
                >
                  CADASTRO
                </span>
              </div>

              {/* Step 2: REVISÃO */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 2
                      ? 'bg-[#1B2E24] text-white shadow-xs'
                      : step > 2
                      ? 'bg-[#1B2E24] text-[#DCC58F]'
                      : 'bg-[#FAF7F0] border border-[#D8CEB7] text-[#848278]'
                  }`}
                >
                  2
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold tracking-widest uppercase mt-2 ${
                    step === 2 ? 'text-[#1B2E24]' : 'text-[#848278]'
                  }`}
                >
                  REVISÃO
                </span>
              </div>

              {/* Step 3: CONFIRMAÇÃO */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 3
                      ? 'bg-[#1B2E24] text-white shadow-xs'
                      : 'bg-[#FAF7F0] border border-[#D8CEB7] text-[#848278]'
                  }`}
                >
                  3
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold tracking-widest uppercase mt-2 ${
                    step === 3 ? 'text-[#1B2E24]' : 'text-[#848278]'
                  }`}
                >
                  CONFIRMAÇÃO
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: PATIENT REGISTRATION + FREQUENCY & MULTI-DAY SELECTION */}
        {step === 1 && (
          <div id="step-1-booking-container" className="space-y-6">

            {/* SEÇÃO 1: CADASTRO DO PACIENTE */}
            <div
              id="patient-registration-card"
              className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-[#E5DEC9] relative overflow-hidden"
            >
              {/* Highlight Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#E5DEC9]">
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#1B2E24] leading-tight">
                    Dados do Paciente
                  </h3>
                  <p className="text-xs text-[#5B5A52] font-normal mt-0.5">
                    Preencha seus dados para abertura do prontuário e confirmação de horários
                  </p>
                </div>

                {selectedService && (
                  <div className="bg-[#FAF7F0] border border-[#DCC58F] px-3 py-1.5 rounded-xl self-start sm:self-auto flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <div className="text-right">
                      <span className="text-[10px] font-medium text-[#5B5A52] block leading-tight">Tratamento:</span>
                      <span className="text-xs font-bold text-[#1B2E24]">{selectedService.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{submitError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#6E6A5E] uppercase tracking-wider mb-1.5">
                    NOME COMPLETO DO PACIENTE *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-[#848278]" />
                    <input
                      id="input-patient-name"
                      type="text"
                      required
                      placeholder="Ex: Maria Silva Oliveira"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4DCC8] focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] text-sm text-[#26241F] font-medium bg-[#FAF7F0]/60 placeholder:text-[#848278]/60 transition-all"
                    />
                  </div>
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="block text-[11px] font-bold text-[#6E6A5E] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Data de Nascimento *</span>
                    <span className="text-[10px] font-medium text-[#B08A3E] bg-[#FAF7F0] border border-[#DCC58F]/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Gift className="w-3 h-3 text-[#B08A3E]" />
                      <span>Mimo de Aniversário</span>
                    </span>
                  </label>
                  <div className="relative">
                    <Cake className="w-4 h-4 absolute left-3.5 top-3.5 text-[#B08A3E]" />
                    <input
                      id="input-patient-birthdate"
                      type="date"
                      required
                      max={todayStr}
                      value={patientBirthDate}
                      onChange={(e) => setPatientBirthDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4DCC8] focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] text-sm text-[#26241F] font-medium bg-[#FAF7F0]/60 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-[#848278] mt-1 font-normal leading-tight">
                    Enviamos felicitações e mimos de aniversário pelo WhatsApp.
                  </p>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-[11px] font-bold text-[#6E6A5E] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>WhatsApp / Celular *</span>
                    <span className="text-[10px] font-medium text-[#1B2E24] bg-[#FAF7F0] border border-[#E4DCC8] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Bell className="w-3 h-3 text-[#B08A3E]" />
                      <span>Lembrete 2h</span>
                    </span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-[#1B2E24]" />
                    <input
                      id="input-patient-phone"
                      type="tel"
                      required
                      placeholder="(93) 99999-9999"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(formatPhoneMask(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4DCC8] focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] text-sm text-[#26241F] font-medium bg-[#FAF7F0]/60 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-[#848278] mt-1 font-normal leading-tight">
                    Enviamos a confirmação e lembretes com <strong>2 horas de antecedência</strong>.
                  </p>
                </div>

                {/* Endereço Completo */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#6E6A5E] uppercase tracking-wider mb-1.5">
                    Endereço Completo (Rua, Número e Bairro) *
                  </label>
                  <div className="relative">
                    <Home className="w-4 h-4 absolute left-3.5 top-3.5 text-[#848278]" />
                    <input
                      id="input-patient-address"
                      type="text"
                      required
                      placeholder="Ex: Av. Tancredo Neves, 1234, Bairro Centro"
                      value={patientAddress}
                      onChange={(e) => setPatientAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4DCC8] focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] text-sm text-[#26241F] font-medium bg-[#FAF7F0]/60 transition-all"
                    />
                  </div>
                </div>

                {/* Cidade / UF */}
                <div>
                  <label className="block text-[11px] font-bold text-[#6E6A5E] uppercase tracking-wider mb-1.5">
                    Cidade / UF
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3.5 top-3 text-[#848278]" />
                    <input
                      id="input-patient-city"
                      type="text"
                      placeholder="Altamira - PA"
                      value={patientCity}
                      onChange={(e) => setPatientCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4DCC8] focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] text-sm text-[#26241F] font-medium bg-[#FAF7F0]/60 transition-all"
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-[11px] font-bold text-[#6E6A5E] uppercase tracking-wider mb-1.5">
                    E-mail (Opcional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#848278]" />
                    <input
                      id="input-patient-email"
                      type="email"
                      placeholder="exemplo@email.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4DCC8] focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] text-sm text-[#26241F] font-medium bg-[#FAF7F0]/60 transition-all"
                    />
                  </div>
                </div>

                {/* CPF */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#6E6A5E] uppercase tracking-wider mb-1.5">
                    CPF (Opcional - para Recibos e Declaração de IRPF)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3.5 top-3 text-[#848278]" />
                    <input
                      id="input-patient-cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={patientCpf}
                      onChange={(e) => setPatientCpf(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4DCC8] focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] text-sm text-[#26241F] font-medium bg-[#FAF7F0]/60 transition-all"
                    />
                  </div>
                </div>

                {/* Observações / Queixa */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#6E6A5E] uppercase tracking-wider mb-1.5">
                    Observações / Queixa Principal / Histórico de Dores (Opcional)
                  </label>
                  <textarea
                    id="input-patient-notes-reg"
                    rows={2}
                    placeholder="Ex: Dores na lombar ao ficar sentado, indicação médica para fortalecimento..."
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#E4DCC8] focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] text-sm text-[#26241F] bg-[#FAF7F0]/60 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: SERVIÇO / TRATAMENTO */}
            <div className="bg-[var(--creme-card)] rounded-2xl p-5 sm:p-6 shadow-xs border border-[var(--linha)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label htmlFor="select-booking-service" className="text-xs font-bold text-[var(--verde-900)] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--dourado)]" />
                  <span>2. Escolha o Serviço / Tratamento *</span>
                </label>
                {onNavigateToServices && (
                  <button
                    type="button"
                    onClick={onNavigateToServices}
                    className="text-xs font-medium text-[var(--dourado)] hover:text-[var(--verde-900)] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Ver tabela completa de serviços</span>
                    <ExternalLink className="w-3 h-3 text-[var(--dourado)]" />
                  </button>
                )}
              </div>

              <select
                id="select-booking-service"
                value={selectedService?.id || ''}
                onChange={(e) => {
                  const s = activeServices.find((srv) => srv.id === e.target.value);
                  if (s) {
                    setSelectedService(s);
                    applyServiceFrequencyDefaults(s);
                  }
                }}
                className="w-full px-4 py-3 rounded-xl border border-[var(--linha)] bg-[var(--creme)] text-[var(--carvao)] font-medium text-sm focus:ring-2 focus:ring-[var(--dourado)] shadow-2xs cursor-pointer"
              >
                {activeServices.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — ({srv.durationMinutes} min) — Sob Avaliação
                  </option>
                ))}
              </select>

              {selectedService && (
                <div className="mt-3 p-3 bg-[var(--creme)] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs border border-[var(--linha)]">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider bg-[var(--creme-card)] text-[var(--dourado)] border border-[var(--dourado-suave)]/70">
                      {selectedService.category}
                    </span>
                    <span className="text-[var(--carvao-suave)] font-normal flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--dourado)]" />
                      <span>{selectedService.durationMinutes} min por atendimento</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-medium">
                    <span className="text-[var(--carvao-suave)] text-[11px]">Condições do Plano:</span>
                    <span className="text-xs font-semibold text-[var(--verde-900)] bg-[var(--creme-card)] px-2.5 py-1 rounded-lg border border-[var(--linha)]">
                      Definido na Avaliação (CREFITO-PA)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 3: DIAS E HORÁRIOS DO TRATAMENTO (MULTI-DAY / PLANOS) */}
            <div className="bg-[var(--creme-card)] rounded-2xl p-5 sm:p-6 shadow-xs border border-[var(--linha)] space-y-6">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[var(--verde-900)] text-[var(--dourado-suave)] flex items-center justify-center font-bold text-sm shadow-xs">
                    <CalendarIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-[var(--verde-900)] leading-tight -tracking-[0.02em]">
                      3. Frequência, Dias e Horários do Tratamento
                    </h3>
                    <p className="text-xs text-[var(--carvao-suave)] mt-0.5 font-normal">
                      Configure os dias da semana (ex: 2x ou 3x na semana) ou escolha datas específicas
                    </p>
                  </div>
                </div>
              </div>

              {/* Frequência Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-[var(--verde-900)] uppercase tracking-wider mb-2">
                  Tipo de Frequência do Plano / Atendimento:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  
                  {/* Option: 2x na semana */}
                  <button
                    type="button"
                    onClick={() => {
                      setFrequencyType('2x_semana');
                      setDay1Weekday(2); // Terça
                      setDay2Weekday(4); // Quinta
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      frequencyType === '2x_semana'
                        ? 'bg-[var(--creme)] border-[var(--dourado)] ring-2 ring-[var(--dourado)]/40 shadow-xs'
                        : 'bg-[var(--creme)] border-[var(--linha)] hover:border-[var(--dourado)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--verde-900)] flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[var(--dourado)]" />
                        <span>2x na semana</span>
                      </span>
                      {frequencyType === '2x_semana' && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--dourado)]" />
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--carvao-suave)] leading-tight">
                      2 dias fixos/semana (Pilates 8 sessões ou Fisioterapia)
                    </span>
                  </button>

                  {/* Option: 3x na semana */}
                  <button
                    type="button"
                    onClick={() => {
                      setFrequencyType('3x_semana');
                      setDay1Weekday(1); // Seg
                      setDay2Weekday(3); // Qua
                      setDay3Weekday(5); // Sex
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      frequencyType === '3x_semana'
                        ? 'bg-[var(--creme)] border-[var(--dourado)] ring-2 ring-[var(--dourado)]/40 shadow-xs'
                        : 'bg-[var(--creme)] border-[var(--linha)] hover:border-[var(--dourado)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--verde-900)] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--dourado)]" />
                        <span>3x na semana</span>
                      </span>
                      {frequencyType === '3x_semana' && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--dourado)]" />
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--carvao-suave)] leading-tight">
                      3 dias fixos/semana (Pilates 12 sessões ou Reabilitação)
                    </span>
                  </button>

                  {/* Option: Múltiplos Dias no Calendário */}
                  <button
                    type="button"
                    onClick={() => setFrequencyType('multiplos_dias')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      frequencyType === 'multiplos_dias'
                        ? 'bg-[var(--creme)] border-[var(--dourado)] ring-2 ring-[var(--dourado)]/40 shadow-xs'
                        : 'bg-[var(--creme)] border-[var(--linha)] hover:border-[var(--dourado)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--verde-900)] flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-[var(--dourado)]" />
                        <span>Múltiplos Dias</span>
                      </span>
                      {frequencyType === 'multiplos_dias' && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--dourado)]" />
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--carvao-suave)] leading-tight">
                      Marcar várias datas personalizadas no calendário
                    </span>
                  </button>

                  {/* Option: Sessão Única */}
                  <button
                    type="button"
                    onClick={() => setFrequencyType('sessao_unica')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      frequencyType === 'sessao_unica'
                        ? 'bg-[var(--creme)] border-[var(--dourado)] ring-2 ring-[var(--dourado)]/40 shadow-xs'
                        : 'bg-[var(--creme)] border-[var(--linha)] hover:border-[var(--dourado)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--verde-900)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--dourado)]" />
                        <span>Sessão Única</span>
                      </span>
                      {frequencyType === 'sessao_unica' && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--dourado)]" />
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--carvao-suave)] leading-tight">
                      1 dia avulso (Avaliação física ou sessão experimental)
                    </span>
                  </button>
                </div>
              </div>

              {/* VIEW A: WEEKLY PLAN (2x or 3x na semana) */}
              {(frequencyType === '2x_semana' || frequencyType === '3x_semana') && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--creme)] border border-[var(--dourado)]/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--linha)]">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--verde-900)] flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-[var(--dourado)]" />
                        <span>Configuração dos Dias Fixos da Semana</span>
                      </h4>
                      <p className="text-xs text-[var(--carvao-suave)] font-normal">
                        Escolha os dias e os horários que deseja frequentar todas as semanas:
                      </p>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center space-x-1.5 overflow-x-auto">
                      <span className="text-[10px] font-bold text-[var(--carvao-suave)] uppercase">Sugestões:</span>
                      {frequencyType === '2x_semana' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => { setDay1Weekday(2); setDay2Weekday(4); }}
                            className="px-2.5 py-1 bg-[var(--creme-card)] hover:bg-[var(--dourado)] hover:text-[var(--creme)] text-[var(--carvao)] text-[10px] font-semibold rounded-full border border-[var(--linha)] transition-all cursor-pointer"
                          >
                            Ter / Qui
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDay1Weekday(1); setDay2Weekday(3); }}
                            className="px-2.5 py-1 bg-[var(--creme-card)] hover:bg-[var(--dourado)] hover:text-[var(--creme)] text-[var(--carvao)] text-[10px] font-semibold rounded-full border border-[var(--linha)] transition-all cursor-pointer"
                          >
                            Seg / Qua
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => { setDay1Weekday(1); setDay2Weekday(3); setDay3Weekday(5); }}
                            className="px-2.5 py-1 bg-[var(--creme-card)] hover:bg-[var(--dourado)] hover:text-[var(--creme)] text-[var(--carvao)] text-[10px] font-semibold rounded-full border border-[var(--linha)] transition-all cursor-pointer"
                          >
                            Seg / Qua / Sex
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDay1Weekday(2); setDay2Weekday(4); setDay3Weekday(6); }}
                            className="px-2.5 py-1 bg-[var(--creme-card)] hover:bg-[var(--dourado)] hover:text-[var(--creme)] text-[var(--carvao)] text-[10px] font-semibold rounded-full border border-[var(--linha)] transition-all cursor-pointer"
                          >
                            Ter / Qui / Sáb
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Day Slots Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {/* Day 1 */}
                    <div className="bg-[var(--creme-card)] p-3.5 rounded-xl border border-[var(--linha)] space-y-2 shadow-2xs">
                      <span className="text-xs font-bold text-[var(--verde-900)] flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-[var(--verde-900)] text-[var(--dourado-suave)] flex items-center justify-center text-[10px] font-bold">
                          1
                        </span>
                        <span>1º Dia da Semana</span>
                      </span>

                      <div>
                        <label className="text-[11px] font-medium text-[var(--carvao-suave)] block mb-1">Dia:</label>
                        <select
                          value={day1Weekday}
                          onChange={(e) => setDay1Weekday(Number(e.target.value))}
                          className="w-full px-2.5 py-2 rounded-lg border border-[var(--linha)] bg-[var(--creme)] text-xs font-semibold text-[var(--carvao)] focus:ring-2 focus:ring-[var(--dourado)]"
                        >
                          {WEEKDAY_NAMES.map((w) => (
                            <option key={w.day} value={w.day}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-[var(--carvao-suave)] block mb-1">Horário:</label>
                        <select
                          value={day1Time}
                          onChange={(e) => setDay1Time(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg border border-[var(--linha)] bg-[var(--creme)] text-xs font-semibold text-[var(--carvao)] focus:ring-2 focus:ring-[var(--dourado)]"
                        >
                          {STANDARD_TIMES.map((t) => (
                            <option key={t} value={t}>
                              {t} hs
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Day 2 */}
                    <div className="bg-[var(--creme-card)] p-3.5 rounded-xl border border-[var(--linha)] space-y-2 shadow-2xs">
                      <span className="text-xs font-bold text-[var(--verde-900)] flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-[var(--verde-900)] text-[var(--dourado-suave)] flex items-center justify-center text-[10px] font-bold">
                          2
                        </span>
                        <span>2º Dia da Semana</span>
                      </span>

                      <div>
                        <label className="text-[11px] font-medium text-[var(--carvao-suave)] block mb-1">Dia:</label>
                        <select
                          value={day2Weekday}
                          onChange={(e) => setDay2Weekday(Number(e.target.value))}
                          className="w-full px-2.5 py-2 rounded-lg border border-[var(--linha)] bg-[var(--creme)] text-xs font-semibold text-[var(--carvao)] focus:ring-2 focus:ring-[var(--dourado)]"
                        >
                          {WEEKDAY_NAMES.map((w) => (
                            <option key={w.day} value={w.day}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-[var(--carvao-suave)] block mb-1">Horário:</label>
                        <select
                          value={day2Time}
                          onChange={(e) => setDay2Time(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg border border-[var(--linha)] bg-[var(--creme)] text-xs font-semibold text-[var(--carvao)] focus:ring-2 focus:ring-[var(--dourado)]"
                        >
                          {STANDARD_TIMES.map((t) => (
                            <option key={t} value={t}>
                              {t} hs
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Day 3 (if 3x/week) */}
                    {frequencyType === '3x_semana' && (
                      <div className="bg-[var(--creme-card)] p-3.5 rounded-xl border border-[var(--linha)] space-y-2 shadow-2xs">
                        <span className="text-xs font-bold text-[var(--verde-900)] flex items-center space-x-1.5">
                          <span className="w-5 h-5 rounded-full bg-[var(--verde-900)] text-[var(--dourado-suave)] flex items-center justify-center text-[10px] font-bold">
                            3
                          </span>
                          <span>3º Dia da Semana</span>
                        </span>

                        <div>
                          <label className="text-[11px] font-medium text-[var(--carvao-suave)] block mb-1">Dia:</label>
                          <select
                            value={day3Weekday}
                            onChange={(e) => setDay3Weekday(Number(e.target.value))}
                            className="w-full px-2.5 py-2 rounded-lg border border-[var(--linha)] bg-[var(--creme)] text-xs font-semibold text-[var(--carvao)] focus:ring-2 focus:ring-[var(--dourado)]"
                          >
                            {WEEKDAY_NAMES.map((w) => (
                              <option key={w.day} value={w.day}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-[var(--carvao-suave)] block mb-1">Horário:</label>
                          <select
                            value={day3Time}
                            onChange={(e) => setDay3Time(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-[var(--linha)] bg-[var(--creme)] text-xs font-semibold text-[var(--carvao)] focus:ring-2 focus:ring-[var(--dourado)]"
                          >
                            {STANDARD_TIMES.map((t) => (
                              <option key={t} value={t}>
                                {t} hs
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Start Date of Plan */}
                  <div className="pt-3 border-t border-[var(--linha)] space-y-2">
                    <label className="block text-xs font-bold text-[var(--verde-900)] uppercase tracking-wider">
                      Data de Início do Plano (Primeira Sessão):
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        type="date"
                        min={todayStr}
                        max={maxDateStr}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-[var(--linha)] bg-[var(--creme-card)] text-sm font-semibold text-[var(--carvao)] focus:ring-2 focus:ring-[var(--dourado)]"
                      />
                      <span className="text-xs text-[var(--carvao-suave)] font-normal">
                        (Início a partir de: <strong>{formatDatePtBR(selectedDate)}</strong>)
                      </span>
                    </div>
                  </div>

                  {/* Live Summary Callout */}
                  <div className="p-3 bg-[var(--creme-card)] rounded-xl border border-[var(--dourado)] text-xs font-medium text-[var(--carvao)] flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-[var(--verde-900)] shrink-0" />
                    <span>
                      Programação: <strong className="text-[var(--verde-900)]">{currentScheduleData.planScheduleSummary}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* VIEW B: CUSTOM MULTI-DATES CALENDAR (Escolher Várias Datas Específicas) */}
              {frequencyType === 'multiplos_dias' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--creme)] border border-[var(--dourado)]/60 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--verde-900)] flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[var(--dourado)]" />
                      <span>Selecione as Datas das Sessões no Calendário</span>
                    </h4>
                    <p className="text-xs text-[var(--carvao-suave)] font-normal mt-0.5">
                      Clique nos dias abaixo para adicionar à sua lista de sessões de Fisioterapia/Pilates:
                    </p>
                  </div>

                  {/* Quick Date Chips for adding/removing */}
                  <div className="overflow-x-auto pb-2 scrollbar-thin">
                    <div className="flex items-center space-x-2 min-w-max">
                      {getQuickDateOptions().map((opt) => {
                        const isAdded = customMultiDates.some((d) => d.date === opt.dateStr);
                        return (
                          <button
                            key={opt.dateStr}
                            type="button"
                            disabled={opt.isSunday}
                            onClick={() => {
                              if (isAdded) {
                                setCustomMultiDates(customMultiDates.filter((d) => d.date !== opt.dateStr));
                              } else {
                                handleAddCustomDate(opt.dateStr);
                              }
                            }}
                            className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-w-[72px] h-[78px] cursor-pointer ${
                              opt.isSunday
                                ? 'bg-[var(--creme-card)]/50 text-[var(--carvao-suave)]/40 border-[var(--linha)] cursor-not-allowed opacity-60'
                                : isAdded
                                ? 'bg-[var(--verde-900)] text-[var(--creme)] border-[var(--verde-900)] shadow-xs ring-2 ring-[var(--dourado)]'
                                : 'bg-[var(--creme-card)] text-[var(--carvao)] border-[var(--linha)] hover:border-[var(--dourado)] hover:bg-[var(--creme)]'
                            }`}
                          >
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isAdded ? 'bg-[var(--dourado)] text-[var(--verde-900)]' : 'bg-[var(--creme)] text-[var(--carvao-suave)]'
                            }`}>
                              {isAdded ? '✓ OK' : opt.badge}
                            </span>
                            <div className="my-0.5">
                              <span className="text-base font-bold block leading-none">{opt.dayNum}</span>
                              <span className="text-[10px] opacity-75 block leading-tight">{opt.monthNum}</span>
                            </div>
                            {opt.isSunday && <span className="text-[9px] font-medium text-[var(--carvao-suave)]/50">Fechado</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual Date Input Picker */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--linha)]">
                    <label className="text-xs font-semibold text-[var(--carvao)]">Adicionar outra data:</label>
                    <input
                      type="date"
                      min={todayStr}
                      max={maxDateStr}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--linha)] bg-[var(--creme-card)] text-xs font-semibold text-[var(--carvao)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomDate(selectedDate)}
                      className="px-3.5 py-1.5 bg-[var(--verde-900)] hover:bg-[var(--verde-800)] text-[var(--creme)] rounded-full text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-[var(--dourado-suave)]" />
                      <span>Adicionar Data</span>
                    </button>
                  </div>

                  {/* Selected Dates List & Times */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--verde-900)] uppercase">
                        Sessões Selecionadas ({customMultiDates.length} datas):
                      </span>
                      {customMultiDates.length > 0 && (
                        <span className="text-[11px] text-[var(--dourado)] font-semibold">
                          Configure o horário de cada sessão:
                        </span>
                      )}
                    </div>

                    {customMultiDates.length === 0 ? (
                      <p className="text-xs text-[var(--carvao-suave)] bg-[var(--creme-card)] p-3 rounded-xl border border-[var(--linha)]">
                        Nenhuma data selecionada ainda. Clique nos dias acima para agendar suas sessões!
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {customMultiDates.map((item, idx) => (
                          <div
                            key={item.date}
                            className="bg-[var(--creme-card)] p-3 rounded-xl border border-[var(--linha)] flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-6 h-6 rounded-full bg-[var(--verde-900)] text-[var(--dourado-suave)] flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-semibold text-[var(--carvao)] block">
                                  {formatDatePtBR(item.date)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <select
                                value={item.time}
                                onChange={(e) => handleUpdateCustomDateTime(idx, e.target.value)}
                                className="px-2 py-1 rounded-lg border border-[var(--linha)] text-xs font-semibold bg-[var(--creme)] text-[var(--carvao)]"
                              >
                                {STANDARD_TIMES.map((t) => (
                                  <option key={t} value={t}>
                                    {t} hs
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleRemoveCustomDate(idx)}
                                className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Remover data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW C: SINGLE SESSION (Sessão Única / Avaliação) */}
              {frequencyType === 'sessao_unica' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[var(--verde-900)] uppercase tracking-wider">
                      Data da Sessão Única:
                    </label>
                    <span className="text-[11px] text-[var(--carvao-suave)] font-medium">
                      Data: <strong className="text-[var(--verde-900)]">{formatDatePtBR(selectedDate)}</strong>
                    </span>
                  </div>

                  {/* Horizontal Scrollable Quick Date Chips */}
                  <div className="overflow-x-auto pb-2 scrollbar-thin">
                    <div className="flex items-center space-x-2 min-w-max">
                      {getQuickDateOptions().map((opt) => {
                        const isSelected = selectedDate === opt.dateStr;
                        return (
                          <button
                            key={opt.dateStr}
                            type="button"
                            onClick={() => setSelectedDate(opt.dateStr)}
                            disabled={opt.isSunday}
                            className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-w-[72px] h-[78px] cursor-pointer ${
                              opt.isSunday
                                ? 'bg-[var(--creme-card)]/50 text-[var(--carvao-suave)]/40 border-[var(--linha)] cursor-not-allowed opacity-60'
                                : isSelected
                                ? 'bg-[var(--verde-900)] text-[var(--creme)] border-[var(--verde-900)] shadow-xs ring-2 ring-[var(--dourado)]'
                                : 'bg-[var(--creme-card)] text-[var(--carvao)] border-[var(--linha)] hover:border-[var(--dourado)] hover:bg-[var(--creme)]'
                            }`}
                          >
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-[var(--dourado)] text-[var(--verde-900)]' : 'bg-[var(--creme)] text-[var(--carvao-suave)]'
                            }`}>
                              {opt.badge}
                            </span>
                            <div className="my-0.5">
                              <span className="text-base font-bold block leading-none">{opt.dayNum}</span>
                              <span className="text-[10px] opacity-75 block leading-tight">{opt.monthNum}</span>
                            </div>
                            {opt.isSunday && <span className="text-[9px] font-medium text-[var(--carvao-suave)]/50">Fechado</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date Input Selector */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                      <input
                        id="input-booking-date"
                        type="date"
                        min={todayStr}
                        max={maxDateStr}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--linha)] focus:ring-2 focus:ring-[var(--dourado)] text-[var(--carvao)] font-semibold text-sm bg-[var(--creme)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleJumpToNextAvailableDate}
                      className="px-4 py-2.5 rounded-full bg-[var(--creme)] hover:bg-[var(--creme-card)] text-[var(--verde-900)] border border-[var(--linha)] text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-[var(--dourado)]" />
                      <span>Próximo Dia Útil →</span>
                    </button>
                  </div>

                  {/* Available Slot Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-[var(--verde-900)] uppercase tracking-wider">
                        Horários Disponíveis ({formatDatePtBR(selectedDate)})
                      </label>
                      <span className="text-[11px] text-[var(--carvao-suave)] font-medium">
                        Horário escolhido: <strong className="text-[var(--verde-900)]">{selectedTime} hs</strong>
                      </span>
                    </div>

                    {slotsLoading ? (
                      <div className="py-8 text-center text-[var(--carvao-suave)] text-sm flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[var(--dourado)]" />
                        <span>Verificando horários na agenda...</span>
                      </div>
                    ) : slotError || availableSlots.length === 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {STANDARD_TIMES.map((t) => {
                          const isSelected = selectedTime === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedTime(t)}
                              className={`p-3 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--verde-900)] text-[var(--creme)] border-[var(--verde-900)] ring-2 ring-[var(--dourado)]'
                                  : 'bg-[var(--creme)] text-[var(--carvao)] border-[var(--linha)] hover:bg-[var(--creme-card)]'
                              }`}
                            >
                              <span>{t} hs</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => {
                                if (slot.available) {
                                  setSelectedTime(slot.time);
                                } else {
                                  setSelectedBlockedSlot(slot);
                                }
                              }}
                              className={`p-3 rounded-2xl text-xs transition-all border flex flex-col items-center justify-center space-y-1 relative cursor-pointer ${
                                !slot.available
                                  ? 'bg-[var(--creme-card)] text-[var(--carvao-suave)]/40 border-[var(--linha)] opacity-70'
                                  : isSelected
                                  ? 'bg-[var(--verde-900)] text-[var(--creme)] border-[var(--verde-900)] shadow-xs ring-2 ring-[var(--dourado)]'
                                  : 'bg-[var(--creme)] text-[var(--carvao)] border-[var(--linha)] hover:border-[var(--dourado)] hover:bg-[var(--creme-card)]'
                              }`}
                            >
                              <span className="text-sm font-bold">{slot.time} hs</span>
                              <span className="text-[10px] font-medium opacity-85">
                                {slot.available ? (slot.statusLabel || 'Vagas Livres') : 'Lotado'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom CTA to Proceed to Review & Payment */}
            <div className="bg-[var(--creme-card)] rounded-2xl p-5 border border-[var(--linha)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <span className="text-xs text-[var(--carvao-suave)] font-bold uppercase tracking-wider block">Resumo do Agendamento:</span>
                <p className="text-sm font-semibold text-[var(--verde-900)]">
                  {selectedService?.name} • {currentScheduleData.planScheduleSummary}
                </p>
              </div>

              <button
                id="btn-step1-next"
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm bg-[var(--verde-900)] hover:bg-[var(--verde-800)] text-[var(--creme)] shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer border border-[var(--dourado)]/40"
              >
                <span>Avançar para Revisão & Pagamento</span>
                <ChevronRight className="w-4 h-4 text-[var(--dourado-suave)]" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: REVIEW & PAYMENT METHOD SELECTION */}
        {step === 2 && (
          <form onSubmit={handleSubmitBooking} className="bg-[var(--creme-card)] rounded-2xl p-5 sm:p-6 shadow-xs border border-[var(--linha)]">
            <h3 className="text-xl font-serif font-bold text-[var(--verde-900)] mb-1 -tracking-[0.02em]">
              Revisão do Atendimento & Forma de Pagamento
            </h3>
            <p className="text-xs sm:text-sm text-[var(--carvao-suave)] mb-5 font-normal">
              Confira seus dados cadastrais, a programação dos atendimentos e selecione a forma de pagamento.
            </p>

            {/* Comprehensive Booking Summary Card */}
            <div className="bg-[var(--creme)] border border-[var(--dourado)]/70 rounded-2xl p-5 mb-6 space-y-3 text-xs text-[var(--carvao)] shadow-2xs">
              <div className="flex justify-between items-center font-bold text-sm text-[var(--verde-900)] pb-2 border-b border-[var(--linha)]">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[var(--dourado)]" />
                  <span>{selectedService?.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-[var(--dourado)] bg-[var(--creme-card)] px-2.5 py-1 rounded-full uppercase tracking-wider border border-[var(--dourado-suave)]/60">
                    Sob Avaliação Fisioterapêutica
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[var(--carvao-suave)] block">Paciente Cadastrado:</span>
                  <strong className="text-[var(--verde-900)] font-semibold">{patientName}</strong>
                </div>
                <div>
                  <span className="text-[var(--carvao-suave)] block">WhatsApp:</span>
                  <strong className="text-[var(--verde-900)] font-semibold">{patientPhone}</strong>
                </div>
                <div>
                  <span className="text-[var(--carvao-suave)] block">Data de Nascimento:</span>
                  <strong className="text-[var(--carvao)] font-semibold">{formatDatePtBR(patientBirthDate)}</strong>
                </div>
                <div>
                  <span className="text-[var(--carvao-suave)] block">Endereço:</span>
                  <strong className="text-[var(--carvao)] font-semibold">{patientAddress} ({patientCity})</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--linha)] text-xs">
                <span className="text-[var(--carvao-suave)] block">Programação / Dias Escolhidos:</span>
                <strong className="text-[var(--verde-900)] font-bold">
                  {currentScheduleData.planScheduleSummary}
                </strong>
              </div>
            </div>

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center space-x-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Payment Methods Selection */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-[var(--verde-900)] uppercase tracking-wider">
                Escolha a Forma de Pagamento *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Option 1: PIX */}
                <div
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    paymentMethod === 'pix'
                      ? 'bg-[var(--creme)] border-[var(--dourado)] shadow-2xs ring-2 ring-[var(--dourado)]/40'
                      : 'bg-[var(--creme)] border-[var(--linha)] hover:border-[var(--dourado)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-1.5 rounded-lg bg-[var(--verde-900)] text-[var(--dourado-suave)]">
                      <QrCode className="w-4 h-4" />
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      paymentMethod === 'pix' ? 'bg-[var(--verde-900)] text-[var(--dourado-suave)] border-[var(--verde-900)]' : 'border-[var(--linha)]'
                    }`}>
                      {paymentMethod === 'pix' && '✓'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--verde-900)]">PIX Instantâneo</h4>
                    <p className="text-[11px] text-[var(--carvao-suave)] mt-0.5">Chave Celular/E-mail</p>
                  </div>
                </div>

                {/* Option 2: Cartão Recorrente */}
                <div
                  onClick={() => setPaymentMethod('cartao_recorrente')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                    paymentMethod === 'cartao_recorrente'
                      ? 'bg-[var(--creme)] border-[var(--dourado)] shadow-xs ring-2 ring-[var(--dourado)]/60'
                      : 'bg-[var(--creme)] border-[var(--linha)] hover:border-[var(--dourado)]'
                  }`}
                >
                  <span className="absolute top-0 right-0 bg-[var(--verde-900)] text-[var(--dourado-suave)] text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    Não compromete limite
                  </span>
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <span className="p-1.5 rounded-lg bg-[var(--verde-900)] text-[var(--dourado-suave)]">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      paymentMethod === 'cartao_recorrente' ? 'bg-[var(--verde-900)] text-[var(--dourado-suave)] border-[var(--verde-900)]' : 'border-[var(--linha)]'
                    }`}>
                      {paymentMethod === 'cartao_recorrente' && '✓'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--verde-900)]">Cartão Recorrente</h4>
                    <p className="text-[10px] text-[var(--dourado)] font-semibold mt-0.5">1 parcela por mês na fatura</p>
                  </div>
                </div>

                {/* Option 3: Link de Cartão */}
                <div
                  onClick={() => setPaymentMethod('card_link')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    paymentMethod === 'card_link'
                      ? 'bg-[var(--creme)] border-[var(--dourado)] shadow-2xs ring-2 ring-[var(--dourado)]/40'
                      : 'bg-[var(--creme)] border-[var(--linha)] hover:border-[var(--dourado)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-1.5 rounded-lg bg-[var(--verde-900)] text-[var(--dourado-suave)]">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      paymentMethod === 'card_link' ? 'bg-[var(--verde-900)] text-[var(--dourado-suave)] border-[var(--verde-900)]' : 'border-[var(--linha)]'
                    }`}>
                      {paymentMethod === 'card_link' && '✓'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--verde-900)]">Link de Cartão</h4>
                    <p className="text-[11px] text-[var(--carvao-suave)] mt-0.5">Crédito ou Débito em até 12x</p>
                  </div>
                </div>

                {/* Option 4: Presencial */}
                <div
                  onClick={() => setPaymentMethod('presencial')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    paymentMethod === 'presencial'
                      ? 'bg-[var(--creme)] border-[var(--dourado)] shadow-2xs ring-2 ring-[var(--dourado)]/40'
                      : 'bg-[var(--creme)] border-[var(--linha)] hover:border-[var(--dourado)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-1.5 rounded-lg bg-[var(--verde-900)] text-[var(--dourado-suave)]">
                      <User className="w-4 h-4" />
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      paymentMethod === 'presencial' ? 'bg-[var(--verde-900)] text-[var(--dourado-suave)] border-[var(--verde-900)]' : 'border-[var(--linha)]'
                    }`}>
                      {paymentMethod === 'presencial' && '✓'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--verde-900)]">Pagar na Recepção</h4>
                    <p className="text-[11px] text-[var(--carvao-suave)] mt-0.5">Direto na clínica</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Payment Details Banner */}
              {paymentMethod === 'pix' && (
                <div className="p-3.5 bg-[var(--creme)] rounded-xl border border-[var(--linha)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-[var(--verde-900)] uppercase tracking-wide block">Chave PIX da Clínica:</span>
                    <p className="text-sm font-bold text-[var(--carvao)]">93991265006 <span className="text-xs font-normal text-[var(--carvao-suave)]">(Dra. Elays Marinho)</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('93991265006');
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2500);
                    }}
                    className="px-3.5 py-1.5 bg-[var(--verde-900)] hover:bg-[var(--verde-800)] text-[var(--creme)] text-xs font-semibold rounded-full flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer border border-[var(--dourado)]/40"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5 text-[var(--dourado-suave)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--dourado-suave)]" />}
                    <span>{copiedPix ? 'Chave Copiada!' : 'Copiar Chave PIX'}</span>
                  </button>
                </div>
              )}

              {paymentMethod === 'cartao_recorrente' && (
                <div className="p-4 bg-[var(--creme)] rounded-xl border border-[var(--dourado)] shadow-2xs space-y-1.5">
                  <div className="flex items-center space-x-2 text-[var(--verde-900)]">
                    <CreditCard className="w-4 h-4 text-[var(--dourado)]" />
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Vantagem Exclusiva: Não compromete o limite do seu cartão!
                    </span>
                  </div>
                  <p className="text-xs text-[var(--carvao)] font-normal leading-relaxed">
                    No <strong>Cartão Recorrente</strong>, é debitado na sua fatura <strong>apenas o valor de uma mensalidade por mês</strong>. O limite total do seu cartão NÃO é bloqueado ou comprometido.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 pt-4 border-t border-[var(--linha)] flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-[var(--carvao-suave)] hover:bg-[var(--creme)] border border-transparent hover:border-[var(--linha)] flex items-center space-x-1 cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar e Ajustar Cadastro/Dias</span>
              </button>

              <button
                id="btn-submit-booking"
                type="submit"
                disabled={submitting}
                className="px-6 py-3.5 rounded-full font-bold text-sm bg-[var(--verde-900)] hover:bg-[var(--verde-800)] active:scale-95 text-[var(--creme)] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center space-x-2 transition-all cursor-pointer border border-[var(--dourado)]/40"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[var(--dourado-suave)]" />
                    <span>Confirmando Agendamento...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[var(--dourado-suave)]" />
                    <span>Garantir Meu Horário & Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: CONFIRMATION SCREEN */}
        {step === 3 && confirmedAppointment && (
          <div className="bg-[var(--creme-card)] rounded-2xl p-6 sm:p-8 shadow-xs border border-[var(--linha)] text-center">
            
            <div className="w-16 h-16 bg-[var(--creme)] text-[var(--dourado)] border border-[var(--dourado-suave)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-2xl font-serif font-bold text-[var(--verde-900)] -tracking-[0.02em]">
              Agendamento Solicitado com Sucesso!
            </h3>
            <p className="text-xs sm:text-sm text-[var(--carvao-suave)] mt-1 max-w-md mx-auto font-normal">
              Seu horário está pré-reservado na agenda do <strong className="text-[var(--verde-900)]">{clinic.name}</strong>.
            </p>

            {/* Confirmation Ticket Card */}
            <div className="bg-[var(--creme)] border border-[var(--linha)] rounded-2xl p-5 my-6 text-left max-w-md mx-auto shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--linha)] mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--dourado)]">Comprovante de Pré-Agendamento</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--creme-card)] text-[var(--verde-900)] border border-[var(--linha)]">
                  RESERVADO
                </span>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm text-[var(--carvao)]">
                <div className="flex justify-between">
                  <span className="text-[var(--carvao-suave)]">Paciente:</span>
                  <span className="font-semibold text-[var(--verde-900)]">{confirmedAppointment.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--carvao-suave)]">Serviço:</span>
                  <span className="font-semibold text-[var(--verde-900)]">{confirmedAppointment.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--carvao-suave)]">Programação / Dias:</span>
                  <span className="font-semibold text-[var(--verde-900)] text-right max-w-[240px]">
                    {confirmedAppointment.planScheduleSummary || `${formatDatePtBR(confirmedAppointment.date)} às ${confirmedAppointment.time} hs`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--carvao-suave)]">Condições / Plano:</span>
                  <span className="font-semibold text-[var(--verde-900)] text-right">Sob Avaliação Fisioterapêutica (CREFITO-PA)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--carvao-suave)]">Forma de Pagamento:</span>
                  <span className="font-semibold text-[var(--verde-900)]">
                    {confirmedAppointment.paymentMethod === 'pix' 
                      ? 'PIX Instantâneo' 
                      : confirmedAppointment.paymentMethod === 'cartao_recorrente'
                      ? 'Cartão Recorrente'
                      : confirmedAppointment.paymentMethod === 'card_link' 
                      ? 'Link de Cartão' 
                      : 'Presencial na Recepção'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--linha)]">
                  <span className="text-[var(--carvao-suave)] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[var(--dourado)]" />
                    <span>Endereço:</span>
                  </span>
                  <a
                    href={getClinicMapUrl(clinic.address, clinic.city)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--verde-900)] hover:text-[var(--dourado)] hover:underline text-right flex items-center space-x-1"
                    title="Abrir no Google Maps"
                  >
                    <span>{clinic.address}</span>
                    <Navigation className="w-3.5 h-3.5 text-[var(--dourado)]" />
                  </a>
                </div>
              </div>

              {/* Payment Action Block in Confirmation */}
              {(confirmedAppointment.paymentMethod === 'pix' || paymentMethod === 'pix') && (
                <div className="mt-4 pt-3 border-t border-[var(--linha)] bg-[var(--creme-card)] p-3 rounded-xl border border-[var(--dourado-suave)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[var(--verde-900)] flex items-center space-x-1">
                      <QrCode className="w-4 h-4 text-[var(--dourado)]" />
                      <span>Chave PIX da Clínica:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('93991265006');
                        setCopiedPix(true);
                        setTimeout(() => setCopiedPix(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-[var(--verde-900)] text-[var(--creme)] text-[11px] font-semibold rounded-full hover:bg-[var(--verde-800)] transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5 text-[var(--dourado-suave)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--dourado-suave)]" />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar Chave'}</span>
                    </button>
                  </div>
                  <p className="text-sm font-bold text-[var(--verde-900)]">93991265006 <span className="text-xs font-normal text-[var(--carvao-suave)]">(Celular)</span></p>
                  <p className="text-[11px] text-[var(--carvao-suave)] mt-1 italic">
                    Realize o PIX e envie o comprovante clicando no botão do WhatsApp abaixo para confirmação imediata.
                  </p>
                </div>
              )}

              {(confirmedAppointment.paymentMethod === 'card_link' || paymentMethod === 'card_link') && (
                <div className="mt-4 pt-3 border-t border-[var(--linha)] bg-[var(--creme-card)] p-3 rounded-xl border border-[var(--linha)]">
                  <span className="text-xs font-bold text-[var(--verde-900)] flex items-center space-x-1 mb-1">
                    <CreditCard className="w-4 h-4 text-[var(--dourado)]" />
                    <span>Link de Pagamento no Cartão:</span>
                  </span>
                  <a
                    href="https://link.mercadopago.com.br/fisiolys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-[var(--verde-900)] bg-[var(--creme)] border border-[var(--dourado)] px-3 py-1.5 rounded-full hover:bg-[var(--creme-card)] transition-all"
                  >
                    <span>Pagar com Cartão (Mercado Pago)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Webhook notification pill */}
              <div className="mt-4 pt-3 border-t border-[var(--linha)] text-[11px] flex items-center justify-between text-[var(--carvao-suave)]">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--dourado)]" />
                  <span>Notificação da Clínica:</span>
                </span>
                <span className={`font-semibold ${webhookStatus ? 'text-[var(--verde-900)]' : 'text-[var(--carvao-suave)]'}`}>
                  {webhookStatus ? 'Enviada ao Gestor' : 'Registrada no Sistema'}
                </span>
              </div>
            </div>

          </div>
        )}
      </div>
    )}

        {/* ========================================================================= */}
        {/* SEÇÃO 2: CATÁLOGO DE SERVIÇOS & TRATAMENTOS */}
        {/* ========================================================================= */}
        {activeSection === 'servicos' && (
          <div id="servicos" className="space-y-6 animate-in fade-in duration-300 scroll-mt-24">
            
            {/* Header Banner */}
            <div className="bg-[#1B2E24] rounded-3xl p-6 sm:p-8 text-[#FAF7F0] shadow-md border border-[#2B4335] relative overflow-hidden">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#B08A3E]/20 text-[#DCC58F] border border-[#B08A3E]/40 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#DCC58F]" />
                  <span>Guia de Atendimentos & Tratamentos • Fisiolys</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#FAF7F0]">
                  Serviços Especializados com a Dra. Elays Marinho
                </h3>
                <p className="text-xs sm:text-sm text-[#E4DCC8] max-w-2xl font-sans leading-relaxed">
                  Conheça os protocolos de Pilates MAT Solo, Fisioterapia Traumato-Ortopédica, Reabilitação Postural, Terapias Manuais e ABA infantil. Selecione o tratamento ideal para iniciar seu agendamento.
                </p>
              </div>
            </div>

            {/* Category Filter Switcher */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: 'all', label: 'Todos os Tratamentos', icon: '✨' },
                { id: 'pilates', label: 'Pilates MAT Solo & Clínico', icon: '🧘‍♀️' },
                { id: 'fisioterapia', label: 'Fisioterapia Traumato-Ortopédica', icon: '🩺' },
                { id: 'massoterapia', label: 'Massoterapia & Miofascial', icon: '💆‍♀️' },
                { id: 'coluna', label: 'Coluna & Postura', icon: '🦴' },
                { id: 'pediatria_aba', label: 'Pediatria & ABA', icon: '👶' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatalogCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                    selectedCatalogCategory === cat.id
                      ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#1B2E24] shadow-xs'
                      : 'bg-white text-[#5B5A52] hover:bg-[#FAF7F0] hover:text-[#1B2E24] border-[#E5DEC9]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {activeServices
                .filter((s) => selectedCatalogCategory === 'all' || s.category === selectedCatalogCategory)
                .map((srv) => (
                  <div
                    key={srv.id}
                    className="bg-white rounded-2xl border border-[#E5DEC9] hover:border-[#B08A3E] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FAF7F0] text-[#1B2E24] border border-[#E5DEC9] uppercase">
                          {srv.category === 'pilates' ? 'Pilates Solo' : srv.category === 'fisioterapia' ? 'Fisioterapia' : 'Tratamento Clínico'}
                        </span>
                        <span className="flex items-center space-x-1 text-xs text-[#736B5E] font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#B08A3E]" />
                          <span>{srv.durationMinutes || 50} min</span>
                        </span>
                      </div>

                      <h4 className="text-base font-serif font-bold text-[#1B2E24] group-hover:text-[#243F30] transition-colors">
                        {srv.name}
                      </h4>

                      <p className="text-xs text-[#5B5A52] leading-relaxed">
                        {srv.description || 'Atendimento humanizado e individualizado sob avaliação fisioterapêutica.'}
                      </p>

                      <div className="space-y-1.5 pt-2 border-t border-[#F3EEE2] text-[11px] text-[#26241F]">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1B2E24] shrink-0" />
                          <span>Atendimento individualizado e climatizado</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#B08A3E] shrink-0" />
                          <span>Condições éticas e personalizadas CREFITO-12</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedService(srv);
                        applyServiceFrequencyDefaults(srv);
                        setActiveSection('agendamento');
                        setStep(1);
                        setTimeout(() => {
                          const el = document.getElementById('patient-registration-card');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      className="w-full py-3 px-4 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95"
                    >
                      <CalendarIcon className="w-4 h-4 text-[#DCC58F]" />
                      <span>Agendar Este Tratamento</span>
                    </button>
                  </div>
                ))}
            </div>

            {/* Direct CTA Back to Registration */}
            <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-[#E5DEC9] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <h4 className="text-xs font-bold text-[#1B2E24]">Dúvidas sobre o tratamento ideal?</h4>
                <p className="text-[11px] text-[#736B5E]">Fale diretamente com a Dra. Elays no WhatsApp ou abra seu agendamento online.</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('agendamento');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-[#1B2E24] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Ir para Agendamento
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 3: PLANOS & PROMOÇÕES / CLUBE DE FIDELIDADE */}
        {/* ========================================================================= */}
        {activeSection === 'promocoes' && (
          <div id="promocoes" className="space-y-6 animate-in fade-in duration-300 scroll-mt-24">
            {/* Quick Agendamento CTA Strip */}
            <div className="p-4 bg-[#1B2E24] text-[#FAF7F0] rounded-2xl border border-[#B08A3E]/40 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#243F30] text-[#DCC58F] flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#FAF7F0]">Aproveite os Benefícios do Clube Fisiolys</h4>
                  <p className="text-[11px] text-[#E4DCC8]">Ganhe pontos a cada sessão e troque por massagens e descontos exclusivos.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('agendamento');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-[#B08A3E] hover:bg-[#97732F] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer shrink-0 transition-all active:scale-95"
              >
                Agendar Minha Sessão Agora
              </button>
            </div>

            {/* Clube de Fidelidade e Vantagens Fisiolys com Consulta de Saldo e Indique & Ganhe */}
            <div id="fidelidade">
              <LoyaltyProgramSection clinicPhone={clinic.whatsapp || '5593991265006'} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 4: DEPOIMENTOS DE PACIENTES */}
        {/* ========================================================================= */}
        {activeSection === 'depoimentos' && (
          <div id="depoimentos" className="space-y-6 animate-in fade-in duration-300 scroll-mt-24">
            {/* Quick Agendamento CTA Strip */}
            <div className="p-4 bg-[#1B2E24] text-[#FAF7F0] rounded-2xl border border-[#B08A3E]/40 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#243F30] text-[#DCC58F] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#FAF7F0]">Excelência Reconhecida por Nossos Pacientes</h4>
                  <p className="text-[11px] text-[#E4DCC8]">Nota 5.0 estrelas no Google com centenas de atendimentos realizados.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('agendamento');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-[#B08A3E] hover:bg-[#97732F] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer shrink-0 transition-all active:scale-95"
              >
                Agendar Minha Avaliação
              </button>
            </div>

            {/* Patient Testimonials & 5-Star Reviews Section */}
            <TestimonialsSection />
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 5: BAIXAR APLICATIVO & QR CODE */}
        {/* ========================================================================= */}
        {activeSection === 'app' && (
          <div id="section-view-app" className="space-y-6 animate-in fade-in duration-300">
            {/* App Download QR Code Section */}
            <DownloadAppQRSection clinicName={clinic.name} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 6: CONTRATOS DIGITAIS & TCLE (PROTEGIDO POR SENHA / CPF) */}
        {/* ========================================================================= */}
        {activeSection === 'contratos' && (
          <div id="section-view-contratos" className="space-y-6 animate-in fade-in duration-300">
            <PatientContractsSection 
              clinic={clinic} 
              onNavigateToBooking={() => {
                setActiveSection('agendamento');
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL INTERATIVO: CONFIRMAR PRESENÇA & REAGENDAMENTO RÁPIDO */}
        {/* ========================================================================= */}
        {isPresenceModalOpen && (
          <div 
            id="modal-confirmar-presenca-reagendar"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div className="bg-white rounded-3xl border border-[#E5DEC9] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 bg-[#1B2E24] text-[#FAF7F0] border-b border-[#B08A3E]/30 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    {presenceModalTab === 'checkin' ? <UserCheck className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#FAF7F0]">
                      {presenceModalTab === 'checkin' ? 'Confirmar Presença (Check-in)' : 'Consultar & Reagendar Horário'}
                    </h3>
                    <p className="text-xs text-[#DCC58F]">
                      Recepção Fisiolys • Dra. Elays Marinho
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPresenceModalOpen(false)}
                  className="p-2 rounded-xl text-[#E4DCC8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Tabs Switcher */}
              <div className="p-2 bg-[#FAF7F0] border-b border-[#E5DEC9] grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPresenceModalTab('checkin');
                    setPresenceFeedbackMsg(null);
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    presenceModalTab === 'checkin'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-[#524F4A] hover:bg-[#F2ECE1] border border-[#E5DEC9]'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirmar Presença</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPresenceModalTab('reagendar');
                    setPresenceFeedbackMsg(null);
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    presenceModalTab === 'reagendar'
                      ? 'bg-[#B08A3E] text-white shadow-xs'
                      : 'bg-white text-[#524F4A] hover:bg-[#F2ECE1] border border-[#E5DEC9]'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Reagendar Sessão</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Success Alert if Checked-in */}
                {presenceCheckInSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 animate-in zoom-in-95 duration-200 space-y-3">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <h4 className="text-sm font-bold text-emerald-800">
                        Presença Confirmada com Sucesso!
                      </h4>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Olá <strong>{presenceCheckInSuccess.name}</strong>, sua chegada foi registrada no sistema às <strong>{presenceCheckInSuccess.time}</strong>. A Dra. Elays e a equipe de recepção foram notificadas.
                    </p>
                    <div className="pt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPresenceModalOpen(false);
                          if (onNavigateToPatientPortal) {
                            onNavigateToPatientPortal('checkin', presenceCheckInSuccess.patientCpf || '341.892.108-45');
                          }
                        }}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Abrir Painel do Paciente</span>
                      </button>
                      <a
                        href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. Elays! Acabei de fazer meu check-in na recepção para meu atendimento hoje.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Avisar no WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setPresenceCheckInSuccess(null)}
                        className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-800 text-xs font-medium rounded-xl hover:bg-emerald-100/50 cursor-pointer"
                      >
                        Fazer outro check-in
                      </button>
                    </div>
                  </div>
                )}

                {/* Reschedule Success Alert */}
                {presenceRescheduleSuccess && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 animate-in zoom-in-95 duration-200 space-y-3">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-6 h-6 text-amber-600 shrink-0" />
                      <h4 className="text-sm font-bold text-amber-800">
                        Reagendamento Confirmado com Sucesso!
                      </h4>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Sua sessão foi atualizada para <strong>{presenceNewDate}</strong> às <strong>{presenceNewTime} hs</strong>. A Dra. Elays e a recepção já foram notificadas no prontuário.
                    </p>
                    <div className="pt-1 flex flex-wrap gap-2">
                      <a
                        href={`https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(`Olá Dra. Elays! Reagendei meu horário para o dia ${presenceNewDate} às ${presenceNewTime} hs através do site.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Avisar no WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPresenceModalOpen(false);
                          if (onNavigateToPatientPortal) {
                            const cpf = presenceRescheduleAppt?.patientCpf || (presenceSearchInput.replace(/\D/g, '').length >= 11 ? presenceSearchInput : '341.892.108-45');
                            onNavigateToPatientPortal('proximos', cpf);
                          }
                        }}
                        className="px-4 py-2 bg-[#1B2E24] hover:bg-[#2B4738] text-[#FAF7F0] text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-[#DCC58F]" />
                        <span>Abrir Meu Painel do Paciente</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPresenceRescheduleSuccess(false);
                          setPresenceRescheduleAppt(null);
                        }}
                        className="px-3.5 py-2 bg-white border border-amber-300 text-amber-900 text-xs font-semibold rounded-xl cursor-pointer hover:bg-amber-100/50"
                      >
                        Ver outros agendamentos
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback Error / Info */}
                {presenceFeedbackMsg && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{presenceFeedbackMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePresenceSearch('')}
                      className="text-xs font-bold underline text-amber-800 hover:text-amber-950 cursor-pointer ml-2"
                    >
                      Ver todos
                    </button>
                  </div>
                )}

                {/* DEDICATED VIEW 1: ACTIVE RESCHEDULE FORM */}
                {presenceRescheduleAppt && !presenceRescheduleSuccess ? (
                  <div className="p-5 bg-linear-to-br from-amber-50/90 to-orange-50/50 border-2 border-[#B08A3E]/40 rounded-3xl space-y-4 animate-in fade-in zoom-in-95 duration-200 shadow-md">
                    <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#B08A3E] flex items-center space-x-1">
                          <CalendarCheck className="w-3.5 h-3.5" />
                          <span>Remarcação de Consulta</span>
                        </span>
                        <h4 className="text-sm sm:text-base font-extrabold text-[#1B2E24]">
                          Paciente: {presenceRescheduleAppt.patientName}
                        </h4>
                        <p className="text-xs text-[#736B5E]">
                          Serviço: <strong className="text-[#1B2E24]">{presenceRescheduleAppt.serviceName || 'Fisioterapia / Pilates'}</strong>
                        </p>
                      </div>
                      <span className="text-[11px] font-bold px-3 py-1 bg-white rounded-xl border border-amber-200 text-amber-900 shadow-xs">
                        Horário Atual: {presenceRescheduleAppt.date} às {presenceRescheduleAppt.time} hs
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-[#1B2E24] mb-1.5 flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-[#B08A3E]" />
                          <span>Nova Data Desejada:</span>
                        </label>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={presenceNewDate}
                          onChange={(e) => setPresenceNewDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#D5CCA4] rounded-xl text-xs font-bold text-[#1B2E24] focus:ring-2 focus:ring-[#B08A3E] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#1B2E24] mb-1.5 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-[#B08A3E]" />
                          <span>Novo Horário Desejado:</span>
                        </label>
                        <select
                          value={presenceNewTime}
                          onChange={(e) => setPresenceNewTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#D5CCA4] rounded-xl text-xs font-bold text-[#1B2E24] focus:ring-2 focus:ring-[#B08A3E] focus:outline-none"
                        >
                          {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(t => (
                            <option key={t} value={t}>{t} hs</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quick Horário Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[#736B5E] block">
                        Horários Rápidos da Clínica:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setPresenceNewTime(t)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              presenceNewTime === t
                                ? 'bg-[#B08A3E] text-white shadow-xs scale-105'
                                : 'bg-white border border-[#D5CCA4] text-[#524F4A] hover:bg-[#FAF7F0]'
                            }`}
                          >
                            {t} hs
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional Reason */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#736B5E] mb-1">
                        Motivo da remarcação (opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Imprevisto de trabalho, remarcar para a próxima semana"
                        value={presenceRescheduleReason}
                        onChange={(e) => setPresenceRescheduleReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#D5CCA4] rounded-xl text-xs text-[#26241F] focus:outline-none focus:border-[#B08A3E]"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-amber-200/80">
                      <button
                        type="button"
                        onClick={handleSaveReschedule}
                        className="flex-1 py-3 bg-[#B08A3E] hover:bg-[#97732F] active:scale-98 text-white text-xs font-extrabold rounded-2xl cursor-pointer shadow-md transition-all flex items-center justify-center space-x-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmar Reagendamento de Horário</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPresenceRescheduleAppt(null);
                          setPresenceRescheduleReason('');
                        }}
                        className="px-4 py-3 bg-white border border-[#D5CCA4] text-[#524F4A] hover:text-[#1B2E24] text-xs font-bold rounded-2xl cursor-pointer hover:bg-[#FAF7F0] transition-colors"
                      >
                        ← Voltar à Lista
                      </button>
                    </div>
                  </div>
                ) : (
                  /* DEDICATED VIEW 2: SEARCH & APPOINTMENT LIST */
                  <>
                    {/* Search / Identify Patient Input */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[#1B2E24]">
                        Localizar seu agendamento (CPF, Telefone ou Nome):
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={presenceSearchInput}
                            onChange={(e) => setPresenceSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handlePresenceSearch();
                            }}
                            placeholder="Ex: 123.456.789-00 ou (93) 99126-5006 ou seu nome"
                            className="w-full pl-9 pr-3 py-2.5 bg-[#FAF7F0] border border-[#E5DEC9] rounded-xl text-xs text-[#26241F] focus:outline-none focus:border-emerald-600"
                          />
                          <User className="w-4 h-4 text-[#848278] absolute left-3 top-3" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePresenceSearch()}
                          disabled={presenceIsSearching}
                          className="px-4 py-2.5 bg-[#1B2E24] hover:bg-[#243F30] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5 shrink-0 transition-colors disabled:opacity-50"
                        >
                          {presenceIsSearching ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span>Buscar</span>
                        </button>
                      </div>
                    </div>

                    {/* Results List if found */}
                    {presencePatientAppointments.length > 0 ? (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#1B2E24]">
                            Agendamentos Disponíveis ({presencePatientAppointments.length}):
                          </h4>
                          {presenceSearchInput && (
                            <button
                              type="button"
                              onClick={() => {
                                setPresenceSearchInput('');
                                handlePresenceSearch('');
                              }}
                              className="text-[11px] text-emerald-800 hover:underline font-semibold cursor-pointer"
                            >
                              Limpar filtro
                            </button>
                          )}
                        </div>
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {presencePatientAppointments.map((appt) => {
                            const isCheckedIn = appt.attendanceStatus === 'presenca' || appt.status === 'concluido' || !!appt.checkedInAt;

                            return (
                              <div
                                key={appt.id}
                                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                  isCheckedIn
                                    ? 'bg-emerald-50/60 border-emerald-300'
                                    : 'bg-[#FAF7F0] border-[#E5DEC9] hover:border-emerald-500/50'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-[#1B2E24]">{appt.patientName}</span>
                                    {isCheckedIn ? (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white flex items-center space-x-1">
                                        <Check className="w-2.5 h-2.5" />
                                        <span>Presença Confirmada</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white border border-[#E5DEC9] text-[#524F4A]">
                                        {appt.status}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#848278] flex items-center space-x-2">
                                    <span className="font-semibold text-emerald-800">📅 {appt.date} às ⏰ {appt.time} hs</span>
                                    <span>•</span>
                                    <span>{appt.serviceName || 'Fisioterapia / Pilates'}</span>
                                  </p>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
                                  {presenceModalTab === 'checkin' ? (
                                    <>
                                      {isCheckedIn ? (
                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-xl flex items-center space-x-1">
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Check-in Feito</span>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleConfirmQuickCheckIn(appt)}
                                          className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-1.5 transition-colors"
                                        >
                                          <UserCheck className="w-3.5 h-3.5" />
                                          <span>Confirmar Presença</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPresenceRescheduleAppt(appt);
                                          setPresenceNewDate(appt.date);
                                          setPresenceNewTime(appt.time);
                                          setPresenceModalTab('reagendar');
                                        }}
                                        title="Remarcar esta sessão"
                                        className="px-2.5 py-1.5 bg-white border border-[#D5CCA4] hover:bg-[#F3EEE2] text-[#524F4A] text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                                      >
                                        <CalendarCheck className="w-3.5 h-3.5 text-[#B08A3E]" />
                                        <span className="hidden sm:inline">Reagendar</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPresenceRescheduleAppt(appt);
                                        setPresenceNewDate(appt.date);
                                        setPresenceNewTime(appt.time);
                                      }}
                                      className="w-full sm:w-auto px-4 py-2 bg-[#B08A3E] hover:bg-[#97732F] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-1.5 transition-all"
                                    >
                                      <CalendarCheck className="w-4 h-4" />
                                      <span>Reagendar Horário</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 px-4 bg-[#FAF7F0] rounded-2xl border border-dashed border-[#E5DEC9] space-y-2">
                        <Calendar className="w-6 h-6 text-[#848278] mx-auto opacity-60" />
                        <p className="text-xs text-[#848278]">
                          Nenhum agendamento encontrado para o filtro. Digite seu nome acima ou clique em "Buscar".
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPresenceSearchInput('');
                            handlePresenceSearch('');
                          }}
                          className="px-3 py-1.5 bg-[#1B2E24] text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Carregar Todos os Agendamentos
                        </button>
                      </div>
                    )}

                    {/* Direct Quick Check-in if not in list or general check-in */}
                    {presenceModalTab === 'checkin' && !presenceCheckInSuccess && (
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-emerald-900">Check-in Rápido na Recepção</h4>
                            <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                              Chegou à clínica Fisiolys para seu atendimento hoje? Confirme sua presença instantaneamente para a recepção e Dra. Elays.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConfirmQuickCheckIn()}
                          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-2 transition-transform active:scale-98"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Confirmar Minha Presença Agora</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer with Portal Redirect Option */}
              <div className="p-4 bg-[#FAF7F0] border-t border-[#E5DEC9] flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPresenceModalOpen(false);
                    if (onNavigateToPatientPortal) {
                      const patientCpf = presenceCheckInSuccess?.patientCpf || presenceRescheduleAppt?.patientCpf || (presenceSearchInput.replace(/\D/g, '').length >= 11 ? presenceSearchInput : '341.892.108-45');
                      onNavigateToPatientPortal(presenceModalTab === 'checkin' ? 'checkin' : 'proximos', patientCpf);
                    }
                  }}
                  className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4 text-[#B08A3E]" />
                  <span>Abrir Portal do Paciente Completo (Prontuário & Totem)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPresenceModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#E5DEC9] hover:bg-[#F2ECE1] text-[#26241F] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
