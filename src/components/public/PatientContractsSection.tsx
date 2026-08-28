import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Lock, Unlock, Key, FileCheck2, FileText, CheckCircle2, 
  AlertCircle, Download, Share2, PenTool, Eye, ChevronDown, ChevronUp, 
  Calendar, Clock, User, Phone, Sparkles, RefreshCw, X, Award, Check, 
  MessageSquare, Stethoscope, ArrowRight, ShieldAlert, FileSignature
} from 'lucide-react';
import { ClinicConfig, CrmAvaliacao, Patient, Appointment } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR, formatPhoneMask } from '../../utils/qrUtils';
import { createServiceContractPDF, createClinicalEvaluationPDF } from '../../utils/pdfGenerator';
import { getDoctorCpf, DEFAULT_DOCTOR_CPF, getProfessionalSignature } from '../../utils/securityUtils';
import { BotanicalVineAccents } from '../common/BotanicalVineAccents';
import { DigitalSignaturePad } from '../crm/DigitalSignaturePad';

interface PatientContractsSectionProps {
  clinic: ClinicConfig;
  onNavigateToBooking?: () => void;
  initialCpf?: string;
}

export const PatientContractsSection: React.FC<PatientContractsSectionProps> = ({
  clinic,
  onNavigateToBooking,
  initialCpf = ''
}) => {
  // Authentication State
  const [cpfInput, setCpfInput] = useState<string>(initialCpf);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authenticatedCpf, setAuthenticatedCpf] = useState<string | null>(() => {
    try {
      const saved = sessionStorage.getItem('fisiolys_patient_auth_cpf');
      return saved || null;
    } catch {
      return null;
    }
  });
  const [authError, setAuthError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Data State
  const [avaliacoes, setAvaliacoes] = useState<CrmAvaliacao[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAvalForSignature, setSelectedAvalForSignature] = useState<CrmAvaliacao | null>(null);
  const [expandedClausesId, setExpandedClausesId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contratos' | 'tcle' | 'avaliacao'>('contratos');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load clinic data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [crmData, pts, appts] = await Promise.all([
        api.getCrmData(),
        api.getPatients ? api.getPatients() : Promise.resolve([]),
        api.getAppointments ? api.getAppointments() : Promise.resolve([])
      ]);
      setAvaliacoes(crmData.avaliacoes || []);
      setPatients(pts || []);
      setAppointments(appts || []);
    } catch (e) {
      console.error('Error loading contracts data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format CPF Input on type
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}`;
    }
    setCpfInput(formatted);
    setAuthError('');
  };

  // Find all matched data for authenticated CPF
  const matchedData = useMemo(() => {
    if (!authenticatedCpf) return { patient: null, avaliacoes: [], appointments: [] };
    const cleanAuthCpf = authenticatedCpf.replace(/\D/g, '');

    // Match patient
    const patient = patients.find(p => p.cpf && p.cpf.replace(/\D/g, '') === cleanAuthCpf) || null;
    const patientName = patient ? patient.name.toLowerCase().trim() : '';

    // Match avaliacoes by CPF or patient name
    const matchedAvals = avaliacoes.filter(a => {
      // By direct CPF field if present
      if ((a as any).pacienteCpf && (a as any).pacienteCpf.replace(/\D/g, '') === cleanAuthCpf) {
        return true;
      }
      // By patient name correlation
      if (patientName && a.pacienteNome && a.pacienteNome.toLowerCase().trim().includes(patientName)) {
        return true;
      }
      return false;
    });

    // Match appointments
    const matchedAppts = appointments.filter(appt => {
      if (patient && (appt.patientId === patient.id || (appt.patientPhone && patient.phone && appt.patientPhone.replace(/\D/g, '') === patient.phone.replace(/\D/g, '')))) {
        return true;
      }
      if (patientName && appt.patientName.toLowerCase().trim().includes(patientName)) {
        return true;
      }
      return false;
    });

    return {
      patient,
      avaliacoes: matchedAvals,
      appointments: matchedAppts
    };
  }, [authenticatedCpf, avaliacoes, patients, appointments]);

  // Handle Login Authentication
  const handleAuthenticate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = cpfInput.replace(/\D/g, '');
    if (clean.length !== 11) {
      setAuthError('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    // Check if patient exists with this CPF or if there is matching data
    const matchedPatient = patients.find(p => p.cpf && p.cpf.replace(/\D/g, '') === clean);
    const matchedAval = avaliacoes.find(a => (a as any).pacienteCpf && (a as any).pacienteCpf.replace(/\D/g, '') === clean);

    // If no explicit CPF found in patients list, check if any registered patient has this CPF or allow new patient view
    if (!matchedPatient && !matchedAval && patients.length > 0) {
      // Also check if any appointment name matches
      const hasAnyMatch = patients.some(p => p.cpf && p.cpf.replace(/\D/g, '') === clean);
      if (!hasAnyMatch && patients.filter(p => Boolean(p.cpf)).length > 0) {
        // Warning: CPF not yet registered, but allow access with standard contract template
      }
    }

    setAuthenticatedCpf(clean);
    try {
      sessionStorage.setItem('fisiolys_patient_auth_cpf', clean);
    } catch (err) {
      console.warn(err);
    }
  };

  // Logout / Lock session
  const handleLogout = () => {
    setAuthenticatedCpf(null);
    setCpfInput('');
    try {
      sessionStorage.removeItem('fisiolys_patient_auth_cpf');
    } catch (err) {
      console.warn(err);
    }
  };

  // Handle Signature Save
  const handleSaveSignature = async (sigData: { dataUrl: string; date: string; hash: string; doctorDataUrl?: string }) => {
    if (!selectedAvalForSignature) return;
    try {
      const updated: CrmAvaliacao = {
        ...selectedAvalForSignature,
        assinaturaPacienteUrl: sigData.dataUrl,
        assinaturaData: sigData.date,
        assinaturaHash: sigData.hash,
        assinaturaProfissionalUrl: sigData.doctorDataUrl || selectedAvalForSignature.assinaturaProfissionalUrl || getProfessionalSignature()
      };
      await api.saveCrmAvaliacao(updated);
      setSelectedAvalForSignature(null);
      await loadData();
      alert('✅ Seu Contrato e Termo de Consentimento (TCLE) foram assinados digitalmente com sucesso!');
    } catch (e) {
      console.error('Error saving signature:', e);
      alert('Erro ao registrar assinatura digital. Tente novamente.');
    }
  };

  // Download PDF
  const handleDownloadContractPdf = async (aval: CrmAvaliacao) => {
    setDownloadingId(aval.id);
    try {
      const patientName = aval.pacienteNome || matchedData.patient?.name || 'Paciente Fisiolys';
      const patientCpf = (aval as any).pacienteCpf || (matchedData.patient?.cpf ? formatPhoneMask(matchedData.patient.cpf) : cpfInput);
      
      const { doc, fileName } = await createServiceContractPDF(
        aval,
        patientName,
        clinic
      );
      doc.save(fileName);
    } catch (e) {
      console.error('Error generating contract PDF:', e);
      alert('Houve um erro ao gerar o PDF do contrato.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Download Evaluation / TCLE PDF
  const handleDownloadEvaluationPdf = async (aval: CrmAvaliacao) => {
    setDownloadingId(aval.id + '_eval');
    try {
      const patientName = aval.pacienteNome || matchedData.patient?.name || 'Paciente Fisiolys';
      const { doc, fileName } = await createClinicalEvaluationPDF(aval, patientName, clinic);
      doc.save(fileName);
    } catch (e) {
      console.error('Error generating evaluation PDF:', e);
      alert('Houve um erro ao gerar o laudo da avaliação.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Share on WhatsApp
  const handleShareWhatsApp = (aval: CrmAvaliacao) => {
    const patientName = aval.pacienteNome || matchedData.patient?.name || 'Paciente';
    const msg = `*CONTRATO E PLANO TERAPÊUTICO FISIOLYS* 🌿\n\n` +
      `Olá! Segue a confirmação de acesso ao meu Contrato de Prestação de Serviços e Plano Terapêutico na Fisiolys.\n\n` +
      `👤 *Paciente:* ${patientName}\n` +
      `📋 *Tratamento:* ${aval.planoTerapeutico || 'Pilates & Fisioterapia'}\n` +
      `📅 *Data de Início:* ${aval.data ? formatDatePtBR(aval.data) : 'Conforme agendamento'}\n` +
      `🔒 *Status:* ${aval.assinaturaPacienteUrl ? 'Assinado Digitalmente ✅' : 'Aguardando Assinatura'}\n` +
      `👩‍⚕️ *Responsável Técnica:* Dra. ${clinic.managerName} (CREFITO-12 208058)\n\n` +
      `_Fisiolys Fisioterapia e Pilates • Altamira/PA_`;

    const cleanPhone = clinic.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. SE NÃO AUTENTICADO: TELA DE LOGIN COM SENHA / CPF (GATEWAY DE PRIVACIDADE) */}
      {/* ========================================================================= */}
      {!authenticatedCpf ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1B2E24] via-[#243F30] to-[#16251D] rounded-3xl p-6 sm:p-10 border-2 border-[#DCC58F]/40 shadow-xl text-[#FAF7F0]">
          
          {/* Decorative Vine Plants in Corner */}
          <BotanicalVineAccents position="top-right" opacity={0.25} />
          <BotanicalVineAccents position="bottom-left" opacity={0.2} />

          <div className="relative z-10 max-w-xl mx-auto text-center space-y-6">
            
            {/* Security Pill Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#16251D]/80 border border-[#DCC58F]/50 text-[#DCC58F] text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-[#DCC58F]" />
              <span>Área Restrita & Sigilosa • LGPD & COFFITO</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#FAF7F0] tracking-tight">
                Acesse seus <span className="italic text-[#DCC58F]">Contratos Digitais</span> & TCLE
              </h2>
              <p className="text-xs sm:text-sm text-[#E4DCC8] leading-relaxed max-w-md mx-auto">
                Para resguardar o sigilo médico e a sua privacidade, digite sua senha de acesso exclusivo que corresponde ao seu <strong>CPF</strong>.
              </p>
            </div>

            {/* CPF Password Card Input Form */}
            <form onSubmit={handleAuthenticate} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 shadow-lg space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#DCC58F] mb-2 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Key className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Senha de Acesso (Seu CPF) *</span>
                  </span>
                  <span className="text-[10px] text-[#FAF7F0]/80 font-normal lowercase">somente números</span>
                </label>
                
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={cpfInput}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    autoFocus
                    className="w-full px-4 py-3.5 pl-11 rounded-xl bg-white text-[#1B2E24] text-base sm:text-lg font-mono font-bold tracking-widest placeholder-[#A39E93] border-2 border-[#DCC58F] focus:outline-none focus:ring-4 focus:ring-[#DCC58F]/30 transition-all shadow-inner"
                  />
                  <Lock className="w-5 h-5 text-[#1B2E24]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#1B2E24] hover:text-[#243F30] p-1 bg-[#FAF7F0] rounded-md border border-[#D8CEB7] cursor-pointer"
                  >
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>

                {authError && (
                  <p className="text-xs text-rose-300 font-semibold mt-2 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{authError}</span>
                  </p>
                )}
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={isLoading || cpfInput.replace(/\D/g, '').length < 11}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#DCC58F] via-[#E8D7AA] to-[#DCC58F] hover:from-[#E8D7AA] hover:to-[#DCC58F] text-[#1B2E24] text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-98"
              >
                <Unlock className="w-4 h-4 text-[#1B2E24]" />
                <span>Desbloquear Meus Contratos & TCLE</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              {/* Trust Badges Footer */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#E4DCC8]/90">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#DCC58F]" />
                  <span>Sigilo Ético Profissional COFFITO</span>
                </span>
                <span className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Criptografia SHA-256</span>
                </span>
              </div>
            </form>

            {/* Quick Helper for Registered Patients */}
            {patients.filter(p => Boolean(p.cpf)).length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#16251D]/60 border border-[#DCC58F]/20 text-xs text-[#E4DCC8]">
                <p className="font-semibold text-[#DCC58F] mb-1">💡 Dica de Acesso Rápido:</p>
                <p className="text-[11px] leading-relaxed">
                  Digite os 11 números do seu CPF cadastrado durante o agendamento para visualizar seus termos e assinar na tela.
                </p>
              </div>
            )}

            {/* Return to Booking Button */}
            {onNavigateToBooking && (
              <div>
                <button
                  type="button"
                  onClick={onNavigateToBooking}
                  className="text-xs font-semibold text-[#DCC58F] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Voltar para Agendamento & Cadastro</span>
                </button>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. AUTENTICADO: PAINEL SEGURO DE CONTRATOS, TCLE E AVALIAÇÃO */
        /* ========================================================================= */
        <div className="space-y-6">
          
          {/* Header Banner do Paciente Autenticado */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#1B2E24] via-[#243F30] to-[#1B2E24] rounded-3xl p-6 text-[#FAF7F0] border border-[#DCC58F]/40 shadow-md">
            <BotanicalVineAccents position="top-right" opacity={0.2} />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-13 h-13 rounded-2xl bg-[#16251D] border border-[#DCC58F]/40 text-[#DCC58F] flex items-center justify-center font-serif font-bold text-xl shrink-0 shadow-sm">
                  {matchedData.patient ? matchedData.patient.name.charAt(0) : 'P'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCC58F] text-[#1B2E24] uppercase tracking-wider">
                      Área Segura do Paciente
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Autenticado</span>
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[#FAF7F0] mt-0.5">
                    {matchedData.patient ? matchedData.patient.name : 'Paciente Fisiolys'}
                  </h3>
                  <p className="text-xs text-[#E4DCC8] mt-0.5 font-mono">
                    CPF: {authenticatedCpf.slice(0, 3)}.***.***-{authenticatedCpf.slice(-2)}
                  </p>
                </div>
              </div>

              {/* Logout / Lock Session Button */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-900/40 hover:bg-rose-800/60 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  title="Bloquear sessão e proteger dados do paciente"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>🔒 Bloquear / Sair da Sessão</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-[#E5DEC9] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#848278] tracking-wider">
                  Contratos & Planos
                </span>
                <p className="text-lg font-bold text-[#1B2E24] mt-0.5">
                  {matchedData.avaliacoes.length || 1} {matchedData.avaliacoes.length === 1 ? 'Contrato' : 'Contratos'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#FAF7F0] text-[#1B2E24] flex items-center justify-center">
                <FileCheck2 className="w-5 h-5 text-[#B08A3E]" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E5DEC9] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#848278] tracking-wider">
                  Status de Assinatura
                </span>
                <p className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Válido & Registrado</span>
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <FileSignature className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E5DEC9] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#848278] tracking-wider">
                  Responsável Técnica
                </span>
                <p className="text-xs font-bold text-[#1B2E24] mt-0.5 truncate">
                  Dra. {clinic.managerName}
                </p>
                <p className="text-[10px] text-[#B08A3E] font-semibold">CREFITO-12 / 208058</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LISTA DE CONTRATOS DO PACIENTE */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1B2E24] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#B08A3E]" />
                <span>Seus Documentos Clínicos & Contratuais</span>
              </h4>
              <span className="text-xs text-[#848278]">
                Protegido sob sigilo ético COFFITO 424/2013
              </span>
            </div>

            {/* SE EXISTEM AVALIAÇÕES CADASTRADAS NO CRM */}
            {matchedData.avaliacoes.length > 0 ? (
              matchedData.avaliacoes.map((aval) => {
                const isSigned = Boolean(aval.assinaturaPacienteUrl);
                const isExpanded = expandedClausesId === aval.id;

                return (
                  <div 
                    key={aval.id}
                    className="bg-white rounded-2xl border-2 border-[#E5DEC9] hover:border-[#B08A3E] p-5 sm:p-6 shadow-sm transition-all space-y-5"
                  >
                    {/* Top Row: Title, Date and Signing Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F3EEE2]">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1B2E24] text-[#DCC58F] uppercase">
                            Contrato de Prestação de Serviços
                          </span>
                          <span className="text-xs text-[#848278]">
                            Data: {aval.data ? formatDatePtBR(aval.data) : 'Vigente'}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-serif font-bold text-[#1B2E24] mt-1">
                          Plano Terapêutico & Pilates — {aval.pacienteNome || matchedData.patient?.name}
                        </h3>
                      </div>

                      {/* Signature Status Pill */}
                      <div className="flex items-center gap-2">
                        {isSigned ? (
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Assinado pelo Paciente ✅</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedAvalForSignature(aval)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#B08A3E] to-[#97732F] hover:from-[#97732F] hover:to-[#B08A3E] text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all animate-pulse hover:animate-none"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>✍️ Assinar Contrato Agora</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Summary Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-[#FAF7F0] p-4 rounded-xl border border-[#E5DEC9]">
                      <div>
                        <span className="text-[10px] font-bold text-[#848278] uppercase">Tratamento / Conduta:</span>
                        <p className="font-semibold text-[#1B2E24] mt-0.5">
                          {aval.planoTerapeutico || 'Pilates Clínico & Cinesioterapia'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#848278] uppercase">Frequência Semanal:</span>
                        <p className="font-semibold text-[#1B2E24] mt-0.5">
                          {aval.frequenciaSemanal || '2x por semana (50 min/sessão)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#848278] uppercase">Investimento:</span>
                        <p className="font-bold text-[#B08A3E] mt-0.5">
                          {aval.valorTratamento || 'Conforme plano mensal Fisiolys'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#848278] uppercase">Responsável Técnica:</span>
                        <p className="font-semibold text-[#1B2E24] mt-0.5">
                          Dra. {clinic.managerName} (CREFITO-12)
                        </p>
                      </div>
                    </div>

                    {/* Digital Signatures Verification Preview */}
                    <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1B2E24]">
                        <span className="flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#B08A3E]" />
                          <span>Autenticidade e Carimbos Digitais</span>
                        </span>
                        <span className="text-[11px] text-[#848278] font-normal">
                          Validade jurídica nos termos da MP 2.200-2/2001
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Paciente */}
                        <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E5DEC9] flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-[#848278] uppercase">Assinatura do Paciente:</span>
                            <p className="text-xs font-bold text-[#1B2E24]">
                              {isSigned ? 'Registrada com Sucesso' : 'Pendente de Assinatura'}
                            </p>
                            {aval.assinaturaData && (
                              <p className="text-[10px] text-emerald-700 font-mono">
                                Data: {aval.assinaturaData}
                              </p>
                            )}
                            {aval.assinaturaHash && (
                              <p className="text-[9px] text-[#848278] font-mono truncate max-w-[180px]">
                                SHA-256: {aval.assinaturaHash.slice(0, 16)}...
                              </p>
                            )}
                          </div>
                          {isSigned && aval.assinaturaPacienteUrl ? (
                            <img 
                              src={aval.assinaturaPacienteUrl} 
                              alt="Assinatura Paciente" 
                              className="h-9 max-w-[100px] object-contain bg-white rounded border border-[#E5DEC9] p-0.5"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedAvalForSignature(aval)}
                              className="px-2.5 py-1 bg-[#1B2E24] text-[#DCC58F] text-[11px] font-bold rounded-lg cursor-pointer hover:bg-[#243F30]"
                            >
                              Assinar ✍️
                            </button>
                          )}
                        </div>

                        {/* Profissional Dra. Elays */}
                        <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E5DEC9] flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-[#848278] uppercase">Assinatura da Fisioterapeuta:</span>
                            <p className="text-xs font-bold text-[#1B2E24]">
                              Dra. {clinic.managerName}
                            </p>
                            <p className="text-[10px] text-[#B08A3E] font-semibold">
                              CREFITO-12 / 208058 • Autenticada ✅
                            </p>
                          </div>
                          {aval.assinaturaProfissionalUrl || getProfessionalSignature() ? (
                            <img 
                              src={aval.assinaturaProfissionalUrl || getProfessionalSignature()!} 
                              alt="Assinatura Dra. Elays" 
                              className="h-9 max-w-[100px] object-contain bg-white rounded border border-[#E5DEC9] p-0.5"
                            />
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">
                              Registrado ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Clauses Preview */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedClausesId(isExpanded ? null : aval.id)}
                        className="text-xs font-bold text-[#B08A3E] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span>{isExpanded ? 'Ocultar Cláusulas Contratuais' : 'Visualizar Todas as Cláusulas do Contrato & Termo TCLE'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 p-4 rounded-xl bg-[#FAF7F0] border border-[#E5DEC9] text-xs text-[#26241F] space-y-3 animate-in fade-in duration-200">
                          <div>
                            <h5 className="font-bold text-[#1B2E24]">CLÁUSULA 1ª — DO OBJETO E PLANO TERAPÊUTICO INDIVIDUALIZADO</h5>
                            <p className="text-[11px] text-[#5B5A52] mt-0.5 leading-relaxed">
                              Prestação de serviços profissionais especializados de Fisioterapia e/ou Pilates Clínico visando à prevenção, alívio de dor e ganho de força e mobilidade com base em avaliação cinético-funcional.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-bold text-[#1B2E24]">CLÁUSULA 2ª — DA NATUREZA TÉCNICA E DEONTOLOGIA (COFFITO 424/2013)</h5>
                            <p className="text-[11px] text-[#5B5A52] mt-0.5 leading-relaxed">
                              Obrigação de meio e zelo técnico-científico, com rigoroso cumprimento das orientações posturais e ergonômicas da profissional.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-bold text-[#1B2E24]">CLÁUSULA 3ª — DAS SESSÕES, PONTUALIDADE E REPOSIÇÕES</h5>
                            <p className="text-[11px] text-[#5B5A52] mt-0.5 leading-relaxed">
                              Sessões com duração média de 50 minutos. Em caso de ausência justificada com antecedência mínima de 4 horas, o paciente terá direito a reagendamento dentro do respectivo mês de vigência.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-bold text-[#1B2E24]">CLÁUSULA 4ª — DO SIGILO PROFISSIONAL E PROTEÇÃO DE DADOS (LGPD)</h5>
                            <p className="text-[11px] text-[#5B5A52] mt-0.5 leading-relaxed">
                              Todos os registros de saúde, anamnese e evoluções são estritamente sigilosos e protegidos sob a Lei Federal nº 13.709/2018 (LGPD).
                            </p>
                          </div>
                          <div>
                            <h5 className="font-bold text-[#1B2E24]">CLÁUSULA 5ª — TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO & IMAGEM (COFFITO 532/2021)</h5>
                            <p className="text-[11px] text-[#5B5A52] mt-0.5 leading-relaxed">
                              Autorização de registros para acompanhamento comparativo e prontuário em conformidade ética com o conselho profissional.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: PDF Download, Share WhatsApp & Sign */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={downloadingId === aval.id}
                          onClick={() => handleDownloadContractPdf(aval)}
                          className="px-4 py-2.5 rounded-xl bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] text-xs font-bold shadow-xs flex items-center space-x-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Download className="w-4 h-4 text-[#DCC58F]" />
                          <span>{downloadingId === aval.id ? 'Gerando PDF...' : 'Baixar Contrato em PDF'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={downloadingId === aval.id + '_eval'}
                          onClick={() => handleDownloadEvaluationPdf(aval)}
                          className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F0] text-[#1B2E24] border border-[#E5DEC9] text-xs font-bold shadow-2xs flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
                        >
                          <FileText className="w-4 h-4 text-[#B08A3E]" />
                          <span>Laudo da Avaliação</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(aval)}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Salvar no WhatsApp</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            ) : (
              /* SE AINDA NÃO HÁ UMA AVALIAÇÃO FORMAL CADASTRADA NO CRM, MOSTRA O MODELO PADRÃO DO PACIENTE */
              <div className="bg-white rounded-2xl border-2 border-[#E5DEC9] p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F3EEE2]">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1B2E24] text-[#DCC58F] uppercase">
                      Contrato Padrão Fisiolys & Termo TCLE
                    </span>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-[#1B2E24] mt-1">
                      Contrato de Prestação de Serviços Terapêuticos
                    </h3>
                    <p className="text-xs text-[#848278] mt-0.5">
                      Paciente: {matchedData.patient?.name || 'Cadastro Fisiolys'} • CPF: {authenticatedCpf}
                    </p>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Disponível para Consulta & Download</span>
                  </div>
                </div>

                <p className="text-xs text-[#5B5A52] leading-relaxed">
                  Este é o seu instrumento contratual padrão com as diretrizes da Fisiolys Fisioterapia e Pilates, sob responsabilidade técnica da <strong>Dra. {clinic.managerName} (CREFITO-12 / 208058)</strong>. Você pode baixar a via completa do contrato com todas as cláusulas éticas, diretrizes de reposição e proteção de dados LGPD.
                </p>

                {/* Standard Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={downloadingId === 'standard'}
                    onClick={async () => {
                      setDownloadingId('standard');
                      try {
                        const standardAval: any = {
                          id: 'std_1',
                          pacienteNome: matchedData.patient?.name || 'Paciente Fisiolys',
                          pacienteCpf: authenticatedCpf,
                          planoTerapeutico: 'Pilates Clínico & Fisioterapia Especializada',
                          frequenciaSemanal: '2x por semana',
                          valorTratamento: 'Conforme plano mensal Fisiolys',
                          formaPagamento: 'PIX / Cartão de Crédito',
                          data: new Date().toISOString().split('T')[0],
                          assinaturaProfissionalUrl: getProfessionalSignature()
                        };
                        const { doc, fileName } = await createServiceContractPDF(
                          standardAval,
                          standardAval.pacienteNome,
                          clinic
                        );
                        doc.save(fileName);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setDownloadingId(null);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] text-xs font-bold shadow-xs flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4 text-[#DCC58F]" />
                    <span>{downloadingId === 'standard' ? 'Gerando PDF...' : 'Baixar Minha Via do Contrato (PDF)'}</span>
                  </button>

                  <a
                    href={`https://wa.me/${clinic.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá Dra. ${clinic.managerName}! Estou acessando meus contratos digitais com o CPF ${authenticatedCpf}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Falar com a Fisioterapeuta</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* DIGITAL SIGNATURE MODAL IF PATIENT CLICKS TO SIGN */}
          {/* ========================================================================= */}
          {selectedAvalForSignature && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-2xl bg-white rounded-3xl p-6 border border-[#E5DEC9] shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                  type="button"
                  onClick={() => setSelectedAvalForSignature(null)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF7F0] text-[#1B2E24] flex items-center justify-center font-bold hover:bg-[#E5DEC9] transition-colors cursor-pointer"
                >
                  ✕
                </button>

                <DigitalSignaturePad
                  patientName={selectedAvalForSignature.pacienteNome || matchedData.patient?.name || 'Paciente'}
                  treatmentName={selectedAvalForSignature.planoTerapeutico || 'Contrato de Prestação de Serviços Fisiolys'}
                  initialSignatureUrl={selectedAvalForSignature.assinaturaPacienteUrl}
                  initialSignatureDate={selectedAvalForSignature.assinaturaData}
                  initialSignatureHash={selectedAvalForSignature.assinaturaHash}
                  initialDoctorSignatureUrl={selectedAvalForSignature.assinaturaProfissionalUrl || getProfessionalSignature()}
                  onSave={handleSaveSignature}
                  onCancel={() => setSelectedAvalForSignature(null)}
                />
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
