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
  UserCheck,
  X,
  FileText,
  User,
  MapPin,
  Mail,
  Phone,
  Copy,
  Check,
  Flower2,
  Heart
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
      <div className="bg-verde-900 text-creme rounded-3xl p-6 sm:p-8 shadow-lg border border-verde-800 relative overflow-hidden">
        {/* Glow & Sparkle accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-dourado/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-dourado-suave/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Title Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-dourado text-creme flex items-center justify-center shadow-md font-bold shrink-0 border border-dourado-suave/40">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-flex items-center space-x-1 bg-dourado/15 text-dourado-suave text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-dourado/30 mb-1">
                  <Sparkles className="w-3 h-3 text-dourado" />
                  <span>Clube de Vantagens Fisiolys</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-creme tracking-tight">
                  Programa de Fidelidade Recorrente
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-creme/70 block">Mensalidade</span>
              <span className="text-2xl font-serif font-bold text-dourado-suave">R$ 99<span className="text-xs font-normal text-creme/70">/mês</span></span>
            </div>
          </div>

          {/* Description Paragraph */}
          <p className="text-xs sm:text-sm text-creme/80 leading-relaxed font-sans max-w-2xl">
            Cuidar da saúde e prevenção com continuidade ficou ainda mais fácil! Com a assinatura mensal de <strong className="text-dourado-suave">R$ 99,00</strong>, 
            100% do seu valor mensal é convertido em <strong className="text-creme">crédito acumulativo</strong> para realizar sessões de Pilates, Fisioterapia, Massoterapia e avaliações.
          </p>

          {/* 4 Main Benefits Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Benefit 1 */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-dourado-suave">
                <CreditCard className="w-4 h-4 text-dourado" />
                <h4 className="text-xs font-bold text-creme uppercase tracking-wider font-serif">100% em Saldo</h4>
              </div>
              <p className="text-[11px] text-creme/70 font-sans leading-snug">
                Cada R$ 99 pago mensalmente vira R$ 99 de saldo limpo. O valor acumula sem vencer caso você precise viajar.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-dourado/10 backdrop-blur-md border border-dourado/30 p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-dourado-suave">
                <Sparkles className="w-4 h-4 text-dourado" />
                <h4 className="text-xs font-bold text-creme uppercase tracking-wider font-serif">Cartão Recorrente</h4>
              </div>
              <p className="text-[11px] text-creme/85 font-sans leading-snug">
                Cobrado mensalmente apenas <strong>R$ 99 por mês</strong>. Não compromete o limite total do cartão!
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-dourado-suave">
                <Users className="w-4 h-4 text-dourado" />
                <h4 className="text-xs font-bold text-creme uppercase tracking-wider font-serif">Extensível à Família</h4>
              </div>
              <p className="text-[11px] text-creme/70 font-sans leading-snug">
                Benefício extensível para seus <strong className="text-creme">filhos e parentes de 2º grau</strong> (pais, avós, irmãos e netos).
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2 text-dourado-suave">
                <HeartHandshake className="w-4 h-4 text-dourado" />
                <h4 className="text-xs font-bold text-creme uppercase tracking-wider font-serif">Prioridade</h4>
              </div>
              <p className="text-[11px] text-creme/70 font-sans leading-snug">
                Garantia de atendimento prioritário com a Dra. Elays Marinho e descontos exclusivos nas consultas.
              </p>
            </div>
          </div>

          {/* Call to Action Button -> Opens In-App Registration Modal */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center space-x-2 text-xs text-creme/80 font-medium font-sans">
              <ShieldCheck className="w-4 h-4 text-dourado-suave" />
              <span>Sem fidelidade obrigatória ou multas abusivas</span>
            </div>

            <button
              type="button"
              id="open-loyalty-registration-modal-btn"
              onClick={handleOpenRegisterModal}
              className="w-full sm:w-auto px-6 py-3.5 bg-dourado hover:bg-dourado/90 text-creme font-bold text-xs sm:text-sm rounded-full shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer border border-dourado-suave/40"
            >
              <Crown className="w-4 h-4 text-creme" />
              <span>Fazer Cadastro no Clube de Vantagens</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* área do paciente: consulta de mensalidades e saldo acumulado */}
      <div className="bg-creme-card rounded-3xl p-6 sm:p-7 shadow-sm border border-linha space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-linha/60 pb-4">
          <div>
            <span className="text-[11px] font-bold text-dourado uppercase tracking-wider block">
              Área do Paciente Assinante
            </span>
            <h4 className="text-lg font-serif font-bold text-carvao">
              Consulte seu Plano de Fidelidade e Saldo
            </h4>
          </div>
          <p className="text-xs text-carvao-suave max-w-xs font-sans">
            Digite abaixo seu telefone, CPF ou nome para verificar suas mensalidades pagas, saldo acumulado e dependentes.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-carvao-suave/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="loyalty-search-input"
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Digite seu Telefone, CPF ou Nome..."
              className="w-full pl-10 pr-4 py-3 rounded-full border border-linha bg-white text-xs font-semibold text-carvao focus:outline-none focus:ring-2 focus:ring-verde-900"
            />
          </div>

          <button
            type="submit"
            id="loyalty-search-btn"
            disabled={searching}
            className="px-6 py-3 bg-verde-900 hover:bg-verde-800 text-creme text-xs font-bold rounded-full transition-all shadow-xs flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50 cursor-pointer border border-verde-800"
          >
            {searching ? (
              <span>Buscando...</span>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-dourado-suave" />
                <span>Consultar Meu Plano</span>
              </>
            )}
          </button>
        </form>

        {/* Error Message if not found */}
        {searchError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Member Ticket Details Display */}
        {queriedMember && (
          <div className="bg-white border border-linha rounded-2xl p-5 space-y-4 animate-fadeIn shadow-2xs">
            {/* Top Bar Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-linha/60">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-serif font-bold text-carvao">{queriedMember.patientName}</h4>
                  {queriedMember.status === 'ativo' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-verde-900/10 text-verde-900 border border-verde-900/20 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-verde-900" />
                      <span>Plano Ativo</span>
                    </span>
                  )}
                  {queriedMember.status === 'inadimplente' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>Pendência de Pagamento</span>
                    </span>
                  )}
                  {queriedMember.status === 'inativo' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-creme text-carvao-suave border border-linha">
                      Plano Pausado
                    </span>
                  )}
                </div>
                <p className="text-xs text-carvao-suave mt-0.5 font-sans">
                  Tel: {queriedMember.patientPhone} {queriedMember.patientEmail && `• ${queriedMember.patientEmail}`}
                </p>
                {queriedMember.patientAddress && (
                  <p className="text-[11px] text-carvao-suave flex items-center space-x-1 mt-0.5 font-sans">
                    <MapPin className="w-3 h-3 text-dourado shrink-0" />
                    <span>{queriedMember.patientAddress}</span>
                  </p>
                )}
              </div>

              {/* Balance Box */}
              <div className="p-3 bg-creme rounded-2xl border border-dourado/40 text-right shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-carvao-suave block">Saldo Disponível</span>
                <span className="text-xl font-serif font-bold text-verde-900">
                  {formatCurrency(queriedMember.accumulatedBalance)}
                </span>
              </div>
            </div>

            {/* CARTÃO FIDELIDADE DIGITAL DO PACIENTE */}
            <div className="pt-2 pb-1">
              <span className="text-[11px] font-bold text-verde-900 uppercase tracking-wider block mb-2 font-serif">
                Seu Cartão Fidelidade Digital
              </span>
              <LoyaltyCard member={queriedMember} clinicPhone={clinicPhone} showActions={true} />
            </div>

            {/* Quick Metrics & Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-creme p-3 rounded-2xl border border-linha">
                <span className="text-carvao-suave text-[10px] block font-medium">Valor Mensal</span>
                <span className="font-serif font-bold text-carvao">{formatCurrency(queriedMember.monthlyFee)}/mês</span>
              </div>
              <div className="bg-creme p-3 rounded-2xl border border-linha">
                <span className="text-carvao-suave text-[10px] block font-medium">Dia do Vencimento</span>
                <span className="font-serif font-bold text-carvao">Todo dia {queriedMember.dueDay}</span>
              </div>
              <div className="bg-creme p-3 rounded-2xl border border-linha">
                <span className="text-carvao-suave text-[10px] block font-medium">Total Utilizado</span>
                <span className="font-serif font-bold text-carvao-suave">{formatCurrency(queriedMember.totalSpent)}</span>
              </div>
              <div className="bg-creme p-3 rounded-2xl border border-linha">
                <span className="text-carvao-suave text-[10px] block font-medium">Início no Clube</span>
                <span className="font-serif font-bold text-carvao-suave">{formatDatePtBR(queriedMember.joinedDate)}</span>
              </div>
            </div>

            {/* Beneficiaries Section */}
            <div className="bg-creme p-4 rounded-2xl border border-linha space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-verde-900">
                <Users className="w-4 h-4 text-dourado" />
                <span>Beneficiários Autorizados (Filhos e Parentes de 2º Grau):</span>
              </div>
              {queriedMember.beneficiaries && queriedMember.beneficiaries.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {queriedMember.beneficiaries.map((ben) => (
                    <span key={ben.id} className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white text-carvao text-xs font-medium border border-linha">
                      <UserCheck className="w-3 h-3 text-dourado" />
                      <span>{ben.name} ({ben.relationship})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-carvao-suave italic font-sans">
                  Nenhum dependente cadastrado ainda. Você pode adicionar seus filhos ou parentes de 2º grau na recepção!
                </p>
              )}
            </div>

            {/* Overdue / Pending Months Warning */}
            {queriedMember.overdueMonths && queriedMember.overdueMonths.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Mensalidades em Atraso:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {queriedMember.overdueMonths.map((m, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300">
                      {m} - R$ 99,00
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-rose-700 mt-1 font-sans">
                  Realize o PIX da mensalidade e envie o comprovante para regularizar e liberar seu saldo acumulado.
                </p>
              </div>
            )}

            {/* Paid Monthly Fees History */}
            <div className="bg-creme p-4 rounded-2xl border border-linha space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-verde-900">
                <Clock className="w-4 h-4 text-dourado" />
                <span>Histórico de Mensalidades Pagas:</span>
              </div>

              {queriedMember.payments && queriedMember.payments.length > 0 ? (
                <div className="divide-y divide-linha/60 max-h-40 overflow-y-auto pr-1">
                  {queriedMember.payments.map((pay) => (
                    <div key={pay.id} className="py-2 flex items-center justify-between text-xs font-sans">
                      <div>
                        <span className="font-bold text-carvao">Mês {pay.monthYear}</span>
                        <span className="text-[10px] text-carvao-suave block">Pago em {formatDatePtBR(pay.paidAt)} • Via {pay.paymentMethod.toUpperCase()}</span>
                      </div>
                      <span className="font-bold text-verde-900 bg-white px-2.5 py-1 rounded-full border border-linha">
                        + {formatCurrency(pay.amount)} em saldo
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-carvao-suave italic font-sans">Nenhum pagamento registrado ainda.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PROMOÇÃO INDIQUE E GANHE */}
      <div className="bg-creme-card rounded-3xl p-6 sm:p-7 shadow-sm border border-dourado/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-dourado/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-dourado/15 text-dourado text-[11px] font-bold uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5 text-dourado" />
              <span>Promoção Especial • Indique e Ganhe</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-carvao tracking-tight">
              Indique um Amigo ou Familiar e Ganhe de Presente!
            </h3>

            <p className="text-xs sm:text-sm text-carvao-suave leading-relaxed font-sans">
              Indique amigos ou familiares para cuidar da saúde na <strong>Fisiolys</strong>! Assim que a pessoa indicada iniciar seu tratamento de Fisioterapia ou plano de Pilates, você ganha <strong>100% gratuito</strong> à sua escolha:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 bg-white rounded-2xl border border-linha shadow-xs flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-verde-900 text-dourado-suave flex items-center justify-center font-bold text-base shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-carvao uppercase tracking-wide font-serif">Opção 1: Massoterapia</h4>
                  <p className="text-[11px] text-carvao-suave font-sans">1 Sessão Completa de Massoterapia / Liberação</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-linha shadow-xs flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-dourado text-creme flex items-center justify-center font-bold text-base shrink-0">
                  <Flower2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-carvao uppercase tracking-wide font-serif">Opção 2: Pilates Clínico</h4>
                  <p className="text-[11px] text-carvao-suave font-sans">1 Aula Experimental de Pilates Solo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full lg:w-auto shrink-0">
            <a
              id="loyalty-referral-whatsapp-btn"
              href={`https://wa.me/?text=${encodeURIComponent(
                `Olá! Estou te indicando a Dra. Elays Marinho na Clínica Fisiolys para atendimentos de Fisioterapia, Pilates Clínico e Massoterapia! Você pode agendar direto pelo link do aplicativo: ${window.location.origin}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3.5 bg-verde-900 hover:bg-verde-800 text-creme font-bold text-xs sm:text-sm rounded-full shadow-md transition-all flex items-center justify-center space-x-2 border border-verde-800 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-dourado-suave" />
              <span>Indicar Amigo pelo WhatsApp</span>
            </a>

            <button
              type="button"
              id="loyalty-copy-referral-btn"
              onClick={() => {
                const textToCopy = `Conheça a Clínica Fisiolys da Dra. Elays Marinho! Atendimentos de Fisioterapia, Pilates e Massoterapia. Agende pelo link: ${window.location.origin}`;
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(textToCopy);
                  alert('Mensagem de indicação copiada com sucesso! Envie aos seus amigos.');
                }
              }}
              className="px-4 py-2.5 bg-white hover:bg-creme text-carvao font-bold text-xs rounded-full border border-linha transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-carvao-suave" />
              <span>Copiar Mensagem de Indicação</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CADASTRO NO CLUBE DE VANTAGENS */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carvao/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-creme-card rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-linha relative my-8">
            {/* Close Button */}
            <button
              type="button"
              id="close-loyalty-modal-btn"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 text-carvao-suave hover:text-carvao bg-creme hover:bg-white rounded-full transition-all cursor-pointer border border-linha"
            >
              <X className="w-5 h-5" />
            </button>

            {!registrationSuccess ? (
              /* REGISTRATION FORM STAGE */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Modal Header */}
                <div className="flex items-center space-x-3 pb-3 border-b border-linha/60">
                  <div className="w-11 h-11 rounded-2xl bg-verde-900 text-creme flex items-center justify-center shadow-md shrink-0 border border-verde-800">
                    <Crown className="w-6 h-6 text-dourado-suave" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-carvao">
                      Cadastro no Clube de Vantagens
                    </h3>
                    <p className="text-xs text-carvao-suave font-sans">
                      Preencha seus dados para solicitar sua adesão ao plano (R$ 99,00/mês).
                    </p>
                  </div>
                </div>

                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Form Fields: Nome, Endereço, E-mail, WhatsApp */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-carvao mb-1 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-dourado" />
                      <span>Nome Completo *</span>
                    </label>
                    <input
                      id="loyalty-form-name"
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Maria das Dores Silva"
                      className="w-full px-3.5 py-2.5 rounded-full border border-linha bg-white text-xs font-semibold text-carvao focus:outline-none focus:ring-2 focus:ring-verde-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-carvao mb-1 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-dourado" />
                      <span>Endereço Completo *</span>
                    </label>
                    <input
                      id="loyalty-form-address"
                      type="text"
                      required
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Ex: Av. Coronel José Porfírio, 123 - Centro, Altamira/PA"
                      className="w-full px-3.5 py-2.5 rounded-full border border-linha bg-white text-xs font-semibold text-carvao focus:outline-none focus:ring-2 focus:ring-verde-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-carvao mb-1 flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-dourado" />
                        <span>E-mail *</span>
                      </label>
                      <input
                        id="loyalty-form-email"
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="nome@email.com"
                        className="w-full px-3.5 py-2.5 rounded-full border border-linha bg-white text-xs font-semibold text-carvao focus:outline-none focus:ring-2 focus:ring-verde-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-carvao mb-1 flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-dourado" />
                        <span>WhatsApp / Telefone *</span>
                      </label>
                      <input
                        id="loyalty-form-phone"
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="(93) 99126-5006"
                        className="w-full px-3.5 py-2.5 rounded-full border border-linha bg-white text-xs font-semibold text-carvao focus:outline-none focus:ring-2 focus:ring-verde-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-carvao mb-1 flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5 text-carvao-suave" />
                      <span>CPF (Opcional)</span>
                    </label>
                    <input
                      id="loyalty-form-cpf"
                      type="text"
                      value={formCpf}
                      onChange={(e) => setFormCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2.5 rounded-full border border-linha bg-white text-xs font-semibold text-carvao focus:outline-none focus:ring-2 focus:ring-verde-900"
                    />
                  </div>
                </div>

                {/* FORMA DE PAGAMENTO RECORRENTE vs PIX */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-carvao uppercase tracking-wider flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-dourado" />
                    <span>Escolha a Forma de Pagamento (R$ 99,00/mês)</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="loyalty-paymethod-card-btn"
                      onClick={() => setPaymentMethod('cartao_recorrente')}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        paymentMethod === 'cartao_recorrente'
                          ? 'bg-verde-900/10 border-verde-900 ring-2 ring-verde-900/20'
                          : 'bg-white border-linha hover:border-dourado'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-verde-900 flex items-center space-x-1">
                          <CreditCard className="w-3.5 h-3.5 text-verde-900" />
                          <span>Cartão de Crédito</span>
                        </span>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-verde-900 text-creme rounded-full">
                          Recorrente
                        </span>
                      </div>
                      <p className="text-[10px] text-carvao-suave font-sans leading-tight">
                        Cobrança mensal automática de R$ 99. Saldo renovado todo mês.
                      </p>
                    </button>

                    <button
                      type="button"
                      id="loyalty-paymethod-pix-btn"
                      onClick={() => setPaymentMethod('pix')}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        paymentMethod === 'pix'
                          ? 'bg-dourado/15 border-dourado ring-2 ring-dourado/30'
                          : 'bg-white border-linha hover:border-dourado'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-carvao">PIX Manual</span>
                        <span className="text-[9px] text-dourado font-bold">A cada mês</span>
                      </div>
                      <p className="text-[10px] text-carvao-suave font-sans leading-tight">
                        Pagamento manual via chave PIX com envio de comprovante.
                      </p>
                    </button>
                  </div>

                  {/* CAMPO DE CARTÃO QUANDO SELECIONADO */}
                  {paymentMethod === 'cartao_recorrente' && (
                    <div className="p-4 bg-verde-900 text-creme rounded-2xl border border-verde-800 space-y-3 shadow-md animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-[11px] font-bold text-dourado-suave flex items-center space-x-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Dados do Cartão de Crédito</span>
                        </span>
                        <span className="text-[9px] text-creme/90 font-bold bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                          Cobrança Automática R$ 99/mês
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-creme/80 mb-0.5">
                          Nome Impresso no Cartão *
                        </label>
                        <input
                          id="loyalty-card-holder"
                          type="text"
                          required={paymentMethod === 'cartao_recorrente'}
                          value={cardHolderName}
                          onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                          placeholder="EX: MARIA O SILVA"
                          className="w-full px-3.5 py-2 rounded-full border border-white/20 bg-white/10 text-creme text-xs font-bold uppercase placeholder-creme/40 focus:outline-none focus:border-dourado"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-creme/80 mb-0.5">
                          Número do Cartão de Crédito *
                        </label>
                        <input
                          id="loyalty-card-number"
                          type="text"
                          required={paymentMethod === 'cartao_recorrente'}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4532 •••• •••• 8842"
                          maxLength={19}
                          className="w-full px-3.5 py-2 rounded-full border border-white/20 bg-white/10 text-creme font-mono text-xs font-bold tracking-widest placeholder-creme/40 focus:outline-none focus:border-dourado"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-creme/80 mb-0.5">
                            Validade (MM/AA) *
                          </label>
                          <input
                            id="loyalty-card-expiry"
                            type="text"
                            required={paymentMethod === 'cartao_recorrente'}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="12/28"
                            maxLength={5}
                            className="w-full px-3 py-2 rounded-full border border-white/20 bg-white/10 text-creme text-xs font-mono font-bold text-center placeholder-creme/40 focus:outline-none focus:border-dourado"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-creme/80 mb-0.5">
                            CVV (Segurança) *
                          </label>
                          <input
                            id="loyalty-card-cvv"
                            type="password"
                            required={paymentMethod === 'cartao_recorrente'}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-3 py-2 rounded-full border border-white/20 bg-white/10 text-creme text-xs font-mono font-bold text-center placeholder-creme/40 focus:outline-none focus:border-dourado"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-[10px] text-creme/85 leading-snug font-sans">
                        💳 <strong>Cobrança Recorrente Ativa:</strong> A mensalidade de R$ 99,00 será cobrada automaticamente no cartão a cada 30 dias com R$ 99,00 em saldo liberado todo mês.
                      </div>
                    </div>
                  )}
                </div>

                {/* REGIME DE VANTAGENS */}
                <div className="bg-white p-4 rounded-2xl border border-linha space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-carvao uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-dourado" />
                    <span>Regime de Vantagens e Regulamento do Clube</span>
                  </div>

                  {/* Fine Print */}
                  <div className="text-[11px] leading-relaxed text-carvao-suave space-y-1.5 max-h-36 overflow-y-auto pr-1 bg-creme p-3 rounded-xl border border-linha/60 font-sans">
                    <p>
                      <strong>1. Valor e Pagamento:</strong> O assinante compromete-se a realizar o pagamento das mensalidades no valor fixo de <strong>R$ 99,00 (noventa e nove reais)</strong> mensais, revertido integralmente em saldo para utilização em serviços da clínica.
                    </p>
                    <p>
                      <strong>2. Carência e Urgências:</strong> Caso o paciente queira utilizar o plano completo de benefícios, há uma <strong>carência regulamentar de 6 meses</strong>. Em casos comprovados de urgência ou necessidade imediata de tratamento, a clínica liberará o acesso antecipado.
                    </p>
                    <p>
                      <strong>3. Extensão Familiar:</strong> O saldo acumulado e os benefícios do programa podem ser utilizados livremente pelo titular e por seus <strong>parentes de 2º grau</strong> (pais, avós, irmãos, netos e filhos).
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
                      id="loyalty-terms-checkbox"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded-md text-verde-900 focus:ring-verde-900 border-linha cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-carvao font-bold leading-tight font-sans">
                      Declaro que li, compreendo e dou meu aceite integral ao Regime de Vantagens acima (mensalidade R$ 99,00, carência de 6 meses com exceção de urgências, extensão a parentes de 2º grau, isenção de obrigatoriedade mensal e utilização exclusiva em serviços da clínica sem devoluções).
                    </span>
                  </label>
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    id="cancel-loyalty-registration-btn"
                    onClick={handleCloseModal}
                    className="w-full sm:w-1/3 py-3 px-4 bg-creme hover:bg-white text-carvao font-bold text-xs rounded-full border border-linha transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="submit-loyalty-registration-btn"
                    disabled={submitting || !acceptedTerms}
                    className="w-full sm:w-2/3 py-3 px-4 bg-verde-900 hover:bg-verde-800 disabled:opacity-50 text-creme font-bold text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5 border border-verde-800"
                  >
                    {submitting ? (
                      <span>Cadastrando...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-dourado-suave" />
                        <span>Confirmar Cadastro no Clube</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* REGISTRATION SUCCESS STAGE */
              <div className="text-center space-y-5 py-2 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-verde-900/10 text-verde-900 flex items-center justify-center mx-auto shadow-xs border border-verde-900/20">
                  <Sparkles className="w-7 h-7 text-dourado" />
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-dourado tracking-widest block mb-1">
                    Clube de Vantagens Fisiolys
                  </span>
                  <h3 className="text-xl font-serif font-bold text-carvao">
                    Cadastro Concluído com Sucesso!
                  </h3>
                  <p className="text-xs text-carvao-suave font-sans mt-1">
                    Seja muito bem-vindo(a), <strong className="text-carvao">{registrationSuccess.patientName}</strong>! Seu Cartão Fidelidade Oficial já está gerado.
                  </p>
                </div>

                {/* DIGITAL LOYALTY CARD WITH MASCOT */}
                <div className="py-1">
                  <LoyaltyCard member={registrationSuccess} clinicPhone={clinicPhone} showActions={true} />
                </div>

                {/* PIX Instructions Box */}
                <div className="bg-white p-4 rounded-2xl border border-linha text-left space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-carvao">
                    <CreditCard className="w-4 h-4 text-dourado" />
                    <span>Ativação do Saldo - 1ª Mensalidade (PIX R$ 99,00):</span>
                  </div>
                  <p className="text-[11px] text-carvao-suave leading-relaxed font-sans">
                    Efetue o PIX abaixo e envie o comprovante no WhatsApp para liberar seu saldo de R$ 99,00:
                  </p>
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={pixKey}
                      className="w-full bg-creme px-3.5 py-2 rounded-full border border-linha font-mono text-xs font-bold text-carvao"
                    />
                    <button
                      type="button"
                      id="copy-pix-key-btn"
                      onClick={handleCopyPix}
                      className="px-4 py-2 bg-verde-900 hover:bg-verde-800 text-creme font-bold text-xs rounded-full shadow-2xs transition-all flex items-center space-x-1 shrink-0 cursor-pointer border border-verde-800"
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
                    id="notify-whatsapp-success-btn"
                    onClick={handleNotifyWhatsApp}
                    className="w-full py-3.5 bg-verde-900 hover:bg-verde-800 text-creme font-bold text-xs rounded-full shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer border border-verde-800"
                  >
                    <MessageSquare className="w-4 h-4 text-dourado-suave" />
                    <span>Enviar Comprovante / Avisar Recepção pelo WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    id="close-success-panel-btn"
                    onClick={handleCloseModal}
                    className="w-full py-2.5 bg-white hover:bg-creme text-carvao font-bold text-xs rounded-full border border-linha transition-all cursor-pointer"
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
