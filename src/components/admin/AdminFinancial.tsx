import React, { useState, useEffect } from 'react';
import { Appointment, ClinicConfig, LoyaltyMember, Patient } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR } from '../../utils/qrUtils';
import { Logo } from '../Logo';
import { getDoctorCpf, DEFAULT_DOCTOR_CPF } from '../../utils/securityUtils';
import { ReceiptData, triggerDirectReceiptPrint, buildReceiptHTML } from '../../utils/printUtils';
import { downloadReceiptPDF, printReceiptPDF, shareReceiptViaWhatsApp } from '../../utils/pdfGenerator';
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
  ChevronRight,
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Receipt,
  X,
  Calendar,
  UserCheck,
  IdCard
} from 'lucide-react';

interface AdminFinancialProps {
  clinic: ClinicConfig;
  appointments: Appointment[];
  patients?: Patient[];
  initialTab?: 'pendentes' | 'recebidos';
  onReload?: () => void;
}

interface PendingItem {
  id: string;
  patientName: string;
  patientPhone: string;
  patientCpf?: string;
  type: 'pilates_atendimento' | 'fidelidade_mensal';
  title: string;
  dateOrDue: string;
  amount: number;
  rawObject: Appointment | LoyaltyMember;
  status: 'pendente' | 'atrasado';
}

export const AdminFinancial: React.FC<AdminFinancialProps> = ({ clinic, appointments, patients = [], initialTab = 'pendentes', onReload }) => {
  const [loyaltyMembers, setLoyaltyMembers] = useState<LoyaltyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'recebidos'>(initialTab);
  const [filterType, setFilterType] = useState<'todos' | 'pilates' | 'fidelidade'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sync initialTab if prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Template message, CPF & payment links customization
  const [doctorCpf, setDoctorCpf] = useState<string>(() => {
    return getDoctorCpf(clinic.managerCpf || DEFAULT_DOCTOR_CPF);
  });
  const [customPixKey, setCustomPixKey] = useState(clinic.phone || '(93) 99126-5006');
  const [customCardLink, setCustomCardLink] = useState(() => {
    return clinic.customAppUrl ? `${clinic.customAppUrl.replace(/\/+$/, '')}/pagamento` : 'https://fisiolys.app/pagamento-cartao';
  });

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Manual Receipt Form State (Emitir Recibo para Qualquer Paciente)
  const [isManualReceiptModalOpen, setIsManualReceiptModalOpen] = useState(false);
  const [manualRecPatientName, setManualRecPatientName] = useState('');
  const [manualRecPatientPhone, setManualRecPatientPhone] = useState('');
  const [manualRecPatientCpf, setManualRecPatientCpf] = useState('');
  const [manualRecServiceName, setManualRecServiceName] = useState('Pilates Clínico / Fisioterapia');
  const [manualRecAmount, setManualRecAmount] = useState<string>('99.00');
  const [manualRecDate, setManualRecDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualRecPaymentMethod, setManualRecPaymentMethod] = useState<string>('PIX');
  const [manualRecNotes, setManualRecNotes] = useState<string>('');

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
      if (app.status === 'agendado') {
        pendingItems.push({
          id: `appt_${app.id}`,
          patientName: app.patientName,
          patientPhone: app.patientPhone,
          patientCpf: app.patientCpf,
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
        patientCpf: member.patientCpf,
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

  // Confirmed lists for the "Recebidos & Recibos" tab
  const confirmedAppts = appointments.filter((a) => a.status === 'concluido');
  const confirmedLoyaltyPayments: { member: LoyaltyMember; monthYear: string; amount: number; paymentMethod?: string; paidAt?: string }[] = [];
  loyaltyMembers.forEach((member) => {
    (member.payments || []).forEach((p) => {
      confirmedLoyaltyPayments.push({
        member,
        monthYear: p.monthYear,
        amount: p.amount || 99,
        paymentMethod: p.paymentMethod || 'Cartão Recorrente',
        paidAt: p.paidAt
      });
    });
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

  // 1. Send Credit Card Payment Link via WhatsApp
  const sendCreditCardLink = (item: PendingItem) => {
    setSendingId(item.id);
    const cleanPhone = item.patientPhone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const cardUrl = customCardLink.trim() || 'https://fisiolys.app/pagamento-cartao';

    let message = '';
    if (item.type === 'pilates_atendimento') {
      message = `Olá *${item.patientName}*! Tudo bem?\n\nPassando para enviar o seu link de pagamento via *Cartão de Crédito* referente ao atendimento de *${item.title}* na ${clinic.name || 'Clínica Fisiolys'}.\n\n💰 *Valor:* ${formatCurrency(item.amount)}\n🗓️ *Data/Vencimento:* ${formatDatePtBR(item.dateOrDue)}\n\n💳 *LINK PARA PAGAMENTO NO CARTÃO:*\n${cardUrl}\n\n✨ *Diferencial:* No pagamento recorrente, é debitado apenas o valor mensal sem comprometer o limite total do seu cartão! Se precisar de algo, estou à disposição. 😊🌸`;
    } else {
      message = `Olá *${item.patientName}*! Tudo bem?\n\nSegue o link seguro para renovação da mensalidade do seu *Clube de Fidelidade R$ 99/mês* na ${clinic.name || 'Clínica Fisiolys'}:\n\n👑 *Plano:* Clube de Fidelidade Recorrente\n💰 *Valor:* ${formatCurrency(item.amount)}\n\n💳 *LINK DE PAGAMENTO NO CARTÃO:*\n${cardUrl}\n\n✨ *Sem Bloquear seu Limite:* É descontado apenas R$ 99 por mês no cartão, mantendo todo o seu limite livre! Qualquer dúvida, estamos aqui. 💚`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    setActionSuccess(`Link de Cartão enviado via WhatsApp para ${item.patientName}!`);
    setTimeout(() => {
      setSendingId(null);
      setActionSuccess(null);
    }, 3000);
  };

  // 2. Send PIX Charge via WhatsApp
  const sendPixCharge = (item: PendingItem) => {
    setSendingId(item.id);
    const cleanPhone = item.patientPhone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    let message = '';
    if (item.type === 'pilates_atendimento') {
      message = `Olá *${item.patientName}*! Tudo bem?\n\nPassando para enviar a chave Pix para pagamento de *${item.title}* na ${clinic.name || 'Clínica Fisiolys'}.\n\n💰 *Valor:* ${formatCurrency(item.amount)}\n🗓️ *Data/Vencimento:* ${formatDatePtBR(item.dateOrDue)}\n\n💠 *CHAVE PIX (CELULAR):*\n\`${customPixKey}\`\n\n📌 *Favorecido:* ${clinic.managerName || 'Dra. Elays Marinho'}\n\nAssim que realizar a transferência, por favor nos envie o comprovante por aqui. Muito obrigada! 😊✨`;
    } else {
      message = `Olá *${item.patientName}*! Tudo bem?\n\nPassando para lembrar da mensalidade do seu *Clube de Fidelidade R$ 99/mês* na ${clinic.name || 'Clínica Fisiolys'}.\n\n👑 *Plano:* Clube de Fidelidade\n💰 *Valor:* ${formatCurrency(item.amount)}\n\n💠 *CHAVE PIX:*\n\`${customPixKey}\`\n📌 *Favorecido:* ${clinic.managerName || 'Dra. Elays Marinho'}\n\nAo concluir, basta nos mandar o comprovante por aqui. Agradecemos a parceria de sempre! 🌸`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    setActionSuccess(`Cobrança Pix enviada via WhatsApp para ${item.patientName}!`);
    setTimeout(() => {
      setSendingId(null);
      setActionSuccess(null);
    }, 3000);
  };

  // 3. Trigger Full WhatsApp Reminder (Cartão + Pix)
  const sendWhatsAppReminder = (item: PendingItem) => {
    setSendingId(item.id);
    const cleanPhone = item.patientPhone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const cardUrl = customCardLink.trim() || 'https://fisiolys.app/pagamento-cartao';

    let message = '';
    if (item.type === 'pilates_atendimento') {
      message = `Olá *${item.patientName}*! Tudo bem?\n\nPassando para lembrar referente ao seu agendamento/mensalidade de *${item.title}* na ${clinic.name || 'Clínica Fisiolys'}.\n\n💰 *Valor:* ${formatCurrency(item.amount)}\n🗓️ *Data/Vencimento:* ${formatDatePtBR(item.dateOrDue)}\n\n💳 *OPÇÕES DE PAGAMENTO PRÁTICO:*\n1. *Pix Instantâneo:* Chave celular \`${customPixKey}\`\n2. *Cartão de Crédito:* ${cardUrl} (Desconta *apenas a parcela mensal* sem comprometer o limite total do cartão!)\n\nPor favor, nos envie o comprovante por aqui assim que efetuar. Se precisar de ajuda, estou à disposição! 😊✨`;
    } else {
      message = `Olá *${item.patientName}*! Tudo bem?\n\nIdentificamos uma pendência na sua mensalidade do *Clube de Fidelidade R$ 99/mês* na ${clinic.name || 'Clínica Fisiolys'}.\n\n👑 *Plano:* Clube de Fidelidade Recorrente\n💰 *Valor:* ${formatCurrency(item.amount)}\n\n💳 *PAGUE FÁCIL:*\n1. *Cartão de Crédito Recorrente:* ${cardUrl} (apenas R$ 99/mês debitado, preservando seu limite)\n2. *Chave Pix:* \`${customPixKey}\`\n\nCaso já tenha realizado o pagamento, desconsidere esta mensagem. Muito obrigada! 🌸`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    setActionSuccess(`Lembrete completo enviado via WhatsApp para ${item.patientName}!`);
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

  // Generate Receipt Data from Pending Item
  const handleOpenReceiptFromPending = (item: PendingItem) => {
    const receiptNum = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setSelectedReceipt({
      title: item.type === 'fidelidade_mensal' ? 'Recibo - Clube de Fidelidade' : 'Recibo de Atendimento & Sessão',
      patientName: item.patientName,
      patientPhone: item.patientPhone,
      patientCpf: item.patientCpf,
      serviceName: item.title,
      amount: item.amount,
      date: item.dateOrDue,
      paymentMethod: item.type === 'fidelidade_mensal' ? 'Cartão de Crédito Recorrente' : 'PIX / Cartão de Crédito',
      receiptNumber: receiptNum,
      status: 'pendente',
      notes: 'Demonstrativo de cobrança e quitação da Clínica Fisiolys.'
    });
  };

  // Generate Receipt Data from Confirmed Appointment
  const handleOpenReceiptFromAppt = (appt: Appointment) => {
    const receiptNum = `REC-${appt.id.replace(/\D/g, '').slice(-4) || '2026'}`;
    setSelectedReceipt({
      title: 'Recibo Oficial de Atendimento',
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      patientCpf: appt.patientCpf,
      serviceName: appt.serviceName,
      amount: appt.servicePrice || 0,
      date: appt.date,
      paymentMethod: (appt.paymentMethod || 'PIX').toUpperCase(),
      receiptNumber: receiptNum,
      status: 'concluido',
      notes: `Atendimento realizado com Dra. Elays Marinho às ${appt.time}h.`
    });
  };

  // Generate Receipt Data from Loyalty Payment
  const handleOpenReceiptFromLoyalty = (member: LoyaltyMember, monthYear: string, amount: number, paymentMethod?: string, paidAt?: string) => {
    const receiptNum = `FID-${member.id.replace(/\D/g, '').slice(-4) || '9901'}`;
    setSelectedReceipt({
      title: 'Recibo de Mensalidade - Clube de Fidelidade',
      patientName: member.patientName,
      patientPhone: member.patientPhone,
      patientCpf: member.patientCpf,
      serviceName: `Clube de Fidelidade Fisiolys (Ref. ${monthYear})`,
      amount: amount,
      date: paidAt || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || 'Cartão de Crédito Recorrente',
      receiptNumber: receiptNum,
      status: 'concluido',
      notes: 'Mensalidade quitada. Saldo e benefícios do Clube liberados.'
    });
  };

  // Print / View Official PDF Receipt Function
  const handlePrintReceiptDirect = async (receipt: ReceiptData) => {
    try {
      setActionSuccess(`Gerando e preparando recibo em PDF para ${receipt.patientName}...`);
      await printReceiptPDF(receipt, clinic, doctorCpf);
      setActionSuccess(`Recibo oficial em PDF gerado com sucesso!`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err) {
      console.error('Error generating PDF for print', err);
      triggerDirectReceiptPrint(receipt, clinic, doctorCpf);
    }
  };

  // Download official vector PDF file
  const handleDownloadReceiptPDF = async (receipt: ReceiptData) => {
    try {
      setActionSuccess(`Gerando arquivo PDF de ${receipt.patientName}...`);
      const fileName = await downloadReceiptPDF(receipt, clinic, doctorCpf);
      setActionSuccess(`Arquivo "${fileName}" baixado com sucesso!`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err) {
      console.error('Error downloading PDF', err);
      triggerDirectReceiptPrint(receipt, clinic, doctorCpf);
    }
  };

  // Forward Receipt to Patient via WhatsApp with PDF Document Attachment
  const handleForwardReceiptWhatsApp = async (receipt: ReceiptData) => {
    try {
      setActionSuccess(`Processando recibo em PDF para envio via WhatsApp...`);
      const res = await shareReceiptViaWhatsApp(receipt, clinic, doctorCpf);
      if (res.sharedAsFile) {
        setActionSuccess(`Recibo em PDF compartilhado diretamente!`);
      } else {
        setActionSuccess(`📄 Arquivo PDF baixado! A conversa do WhatsApp foi aberta para você enviar o comprovante com o anexo.`);
      }
      setTimeout(() => setActionSuccess(null), 4500);
    } catch (err) {
      console.error('Error in WhatsApp PDF sharing', err);
      // Basic fallback
      const cleanPhone = (receipt.patientPhone || '').replace(/\D/g, '');
      const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const msg = `🧾 *RECIBO OFICIAL DE PAGAMENTO - ${clinic.name || 'Clínica Fisiolys'}*\n\n` +
        `Olá *${receipt.patientName}*! Segue seu comprovante de atendimento:\n\n` +
        `📄 *Nº:* ${receipt.receiptNumber}\n` +
        `💰 *Valor:* ${formatCurrency(receipt.amount)}\n` +
        `🗓️ *Data:* ${formatDatePtBR(receipt.date)}\n` +
        `🏥 *Profissional:* ${clinic.managerName || 'Dra. Elays Marinho'} (${clinic.managerCrefito || 'CREFITO-12'})\n` +
        `🪪 *CPF:* ${doctorCpf}`;
      window.open(`https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  // Copy receipt text to clipboard
  const handleCopyReceiptText = (receipt: ReceiptData) => {
    const text = `RECIBO DE PAGAMENTO - ${clinic.name || 'Clínica Fisiolys'}\n\n` +
      `Nº Recibo: ${receipt.receiptNumber}\n` +
      `Paciente: ${receipt.patientName}\n` +
      `Serviço: ${receipt.serviceName}\n` +
      `Valor: ${formatCurrency(receipt.amount)}\n` +
      `Data: ${formatDatePtBR(receipt.date)}\n` +
      `Forma de Pagamento: ${receipt.paymentMethod}\n` +
      `Profissional: ${clinic.managerName || 'Dra. Elays Marinho'} (CREFITO-12)\n` +
      `CPF da Profissional: ${doctorCpf}\n` +
      `${clinic.address} - ${clinic.city}`;

    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  // Open manual custom receipt modal
  const handleOpenManualReceiptModal = () => {
    setManualRecPatientName('');
    setManualRecPatientPhone('');
    setManualRecPatientCpf('');
    setManualRecServiceName('Sessão de Fisioterapia / Pilates');
    setManualRecAmount('99.00');
    setManualRecDate(new Date().toISOString().split('T')[0]);
    setManualRecPaymentMethod('PIX');
    setManualRecNotes('');
    setIsManualReceiptModalOpen(true);
  };

  // Submit manual custom receipt
  const handleSubmitManualReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRecPatientName.trim()) {
      alert('Por favor, informe o nome do paciente.');
      return;
    }

    const parsedAmount = parseFloat(manualRecAmount.replace(',', '.')) || 0;
    const recNumber = `REC-${Date.now().toString().slice(-6)}`;

    const newReceipt: ReceiptData = {
      title: `Recibo - ${manualRecServiceName}`,
      patientName: manualRecPatientName.trim(),
      patientPhone: manualRecPatientPhone.trim() || clinic.phone || '',
      patientCpf: manualRecPatientCpf.trim() || undefined,
      serviceName: manualRecServiceName.trim(),
      amount: parsedAmount,
      date: manualRecDate || new Date().toISOString().split('T')[0],
      paymentMethod: manualRecPaymentMethod,
      receiptNumber: recNumber,
      status: 'concluido',
      notes: manualRecNotes.trim() || undefined,
    };

    setIsManualReceiptModalOpen(false);
    setSelectedReceipt(newReceipt);
  };

  // Export Complete Financial PDF Report function
  const handleExportFinancialPDF = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para exportar o relatório em PDF.');
      return;
    }

    const nowStr = new Date().toLocaleString('pt-BR');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Financeiro & Contábil - ${clinic.name || 'Dra. Elays Marinho'}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; font-size: 12px; }
            .no-print { display: none; }
          }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 30px; background: #fff; line-height: 1.4; }
          .header { border-bottom: 2px solid #31523D; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .clinic-name { font-size: 20px; font-weight: 800; color: #31523D; margin: 0; }
          .doc-title { font-size: 14px; font-weight: 700; color: #D0A73B; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .meta { font-size: 11px; color: #64748b; text-align: right; }
          
          .kpi-container { display: flex; gap: 15px; margin-bottom: 25px; }
          .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; background: #f8fafc; }
          .kpi-box.pending { border-color: #f59e0b; background: #fffbeb; }
          .kpi-box.confirmed { border-color: #10b981; background: #ecfdf5; }
          .kpi-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .kpi-val { font-size: 18px; font-weight: 900; }
          .kpi-val.green { color: #047857; }
          .kpi-val.amber { color: #b45309; }
          
          h2 { font-size: 13px; font-weight: 800; color: #0f172a; border-left: 4px solid #31523D; padding-left: 8px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { background-color: #31523D; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
          td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; text-transform: uppercase; }
          .badge-pendente { background: #fef3c7; color: #92400e; }
          .badge-atrasado { background: #ffe4e6; color: #9f1239; }
          .badge-pago { background: #d1fae5; color: #065f46; }
          
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #64748b; }
          .sign-line { width: 200px; border-top: 1px solid #0f172a; text-align: center; padding-top: 4px; font-weight: 700; color: #0f172a; }
          .btn-print { background: #31523D; color: #fff; border: none; padding: 10px 20px; font-weight: 700; border-radius: 6px; cursor: pointer; margin-bottom: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right;">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir ou Salvar em PDF</button>
        </div>
        
        <div class="header">
          <div>
            <h1 class="clinic-name">${clinic.name || 'Clínica Fisiolys'}</h1>
            <div class="doc-title">Relatório de Controle Financeiro & Contábil</div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px;">Fisioterapia Pélvica, Obstétrica & Studio Pilates</div>
          </div>
          <div class="meta">
            <div><strong>Data de Emissão:</strong> ${nowStr}</div>
            <div><strong>Emitido por:</strong> Gestão Financeira</div>
            <div><strong>Contato:</strong> ${clinic.phone || ''}</div>
          </div>
        </div>

        <div class="kpi-container">
          <div class="kpi-box confirmed">
            <div class="kpi-title">Total Recebido (Confirmado)</div>
            <div class="kpi-val green">${formatCurrency(totalConfirmedRevenue)}</div>
            <div style="font-size: 10px; color: #047857; margin-top: 2px;">${confirmedAppts.length + confirmedLoyaltyPayments.length} lançamento(s) concluído(s)</div>
          </div>
          <div class="kpi-box pending">
            <div class="kpi-title">Total Pendente / Atrasado</div>
            <div class="kpi-val amber">${formatCurrency(totalPendingAmount)}</div>
            <div style="font-size: 10px; color: #b45309; margin-top: 2px;">${pendingItems.length} pendência(s) em aberto</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Balanço Estimado Total</div>
            <div class="kpi-val" style="color: #1e293b;">${formatCurrency(totalConfirmedRevenue + totalPendingAmount)}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Pilates + Clube de Fidelidade</div>
          </div>
        </div>

        <h2>1. Detalhamento de Cobranças Pendentes & Atrasadas</h2>
        ${pendingItems.length === 0 ? '<p style="font-size: 11px; color: #059669; font-weight: bold; padding: 10px; background: #ecfdf5; border-radius: 6px;">Nenhuma pendência financeira encontrada no momento.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Telefone</th>
                <th>Tipo / Serviço</th>
                <th>Vencimento / Data</th>
                <th>Status</th>
                <th style="text-align: right;">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${pendingItems.map((item) => `
                <tr>
                  <td><strong>${item.patientName}</strong></td>
                  <td>${item.patientPhone}</td>
                  <td>${item.title}</td>
                  <td>${formatDatePtBR(item.dateOrDue)}</td>
                  <td><span class="badge badge-${item.status}">${item.status.toUpperCase()}</span></td>
                  <td style="text-align: right; font-weight: bold; color: #b45309;">${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="5" style="text-align: right;">Subtotal Pendente:</td>
                <td style="text-align: right; color: #b45309; font-size: 12px;">${formatCurrency(totalPendingAmount)}</td>
              </tr>
            </tfoot>
          </table>
        `}

        <h2>2. Detalhamento de Pagamentos Recebidos & Confirmados</h2>
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Origem / Serviço</th>
              <th>Data / Referência</th>
              <th>Status</th>
              <th style="text-align: right;">Valor Recebido (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${confirmedAppts.map((app) => `
              <tr>
                <td><strong>${app.patientName}</strong></td>
                <td>Sessão: ${app.serviceName}</td>
                <td>${formatDatePtBR(app.date)}</td>
                <td><span class="badge badge-pago">CONCLUÍDO</span></td>
                <td style="text-align: right; font-weight: bold; color: #047857;">${formatCurrency(app.servicePrice || 0)}</td>
              </tr>
            `).join('')}
            ${confirmedLoyaltyPayments.map((p) => `
              <tr>
                <td><strong>${p.member.patientName}</strong></td>
                <td>Clube Fidelidade (${p.paymentMethod})</td>
                <td>Ref. ${p.monthYear}</td>
                <td><span class="badge badge-pago">PAGO</span></td>
                <td style="text-align: right; font-weight: bold; color: #047857;">${formatCurrency(p.amount)}</td>
              </tr>
            `).join('')}
            ${confirmedAppts.length === 0 && confirmedLoyaltyPayments.length === 0 ? `
              <tr>
                <td colspan="5" style="text-align: center; color: #94a3b8; padding: 15px;">Nenhum recebimento confirmado no histórico recente.</td>
              </tr>
            ` : ''}
          </tbody>
          <tfoot>
            <tr style="background: #ecfdf5; font-weight: bold;">
              <td colspan="4" style="text-align: right;">Subtotal Recebido:</td>
              <td style="text-align: right; color: #047857; font-size: 12px;">${formatCurrency(totalConfirmedRevenue)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>
            <div>Documento oficial de auditoria contábil e controle financeiro.</div>
            <div>${clinic.name || 'Clínica Fisiolys'} — Sistema de Gestão Integrada</div>
          </div>
          <div style="text-align: center;">
            <div style="height: 35px;"></div>
            <div class="sign-line">Assinatura / Visto do Responsável</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#31523D] text-[#D0A73B] uppercase tracking-wider">
              Gestão Financeira & Cobrança
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Cartão Recorrente + PIX + Recibos em PDF
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-800 mt-2">
            Painel de Controle Financeiro & Emissão de Recibos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Envie links de pagamento no <strong>Cartão de Crédito</strong> e chaves <strong>PIX</strong> diretamente no WhatsApp dos pacientes, gere <strong>Recibos em PDF</strong> com 1 clique e acompanhe o fluxo de caixa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-export-financial-pdf"
            onClick={handleExportFinancialPDF}
            className="px-4 py-2.5 bg-[#31523D] hover:bg-[#25402e] text-[#D0A73B] text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center space-x-1.5 shadow-2xs hover:shadow-xs cursor-pointer border border-[#D0A73B]/30"
          >
            <Printer className="w-4 h-4 text-[#D0A73B]" />
            <span>Relatório Geral PDF</span>
          </button>

          <button
            onClick={() => {
              fetchLoyalty();
              if (onReload) onReload();
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-2xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            title="Atualizar dados financeiros"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
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
            {pendingItems.length} cobrança{pendingItems.length !== 1 ? 's' : ''} em aberto
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

      {/* QUICK CONFIGURATION BAR: Chave Pix, Link do Cartão & CPF da Dra. Elays */}
      <div className="bg-gradient-to-r from-[#F5EED3] via-white to-[#EAF0DB] p-5 rounded-3xl border-2 border-[#D0A73B] shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center shrink-0 shadow-xs font-black">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold text-[#23372B]">
                  Configuração de Cobrança, Recibos & Dados Fiscais (Dra. Elays)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D0A73B] text-[#1B2B22]">
                  Recibos & WhatsApp
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Estes dados são aplicados automaticamente em todos os <strong>Recibos Oficiais</strong>, <strong>PDFs</strong>, e cobranças via <strong>Cartão</strong> ou <strong>PIX</strong> no WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* CPF da Dra. Elays */}
            <div className="bg-white p-2.5 rounded-xl border border-[#D0A73B]/50 shadow-2xs flex-1 sm:flex-initial">
              <label className="text-[10px] font-extrabold text-[#31523D] uppercase flex items-center space-x-1 mb-1">
                <IdCard className="w-3 h-3 text-[#D0A73B]" />
                <span>CPF da Dra. Elays (Recibos)</span>
              </label>
              <input
                type="text"
                value={doctorCpf}
                onChange={(e) => {
                  const val = e.target.value;
                  setDoctorCpf(val);
                  localStorage.setItem('fisiolys_dr_cpf', val);
                }}
                placeholder="000.000.000-00"
                className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 w-full sm:w-36 focus:outline-none focus:ring-1 focus:ring-[#31523D]"
              />
            </div>

            {/* PIX Key Input */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex-1 sm:flex-initial">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                💠 Chave Pix da Clínica
              </label>
              <input
                type="text"
                value={customPixKey}
                onChange={(e) => setCustomPixKey(e.target.value)}
                placeholder="Telefone, CPF ou CNPJ"
                className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 w-full sm:w-40 focus:outline-none focus:ring-1 focus:ring-[#31523D]"
              />
            </div>

            {/* Credit Card Payment Link Input */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex-1 sm:flex-initial">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                💳 Link de Cartão
              </label>
              <input
                type="text"
                value={customCardLink}
                onChange={(e) => setCustomCardLink(e.target.value)}
                placeholder="https://link-pagamento..."
                className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-[#31523D]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR & MANUAL RECEIPT BUTTON: Cobranças Pendentes vs. Histórico de Recebimentos */}
      <div className="bg-white p-3 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
            {/* Tab 1: Cobranças Pendentes */}
            <button
              id="tab-btn-financeiro-pendentes"
              type="button"
              onClick={() => setActiveTab('pendentes')}
              className={`px-5 py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-between border ${
                activeTab === 'pendentes'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-xl ${activeTab === 'pendentes' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block uppercase text-[10px] tracking-wider opacity-90">Aba 1</span>
                  <span className="text-sm font-black">⚡ Cobranças Pendentes</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                activeTab === 'pendentes' ? 'bg-white text-amber-800' : 'bg-amber-100 text-amber-900'
              }`}>
                {filteredItems.length}
              </span>
            </button>

            {/* Tab 2: Histórico de Recebimentos & Recibos em PDF */}
            <button
              id="tab-btn-financeiro-recebidos"
              type="button"
              onClick={() => setActiveTab('recebidos')}
              className={`px-5 py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-between border ${
                activeTab === 'recebidos'
                  ? 'bg-[#31523D] text-[#D0A73B] border-[#23372B] shadow-md ring-2 ring-[#D0A73B]/40'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-xl ${activeTab === 'recebidos' ? 'bg-[#D0A73B]/20 text-[#D0A73B]' : 'bg-emerald-100 text-emerald-800'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block uppercase text-[10px] tracking-wider opacity-90">Aba 2 (Recibos)</span>
                  <span className="text-sm font-black text-white">📄 Histórico de Recebimentos & Recibos</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                activeTab === 'recebidos' ? 'bg-[#D0A73B] text-[#1E3326]' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {confirmedAppts.length + confirmedLoyaltyPayments.length}
              </span>
            </button>
          </div>

          {/* Quick Action: Emitir Recibo Manual para Qualquer Paciente */}
          <button
            id="btn-emitir-recibo-manual"
            type="button"
            onClick={handleOpenManualReceiptModal}
            className="px-4 py-3.5 rounded-2xl text-xs font-black bg-gradient-to-r from-[#D0A73B] to-[#b38b28] hover:from-[#c2982f] hover:to-[#9c771e] text-[#1E3326] shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#D0A73B] shrink-0"
            title="Emitir um recibo oficial timbrado para qualquer atendimento ou paciente avulso"
          >
            <Receipt className="w-4 h-4 text-[#1E3326]" />
            <span>➕ Emitir Novo Recibo em PDF</span>
          </button>
        </div>

        {/* Informative Guidance Banner */}
        <div className="bg-[#31523D]/5 border border-[#31523D]/15 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-700">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-[#31523D]">📍 Onde encontrar seus Recibos em PDF:</span>
            <span className="text-slate-600">
              {activeTab === 'pendentes'
                ? 'Você está em Cobranças Pendentes. Clique na Aba 2 (Histórico de Recebimentos) acima para ver todos os pagamentos concluídos e emitir recibos.'
                : 'Você está no Histórico de Recebimentos! Localize o paciente abaixo e clique no botão "Recibo em PDF" para imprimir ou encaminhar no WhatsApp.'}
            </span>
          </div>
          {activeTab === 'pendentes' && (
            <button
              onClick={() => setActiveTab('recebidos')}
              className="text-xs font-bold text-[#31523D] hover:underline flex items-center space-x-1 shrink-0 cursor-pointer"
            >
              <span>Ir para Histórico de Recebimentos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PENDING PAYMENTS & DISPATCH */}
      {activeTab === 'pendentes' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
                <h3 className="text-lg font-black text-slate-800">
                  Cobranças Pendentes & Envio de Links ({filteredItems.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Envie o link de cartão ou Pix direto no WhatsApp, visualize o recibo prévio ou dê baixa no pagamento.
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
                  placeholder="Buscar paciente ou telefone..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D] w-48 sm:w-56"
                />
              </div>

              <select
                value={filterType}
                onChange={(e: any) => setFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
              >
                <option value="todos">Todos os Atendimentos</option>
                <option value="pilates">🧘‍♀️ Pilates / Sessões</option>
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
                  className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
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
                        {item.status === 'atrasado' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
                            Vencido
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <strong>{item.patientPhone}</strong>
                        </span>
                        <span>•</span>
                        <span>Vencimento: <strong>{formatDatePtBR(item.dateOrDue)}</strong></span>
                        {item.patientCpf && (
                          <>
                            <span>•</span>
                            <span>CPF: {item.patientCpf}</span>
                          </>
                        )}
                      </p>

                      <p className="text-xs font-bold text-slate-500 mt-1">
                        Serviço: <span className="text-slate-700">{item.title}</span>
                      </p>
                    </div>
                  </div>

                  {/* Amount & Complete Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60">
                    <div className="text-left lg:text-right mr-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor</span>
                      <strong className="text-base font-black text-slate-900">{formatCurrency(item.amount)}</strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Button 1: Send Credit Card Payment Link */}
                      <button
                        type="button"
                        disabled={sendingId === item.id}
                        onClick={() => sendCreditCardLink(item)}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold bg-[#31523D] hover:bg-[#23372B] text-[#D0A73B] shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer border border-[#D0A73B]/30"
                        title="Enviar Link de Pagamento no Cartão de Crédito pelo WhatsApp"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#D0A73B]" />
                        <span>Link Cartão</span>
                      </button>

                      {/* Button 2: Send Pix Charge */}
                      <button
                        type="button"
                        disabled={sendingId === item.id}
                        onClick={() => sendPixCharge(item)}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-800 text-white shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                        title="Enviar Chave Pix e Cobrança no WhatsApp"
                      >
                        <QrCode className="w-3.5 h-3.5 text-teal-200" />
                        <span>Pix (WhatsApp)</span>
                      </button>

                      {/* Button 3: Send Complete WhatsApp Reminder */}
                      <button
                        type="button"
                        disabled={sendingId === item.id}
                        onClick={() => sendWhatsAppReminder(item)}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                        title="Enviar Lembrete Completo (Cartão + Pix)"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Lembrete Geral</span>
                      </button>

                      {/* Button 4: Open Receipt Modal (PDF) */}
                      <button
                        type="button"
                        onClick={() => handleOpenReceiptFromPending(item)}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs flex items-center space-x-1 transition-all cursor-pointer"
                        title="Gerar e Imprimir Recibo / Comprovante em PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Recibo PDF</span>
                      </button>

                      {/* Button 5: Mark as Paid */}
                      <button
                        type="button"
                        onClick={() => handleMarkAsPaid(item)}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center space-x-1 transition-all cursor-pointer"
                        title="Dar baixa e marcar como recebido"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Dar Baixa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONFIRMED PAYMENTS & RECEIPTS */}
      {activeTab === 'recebidos' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded-full bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </span>
                <h3 className="text-lg font-black text-slate-800">
                  Pagamentos Recebidos & Emissão de Recibos
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique no ícone de <strong>Recibo em PDF</strong> para imprimir a via timbrada ou encaminhar diretamente no WhatsApp do paciente.
              </p>
            </div>

            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-black">
              Total Quitado: {formatCurrency(totalConfirmedRevenue)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Confirmed Appointments */}
            {confirmedAppts.map((appt) => (
              <div
                key={`conf_${appt.id}`}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-extrabold text-slate-800">{appt.patientName}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                        Sessão Concluída
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {appt.serviceName} • {formatDatePtBR(appt.date)} às {appt.time}h • Forma: <strong>{(appt.paymentMethod || 'PIX').toUpperCase()}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor Pago</span>
                    <strong className="text-base font-black text-emerald-700">{formatCurrency(appt.servicePrice || 0)}</strong>
                  </div>

                  {/* Receipt PDF Action Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenReceiptFromAppt(appt)}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#31523D] hover:bg-[#23372B] text-[#D0A73B] shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer border border-[#D0A73B]/30"
                    title="Imprimir ou Encaminhar Recibo Oficial em PDF"
                  >
                    <FileText className="w-4 h-4 text-[#D0A73B]" />
                    <span>Recibo em PDF</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Confirmed Loyalty Payments */}
            {confirmedLoyaltyPayments.map((lp, idx) => (
              <div
                key={`loyalty_conf_${idx}`}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#31523D] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-black shrink-0">
                    👑
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-extrabold text-slate-800">{lp.member.patientName}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#31523D] text-[#D0A73B] uppercase">
                        Clube Fidelidade R$ 99
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Referência: <strong>{lp.monthYear}</strong> • Modalidade: <strong>{lp.paymentMethod}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor Pago</span>
                    <strong className="text-base font-black text-emerald-700">{formatCurrency(lp.amount)}</strong>
                  </div>

                  {/* Receipt PDF Action Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenReceiptFromLoyalty(lp.member, lp.monthYear, lp.amount, lp.paymentMethod, lp.paidAt)}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#31523D] hover:bg-[#23372B] text-[#D0A73B] shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer border border-[#D0A73B]/30"
                    title="Imprimir ou Encaminhar Recibo Oficial em PDF"
                  >
                    <FileText className="w-4 h-4 text-[#D0A73B]" />
                    <span>Recibo em PDF</span>
                  </button>
                </div>
              </div>
            ))}

            {confirmedAppts.length === 0 && confirmedLoyaltyPayments.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">
                Nenhum pagamento registrado no histórico recente.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MANUAL RECEIPT CREATION MODAL (EMISSÃO DE RECIBO AVULSO / QUALQUER PACIENTE) --- */}
      {isManualReceiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-2xl bg-[#31523D] text-[#D0A73B]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Emitir Novo Recibo em PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preencha os dados do paciente para gerar o recibo oficial timbrado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualReceiptModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualReceipt} className="space-y-3.5 text-xs">
              {/* Quick Select Existing Patient if available */}
              {patients && patients.length > 0 && (
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Selecionar Paciente Cadastrado (Opcional):
                  </label>
                  <select
                    onChange={(e) => {
                      const found = patients.find((p) => p.name === e.target.value);
                      if (found) {
                        setManualRecPatientName(found.name);
                        setManualRecPatientPhone(found.phone || '');
                        setManualRecPatientCpf(found.cpf || '');
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                  >
                    <option value="">-- Selecione ou digite manualmente abaixo --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Patient Name */}
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  Nome Completo do Paciente *
                </label>
                <input
                  type="text"
                  required
                  value={manualRecPatientName}
                  onChange={(e) => setManualRecPatientName(e.target.value)}
                  placeholder="Ex: Maria José de Oliveira"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D] font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Patient Phone */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    value={manualRecPatientPhone}
                    onChange={(e) => setManualRecPatientPhone(e.target.value)}
                    placeholder="(91) 98522-8356"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                  />
                </div>

                {/* Patient CPF */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    CPF (Para Declaração IR)
                  </label>
                  <input
                    type="text"
                    value={manualRecPatientCpf}
                    onChange={(e) => setManualRecPatientCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                  />
                </div>
              </div>

              {/* Service & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Serviço / Atendimento Prestado
                  </label>
                  <input
                    type="text"
                    required
                    value={manualRecServiceName}
                    onChange={(e) => setManualRecServiceName(e.target.value)}
                    placeholder="Ex: Pilates Clínico Mensal / Fisioterapia"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Valor Quitado (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualRecAmount}
                    onChange={(e) => setManualRecAmount(e.target.value)}
                    placeholder="99.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D] font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    value={manualRecDate}
                    onChange={(e) => setManualRecDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={manualRecPaymentMethod}
                    onChange={(e) => setManualRecPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none font-bold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  Observações no Recibo (Opcional)
                </label>
                <input
                  type="text"
                  value={manualRecNotes}
                  onChange={(e) => setManualRecNotes(e.target.value)}
                  placeholder="Ex: Mensalidade referente ao mês de Outubro"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualReceiptModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#31523D] hover:bg-[#23372B] text-[#D0A73B] font-extrabold shadow-sm flex items-center space-x-1.5 cursor-pointer border border-[#D0A73B]/40"
                >
                  <FileText className="w-4 h-4 text-[#D0A73B]" />
                  <span>Gerar Recibo Oficial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INDIVIDUAL OFFICIAL RECEIPT MODAL (IMPRESSÃO / ENCAMINHAMENTO NO WHATSAPP) --- */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            
            {/* Receipt Modal Header with Brand Logo */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <Logo size="md" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    Recibo Oficial de Pagamento
                  </h3>
                  <span className="text-[11px] text-emerald-800 font-mono font-bold">
                    {selectedReceipt.receiptNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Visual Body */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Clínica / Emissor:</span>
                <span className="font-bold text-[#23372B] text-right">{clinic.name || 'Fisiolys Fisioterapia e Pilates'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Responsável Técnica:</span>
                <span className="font-bold text-slate-800">{clinic.managerName || 'Dra. Elays Marinho'} (CREFITO-12)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2 bg-emerald-50/50 -mx-2 px-2 py-1 rounded-lg">
                <span className="text-emerald-900 font-bold">CPF da Profissional:</span>
                <span className="font-mono font-bold text-emerald-950">{doctorCpf}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Paciente:</span>
                <span className="font-extrabold text-slate-900">{selectedReceipt.patientName}</span>
              </div>
              {selectedReceipt.patientCpf && (
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500 font-medium">CPF do Paciente:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedReceipt.patientCpf}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Telefone / Contato:</span>
                <span className="font-bold text-slate-800">{selectedReceipt.patientPhone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Serviço / Atendimento:</span>
                <span className="font-bold text-slate-800 text-right">{selectedReceipt.serviceName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Data de Referência:</span>
                <span className="font-bold text-slate-800">{formatDatePtBR(selectedReceipt.date)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Forma de Quitação:</span>
                <span className="font-bold text-slate-800">{selectedReceipt.paymentMethod}</span>
              </div>

              {/* Total Box */}
              <div className="flex justify-between items-center pt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-sm font-black">
                <span className="text-emerald-950 uppercase">Valor Quitado:</span>
                <span className="text-lg text-emerald-700">{formatCurrency(selectedReceipt.amount)}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              📍 {clinic.address} • {clinic.city} - PA<br />
              Comprovante oficial para declaração e auditoria médica.
            </div>

            {/* Receipt Modal Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              {/* Action 1: Direct Print / PDF Viewer */}
              <button
                type="button"
                onClick={() => handlePrintReceiptDirect(selectedReceipt)}
                className="py-3 px-3 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Abrir e imprimir recibo em PDF"
              >
                <Printer className="w-4 h-4 text-[#D0A73B]" />
                <span>Imprimir PDF</span>
              </button>

              {/* Action 2: Direct PDF File Download */}
              <button
                type="button"
                onClick={() => handleDownloadReceiptPDF(selectedReceipt)}
                className="py-3 px-3 bg-[#D0A73B] hover:bg-[#b8912e] text-[#18271e] rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Baixar arquivo oficial do recibo em PDF (.pdf)"
              >
                <Download className="w-4 h-4 text-[#18271e]" />
                <span>Baixar PDF</span>
              </button>
              
              {/* Action 3: Forward to Patient on WhatsApp with PDF Attachment */}
              <button
                type="button"
                onClick={() => handleForwardReceiptWhatsApp(selectedReceipt)}
                className="py-3 px-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Enviar recibo em PDF diretamente pelo WhatsApp do paciente"
              >
                <Send className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>

              {/* Action 4: Copy text */}
              <button
                type="button"
                onClick={() => handleCopyReceiptText(selectedReceipt)}
                className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Copiar texto do recibo"
              >
                {copiedReceipt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{copiedReceipt ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATED MESSAGES & REMINDERS GUIDE (CENTRAL DE LEMBRETES AUTOMÁTICOS) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-black">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              Central de Lembretes & Links de Cobrança WhatsApp
            </h3>
            <p className="text-xs text-slate-500">
              Modelos automáticos para envio rápido de Cartão de Crédito sem travar o limite, Pix e Recibos Digitais.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Template 1: Pilates Monthly */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#31523D] flex items-center space-x-1">
                <span>🧘‍♀️ Modelo Mensalidade / Sessão</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">Cartão + Pix</span>
            </div>
            <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono leading-relaxed">
              "Olá [Nome]! Passando para enviar as opções de pagamento da sua sessão de Pilates na Fisiolys. No cartão recorrente é debitada apenas a parcela mensal! Chave Pix: {customPixKey}..."
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
              "Olá [Nome]! Seu Plano do Clube de Fidelidade R$ 99/mês está disponível para renovação sem comprometer o limite do seu cartão de crédito. Chave Pix: {customPixKey}..."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

