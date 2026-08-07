import React, { useState, useEffect } from 'react';
import { Appointment, ClinicConfig, LoyaltyMember } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR } from '../../utils/qrUtils';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  CreditCard,
  QrCode,
  Users,
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Phone,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';

interface AdminFinancialProps {
  clinic: ClinicConfig;
  appointments: Appointment[];
  onReload?: () => void;
}

interface PendingItem {
  id: string;
  patientName: string;
  patientPhone: string;
  type: 'pilates_atendimento' | 'fidelidade_mensal';
  title: string;
  dateOrDue: string;
  amount: number;
  rawObject: Appointment | LoyaltyMember;
  status: 'pendente' | 'atrasado';
}

export const AdminFinancial: React.FC<AdminFinancialProps> = ({ clinic, appointments, onReload }) => {
  const [loyaltyMembers, setLoyaltyMembers] = useState<LoyaltyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [filterType, setFilterType] = useState<'todos' | 'pilates' | 'fidelidade'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Template message customization
  const [customPixKey, setCustomPixKey] = useState(clinic.phone || '(85) 99999-9999');

  const fetchLoyalty = async () => {
    setLoadingMembers(true);
    try {
      const members = await api.getLoyaltyMembers();
      setLoyaltyMembers(members);
    } catch (err) {
      console.error('Erro ao carregar clube de fidelidade no financeiro:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchLoyalty();
  }, []);

  // Build list of Pending Items
  const pendingItems: PendingItem[] = [];

  // 1. Pending Appointments (e.g., status is 'agendado' or 'concluido' but not paid / attendance concluded)
  appointments.forEach((app) => {
    if (app.status !== 'cancelado') {
      const isPaid = app.paymentMethod && app.status === 'concluido';
      // If not explicitly marked concluded with payment method, consider pending if not canceled
      if (app.status === 'agendado') {
        pendingItems.push({
          id: `appt_${app.id}`,
          patientName: app.patientName,
          patientPhone: app.patientPhone,
          type: 'pilates_atendimento',
          title: `${app.serviceName}`,
          dateOrDue: app.date,
          amount: app.servicePrice || 0,
          rawObject: app,
          status: 'pendente',
        });
      }
    }
  });

  // 2. Pending Loyalty Members (inadimplentes or overdue months)
  loyaltyMembers.forEach((member) => {
    if (member.status === 'inadimplente' || (member.overdueMonths && member.overdueMonths.length > 0)) {
      const overdueMonthsCount = member.overdueMonths?.length || 1;
      pendingItems.push({
        id: `loyalty_${member.id}`,
        patientName: member.patientName,
        patientPhone: member.patientPhone,
        type: 'fidelidade_mensal',
        title: `Clube de Fidelidade R$ 99 (${overdueMonthsCount} Mês${overdueMonthsCount > 1 ? 'es' : ''} Pendente)`,
        dateOrDue: member.nextBillingDate || `Dia ${member.dueDay || 10}`,
        amount: (member.monthlyFee || 99) * overdueMonthsCount,
        rawObject: member,
        status: 'atrasado',
      });
    }
  });

  // Filter pending items
  const filteredItems = pendingItems.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patientPhone.includes(searchTerm);

    if (!matchesSearch) return false;
    if (filterType === 'pilates') return item.type === 'pilates_atendimento';
    if (filterType === 'fidelidade') return item.type === 'fidelidade_mensal';
    return true;
  });

  // Financial Stats
  const totalPendingAmount = pendingItems.reduce((acc, curr) => acc + curr.amount, 0);

  // Revenue from confirmed loyalty payments
  const confirmedLoyaltyRevenue = loyaltyMembers.reduce((acc, member) => {
    const sumPayments = (member.payments || []).reduce((pAcc, p) => pAcc + (p.amount || 99), 0);
    return acc + sumPayments;
  }, 0);

  // Revenue from completed appointments
  const confirmedAppointmentsRevenue = appointments
    .filter((a) => a.status === 'concluido')
    .reduce((acc, a) => acc + (a.servicePrice || 0), 0);

  const totalConfirmedRevenue = confirmedLoyaltyRevenue + confirmedAppointmentsRevenue;

  // Trigger WhatsApp Reminder with customized text
  const sendWhatsAppReminder = (item: PendingItem) => {
    setSendingId(item.id);

    let message = '';
    const cleanPhone = item.patientPhone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    if (item.type === 'pilates_atendimento') {
      message = `Olá *${item.patientName}*! Tudo bem?\n\nPassando para lembrar referente ao seu agendamento/mensalidade de *${item.title}* na Clínica Dra. Elays Marinho.\n\n💰 *Valor:* R$ ${item.amount.toFixed(2).replace('.', ',')}\n🗓️ *Data/Vencimento:* ${formatDatePtBR(item.dateOrDue)}\n\n💳 *OPÇÕES DE PAGAMENTO PRÁTICO:*\n1. *Pix Instantâneo:* Chave celular \`${customPixKey}\`\n2. *Cartão de Crédito Recorrente:* É descontado *apenas o valor da parcela mensal* sem comprometer o limite total do seu cartão!\n\nPor favor, nos envie o comprovante por aqui assim que efetuar. Se precisar de ajuda, estou à disposição! 😊✨`;
    } else {
      message = `Olá *${item.patientName}*! Tudo bem?\n\nIdentificamos uma pendência na sua mensalidade do *Clube de Fidelidade R$ 99/mês* na Clínica Dra. Elays Marinho.\n\n👑 *Plano:* Clube de Fidelidade Recorrente\n💰 *Valor:* R$ ${item.amount.toFixed(2).replace('.', ',')}\n\n💳 *PAGUE FÁCIL SEM COMPROMETER SEU LIMITE:*\nNo nosso pagamento recorrente no cartão de crédito, é debitado *apenas R$ 99/mês*, preservando o limite total do seu cartão!\n\n📌 *Chave Pix:* \`${customPixKey}\`\n\nCaso já tenha realizado o pagamento, desconsidere esta mensagem. Muito obrigada! 🌸`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    setActionSuccess(`Lembrete WhatsApp gerado para ${item.patientName}!`);
    setTimeout(() => {
      setSendingId(null);
      setActionSuccess(null);
    }, 3000);
  };

  // Mark pending item as paid
  const handleMarkAsPaid = async (item: PendingItem) => {
    try {
      if (item.type === 'pilates_atendimento') {
        const appt = item.rawObject as Appointment;
        await api.updateAppointmentStatus(appt.id, 'concluido', 'Pago via Gestão Financeira', 'presenca');
        if (onReload) onReload();
      } else {
        const member = item.rawObject as LoyaltyMember;
        const currentMonthYear = `${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
        await api.recordLoyaltyPayment(member.id, {
          monthYear: currentMonthYear,
          amount: item.amount,
          paymentMethod: 'cartao_recorrente',
          receiptNotes: 'Baixa manual realizada pelo painel financeiro',
        });
        await fetchLoyalty();
      }
      setActionSuccess(`Pagamento de ${item.patientName} confirmado com sucesso!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar baixa no pagamento');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#31523D] text-[#D0A73B] uppercase tracking-wider">
              Gestão Financeira & Lembretes
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Cartão Recorrente - Não Compromete o Limite do Cartão
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-800 mt-2">
            Painel de Controle Financeiro e Cobrança
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Acompanhe pagamentos pendentes de Pilates e Clube de Fidelidade, envie mensagens de lembrete no WhatsApp e ofereça cobrança recorrente no cartão sem comprometer o limite da paciente.
          </p>
        </div>

        <button
          onClick={() => {
            fetchLoyalty();
            if (onReload) onReload();
          }}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 font-black">✕</button>
        </div>
      )}

      {/* Key Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Confirmed Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Recebido / Confirmado</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(totalConfirmedRevenue)}</p>
          <p className="text-[11px] text-slate-500">Agendamentos concluídos + Mensalidades pagas</p>
        </div>

        {/* Stat 2: Outstanding Pending Payments (DESTAQUE) */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-5 rounded-2xl border border-amber-400 text-white shadow-md space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-100 uppercase tracking-wider">⚡ Pagamentos Pendentes</span>
            <span className="p-2 rounded-xl bg-white/20 text-white">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black">{formatCurrency(totalPendingAmount)}</p>
          <p className="text-[11px] text-amber-100 font-semibold">
            {pendingItems.length} paciente{pendingItems.length !== 1 ? 's' : ''} com cobrança pendente
          </p>
        </div>

        {/* Stat 3: Loyalty Subscriptions Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Clube Fidelidade R$ 99</span>
            <span className="p-2 rounded-xl bg-[#31523D] text-[#D0A73B]">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-[#31523D]">{loyaltyMembers.length} Assinantes</p>
          <p className="text-[11px] text-slate-500">{formatCurrency(loyaltyMembers.length * 99)} /mês recorrente</p>
        </div>

        {/* Stat 4: Recurring Payment Benefit Advantage */}
        <div className="bg-gradient-to-r from-[#31523D] to-[#1E3326] p-5 rounded-2xl border border-[#D0A73B]/30 text-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#D0A73B] uppercase tracking-wider">Cartão Recorrente</span>
            <span className="p-2 rounded-xl bg-[#D0A73B]/20 text-[#D0A73B]">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xs font-extrabold text-white leading-tight">Não compromete o limite do seu cartão!</p>
          <p className="text-[10px] text-slate-200">
            É descontado mês a mês apenas o valor da parcela (R$ 99), sem tomar o saldo total da cliente.
          </p>
        </div>
      </div>

      {/* SPECIAL ANNOUNCEMENT BANNER: Cartão Recorrente Explicativo */}
      <div className="bg-gradient-to-r from-[#F5EED3] via-white to-[#EAF0DB] p-5 rounded-3xl border-2 border-[#D0A73B] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center shrink-0 shadow-xs font-black">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-[#23372B]">
                💳 Pagamento Recorrente sem Comprometer o Limite da Paciente
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D0A73B] text-[#1B2B22]">
                Inovação nas Vendas
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Diferente do parcelamento tradicional que bloqueia todo o limite do cartão da pessoa, no <strong>Pagamento Recorrente com Cartão de Crédito</strong> é descontado <strong>apenas o valor de uma mensalidade por mês</strong> (ex: R$ 99,00). O limite total do cartão permanece livre para a paciente usar como quiser!
            </p>
          </div>
        </div>

        <div className="shrink-0 bg-white p-3 rounded-2xl border border-[#C9D8CB] text-center w-full md:w-auto">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Chave Pix para Lembretes</span>
          <div className="mt-1 flex items-center space-x-1">
            <input
              type="text"
              value={customPixKey}
              onChange={(e) => setCustomPixKey(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 w-36 focus:outline-none focus:ring-1 focus:ring-[#31523D]"
            />
            <span className="text-[10px] text-slate-500 font-semibold">(Usado nas msgs)</span>
          </div>
        </div>
      </div>

      {/* FEATURED PENDING PAYMENTS SECTION (ÁREA EM DESTAQUE) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
              <h3 className="text-lg font-black text-slate-800">
                ⚡ Pagamentos Pendentes em Destaque ({filteredItems.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualize todas as mensalidades de Pilates e Clube de Fidelidade R$ 99 que requerem atenção e cobrança.
            </p>
          </div>

          {/* Filter & Search Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por paciente ou telefone..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D] w-48 sm:w-56"
              />
            </div>

            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="todos">Todos os Serviços</option>
              <option value="pilates">🧘‍♀️ Pilates / Atendimentos</option>
              <option value="fidelidade">👑 Clube Fidelidade R$ 99</option>
            </select>
          </div>
        </div>

        {/* Pending Items List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-extrabold text-emerald-900">Parabéns! Nenhum pagamento pendente encontrado.</p>
            <p className="text-xs text-emerald-700 mt-1">Todos os atendimentos e mensalidades estão em dia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  item.status === 'atrasado'
                    ? 'bg-amber-50/60 border-amber-300/80 hover:border-amber-400'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 shadow-2xs ${
                    item.type === 'fidelidade_mensal'
                      ? 'bg-[#31523D] text-[#D0A73B]'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.type === 'fidelidade_mensal' ? '👑' : '🧘‍♀️'}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-800">{item.patientName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.type === 'fidelidade_mensal'
                          ? 'bg-[#31523D] text-[#D0A73B]'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {item.type === 'fidelidade_mensal' ? 'Clube Fidelidade R$ 99' : 'Pilates / Atendimento'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <strong>{item.patientPhone}</strong>
                      </span>
                      <span>•</span>
                      <span>Vencimento / Data: <strong>{formatDatePtBR(item.dateOrDue)}</strong></span>
                    </p>

                    <p className="text-xs font-bold text-slate-500 mt-1">
                      Serviço: <span className="text-slate-700">{item.title}</span>
                    </p>
                  </div>
                </div>

                {/* Amount & Direct Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor a Cobrar</span>
                    <strong className="text-base font-black text-slate-900">{formatCurrency(item.amount)}</strong>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Send WhatsApp Reminder Button */}
                    <button
                      disabled={sendingId === item.id}
                      onClick={() => sendWhatsAppReminder(item)}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                      title="Enviar lembrete de pagamento formatado pelo WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Lembrete WhatsApp</span>
                      <span className="sm:hidden">WhatsApp</span>
                    </button>

                    {/* Mark as Paid Button */}
                    <button
                      onClick={() => handleMarkAsPaid(item)}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center space-x-1 transition-all cursor-pointer"
                      title="Dar baixa e marcar como pago"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dar Baixa</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AUTOMATED MESSAGES & REMINDERS GUIDE (CENTRAL DE LEMBRETES AUTOMÁTICOS) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-black">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              Central de Lembretes Automáticos de Mensalidade
            </h3>
            <p className="text-xs text-slate-500">
              Modelos prontos e disparo rápido no WhatsApp do paciente com informações do Pix e Cartão Recorrente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Template 1: Pilates Monthly */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#31523D] flex items-center space-x-1">
                <span>🧘‍♀️ Modelo Mensalidade Pilates</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">Pix + Cartão Recorrente</span>
            </div>
            <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono leading-relaxed">
              "Olá [Nome]! Passando para lembrar da sua mensalidade de Pilates na Dra. Elays Marinho. No cartão recorrente, é cobrado apenas o valor mensal sem comprometer seu limite! Chave Pix: {customPixKey}..."
            </p>
          </div>

          {/* Template 2: Loyalty Club */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#31523D] flex items-center space-x-1">
                <span>👑 Modelo Clube Fidelidade R$ 99</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">Assinatura Mensal</span>
            </div>
            <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono leading-relaxed">
              "Olá [Nome]! Seu Plano do Clube de Fidelidade R$ 99/mês está pendente de renovação. Você pode cadastrar o cartão recorrente sem travar seu limite. Chave Pix: {customPixKey}..."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
