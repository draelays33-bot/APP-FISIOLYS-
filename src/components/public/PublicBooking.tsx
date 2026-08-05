import React, { useState, useEffect } from 'react';
import { Service, ClinicConfig, Appointment, PaymentMethod, SlotInfo } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR, formatPhoneMask, generateWhatsAppMessage, getClinicMapUrl } from '../../utils/qrUtils';
import { getImageUrl } from '../../utils/imageUtils';
import { Logo } from '../Logo';
import { ClinicMascot } from './ClinicMascot';
import { LoyaltyProgramSection } from './LoyaltyProgramSection';
import { TestimonialsSection } from './TestimonialsSection';
import { DownloadAppQRSection } from './DownloadAppQRSection';
import {
  Calendar as CalendarIcon,
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
  Navigation
} from 'lucide-react';

interface PublicBookingProps {
  clinic: ClinicConfig;
  services: Service[];
  onBookingSuccess?: () => void;
}

export const PublicBooking: React.FC<PublicBookingProps> = ({ clinic, services, onBookingSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [copiedPix, setCopiedPix] = useState<boolean>(false);

  // Slot Availability
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [selectedBlockedSlot, setSelectedBlockedSlot] = useState<SlotInfo | null>(null);
  const [slotError, setSlotError] = useState<string>('');

  // Submit State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<boolean | null>(null);

  const activeServices = services.filter((s) => s.active);

  // Auto-select initial active service and set valid date (ONLY if not set)
  useEffect(() => {
    if (!selectedService && activeServices.length > 0) {
      setSelectedService(activeServices[0]);
    }

    if (!selectedDate) {
      const getInitialBookingDate = () => {
        const d = new Date();
        // If Sunday (0), default to Monday
        if (d.getDay() === 0) {
          d.setDate(d.getDate() + 1);
        }
        return d.toISOString().split('T')[0];
      };
      setSelectedDate(getInitialBookingDate());
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
        isToday
      });
    }
    return list;
  };

  // Fetch available slots when service or date changes
  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchSlots(selectedDate, selectedService.id);
    }
  }, [selectedDate, selectedService]);

  const fetchSlots = async (date: string, serviceId: string) => {
    setSlotsLoading(true);
    setSlotError('');
    setSelectedTime('');
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

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedService && activeServices.length > 0) {
        setSelectedService(activeServices[0]);
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2 && selectedDate && selectedTime) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (step > 1 && step < 4) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setSubmitError('Por favor, digite seu Nome Completo para garantir seu horário.');
      const el = document.getElementById('input-patient-name');
      if (el) el.focus();
      return;
    }
    if (!patientPhone.trim() || patientPhone.trim().length < 8) {
      setSubmitError('Por favor, informe seu número de WhatsApp com DDD para contato.');
      const el = document.getElementById('input-patient-phone');
      if (el) el.focus();
      return;
    }
    if (!selectedService || !selectedDate || !selectedTime) {
      setSubmitError('Por favor, selecione um serviço, data e horário no formulário.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const result = await api.createAppointment({
        patientName,
        patientPhone,
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        notes: patientNotes,
        paymentMethod,
      });

      setConfirmedAppointment(result.appointment);
      setWebhookStatus(result.webhookSent);
      setStep(4);
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
    });

    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
  };

  // Generate date picker min and max dates
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 30);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/60 pb-12 pt-4 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto">

        {/* Clinic Header Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#C9D8CB] mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#5F6D33] via-[#D0A73B] to-[#31523D]" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-[#D0A73B] shadow-sm bg-[#23372B]">
                <img
                  src="/src/assets/images/fisiolys_logo_brand_1785780140781.jpg"
                  alt="Logo Fisiolys Fisioterapia e Pilates"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F5EED3] text-[#7E611D] border border-[#D0A73B]/30 mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#D0A73B]" />
                  <span>Agendamento Online</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-[#23372B] tracking-tight">
                  {clinic.name}
                </h2>
                <a
                  href={getClinicMapUrl(clinic.address, clinic.city)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-[#31523D] hover:text-[#23372B] hover:underline mt-1 flex items-center space-x-1 group transition-colors"
                  title="Clique para abrir localização da clínica no Google Maps"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#5F6D33] group-hover:text-[#D0A73B] shrink-0 transition-colors" />
                  <span className="font-medium">{clinic.address} - {clinic.city}</span>
                  <ExternalLink className="w-3 h-3 text-[#D0A73B] opacity-70 group-hover:opacity-100" />
                </a>
              </div>
            </div>

            {/* Contact, Location & Social Badges */}
            <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-start sm:justify-center gap-2 shrink-0">
              <a
                href={getClinicMapUrl(clinic.address, clinic.city)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-[#23372B] font-extrabold bg-[#D0A73B] hover:bg-[#b8912d] px-3.5 py-2 rounded-xl border border-[#D0A73B] transition-all shadow-2xs group"
                title="Abrir rota para a clínica via Google Maps"
              >
                <Navigation className="w-3.5 h-3.5 text-[#23372B] group-hover:rotate-45 transition-transform" />
                <span>Destino / Ver no Mapa</span>
              </a>

              <a
                href={`https://wa.me/${clinic.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-white font-bold bg-[#31523D] hover:bg-[#23372B] px-3.5 py-2 rounded-xl border border-[#D0A73B]/40 transition-all shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>WhatsApp: (93) 99126-5006</span>
              </a>

              <a
                href="https://instagram.com/fisiolysmarinho"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-[#23372B] font-bold bg-[#F5EED3] hover:bg-[#EBDC9C] px-3.5 py-2 rounded-xl border border-[#D0A73B]/50 transition-all shadow-2xs"
              >
                <Instagram className="w-4 h-4 text-[#E1306C]" />
                <span>@fisiolysmarinho</span>
              </a>
            </div>
          </div>

          {/* Practitioner Introduction Banner */}
          <div className="mt-5 pt-4 border-t border-[#E4EBE4] bg-gradient-to-r from-[#F4F7F4] via-white to-[#F4F7F4] rounded-xl p-4 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 border border-[#3D674C]/20 shadow-2xs">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border-2 border-[#D0A73B] shadow-md">
              <img
                src={getImageUrl("/src/assets/images/dra_elays_marinho_official_1785780100332.jpg")}
                alt="Dra. Elays Marinho"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <div className="flex items-center space-x-2 justify-center sm:justify-start">
                    <h3 className="text-lg font-serif font-bold text-[#23372B]">Dra. Elays Marinho</h3>
                    <span className="bg-[#D0A73B] text-[#23372B] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      12 Anos de Experiência
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#D0A73B] uppercase tracking-wide">CREFITO: 208058</p>
                </div>
                <div className="flex flex-col sm:items-end items-center gap-1">
                  <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold bg-[#23372B] text-[#F5EED3] px-3 py-1 rounded-full border border-[#D0A73B]/50 shadow-2xs">
                    <Award className="w-3.5 h-3.5 text-[#D0A73B]" />
                    <span>Fisioterapeuta Responsável</span>
                  </span>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold text-[#31523D] flex items-center justify-center sm:justify-start space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5F6D33] shrink-0" />
                  <span>Fisioterapeuta Especialista em Traumato-Ortopedia, Pediatria e ABA</span>
                </p>
                <p className="text-xs font-semibold text-[#31523D] flex items-center justify-center sm:justify-start space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5F6D33] shrink-0" />
                  <span>Especialista em Pilates Clínico, Biomecânico e Reabilitação Funcional</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step Progress Bar */}
        {step < 4 && (
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-2xs border border-[#C9D8CB] mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span className={step >= 1 ? "text-[#5F6D33] font-bold" : ""}>1. Serviço</span>
              <span className={step >= 2 ? "text-[#5F6D33] font-bold" : ""}>2. Data & Horário</span>
              <span className={step >= 3 ? "text-[#5F6D33] font-bold" : ""}>3. Seus Dados</span>
            </div>
            <div className="w-full bg-[#E4EBE4] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#5F6D33] to-[#D0A73B] h-full transition-all duration-300 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 1: SERVICE SELECTION */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#C9D8CB]">
            {/* Logo and Step Title Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E4EBE4]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#D0A73B] shrink-0 shadow-2xs bg-[#23372B]">
                  <img
                    src={getImageUrl("/src/assets/images/fisiolys_logo_brand_1785780140781.jpg")}
                    alt="Logo Fisiolys"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-extrabold text-[#23372B] leading-tight">
                    Agendamento de Consulta / Sessão
                  </h3>
                  <p className="text-xs text-[#5F6D33] font-medium">
                    Selecione o programa para escolher data e horário
                  </p>
                </div>
              </div>
              <a
                href="https://instagram.com/fisiolysmarinho"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center space-x-1 text-xs font-bold text-[#E1306C] bg-[#F4F7F4] px-2.5 py-1 rounded-lg border border-[#E1306C]/20 hover:bg-white transition-all"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>@fisiolysmarinho</span>
              </a>
            </div>

            {/* Exclusive Clinic Mascot - Lys */}
            <div className="mb-6">
              <ClinicMascot />
            </div>

            {/* Programa de Fidelidade Recorrente R$ 99/mês (Abaixo das Dicas da Lys) */}
            <LoyaltyProgramSection clinicPhone={clinic.whatsapp} />

            {/* Promotional Highlights Box - Especial Dia dos Pais */}
            <div className="bg-gradient-to-r from-[#1B2B22] via-[#2D4A37] to-[#1B2B22] rounded-2xl p-4 sm:p-5 text-[#F5EED3] shadow-md border-2 border-[#D0A73B] mb-6 relative overflow-hidden">
              {/* Decorative background glow */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#D0A73B]/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start space-x-3 sm:space-x-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-[#D0A73B] text-[#23372B] flex items-center justify-center shrink-0 shadow-sm text-2xl font-black">
                  👔
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider bg-[#D0A73B] text-[#23372B] px-3 py-0.5 rounded-full shadow-2xs">
                      👔 ESPECIAL DIA DOS PAIS
                    </span>
                    <span className="text-xs text-[#F5EED3] font-bold bg-[#D0A73B]/20 border border-[#D0A73B]/40 px-2.5 py-0.5 rounded-full">
                      🎁 Recompensa Exclusiva
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-serif font-extrabold text-white mt-2 flex items-center gap-2">
                    <span>Pai Sem Dor e Com Mais Saúde</span>
                    <span className="text-[#D0A73B]">💙</span>
                  </h4>

                  <p className="text-xs sm:text-sm text-[#E4EBE4] mt-1.5 leading-relaxed">
                    Surpreenda seu pai ou cuide de você! Ao contratar qualquer <strong>Programa de Tratamento (Pilates, Coluna ou Fisioterapia)</strong>, você ganha uma <strong>RECOMPENSA EXCLUSIVA DE DIA DOS PAIS:</strong>
                  </p>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#23372B]/80 border border-[#D0A73B]/50 p-2.5 rounded-xl flex items-center space-x-2">
                      <span className="text-base">🎁</span>
                      <div>
                        <strong className="text-[#D0A73B] block">RECOMPENSA GRATUITA:</strong>
                        <span className="text-white font-medium">1 Massoterapia / Liberação Miofascial para o Papai!</span>
                      </div>
                    </div>

                    <div className="bg-[#23372B]/80 border border-[#D0A73B]/50 p-2.5 rounded-xl flex items-center space-x-2">
                      <span className="text-base">⚡</span>
                      <div>
                        <strong className="text-[#D0A73B] block">AULA EXPERIMENTAL:</strong>
                        <span className="text-white font-medium">Pilates Prático por apenas R$ 49,00 (30 min)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {activeServices.map((service) => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <div
                    key={service.id}
                    id={`service-card-${service.id}`}
                    onClick={() => setSelectedService(service)}
                    className={`cursor-pointer rounded-2xl p-4 transition-all border-2 relative ${
                      isSelected
                        ? 'border-[#5F6D33] bg-[#EAF0DB]/60 shadow-xs'
                        : 'border-[#E4EBE4] hover:border-[#9CB55E] bg-white hover:bg-[#F4F7F4]/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      {/* Optional Service Image Illustration */}
                      {service.imageUrl && (
                        <div className="relative w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-[#C9D8CB]/80">
                          <img
                            src={getImageUrl(service.imageUrl)}
                            alt={service.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                        </div>
                      )}

                      {/* Content details */}
                      <div className="flex-1 pr-2">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md uppercase tracking-wider ${
                            service.category === 'pilates'
                              ? 'bg-[#F5EED3] text-[#7E611D] border border-[#D0A73B]/30'
                              : service.category === 'fisioterapia'
                              ? 'bg-[#E4EBE4] text-[#31523D] border border-[#769E82]/30'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {service.category}
                          </span>
                          <span className="text-xs text-slate-500 font-medium flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#5F6D33]" />
                            <span>{service.durationMinutes} min</span>
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-[#23372B] leading-tight">
                          {service.name}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      </div>

                      {/* Price and selector button */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E4EBE4] gap-2">
                        <div className="text-left sm:text-right">
                          <span className="text-xs text-slate-400 block font-medium">Investimento</span>
                          <span className="text-lg font-extrabold text-[#31523D]">
                            {formatCurrency(service.price)}
                          </span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedService(service);
                            setStep(2);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-2xs ${
                            isSelected
                              ? 'bg-[#31523D] text-[#F5EED3] border border-[#D0A73B]/40'
                              : 'bg-[#5F6D33] text-white hover:bg-[#4A5629]'
                          }`}
                        >
                          <span>{isSelected ? 'Selecionado ✓' : 'Escolher Horário'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#D0A73B]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                id="btn-step1-next"
                onClick={handleNextStep}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-[#31523D] hover:bg-[#23372B] text-white shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>Clique aqui e garanta seu horário ({selectedService?.name || 'Selecione acima'})</span>
                <ChevronRight className="w-4 h-4 text-[#D0A73B]" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DATE & TIME SELECTION */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#C9D8CB]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E4EBE4]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#D0A73B] shrink-0 bg-[#23372B]">
                  <img
                    src="/src/assets/images/fisiolys_logo_brand_1785780140781.jpg"
                    alt="Logo Fisiolys"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Programa Selecionado:</span>
                  <p className="text-sm font-bold text-[#31523D]">{selectedService?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-[#5F6D33] hover:underline font-bold bg-[#F4F7F4] px-2.5 py-1 rounded-lg border border-[#C9D8CB]"
              >
                Alterar Serviço
              </button>
            </div>

            <h3 className="text-lg font-bold text-[#23372B] mb-1">
              Escolha a Data e o Horário
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">
              Selecione o dia desejado para filtrar os horários livres.
            </p>

            {/* Date Selection Section: Quick Chips + Calendar */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#294232] uppercase tracking-wider">
                  Data do Atendimento
                </label>
                <span className="text-[11px] text-[#5F6D33] font-semibold">
                  Data selecionada: <strong className="text-[#31523D]">{formatDatePtBR(selectedDate)}</strong>
                </span>
              </div>

              {/* Horizontal Scrollable Quick Date Chips */}
              <div className="overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
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
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-[#31523D] text-white border-[#31523D] shadow-md ring-2 ring-[#D0A73B] scale-105'
                            : 'bg-white text-[#23372B] border-[#C9D8CB] hover:border-[#5F6D33] hover:bg-[#EAF0DB]/50'
                        }`}
                      >
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-[#D0A73B] text-[#23372B]'
                            : opt.isSunday
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-[#EAF0DB] text-[#5F6D33]'
                        }`}>
                          {opt.badge}
                        </span>

                        <div className="my-0.5">
                          <span className="text-base font-black block leading-none">{opt.dayNum}</span>
                          <span className="text-[10px] opacity-75 block leading-tight">{opt.monthNum}</span>
                        </div>

                        {opt.isSunday && (
                          <span className="text-[9px] font-bold text-slate-400">Fechado</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Input Selector */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs flex-1">
                  <input
                    id="input-booking-date"
                    type="date"
                    min={todayStr}
                    max={maxDateStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-[#C9D8CB] focus:ring-2 focus:ring-[#5F6D33] focus:border-[#5F6D33] text-slate-800 font-bold text-xs sm:text-sm bg-[#F4F7F4]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleJumpToNextAvailableDate}
                  className="px-3.5 py-2 rounded-xl bg-[#EAF0DB] hover:bg-[#C9D8CB] text-[#31523D] border border-[#9CB55E]/50 text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#5F6D33]" />
                  <span>Próximo Dia Útil →</span>
                </button>
              </div>
            </div>

            {/* Capacity Rules & System Policy Banner */}
            <div className="bg-gradient-to-br from-[#EAF0DB]/80 via-[#F4F7F4] to-[#F5EED3]/80 border border-[#9CB55E]/60 rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C9D8CB]/60 pb-2">
                <span className="flex items-center space-x-1.5 text-xs font-extrabold text-[#23372B]">
                  <Clock className="w-4 h-4 text-[#5F6D33]" />
                  <span>Regras da Agenda & Lembretes Automáticos</span>
                </span>
                <span className="text-[10px] bg-[#31523D] text-white px-2.5 py-0.5 rounded-full font-bold">
                  Dra. Elays Marinho • Fisiolys
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#23372B]">
                <div className="bg-white p-2.5 rounded-xl border border-[#C9D8CB] flex items-start space-x-2">
                  <span className="text-sm font-bold shrink-0">⏳</span>
                  <div>
                    <strong>Agendamento Online:</strong> Exige no mínimo <strong>2 horas de antecedência</strong>.
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#C9D8CB] flex items-start space-x-2">
                  <span className="text-sm font-bold shrink-0">🔔</span>
                  <div>
                    <strong>Aviso da Sessão:</strong> Disparo automático <strong>4 horas antes do horário marcado</strong>.
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#C9D8CB] flex items-start space-x-2">
                  <span className="text-sm font-bold shrink-0">👥</span>
                  <div>
                    <strong>Atendimento em Grupo:</strong> Até <strong>4 pacientes por horário</strong> (Acompanhamento individualizado).
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#D0A73B]/50 flex items-start space-x-2">
                  <span className="text-sm font-bold shrink-0">⭐</span>
                  <div>
                    <strong>Avaliação Fisioterapêutica:</strong> Atendimento <strong>exclusivo e individual (1 pessoa)</strong>.
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#9CB55E]/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#23372B] font-extrabold text-[11px] flex items-center gap-1.5">
                  <span className="text-sm">🚨</span>
                  <span>Em caso de urgência ou atendimento para as próximas 2 horas:</span>
                </span>
                <a
                  href={`https://wa.me/${clinic.whatsapp || '5593991265006'}?text=${encodeURIComponent(`Olá Dra. Elays Marinho! Tenho uma urgência e gostaria de solicitar um encaixe de atendimento para hoje.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 bg-[#25D366] hover:bg-[#1EBE57] text-white font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-white" />
                  <span>Encaixe de Urgência no WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Available Slot Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#294232] uppercase tracking-wider">
                  Horários Disponíveis ({formatDatePtBR(selectedDate)})
                </label>
                <span className="text-[11px] text-[#5F6D33] font-semibold">
                  Clique no horário desejado
                </span>
              </div>

              {slotsLoading ? (
                <div className="py-8 text-center text-slate-500 text-sm flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#5F6D33]" />
                  <span>Verificando disponibilidade da agenda...</span>
                </div>
              ) : slotError || availableSlots.length === 0 || availableSlots.every(s => !s.available) ? (
                <div className="p-5 bg-gradient-to-br from-[#FFFDF5] via-[#FDFBF2] to-[#F5EED3] rounded-2xl border-2 border-[#D0A73B]/60 shadow-sm text-[#31523D] space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#D0A73B] text-[#23372B] flex items-center justify-center shrink-0 font-black text-xl shadow-xs">
                      🔒
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[#23372B]">
                        Agenda Sem Vagas para {formatDatePtBR(selectedDate)}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#415347] mt-1 leading-relaxed">
                        {slotError || 'Todos os horários desta data já foram preenchidos ou se encerraram para hoje.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#D0A73B]/30 flex flex-wrap items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={handleJumpToNextAvailableDate}
                      className="px-4 py-2.5 rounded-xl bg-[#31523D] hover:bg-[#23372B] text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <CalendarIcon className="w-4 h-4 text-[#D0A73B]" />
                      <span>Ver Próximo Dia Disponível →</span>
                    </button>

                    <a
                      href={`https://wa.me/${clinic.whatsapp || '5593991265006'}?text=${encodeURIComponent(`Olá Dra. Elays Marinho! Notei que a agenda do dia ${formatDatePtBR(selectedDate)} está sem vagas para ${selectedService?.name}. Teria a possibilidade de um encaixe especial?`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE57] text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 fill-white" />
                      <span>Solicitar Encaixe no WhatsApp</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    const isOccupiedPartially = slot.available && slot.bookedCount > 0;
                    
                    return (
                      <button
                        key={slot.time}
                        id={`slot-${slot.time}`}
                        type="button"
                        onClick={() => {
                          if (!slot.available) {
                            setSelectedBlockedSlot(slot);
                          } else {
                            setSelectedBlockedSlot(null);
                            setSelectedTime(slot.time);
                            setStep(3);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={`p-3 rounded-2xl text-xs transition-all border flex flex-col items-center justify-center space-y-1 relative cursor-pointer ${
                          !slot.available
                            ? 'bg-slate-50 text-slate-400 border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 shadow-none opacity-80'
                            : isSelected
                            ? 'bg-[#31523D] text-white border-[#31523D] shadow-md ring-2 ring-[#D0A73B]'
                            : isOccupiedPartially
                            ? 'bg-[#FDFBF2] text-[#23372B] border-[#D0A73B] hover:bg-[#F5EED3] shadow-2xs'
                            : 'bg-white text-[#23372B] border-[#C9D8CB] hover:border-[#5F6D33] hover:bg-[#EAF0DB]/60'
                        }`}
                      >
                        <span className="text-sm font-extrabold">{slot.time} hs</span>

                        {/* Status Badges */}
                        {!slot.available ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center ${
                            slot.statusLabel?.includes('< 2h') || slot.statusLabel?.includes('Encerrado')
                              ? 'text-amber-800 bg-amber-100/90 border border-amber-300'
                              : 'text-rose-600 bg-rose-50 border border-rose-200'
                          }`}>
                            {slot.statusLabel
                              ? `🔒 ${slot.statusLabel}`
                              : slot.hasExclusiveBooking
                              ? '🔒 Exclusivo Ocupado'
                              : slot.isExclusive
                              ? '🔒 Exige Horário Livre'
                              : '🚫 LOTADO (4/4)'}
                          </span>
                        ) : isOccupiedPartially ? (
                          <span className="text-[10px] font-bold text-[#8A6A12] bg-[#F5EED3] border border-[#D0A73B]/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>🔥</span>
                            <span>{slot.statusLabel || `${slot.bookedCount}/4 Vagas`}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[#5F6D33] bg-[#EAF0DB] border border-[#9CB55E]/40 px-2 py-0.5 rounded-full">
                            {slot.isExclusive ? '⭐ Exclusivo Livre' : '🟢 4 Vagas Libres'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Blocked/Full Slot Alert Callout */}
            {selectedBlockedSlot && (
              <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-[#23372B] via-[#31523D] to-[#23372B] text-white border-2 border-[#D0A73B] shadow-md animate-fadeIn relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#D0A73B] text-[#23372B] flex items-center justify-center shrink-0 text-xl font-black">
                      ⚠️
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#F5EED3] flex items-center gap-2">
                        <span>Horário das {selectedBlockedSlot.time} hs Indisponível / Lotado</span>
                      </h4>
                      <p className="text-xs text-[#E4EBE4] mt-1 leading-relaxed">
                        {selectedBlockedSlot.reason || `Este horário já atingiu o limite de atendimentos (${selectedBlockedSlot.bookedCount}/${selectedBlockedSlot.maxCapacity}).`}
                      </p>
                      <p className="text-xs text-[#D0A73B] font-semibold mt-1">
                        💡 Sugestão: Escolha um dos horários com vagas verdes ou amarelas acima ou entre em contato para solicitar encaixe especial.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBlockedSlot(null)}
                    className="text-xs text-[#E4EBE4] hover:text-white bg-white/10 px-2 py-1 rounded-lg cursor-pointer"
                  >
                    ✕ Fechar
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-200">
                    Precisa especificamente deste horário para {selectedService?.name}?
                  </span>
                  <a
                    href={`https://wa.me/${clinic.whatsapp || '5593991265006'}?text=${encodeURIComponent(`Olá Dra. Elays Marinho! Gostaria de verificar a possibilidade de um encaixe para o horário das ${selectedBlockedSlot.time} hs no dia ${formatDatePtBR(selectedDate)} para ${selectedService?.name}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 bg-[#25D366] hover:bg-[#1EBE57] active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all"
                  >
                    <MessageSquare className="w-4 h-4 fill-white shrink-0" />
                    <span>Falar no WhatsApp para Encaixe</span>
                  </a>
                </div>
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="mt-8 pt-4 border-t border-[#E4EBE4] flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                id="btn-step2-next"
                disabled={!selectedTime || !selectedDate}
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-[#31523D] hover:bg-[#23372B] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center space-x-2"
              >
                <span>Avançar para Dados ({selectedTime ? `${selectedTime} hs` : 'Escolha um horário acima'})</span>
                <ChevronRight className="w-4 h-4 text-[#D0A73B]" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PATIENT INFORMATION */}
        {step === 3 && (
          <form onSubmit={handleSubmitBooking} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#C9D8CB]">
            <h3 className="text-lg font-bold text-[#23372B] mb-1">
              Seus Dados e Pagamento
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">
              Informe seu nome, WhatsApp e escolha a forma de pagamento desejada.
            </p>

            {/* Booking Summary Badge */}
            <div className="bg-[#F4F7F4] border border-[#C9D8CB] rounded-xl p-4 mb-5 space-y-1.5 text-xs text-[#23372B]">
              <div className="flex justify-between font-bold text-sm text-[#31523D]">
                <span>{selectedService?.name}</span>
                <span className="text-[#9E7F22]">{formatCurrency(selectedService?.price || 0)}</span>
              </div>
              <div className="flex items-center space-x-3 text-[#5F6D33] font-semibold">
                <span className="flex items-center space-x-1">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>{formatDatePtBR(selectedDate)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{selectedTime} hs</span>
                </span>
              </div>
            </div>

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#294232] uppercase tracking-wider mb-1">
                  Seu Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="input-patient-name"
                    type="text"
                    required
                    placeholder="Ex: Maria Silva"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#C9D8CB] focus:ring-2 focus:ring-[#5F6D33] text-sm text-slate-800 font-medium bg-[#F4F7F4]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#294232] uppercase tracking-wider mb-1">
                  WhatsApp / Celular (com DDD) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="input-patient-phone"
                    type="tel"
                    required
                    placeholder="(93) 99999-9999"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(formatPhoneMask(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#C9D8CB] focus:ring-2 focus:ring-[#5F6D33] text-sm text-slate-800 font-medium bg-[#F4F7F4]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#294232] uppercase tracking-wider mb-1">
                  Observações / Dores / Motivo (Opcional)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <textarea
                    id="input-patient-notes"
                    rows={2}
                    placeholder="Ex: Dor na coluna lombar, pós-operatório..."
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#C9D8CB] focus:ring-2 focus:ring-[#5F6D33] text-sm text-slate-800 font-medium bg-[#F4F7F4]/30"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-4 border-t border-[#E4EBE4]">
                <label className="block text-xs font-bold text-[#294232] uppercase tracking-wider mb-2">
                  Forma de Pagamento *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: PIX */}
                  <div
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMethod === 'pix'
                        ? 'bg-[#F5EED3]/80 border-[#D0A73B] shadow-2xs ring-2 ring-[#D0A73B]/40'
                        : 'bg-white border-[#C9D8CB] hover:border-[#5F6D33]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-1.5 rounded-lg bg-[#31523D] text-[#F5EED3]">
                        <QrCode className="w-4 h-4" />
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                        paymentMethod === 'pix' ? 'bg-[#31523D] text-[#D0A73B] border-[#31523D]' : 'border-slate-300'
                      }`}>
                        {paymentMethod === 'pix' && '✓'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#23372B]">PIX Instantâneo</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Chave Celular/E-mail</p>
                    </div>
                  </div>

                  {/* Option 2: Link de Cartão */}
                  <div
                    onClick={() => setPaymentMethod('card_link')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMethod === 'card_link'
                        ? 'bg-[#F5EED3]/80 border-[#D0A73B] shadow-2xs ring-2 ring-[#D0A73B]/40'
                        : 'bg-white border-[#C9D8CB] hover:border-[#5F6D33]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-1.5 rounded-lg bg-[#31523D] text-[#F5EED3]">
                        <CreditCard className="w-4 h-4" />
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                        paymentMethod === 'card_link' ? 'bg-[#31523D] text-[#D0A73B] border-[#31523D]' : 'border-slate-300'
                      }`}>
                        {paymentMethod === 'card_link' && '✓'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#23372B]">Link de Cartão</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Crédito ou Débito em até 12x</p>
                    </div>
                  </div>

                  {/* Option 3: Presencial */}
                  <div
                    onClick={() => setPaymentMethod('presencial')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMethod === 'presencial'
                        ? 'bg-[#F5EED3]/80 border-[#D0A73B] shadow-2xs ring-2 ring-[#D0A73B]/40'
                        : 'bg-white border-[#C9D8CB] hover:border-[#5F6D33]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-1.5 rounded-lg bg-[#31523D] text-[#F5EED3]">
                        <User className="w-4 h-4" />
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                        paymentMethod === 'presencial' ? 'bg-[#31523D] text-[#D0A73B] border-[#31523D]' : 'border-slate-300'
                      }`}>
                        {paymentMethod === 'presencial' && '✓'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#23372B]">Pagar na Clínica</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Na recepção no atendimento</p>
                    </div>
                  </div>
                </div>

                {/* Dynamic Payment Details Banner */}
                {paymentMethod === 'pix' && (
                  <div className="mt-3 p-3.5 bg-[#F4F7F4] rounded-xl border border-[#C9D8CB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-[#31523D] uppercase tracking-wide block">Chave PIX da Clínica:</span>
                      <p className="text-sm font-extrabold text-[#23372B]">93991265006 <span className="text-xs font-normal text-slate-500">(Dra. Elays Marinho)</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('93991265006');
                        setCopiedPix(true);
                        setTimeout(() => setCopiedPix(false), 2500);
                      }}
                      className="px-3.5 py-1.5 bg-[#23372B] hover:bg-[#31523D] text-[#F5EED3] text-xs font-bold rounded-lg flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5 text-[#D0A73B]" /> : <Copy className="w-3.5 h-3.5 text-[#D0A73B]" />}
                      <span>{copiedPix ? 'Chave Copiada!' : 'Copiar Chave PIX'}</span>
                    </button>
                  </div>
                )}

                {paymentMethod === 'card_link' && (
                  <div className="mt-3 p-3.5 bg-[#F4F7F4] rounded-xl border border-[#C9D8CB]">
                    <span className="text-[11px] font-bold text-[#31523D] uppercase tracking-wide block">Pagamento com Cartão via Link Seguro:</span>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Você pode pagar no cartão de crédito/débito online. O link seguro do Mercado Pago será gerado e enviado também no seu WhatsApp ao finalizar.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 Actions */}
            <div className="mt-8 pt-4 border-t border-[#E4EBE4] flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                id="btn-submit-booking"
                type="submit"
                disabled={submitting}
                className="px-6 py-3.5 rounded-xl font-bold text-sm bg-[#31523D] hover:bg-[#23372B] active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center space-x-2 transition-all cursor-pointer ring-2 ring-[#D0A73B]/50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D0A73B]" />
                    <span>Confirmando Agendamento...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#D0A73B]" />
                    <span>Garantir Meu Horário Agora</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: CONFIRMATION SCREEN */}
        {step === 4 && confirmedAppointment && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#C9D8CB] text-center">
            
            <div className="w-16 h-16 bg-[#F5EED3] text-[#9E7F22] border border-[#D0A73B]/40 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-serif font-extrabold text-[#23372B] tracking-tight">
              Agendamento Solicitado com Sucesso!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Seu horário está pré-reservado na agenda do <strong className="text-[#31523D]">{clinic.name}</strong>.
            </p>

            {/* Confirmation Ticket Card */}
            <div className="bg-[#F4F7F4] border border-[#C9D8CB] rounded-2xl p-5 my-6 text-left max-w-md mx-auto shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#C9D8CB] mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7E611D]">Comprovante de Pré-Agendamento</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E4EBE4] text-[#31523D] border border-[#769E82]/30">
                  RESERVADO
                </span>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Paciente:</span>
                  <span className="font-bold text-[#23372B]">{confirmedAppointment.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Serviço:</span>
                  <span className="font-bold text-[#31523D]">{confirmedAppointment.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data e Horário:</span>
                  <span className="font-bold text-[#23372B]">
                    {formatDatePtBR(confirmedAppointment.date)} às {confirmedAppointment.time} hs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor da Sessão:</span>
                  <span className="font-extrabold text-[#9E7F22]">{formatCurrency(confirmedAppointment.servicePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Forma de Pagamento:</span>
                  <span className="font-bold text-[#31523D]">
                    {confirmedAppointment.paymentMethod === 'pix' 
                      ? 'PIX Instantâneo' 
                      : confirmedAppointment.paymentMethod === 'card_link' 
                      ? 'Link de Cartão' 
                      : 'Presencial na Recepção'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#5F6D33]" />
                    <span>Endereço:</span>
                  </span>
                  <a
                    href={getClinicMapUrl(clinic.address, clinic.city)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#31523D] hover:text-[#23372B] hover:underline text-right flex items-center space-x-1"
                    title="Abrir no Google Maps"
                  >
                    <span>{clinic.address}</span>
                    <Navigation className="w-3.5 h-3.5 text-[#D0A73B]" />
                  </a>
                </div>
              </div>

              {/* Payment Action Block in Confirmation */}
              {(confirmedAppointment.paymentMethod === 'pix' || paymentMethod === 'pix') && (
                <div className="mt-4 pt-3 border-t border-[#C9D8CB] bg-[#F5EED3]/60 p-3 rounded-xl border border-[#D0A73B]/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#23372B] flex items-center space-x-1">
                      <QrCode className="w-4 h-4 text-[#31523D]" />
                      <span>Chave PIX da Clínica:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('93991265006');
                        setCopiedPix(true);
                        setTimeout(() => setCopiedPix(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-[#31523D] text-[#F5EED3] text-[11px] font-bold rounded-lg hover:bg-[#23372B] transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-3 h-3 text-[#D0A73B]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar Chave'}</span>
                    </button>
                  </div>
                  <p className="text-sm font-extrabold text-[#31523D]">93991265006 <span className="text-xs font-normal text-slate-600">(Celular)</span></p>
                  <p className="text-[11px] text-[#7E611D] mt-1 italic">
                    Realize o PIX e envie o comprovante clicando no botão do WhatsApp abaixo para confirmação imediata.
                  </p>
                </div>
              )}

              {(confirmedAppointment.paymentMethod === 'card_link' || paymentMethod === 'card_link') && (
                <div className="mt-4 pt-3 border-t border-[#C9D8CB] bg-[#F4F7F4] p-3 rounded-xl border border-[#C9D8CB]">
                  <span className="text-xs font-bold text-[#23372B] flex items-center space-x-1 mb-1">
                    <CreditCard className="w-4 h-4 text-[#31523D]" />
                    <span>Link de Pagamento no Cartão:</span>
                  </span>
                  <a
                    href="https://link.mercadopago.com.br/fisiolys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-bold text-[#31523D] bg-[#F5EED3] border border-[#D0A73B] px-3 py-1.5 rounded-lg hover:bg-[#EBDC9C] transition-all"
                  >
                    <span>Pagar com Cartão (Mercado Pago)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Webhook notification pill */}
              <div className="mt-4 pt-3 border-t border-[#C9D8CB] text-[11px] flex items-center justify-between text-slate-500">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5F6D33]" />
                  <span>Notificação da Clínica:</span>
                </span>
                <span className={`font-semibold ${webhookStatus ? 'text-[#31523D]' : 'text-slate-500'}`}>
                  {webhookStatus ? 'Enviada ao Gestor' : 'Registrada no Sistema'}
                </span>
              </div>
            </div>

            {/* Direct WhatsApp Confirmation Button */}
            <div className="space-y-3 max-w-md mx-auto">
              <button
                id="btn-whatsapp-confirm"
                onClick={handleOpenWhatsAppConfirmation}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#31523D] hover:bg-[#23372B] text-white shadow-md flex items-center justify-center space-x-2 transition-all border border-[#D0A73B]/40"
              >
                <Send className="w-4 h-4 text-[#D0A73B]" />
                <span>Enviar Confirmação no WhatsApp da Clínica</span>
              </button>

              <button
                onClick={() => {
                  setStep(1);
                  setSelectedService(null);
                  setSelectedTime('');
                  setConfirmedAppointment(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Fazer Outro Agendamento
              </button>
            </div>

          </div>
        )}

        {/* App Download QR Code Section */}
        <DownloadAppQRSection clinicName={clinic.name} />

        {/* Patient Testimonials & 5-Star Reviews Section */}
        <TestimonialsSection />

      </div>
    </div>
  );
};
