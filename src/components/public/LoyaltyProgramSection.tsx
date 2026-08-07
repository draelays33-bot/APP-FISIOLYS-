import React, { useState, useEffect } from 'react';
import { LoyaltyMember } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR } from '../../utils/qrUtils';
import {
  Crown,
  Sparkles,
  Users,
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  HeartHandshake,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Gift,
  BadgeCheck,
  UserCheck,
  HelpCircle,
  X,
  FileText,
  User,
  MapPin,
  Mail,
  Phone,
  Copy,
  Check
} from 'lucide-react';
import { LoyaltyCard } from './LoyaltyCard';

interface LoyaltyProgramSectionProps {
  clinicPhone?: string;
}

export const LoyaltyProgramSection: React.FC<LoyaltyProgramSectionProps> = ({ clinicPhone = '5593991265006' }) => {
  const [queryInput, setQueryInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [queriedMember, setQueriedMember] = useState<LoyaltyMember | null>(null);

  // Modal State for In-App Registration
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [regError, setRegError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState<LoyaltyMember | null>(null);

  // Registration Form Fields
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Recurring Card vs PIX state
  const [paymentMethod, setPaymentMethod] = useState<'cartao_recorrente' | 'pix'>('cartao_recorrente');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const pixKey = "5593991265006";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fidelidade') === 'recorrente') {
      const preName = params.get('nome') || '';
      const prePhone = params.get('phone') || '';
      if (preName) setFormName(preName);
      if (prePhone) setFormPhone(prePhone);
      setPaymentMethod('cartao_recorrente');
      setIsRegisterModalOpen(true);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    setSearching(true);
    setSearchError('');
    setQueriedMember(null);

    try {
      const member = await api.queryLoyaltyMember(queryInput.trim());
      setQueriedMember(member);
    } catch (err: any) {
      setSearchError(err.message || 'Nenhum plano encontrado com esses dados. Verifique seu telefone ou CPF.');
    } finally {
      setSearching(false);
    }
  };

  const handleOpenRegisterModal = () => {
    setIsRegisterModalOpen(true);
    setRegError('');
    setRegistrationSuccess(null);
  };

  const handleCloseModal = () => {
    setIsRegisterModalOpen(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!formName.trim()) {
      setRegError('Por favor, informe seu nome completo.');
      return;
    }
    if (!formAddress.trim()) {
      setRegError('Por favor, informe seu endereço.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setRegError('Por favor, informe um e-mail válido.');
      return;
    }
    if (!formPhone.trim()) {
      setRegError('Por favor, informe seu número de WhatsApp/Telefone.');
      return;
    }
    if (!acceptedTerms) {
      setRegError('Você precisa aceitar os termos do Regime de Vantagens do Clube para continuar.');
      return;
    }

    if (paymentMethod === 'cartao_recorrente') {
      if (!cardHolderName.trim()) {
        setRegError('Por favor, informe o nome impresso no cartão de crédito.');
        return;
      }
      if (!cardNumber.trim() || cardNumber.replace(/\D/g, '').length < 13) {
        setRegError('Por favor, informe um número de cartão de crédito válido.');
        return;
      }
      if (!cardExpiry.trim()) {
        setRegError('Por favor, informe a validade do cartão (MM/AA).');
        return;
      }
      if (!cardCvv.trim() || cardCvv.trim().length < 3) {
        setRegError('Por favor, informe o código de segurança (CVV).');
        return;
      }
    }

    setSubmitting(true);

    try {
      let newMember: LoyaltyMember;
      if (paymentMethod === 'cartao_recorrente') {
        const result = await api.subscribeRecurringCard({
          patientName: formName.trim(),
          patientAddress: formAddress.trim(),
          patientEmail: formEmail.trim(),
          patientPhone: formPhone.trim(),
          patientCpf: formCpf.trim() || undefined,
          cardHolderName: cardHolderName.trim(),
          cardNumber: cardNumber.trim(),
          cardExpiry: cardExpiry.trim(),
          cardCvv: cardCvv.trim()
        });
        newMember = result.member;
      } else {
        newMember = await api.createLoyaltyMember({
          patientName: formName.trim(),
          patientAddress: formAddress.trim(),
          patientEmail: formEmail.trim(),
          patientPhone: formPhone.trim(),
          patientCpf: formCpf.trim() || undefined,
          monthlyFee: 99,
          acceptedTerms: true,
        });
      }

      setRegistrationSuccess(newMember);
      setQueriedMember(newMember);
      setQueryInput(newMember.patientPhone);
    } catch (err: any) {
      setRegError(err.message || 'Ocorreu um erro ao realizar seu cadastro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleNotifyWhatsApp = () => {
    if (!registrationSuccess) return;
    const isRec = registrationSuccess.recurringBilling;
    const msg = encodeURIComponent(
      `Olá Dra. Elays! Acabei de me cadastrar no *Clube de Vantagens Fisiolys* pelo APP!\n\n` +
      `👤 *Nome:* ${registrationSuccess.patientName}\n` +
      `📱 *WhatsApp:* ${registrationSuccess.patientPhone}\n` +
      `🏠 *Endereço:* ${registrationSuccess.patientAddress || 'Não informado'}\n` +
      `📧 *E-mail:* ${registrationSuccess.patientEmail || 'Não informado'}\n` +
      `💳 *Forma de Pagamento:* ${isRec ? `Cartão Recorrente R$ 99/mês (${registrationSuccess.cardBrand || 'Cartão'} final ${registrationSuccess.cardLast4 || '****'})` : 'PIX Manual R$ 99'}\n\n` +
      (isRec 
        ? `Minha cobrança recorrente mensal no cartão foi ativada com sucesso e meu saldo de R$ 99,00 já está disponível!`
        : `Gostaria de confirmar o pagamento do meu 1º PIX de R$ 99,00 para ativar meu saldo.`)
    );
    window.open(`https://wa.me/${clinicPhone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  return (
    <section id="programa-fidelidade" className="my-8 space-y-6">
      {/* Banner Principal do Programa de Fidelidade */}
      <div className="bg-gradient-to-br from-[#23372B] via-[#31523D] to-[#1B2B22] text-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-[#D0A73B]/50 relative overflow-hidden">
        {/* Glow & Sparkle accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D0A73B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#5F6D33]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Title Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D0A73B]/30 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D0A73B] to-[#F5EED3] text-[#23372B] flex items-center justify-center shadow-md font-extrabold shrink-0">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <span className="inline-flex items-center space-x-1 bg-[#D0A73B]/20 text-[#F5EED3] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#D0A73B]/40 mb-1">
                  <Sparkles className="w-3 h-3 text-[#D0A73B]" />
                  <span>Clube de Vantagens Fisiolys</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-extrabold text-[#F5EED3] tracking-tight">
                  Programa de Fidelidade Recorrente
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Mensalidade</span>
              <span className="text-2xl font-black text-[#D0A73B]">R$ 99<span className="text-xs font-normal text-slate-200">/mês</span></span>
            </div>
          </div>

          {/* Description Paragraph */}
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium max-w-2xl">
            Cuidar da saúde e prevenção com continuidade ficou ainda mais fácil! Com a assinatura mensal de <strong className="text-[#D0A73B]">R$ 99,00</strong>, 
            100% do seu valor mensal é convertido em <strong className="text-white">crédito acumulativo</strong> para realizar sessões de Pilates, Fisioterapia, Massoterapia e avaliações.
          </p>

          {/* 4 Main Benefits Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Benefit 1 */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-[#D0A73B]">
                <CreditCard className="w-5 h-5" />
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">100% Revertido em Saldo</h4>
              </div>
              <p className="text-[11px] text-slate-300 font-normal leading-snug">
                Cada R$ 99 pago mensalmente vira R$ 99 de saldo limpo. O valor acumula sem vencer caso você precise viajar.
              </p>
            </div>

            {/* Benefit 2: Pagamento Recorrente Sem Compromete Limite */}
            <div className="bg-[#D0A73B]/20 backdrop-blur-md border border-[#D0A73B]/50 p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-[#D0A73B]">
                <Sparkles className="w-5 h-5 text-[#D0A73B]" />
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Cartão Recorrente</h4>
              </div>
              <p className="text-[11px] text-amber-100 font-medium leading-snug">
                É descontado mensalmente apenas <strong>R$ 99 por mês</strong>. Não compromete o limite do seu cartão de crédito!
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-[#D0A73B]">
                <Users className="w-5 h-5" />
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Extensível à Família</h4>
              </div>
              <p className="text-[11px] text-slate-300 font-normal leading-snug">
                Benefício extensível para seus <strong className="text-white">filhos e parentes de 2º grau</strong> (pais, mães, avós, irmãos e netos).
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-[#D0A73B]">
                <HeartHandshake className="w-5 h-5" />
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Prioridade no Agendamento</h4>
              </div>
              <p className="text-[11px] text-slate-300 font-normal leading-snug">
                Garantia de atendimento prioritário com a Dra. Elays Marinho e descontos exclusivos nas consultas de avaliação.
              </p>
            </div>
          </div>

          {/* Call to Action Button -> Opens In-App Registration Modal */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center space-x-2 text-xs text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#D0A73B]" />
              <span>Sem fidelidade obrigatória ou multas abusivas</span>
            </div>

            <button
              type="button"
              onClick={handleOpenRegisterModal}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#D0A73B] to-[#EBDC9C] text-[#1B2B22] font-black text-xs sm:text-sm rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#D0A73B]"
            >
              <Crown className="w-4 h-4 text-[#1B2B22]" />
              <span>Quero Fazer Meu Cadastro no Clube de Vantagens</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* área do paciente: consulta de mensalidades e saldo acumulado */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-[#C9D8CB] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4EBE4] pb-4">
          <div>
            <span className="text-[11px] font-extrabold text-[#5F6D33] uppercase tracking-wider block">
              Área do Paciente Assinante
            </span>
            <h4 className="text-lg font-serif font-bold text-[#23372B]">
              Consulte seu Plano de Fidelidade e Saldo
            </h4>
          </div>
          <p className="text-xs text-slate-500 max-w-xs">
            Digite abaixo seu telefone, CPF ou nome para verificar suas mensalidades pagas, saldo acumulado e dependentes.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Digite seu Telefone, CPF ou Nome..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D] focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={searching}
            className="px-6 py-3 bg-[#31523D] hover:bg-[#23372B] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {searching ? (
              <span>Buscando...</span>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Consultar Meu Plano</span>
              </>
            )}
          </button>
        </form>

        {/* Error Message if not found */}
        {searchError && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Member Ticket Details Display */}
        {queriedMember && (
          <div className="bg-[#F4F7F4] border-2 border-[#5F6D33]/40 rounded-2xl p-5 space-y-4 animate-fadeIn">
            {/* Top Bar Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#C9D8CB]">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-extrabold text-[#23372B]">{queriedMember.patientName}</h4>
                  {queriedMember.status === 'ativo' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#25D366]/20 text-[#1B2B22] border border-[#25D366]/50 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-[#25D366]" />
                      <span>Plano Ativo</span>
                    </span>
                  )}
                  {queriedMember.status === 'inadimplente' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-300 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Pendência de Pagamento</span>
                    </span>
                  )}
                  {queriedMember.status === 'inativo' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-300">
                      Plano Pausado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tel: {queriedMember.patientPhone} {queriedMember.patientEmail && `• ${queriedMember.patientEmail}`}
                </p>
                {queriedMember.patientAddress && (
                  <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{queriedMember.patientAddress}</span>
                  </p>
                )}
              </div>

              {/* Balance Box */}
              <div className="p-3 bg-white rounded-xl border border-[#D0A73B] text-right shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Disponível para Uso</span>
                <span className="text-xl font-black text-[#31523D]">
                  {formatCurrency(queriedMember.accumulatedBalance)}
                </span>
              </div>
            </div>

            {/* CARTÃO FIDELIDADE DIGITAL DO PACIENTE */}
            <div className="pt-2 pb-1">
              <span className="text-[11px] font-extrabold text-[#31523D] uppercase tracking-wider block mb-2">
                💳 Seu Cartão Fidelidade Digital
              </span>
              <LoyaltyCard member={queriedMember} clinicPhone={clinicPhone} showActions={true} />
            </div>

            {/* Quick Metrics & Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-medium">Valor Mensal</span>
                <span className="font-extrabold text-[#23372B]">{formatCurrency(queriedMember.monthlyFee)}/mês</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-medium">Dia do Vencimento</span>
                <span className="font-extrabold text-[#23372B]">Todo dia {queriedMember.dueDay}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-medium">Total Utilizado</span>
                <span className="font-extrabold text-slate-700">{formatCurrency(queriedMember.totalSpent)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-medium">Início no Clube</span>
                <span className="font-extrabold text-slate-700">{formatDatePtBR(queriedMember.joinedDate)}</span>
              </div>
            </div>

            {/* Beneficiaries Section (Filhos e Parentes de 2º Grau) */}
            <div className="bg-white p-3.5 rounded-xl border border-[#C9D8CB] space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#31523D]">
                <Users className="w-4 h-4 text-[#D0A73B]" />
                <span>Beneficiários Autorizados (Filhos e Parentes de 2º Grau):</span>
              </div>
              {queriedMember.beneficiaries && queriedMember.beneficiaries.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {queriedMember.beneficiaries.map((ben) => (
                    <span key={ben.id} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#E4EBE4] text-[#23372B] text-xs font-semibold border border-[#769E82]/30">
                      <UserCheck className="w-3 h-3 text-[#5F6D33]" />
                      <span>{ben.name} ({ben.relationship})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhum dependente cadastrado ainda. Você pode adicionar seus filhos ou parentes de 2º grau na recepção!
                </p>
              )}
            </div>

            {/* Overdue / Pending Months Warning */}
            {queriedMember.overdueMonths && queriedMember.overdueMonths.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Mensalidades em Atraso:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {queriedMember.overdueMonths.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[11px] font-bold border border-red-300">
                      {m} - R$ 99,00
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-red-600 mt-1">
                  Realize o PIX da mensalidade e envie o comprovante para regularizar e liberar seu saldo acumulado.
                </p>
              </div>
            )}

            {/* Paid Monthly Fees History */}
            <div className="bg-white p-3.5 rounded-xl border border-[#C9D8CB] space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#23372B]">
                <Clock className="w-4 h-4 text-[#5F6D33]" />
                <span>Histórico de Mensalidades Pagas:</span>
              </div>

              {queriedMember.payments && queriedMember.payments.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
                  {queriedMember.payments.map((pay) => (
                    <div key={pay.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#23372B]">Mês {pay.monthYear}</span>
                        <span className="text-[10px] text-slate-400 block">Pago em {formatDatePtBR(pay.paidAt)} • Via {pay.paymentMethod.toUpperCase()}</span>
                      </div>
                      <span className="font-extrabold text-[#31523D] bg-[#E4EBE4] px-2 py-0.5 rounded-md">
                        + {formatCurrency(pay.amount)} em saldo
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhum pagamento registrado ainda.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO NO CLUBE DE VANTAGENS */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {!registrationSuccess ? (
              /* REGISTRATION FORM STAGE */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Modal Header */}
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#31523D] to-[#5F6D33] text-white flex items-center justify-center shadow-md shrink-0">
                    <Crown className="w-6 h-6 text-[#D0A73B]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-extrabold text-[#23372B]">
                      Cadastro no Clube de Vantagens
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Preencha seus dados para solicitar sua adesão ao plano (R$ 99,00/mês).
                    </p>
                  </div>
                </div>

                {regError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Form Fields: Nome, Endereço, E-mail, WhatsApp */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-[#31523D]" />
                      <span>Nome Completo *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Maria das Dores Silva"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#31523D]" />
                      <span>Endereço Completo *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Ex: Av. Coronel José Porfírio, 123 - Centro, Altamira/PA"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-[#31523D]" />
                        <span>E-mail *</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="nome@email.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-[#31523D]" />
                        <span>WhatsApp / Telefone *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="(93) 99126-5006"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>CPF (Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formCpf}
                      onChange={(e) => setFormCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                    />
                  </div>
                </div>

                {/* FORMA DE PAGAMENTO RECORRENTE vs PIX */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-extrabold text-[#23372B] uppercase tracking-wider flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-[#D0A73B]" />
                    <span>Escolha a Forma de Pagamento (R$ 99,00/mês)</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cartao_recorrente')}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        paymentMethod === 'cartao_recorrente'
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-emerald-900 flex items-center space-x-1">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cartão de Crédito</span>
                        </span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-600 text-white rounded-md">
                          Recorrente
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium leading-tight">
                        Cobrança mensal automática de R$ 99. Saldo renovado todo mês.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        paymentMethod === 'pix'
                          ? 'bg-[#F5EED3]/80 border-[#D0A73B] ring-2 ring-[#D0A73B]/30'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-[#23372B]">⚡ PIX Manual</span>
                        <span className="text-[9px] text-[#7E611D] font-bold">A cada mês</span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium leading-tight">
                        Pagamento manual via chave PIX com envio de comprovante.
                      </p>
                    </button>
                  </div>

                  {/* CAMPO DE CARTÃO QUANDO SELECIONADO */}
                  {paymentMethod === 'cartao_recorrente' && (
                    <div className="p-3.5 bg-gradient-to-br from-emerald-950 via-[#1B2B22] to-slate-900 text-white rounded-2xl border border-emerald-500/40 space-y-3 shadow-md animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                        <span className="text-[11px] font-extrabold text-amber-300 flex items-center space-x-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Dados do Cartão de Crédito</span>
                        </span>
                        <span className="text-[9px] text-emerald-300 font-bold bg-emerald-900/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          Cobrança Automática R$ 99/mês
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                          Nome Impresso no Cartão *
                        </label>
                        <input
                          type="text"
                          required={paymentMethod === 'cartao_recorrente'}
                          value={cardHolderName}
                          onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                          placeholder="EX: MARIA O SILVA"
                          className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/90 text-white text-xs font-bold uppercase placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                          Número do Cartão de Crédito *
                        </label>
                        <input
                          type="text"
                          required={paymentMethod === 'cartao_recorrente'}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4532 •••• •••• 8842"
                          maxLength={19}
                          className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/90 text-white font-mono text-xs font-bold tracking-widest placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                            Validade (MM/AA) *
                          </label>
                          <input
                            type="text"
                            required={paymentMethod === 'cartao_recorrente'}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="12/28"
                            maxLength={5}
                            className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/90 text-white text-xs font-mono font-bold text-center placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                            CVV (Segurança) *
                          </label>
                          <input
                            type="password"
                            required={paymentMethod === 'cartao_recorrente'}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800/90 text-white text-xs font-mono font-bold text-center placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-emerald-900/40 rounded-xl border border-emerald-500/20 text-[10px] text-emerald-200 leading-snug">
                        💳 <strong>Cobrança Recorrente Ativa:</strong> A mensalidade de R$ 99,00 será cobrada automaticamente no seu cartão de crédito a cada 30 dias. R$ 99,00 em saldo liberado todo mês no seu cartão Fidelidade.
                      </div>
                    </div>
                  )}
                </div>

                {/* REGIME DE VANTAGENS (TERMOS EM LETRAS PEQUENAS) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-[#23372B] uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-[#D0A73B]" />
                    <span>Regime de Vantagens e Regulamento do Clube</span>
                  </div>

                  {/* Fine Print / Letras Pequenas */}
                  <div className="text-[11px] leading-relaxed text-slate-600 space-y-1.5 max-h-36 overflow-y-auto pr-1 bg-white p-3 rounded-xl border border-slate-200/80 font-medium">
                    <p>
                      <strong>1. Valor e Pagamento:</strong> O assinante compromete-se a realizar o pagamento das mensalidades no valor fixo de <strong>R$ 99,00 (noventa e nove reais)</strong> mensais, que é revertido integralmente em saldo para utilização em serviços da clínica.
                    </p>
                    <p>
                      <strong>2. Carência e Urgências:</strong> Caso o paciente queira utilizar o plano completo de benefícios, há uma <strong>carência regulamentar de 6 meses</strong>. Em casos comprovados de urgência ou necessidade imediata de tratamento, a clínica liberará o acesso antecipado.
                    </p>
                    <p>
                      <strong>3. Extensão Familiar:</strong> O saldo acumulado e os benefícios do programa podem ser utilizados livremente pelo titular e por seus <strong>parentes de 2º grau</strong> (pais, mães, avós, irmãos, netos e filhos).
                    </p>
                    <p>
                      <strong>4. Ausência de Obrigatoriedade Mensal:</strong> O paciente <strong>não tem a obrigatoriedade</strong> de realizar o pagamento mensalmente caso fique sem condições financeiras de efetuar o pagamento em determinado período. Não há cobrança de multas ou juros por meses pausados.
                    </p>
                    <p>
                      <strong>5. Política de Não Devolução:</strong> Não devolvemos o valor investido nas mensalidades em dinheiro ou reembolso bancário, pois o valor pago só poderá ser utilizado exclusivamente na prestação dos serviços da clínica (Pilates, Fisioterapia, Massoterapia e Consultas). Portanto, não fazemos devoluções sob nenhuma hipótese.
                    </p>
                  </div>

                  {/* Mandatory Checkbox Agreement */}
                  <label className="flex items-start space-x-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded-md text-[#31523D] focus:ring-[#31523D] border-slate-300 cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-slate-700 font-bold leading-tight">
                      Declaro que li, compreendo e dou meu aceite integral ao Regime de Vantagens acima (mensalidade R$ 99,00, carência de 6 meses com exceção de urgências, extensão a parentes de 2º grau, isenção de obrigatoriedade mensal e utilização exclusiva em serviços da clínica sem devoluções).
                    </span>
                  </label>
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full sm:w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !acceptedTerms}
                    className="w-full sm:w-2/3 py-3 px-4 bg-[#31523D] hover:bg-[#23372B] disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    {submitting ? (
                      <span>Cadastrando...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#D0A73B]" />
                        <span>Confirmar Cadastro no Clube</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* REGISTRATION SUCCESS STAGE */
              <div className="text-center space-y-5 py-2 animate-fadeIn">
                <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md border border-emerald-200">
                  <Sparkles className="w-7 h-7 text-[#D0A73B]" />
                </div>

                <div>
                  <span className="text-[10px] uppercase font-extrabold text-[#5F6D33] tracking-widest block mb-1">
                    Clube de Vantagens Fisiolys
                  </span>
                  <h3 className="text-xl font-serif font-black text-[#23372B]">
                    🎉 Cadastro Concluído com Sucesso!
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Seja muito bem-vindo(a), <strong className="text-slate-800">{registrationSuccess.patientName}</strong>! Seu Cartão Fidelidade Oficial já está gerado.
                  </p>
                </div>

                {/* DIGITAL LOYALTY CARD WITH MASCOT */}
                <div className="py-1">
                  <LoyaltyCard member={registrationSuccess} clinicPhone={clinicPhone} showActions={true} />
                </div>

                {/* PIX Instructions Box */}
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 text-left space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Ativação do Saldo - 1ª Mensalidade (PIX R$ 99,00):</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Efetue o PIX abaixo e envie o comprovante no WhatsApp para liberar seu saldo de R$ 99,00:
                  </p>
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={pixKey}
                      className="w-full bg-white px-3 py-2 rounded-xl border border-amber-300 font-mono text-xs font-bold text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleNotifyWhatsApp}
                    className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Enviar Comprovante / Avisar Recepção pelo WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Ver Meu Painel no App
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
