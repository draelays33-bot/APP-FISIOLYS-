import React, { useState, useEffect } from 'react';
import { LoyaltyMember, LoyaltyStatus, Beneficiary, LoyaltyPayment } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR, formatPhoneMask } from '../../utils/qrUtils';
import {
  Crown,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  CreditCard,
  DollarSign,
  Edit2,
  Trash2,
  X,
  Save,
  MessageSquare,
  UserCheck,
  UserPlus,
  Receipt,
  Sparkles,
  ArrowUpRight,
  MinusCircle,
  Copy,
  Check,
  Link2,
  Share2,
  ExternalLink
} from 'lucide-react';
import { LoyaltyCard } from '../public/LoyaltyCard';

interface AdminLoyaltyProps {
  clinicPhone?: string;
}

export const AdminLoyalty: React.FC<AdminLoyaltyProps> = ({ clinicPhone = '5593991265006' }) => {
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | LoyaltyStatus>('todos');

  // Modals state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<LoyaltyMember | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<LoyaltyMember | null>(null);

  const [cardModalMember, setCardModalMember] = useState<LoyaltyMember | null>(null);

  const [showUseCreditModal, setShowUseCreditModal] = useState(false);
  const [selectedMemberForCredit, setSelectedMemberForCredit] = useState<LoyaltyMember | null>(null);

  // Link Modal state for sales/staff
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedMemberForLink, setSelectedMemberForLink] = useState<LoyaltyMember | null>(null);
  const [customLinkPatientName, setCustomLinkPatientName] = useState('');
  const [customLinkPhone, setCustomLinkPhone] = useState('');
  const [copiedLinkText, setCopiedLinkText] = useState(false);

  const handleOpenLinkModal = (m: LoyaltyMember | null = null) => {
    setSelectedMemberForLink(m);
    setCustomLinkPatientName(m ? m.patientName : '');
    setCustomLinkPhone(m ? m.patientPhone : '');
    setCopiedLinkText(false);
    setShowLinkModal(true);
  };

  // Form states for Member Modal
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formFee, setFormFee] = useState<number>(99);
  const [formDueDay, setFormDueDay] = useState<number>(10);
  const [formInitialBalance, setFormInitialBalance] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<LoyaltyStatus>('ativo');
  const [formNotes, setFormNotes] = useState('');
  const [formBeneficiaries, setFormBeneficiaries] = useState<Beneficiary[]>([]);
  const [newBenName, setNewBenName] = useState('');
  const [newBenRel, setNewBenRel] = useState('Filho(a)');

  // Payment Form state
  const [payMonthYear, setPayMonthYear] = useState('');
  const [payAmount, setPayAmount] = useState<number>(99);
  const [payMethod, setPayMethod] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');
  const [payNotes, setPayNotes] = useState('');

  // Use Credit Form state
  const [useAmount, setUseAmount] = useState<number>(99);
  const [useDesc, setUseDesc] = useState('');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await api.getLoyaltyMembers();
      setMembers(data);
    } catch (err) {
      console.error("Erro ao carregar membros do programa de fidelidade", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Open Member Modal for creation or edit
  const handleOpenMemberModal = (member?: LoyaltyMember) => {
    setFormError('');
    if (member) {
      setEditingMember(member);
      setFormName(member.patientName);
      setFormPhone(member.patientPhone);
      setFormCpf(member.patientCpf || '');
      setFormEmail(member.patientEmail || '');
      setFormAddress(member.patientAddress || '');
      setFormFee(member.monthlyFee || 99);
      setFormDueDay(member.dueDay || 10);
      setFormInitialBalance(member.accumulatedBalance || 0);
      setFormStatus(member.status || 'ativo');
      setFormNotes(member.notes || '');
      setFormBeneficiaries(member.beneficiaries || []);
    } else {
      setEditingMember(null);
      setFormName('');
      setFormPhone('');
      setFormCpf('');
      setFormEmail('');
      setFormAddress('');
      setFormFee(99);
      setFormDueDay(10);
      setFormInitialBalance(0);
      setFormStatus('ativo');
      setFormNotes('');
      setFormBeneficiaries([]);
    }
    setShowMemberModal(true);
  };

  // Add Beneficiary to form state
  const handleAddBeneficiary = () => {
    if (!newBenName.trim()) return;
    const newBen: Beneficiary = {
      id: `ben-${Date.now()}`,
      name: newBenName.trim(),
      relationship: newBenRel
    };
    setFormBeneficiaries([...formBeneficiaries, newBen]);
    setNewBenName('');
  };

  const handleRemoveBeneficiary = (benId: string) => {
    setFormBeneficiaries(formBeneficiaries.filter(b => b.id !== benId));
  };

  // Save Member (Create or Edit)
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Nome e telefone são obrigatórios.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editingMember) {
        await api.updateLoyaltyMember(editingMember.id, {
          patientName: formName.trim(),
          patientPhone: formPhone.trim(),
          patientCpf: formCpf.trim() || undefined,
          patientEmail: formEmail.trim() || undefined,
          patientAddress: formAddress.trim() || undefined,
          monthlyFee: formFee,
          dueDay: formDueDay,
          status: formStatus,
          notes: formNotes.trim() || undefined,
          beneficiaries: formBeneficiaries,
          accumulatedBalance: formInitialBalance
        });
      } else {
        await api.createLoyaltyMember({
          patientName: formName.trim(),
          patientPhone: formPhone.trim(),
          patientCpf: formCpf.trim() || undefined,
          patientEmail: formEmail.trim() || undefined,
          patientAddress: formAddress.trim() || undefined,
          monthlyFee: formFee,
          dueDay: formDueDay,
          accumulatedBalance: formInitialBalance,
          notes: formNotes.trim() || undefined,
          beneficiaries: formBeneficiaries
        });
      }

      setShowMemberModal(false);
      loadMembers();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar paciente no programa.');
    } finally {
      setSaving(false);
    }
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (member: LoyaltyMember) => {
    setSelectedMemberForPayment(member);
    const today = new Date();
    const currentMonthYear = today.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
    setPayMonthYear(currentMonthYear);
    setPayAmount(member.monthlyFee || 99);
    setPayMethod('pix');
    setPayNotes(`Mensalidade ${currentMonthYear}`);
    setFormError('');
    setShowPaymentModal(true);
  };

  // Confirm Payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPayment) return;

    setSaving(true);
    setFormError('');

    try {
      const memberToUpdate = selectedMemberForPayment;
      await api.recordLoyaltyPayment(selectedMemberForPayment.id, {
        monthYear: payMonthYear,
        amount: payAmount,
        paymentMethod: payMethod,
        receiptNotes: payNotes
      });
      setShowPaymentModal(false);
      setCardModalMember(memberToUpdate);
      loadMembers();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setSaving(false);
    }
  };

  // Open Use Credit Modal
  const handleOpenUseCreditModal = (member: LoyaltyMember) => {
    setSelectedMemberForCredit(member);
    setUseAmount(member.monthlyFee || 99);
    setUseDesc('Abatimento de sessão de Pilates / Fisioterapia');
    setFormError('');
    setShowUseCreditModal(true);
  };

  // Confirm Credit Usage
  const handleConfirmUseCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForCredit) return;

    setSaving(true);
    setFormError('');

    try {
      await api.useLoyaltyCredit(selectedMemberForCredit.id, {
        amount: useAmount,
        description: useDesc
      });
      setShowUseCreditModal(false);
      loadMembers();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao utilizar saldo.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Member
  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este paciente do programa de fidelidade?')) return;
    try {
      await api.deleteLoyaltyMember(id);
      loadMembers();
    } catch (err) {
      alert('Erro ao excluir membro.');
    }
  };

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const matchesStatus = statusFilter === 'todos' || m.status === statusFilter;
    const matchesSearch =
      m.patientName.toLowerCase().includes(search.toLowerCase()) ||
      m.patientPhone.includes(search) ||
      (m.patientCpf && m.patientCpf.includes(search));
    return matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const totalActive = members.filter(m => m.status === 'ativo').length;
  const totalOverdue = members.filter(m => m.status === 'inadimplente').length;
  const totalInactive = members.filter(m => m.status === 'inativo').length;
  const mrr = totalActive * 99; // Monthly Recurring Revenue
  const totalAccumulatedBalance = members.reduce((acc, m) => acc + (m.accumulatedBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Title */}
      <div className="bg-[#23372B] text-white p-5 sm:p-6 rounded-2xl border border-[#D0A73B]/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#D0A73B] to-[#F5EED3] text-[#23372B] flex items-center justify-center font-black shadow-md shrink-0">
            <Crown className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-serif font-extrabold text-[#F5EED3]">
                Programa de Fidelidade Recorrente
              </h2>
              <span className="bg-[#D0A73B] text-[#23372B] text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                R$ 99/mês
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5">
              Gestão de Pacientes Cadastrados, Ativos, Inativos, Saldo Acumulado e Mensalidades.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => handleOpenLinkModal(null)}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-xs rounded-xl hover:brightness-110 transition-all flex items-center justify-center space-x-1.5 shadow-md cursor-pointer border border-emerald-400/40"
            title="Gerar / Enviar link de pagamento em cartão de crédito recorrente para colaboradoras venderem pelo WhatsApp"
          >
            <CreditCard className="w-4 h-4 text-amber-300" />
            <span>💳 Link Venda Recorrente Cartão (WhatsApp)</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenMemberModal()}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-[#D0A73B] to-[#EBDC9C] text-[#1B2B22] font-extrabold text-xs rounded-xl hover:brightness-110 transition-all flex items-center justify-center space-x-1.5 shadow-md cursor-pointer border border-[#D0A73B]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Cadastrar Paciente</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#C9D8CB] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ativos</span>
            <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
          </div>
          <span className="text-2xl font-black text-[#23372B]">{totalActive}</span>
          <span className="text-[10px] text-[#5F6D33] block font-semibold">Em dia com o plano</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#C9D8CB] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Em Atraso</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-2xl font-black text-red-600">{totalOverdue}</span>
          <span className="text-[10px] text-red-500 block font-semibold">Pendência financeira</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#C9D8CB] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Inativos</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-600">{totalInactive}</span>
          <span className="text-[10px] text-slate-400 block font-semibold">Pausados / Cancelados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#C9D8CB] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Receita Recorrente</span>
            <DollarSign className="w-4 h-4 text-[#D0A73B]" />
          </div>
          <span className="text-xl font-black text-[#31523D]">{formatCurrency(mrr)}</span>
          <span className="text-[10px] text-slate-500 block font-semibold">Previsão Mensal (MRR)</span>
        </div>

        <div className="bg-[#F5EED3]/80 p-4 rounded-xl border border-[#D0A73B] shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#7E611D] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Saldo Total Pacientes</span>
            <Crown className="w-4 h-4 text-[#D0A73B]" />
          </div>
          <span className="text-xl font-black text-[#23372B]">{formatCurrency(totalAccumulatedBalance)}</span>
          <span className="text-[10px] text-[#7E611D] block font-semibold">Disponível em carteira</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#C9D8CB] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Nome, Tel ou CPF..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'todos' ? 'bg-[#31523D] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ativo')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'ativo' ? 'bg-[#25D366] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ativos ({totalActive})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inadimplente')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'inadimplente' ? 'bg-red-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Em Atraso ({totalOverdue})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inativo')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'inativo' ? 'bg-slate-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inativos ({totalInactive})
          </button>
        </div>
      </div>

      {/* Loyalty Members Table */}
      <div className="bg-white rounded-2xl border border-[#C9D8CB] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-semibold">
            Carregando assinantes do programa...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhum paciente encontrado com esses filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F7F4] text-[11px] font-extrabold text-[#31523D] uppercase border-b border-[#C9D8CB]">
                  <th className="p-3.5">Paciente Assinante</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Vencimento</th>
                  <th className="p-3.5">Saldo Disponível</th>
                  <th className="p-3.5">Beneficiários (2º Grau)</th>
                  <th className="p-3.5 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Patient info */}
                    <td className="p-3.5">
                      <div className="font-extrabold text-[#23372B]">{m.patientName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                        <span>{m.patientPhone}</span>
                        {m.patientCpf && <span>• CPF: {m.patientCpf}</span>}
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="p-3.5">
                      <div className="space-y-1">
                        {m.status === 'ativo' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#25D366]/20 text-[#1B2B22] border border-[#25D366]/50">
                            <CheckCircle2 className="w-3 h-3 text-[#25D366]" />
                            <span>Ativo</span>
                          </span>
                        )}
                        {m.status === 'inadimplente' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            <span>Em Atraso</span>
                          </span>
                        )}
                        {m.status === 'inativo' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                            <span>Inativo</span>
                          </span>
                        )}

                        {m.recurringBilling ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 block w-fit">
                            <CreditCard className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>Cartão Recorrente (**** {m.cardLast4 || '8842'})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 block w-fit">
                            <span>⚡ PIX / Manual</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Due day */}
                    <td className="p-3.5">
                      <span className="font-bold text-slate-700">Dia {m.dueDay}</span>
                      <span className="text-[10px] text-slate-400 block">{formatCurrency(m.monthlyFee)}/mês</span>
                    </td>

                    {/* Balance */}
                    <td className="p-3.5">
                      <span className="text-sm font-black text-[#31523D] bg-[#E4EBE4] px-2.5 py-1 rounded-lg border border-[#769E82]/30 inline-block">
                        {formatCurrency(m.accumulatedBalance)}
                      </span>
                    </td>

                    {/* Beneficiaries */}
                    <td className="p-3.5">
                      {m.beneficiaries && m.beneficiaries.length > 0 ? (
                        <div className="space-y-0.5">
                          {m.beneficiaries.map((b) => (
                            <span key={b.id} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium inline-block mr-1">
                              {b.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sem dependentes</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenLinkModal(m)}
                        className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold rounded-lg transition-all shadow-2xs inline-flex items-center space-x-1 cursor-pointer border border-emerald-500/30"
                        title="Enviar / Copiar Link de Cartão Recorrente (WhatsApp)"
                      >
                        <CreditCard className="w-3 h-3 text-amber-300" />
                        <span>Link Cartão</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCardModalMember(m)}
                        className="px-2.5 py-1.5 bg-gradient-to-r from-[#18291F] to-[#284232] text-[#EBDC9C] hover:brightness-110 text-[11px] font-extrabold rounded-lg transition-all shadow-2xs inline-flex items-center space-x-1 border border-[#D0A73B]/50 cursor-pointer"
                        title="Ver / Enviar Cartão Fidelidade"
                      >
                        <Crown className="w-3 h-3 text-[#D0A73B]" />
                        <span>Cartão</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(m)}
                        className="px-2.5 py-1.5 bg-[#31523D] hover:bg-[#23372B] text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs inline-flex items-center space-x-1 cursor-pointer"
                        title="Registrar mensalidade de R$ 99"
                      >
                        <Receipt className="w-3 h-3 text-[#D0A73B]" />
                        <span>+ R$ 99</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenUseCreditModal(m)}
                        className="px-2.5 py-1.5 bg-[#F5EED3] hover:bg-[#EBDC9C] text-[#23372B] text-[11px] font-bold rounded-lg transition-all border border-[#D0A73B] inline-flex items-center space-x-1 cursor-pointer"
                        title="Abater/utilizar saldo do paciente"
                      >
                        <MinusCircle className="w-3 h-3 text-[#31523D]" />
                        <span>Abater Saldo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenMemberModal(m)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-block cursor-pointer"
                        title="Editar cadastro do paciente"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMember(m.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors inline-block cursor-pointer"
                        title="Excluir membro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create or Edit Loyalty Member */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#C9D8CB] space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#23372B] flex items-center space-x-2">
                <Crown className="w-5 h-5 text-[#D0A73B]" />
                <span>{editingMember ? 'Editar Assinante do Programa' : 'Cadastrar Novo Assinante (R$ 99/mês)'}</span>
              </h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Paciente *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Maria Aparecida Silva"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(formatPhoneMask(e.target.value))}
                    placeholder="(93) 99188-4422"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="paciente@email.com"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro, Cidade/UF"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF (Opcional)</label>
                  <input
                    type="text"
                    value={formCpf}
                    onChange={(e) => setFormCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status do Plano</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as LoyaltyStatus)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="ativo">Ativo (Em dia)</option>
                    <option value="inadimplente">Inadimplente (Em atraso)</option>
                    <option value="inativo">Inativo (Pausado/Cancelado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    value={formFee}
                    onChange={(e) => setFormFee(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-[#31523D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dia do Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formDueDay}
                    onChange={(e) => setFormDueDay(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    value={formInitialBalance}
                    onChange={(e) => setFormInitialBalance(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-[#31523D]"
                  />
                </div>
              </div>

              {/* Beneficiaries Box */}
              <div className="p-3 bg-[#F4F7F4] rounded-2xl border border-[#C9D8CB] space-y-2">
                <span className="font-bold text-[#23372B] block">
                  Beneficiários Autorizados (Filhos e Parentes de 2º Grau):
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBenName}
                    onChange={(e) => setNewBenName(e.target.value)}
                    placeholder="Nome do Filho/Parente"
                    className="flex-1 p-2 rounded-xl border border-slate-300 bg-white"
                  />
                  <select
                    value={newBenRel}
                    onChange={(e) => setNewBenRel(e.target.value)}
                    className="p-2 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="Filho(a)">Filho(a)</option>
                    <option value="Mãe / Pai (1º grau)">Mãe / Pai (1º grau)</option>
                    <option value="Irmão(ã) (2º grau)">Irmão(ã) (2º grau)</option>
                    <option value="Avô / Avó (2º grau)">Avô / Avó (2º grau)</option>
                    <option value="Neto(a) (2º grau)">Neto(a) (2º grau)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddBeneficiary}
                    className="px-3 py-2 bg-[#31523D] text-white rounded-xl font-bold hover:bg-[#23372B]"
                  >
                    +
                  </button>
                </div>

                {formBeneficiaries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formBeneficiaries.map((b) => (
                      <span key={b.id} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[#23372B] font-semibold">
                        <span>{b.name} ({b.relationship})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBeneficiary(b.id)}
                          className="text-red-500 font-black ml-1 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações do Cadastro</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Utiliza o saldo compartilhado para sessões do filho."
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#31523D] hover:bg-[#23372B] text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4 text-[#D0A73B]" />
                  <span>{saving ? 'Salvando...' : 'Salvar Assinante'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Monthly Payment (R$ 99.00) */}
      {showPaymentModal && selectedMemberForPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#C9D8CB] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#23372B] flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-[#31523D]" />
                <span>Registrar Pagamento de Mensalidade</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F4F7F4] rounded-xl border border-[#C9D8CB] text-xs">
              <span className="text-slate-500">Paciente Assinante:</span>
              <p className="font-extrabold text-[#23372B] text-sm">{selectedMemberForPayment.patientName}</p>
              <p className="text-slate-500">Saldo Atual: <strong className="text-[#31523D]">{formatCurrency(selectedMemberForPayment.accumulatedBalance)}</strong></p>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mês / Ano Referência *</label>
                <input
                  type="text"
                  required
                  value={payMonthYear}
                  onChange={(e) => setPayMonthYear(e.target.value)}
                  placeholder="Ex: 08/2026"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-black text-[#31523D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="pix">PIX Instantâneo</option>
                    <option value="cartao">Cartão de Crédito/Débito</option>
                    <option value="dinheiro">Dinheiro na Recepção</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Anotação do Recibo</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ex: Mensalidade 08/2026 paga via PIX"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="p-3 bg-[#F5EED3] rounded-xl border border-[#D0A73B]/60 text-[11px] text-[#7E611D]">
                ✨ <strong>Benefício do Cliente:</strong> Ao confirmar, <strong>+ {formatCurrency(payAmount)}</strong> serão adicionados automaticamente ao saldo acumulado do paciente para abatimento em atendimentos.
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#31523D] hover:bg-[#23372B] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {saving ? 'Registrando...' : 'Confirmar e Creditar + R$ 99'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Deduct / Use Patient Balance */}
      {showUseCreditModal && selectedMemberForCredit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#C9D8CB] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#23372B] flex items-center space-x-2">
                <MinusCircle className="w-5 h-5 text-[#31523D]" />
                <span>Abater Saldo do Paciente</span>
              </h3>
              <button onClick={() => setShowUseCreditModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F4F7F4] rounded-xl border border-[#C9D8CB] text-xs space-y-1">
              <span className="text-slate-500">Paciente Assinante:</span>
              <p className="font-extrabold text-[#23372B] text-sm">{selectedMemberForCredit.patientName}</p>
              <p className="text-slate-600 font-bold">
                Saldo Disponível Atual: <span className="text-[#31523D]">{formatCurrency(selectedMemberForCredit.accumulatedBalance)}</span>
              </p>
            </div>

            <form onSubmit={handleConfirmUseCredit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor a Abater (R$) *</label>
                <input
                  type="number"
                  required
                  max={selectedMemberForCredit.accumulatedBalance}
                  value={useAmount}
                  onChange={(e) => setUseAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-black text-red-600 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição / Serviço Atendido *</label>
                <input
                  type="text"
                  required
                  value={useDesc}
                  onChange={(e) => setUseDesc(e.target.value)}
                  placeholder="Ex: Sessão de Pilates do filho Gabriel"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUseCreditModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#31523D] hover:bg-[#23372B] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {saving ? 'Abatendo...' : 'Confirmar Abatimento de Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Cartão Fidelidade Digital Viewer & WhatsApp/Email Share */}
      {cardModalMember && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative space-y-4">
            <button
              type="button"
              onClick={() => setCardModalMember(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#5F6D33]">
                Clube de Vantagens Fisiolys
              </span>
              <h3 className="text-lg font-serif font-extrabold text-[#23372B]">
                Cartão Fidelidade Oficial
              </h3>
              <p className="text-xs text-slate-500">
                Abaixo você pode visualizar e enviar o cartão digital com a mascote Lys para o WhatsApp ou E-mail do paciente.
              </p>
            </div>

            <div className="pt-1">
              <LoyaltyCard member={cardModalMember} clinicPhone={clinicPhone} showActions={true} />
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setCardModalMember(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 5: Venda Facilitada - Link de Cartão Recorrente R$ 99 para Colaboradoras */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative space-y-4">
            <button
              type="button"
              onClick={() => setShowLinkModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0">
                <CreditCard className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 block">
                  Venda Facilitada para Colaboradoras
                </span>
                <h3 className="text-base font-serif font-extrabold text-[#23372B]">
                  Link de Pagamento Recorrente Cartão (R$ 99)
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Utilize esta ferramenta para enviar o link de assinatura em cartão de crédito recorrente para o paciente via WhatsApp. O valor de R$ 99/mês será cobrado automaticamente no cartão dele todo mês.
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Paciente / Cliente:
                </label>
                <input
                  type="text"
                  value={customLinkPatientName}
                  onChange={(e) => setCustomLinkPatientName(e.target.value)}
                  placeholder="Ex: Maria Oliveira"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefone / WhatsApp do Paciente:
                </label>
                <input
                  type="tel"
                  value={customLinkPhone}
                  onChange={(e) => setCustomLinkPhone(e.target.value)}
                  placeholder="(93) 99126-5006"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Link Generated Preview */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Link de Checkout Recorrente Gerado:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?fidelidade=recorrente${selectedMemberForLink ? `&memberId=${selectedMemberForLink.id}` : ''}${customLinkPatientName ? `&nome=${encodeURIComponent(customLinkPatientName)}` : ''}${customLinkPhone ? `&phone=${encodeURIComponent(customLinkPhone)}` : ''}`}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/50 font-mono text-[11px] font-bold text-emerald-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const link = `${window.location.origin}/?fidelidade=recorrente${selectedMemberForLink ? `&memberId=${selectedMemberForLink.id}` : ''}${customLinkPatientName ? `&nome=${encodeURIComponent(customLinkPatientName)}` : ''}${customLinkPhone ? `&phone=${encodeURIComponent(customLinkPhone)}` : ''}`;
                      navigator.clipboard.writeText(link);
                      setCopiedLinkText(true);
                      setTimeout(() => setCopiedLinkText(false), 2500);
                    }}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center space-x-1 shrink-0 cursor-pointer"
                  >
                    {copiedLinkText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLinkText ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Text Message Preview */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mensagem Pronta para Envio:
                </label>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 leading-snug whitespace-pre-line">
                  {`Olá${customLinkPatientName ? `, *${customLinkPatientName}*` : ''}! 🌿 Aqui está seu link exclusivo para assinar o *Clube de Vantagens Fisiolys* no *Cartão de Crédito com Cobrança Automática Recorrente* (R$ 99,00/mês):\n\n👉 ${window.location.origin}/?fidelidade=recorrente${selectedMemberForLink ? `&memberId=${selectedMemberForLink.id}` : ''}${customLinkPatientName ? `&nome=${encodeURIComponent(customLinkPatientName)}` : ''}${customLinkPhone ? `&phone=${encodeURIComponent(customLinkPhone)}` : ''}\n\nAtivando no cartão, você garante R$ 99,00 de saldo todo mês para usar em Pilates, Fisioterapia ou Massoterapia, extensível para seus filhos e parentes de 2º grau. Qualquer dúvida estou à disposição!`}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = (customLinkPhone || clinicPhone).replace(/\D/g, '');
                  const link = `${window.location.origin}/?fidelidade=recorrente${selectedMemberForLink ? `&memberId=${selectedMemberForLink.id}` : ''}${customLinkPatientName ? `&nome=${encodeURIComponent(customLinkPatientName)}` : ''}${customLinkPhone ? `&phone=${encodeURIComponent(customLinkPhone)}` : ''}`;
                  const msg = `Olá${customLinkPatientName ? `, *${customLinkPatientName}*` : ''}! 🌿 Aqui está seu link exclusivo para assinar o *Clube de Vantagens Fisiolys* no *Cartão de Crédito com Cobrança Automática Recorrente* (R$ 99,00/mês):\n\n👉 ${link}\n\nAtivando no cartão, você garante R$ 99,00 de saldo todo mês para usar em Pilates, Fisioterapia ou Massoterapia, extensível para seus filhos e parentes de 2º grau. Qualquer dúvida estou à disposição!`;
                  window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Directo no WhatsApp do Paciente</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/?fidelidade=recorrente${selectedMemberForLink ? `&memberId=${selectedMemberForLink.id}` : ''}${customLinkPatientName ? `&nome=${encodeURIComponent(customLinkPatientName)}` : ''}${customLinkPhone ? `&phone=${encodeURIComponent(customLinkPhone)}` : ''}`;
                    const msg = `Olá${customLinkPatientName ? `, *${customLinkPatientName}*` : ''}! 🌿 Aqui está seu link exclusivo para assinar o *Clube de Vantagens Fisiolys* no *Cartão de Crédito com Cobrança Automática Recorrente* (R$ 99,00/mês):\n\n👉 ${link}\n\nAtivando no cartão, você garante R$ 99,00 de saldo todo mês para usar em Pilates, Fisioterapia ou Massoterapia, extensível para seus filhos e parentes de 2º grau. Qualquer dúvida estou à disposição!`;
                    navigator.clipboard.writeText(msg);
                    setCopiedLinkText(true);
                    setTimeout(() => setCopiedLinkText(false), 2500);
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  {copiedLinkText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLinkText ? 'Texto Copiado!' : 'Copiar Texto Completo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="w-28 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
