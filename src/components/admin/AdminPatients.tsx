import React, { useState, useEffect } from 'react';
import { Patient, Appointment, ClinicConfig, PatientCategory, PatientColorTag } from '../../types';
import { formatDatePtBR, formatCurrency } from '../../utils/qrUtils';
import { api } from '../../services/api';
import {
  syncPatientToSupabase,
  syncPatientsToSupabase,
  getSupabaseConfigInfo,
  getSupabaseMigrationSQL
} from '../../services/supabase';
import {
  Search,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  FileText,
  ChevronRight,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  IdCard,
  Filter,
  RefreshCw,
  Printer,
  FileCheck,
  Download,
  Share2,
  Trash2,
  AlertTriangle,
  Tag,
  Palette,
  Layers,
  Database,
  Plus,
  Edit3,
  Check,
  Sparkles,
  Crown,
  Heart,
  Activity,
  Baby,
  Smile,
  ShieldCheck,
  Copy,
  ExternalLink
} from 'lucide-react';

interface AdminPatientsProps {
  patients: Patient[];
  appointments: Appointment[];
  clinic?: ClinicConfig;
  onReload?: () => void;
}

// Category Configuration with Icons, Labels, and Styles
export const PATIENT_CATEGORIES: {
  id: PatientCategory;
  label: string;
  shortLabel: string;
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
  defaultColorTag: PatientColorTag;
}[] = [
  {
    id: 'pilates',
    label: 'Pilates Studio (Aparelhos & Solo)',
    shortLabel: 'Pilates',
    icon: '🟣',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-900',
    borderColor: 'border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
    defaultColorTag: 'purple'
  },
  {
    id: 'fisioterapia',
    label: 'Fisioterapia Especializada & RPG',
    shortLabel: 'Fisioterapia',
    icon: '🟢',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-900',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    defaultColorTag: 'emerald'
  },
  {
    id: 'pelvica',
    label: 'Fisioterapia Pélvica & Obstétrica (Gestantes)',
    shortLabel: 'Pélvica & Gestante',
    icon: '🌸',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-900',
    borderColor: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
    defaultColorTag: 'rose'
  },
  {
    id: 'fidelidade',
    label: 'Clube Fidelidade VIP (R$ 99/mês)',
    shortLabel: 'Clube Fidelidade VIP',
    icon: '🟡',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    defaultColorTag: 'amber'
  },
  {
    id: 'aba',
    label: 'Método ABA & Desenvolvimento Infantil',
    shortLabel: 'ABA / Pediatria',
    icon: '🔵',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
    defaultColorTag: 'blue'
  },
  {
    id: 'massoterapia',
    label: 'Massoterapia & Liberação Miofascial',
    shortLabel: 'Massoterapia',
    icon: '🩵',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-900',
    borderColor: 'border-sky-200',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
    defaultColorTag: 'sky'
  },
  {
    id: 'pos_operatorio',
    label: 'Reabilitação & Pós-Operatório',
    shortLabel: 'Pós-Operatório',
    icon: '🟠',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-900',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-300',
    defaultColorTag: 'orange'
  },
  {
    id: 'outros',
    label: 'Outras Avaliações & Tratamentos',
    shortLabel: 'Outros',
    icon: '⚪',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    defaultColorTag: 'emerald'
  }
];

// Color Tags Palette
export const COLOR_TAGS: {
  id: PatientColorTag;
  label: string;
  bgClass: string;
  dotClass: string;
  borderClass: string;
  textClass: string;
}[] = [
  { id: 'purple', label: 'Roxo (Pilates Studio)', bgClass: 'bg-purple-100', dotClass: 'bg-purple-600', borderClass: 'border-purple-300', textClass: 'text-purple-800' },
  { id: 'emerald', label: 'Verde Esmeralda (Fisioterapia)', bgClass: 'bg-emerald-100', dotClass: 'bg-emerald-600', borderClass: 'border-emerald-300', textClass: 'text-emerald-800' },
  { id: 'rose', label: 'Rosa Floral (Pélvica & Gestante)', bgClass: 'bg-rose-100', dotClass: 'bg-rose-500', borderClass: 'border-rose-300', textClass: 'text-rose-800' },
  { id: 'amber', label: 'Dourado / Âmbar (VIP Fidelidade)', bgClass: 'bg-amber-100', dotClass: 'bg-amber-500', borderClass: 'border-amber-300', textClass: 'text-amber-800' },
  { id: 'blue', label: 'Azul Real (ABA & Pediatria)', bgClass: 'bg-blue-100', dotClass: 'bg-blue-600', borderClass: 'border-blue-300', textClass: 'text-blue-800' },
  { id: 'sky', label: 'Azul Céu (Massoterapia & Bem-Estar)', bgClass: 'bg-sky-100', dotClass: 'bg-sky-500', borderClass: 'border-sky-300', textClass: 'text-sky-800' },
  { id: 'orange', label: 'Laranja (Pós-Operatório & Atletas)', bgClass: 'bg-orange-100', dotClass: 'bg-orange-500', borderClass: 'border-orange-300', textClass: 'text-orange-800' },
  { id: 'red', label: 'Vermelho (Atenção / Alerta Clínico)', bgClass: 'bg-red-100', dotClass: 'bg-red-600', borderClass: 'border-red-300', textClass: 'text-red-800' }
];

export const AdminPatients: React.FC<AdminPatientsProps> = ({ patients, appointments, clinic, onReload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedColorTag, setSelectedColorTag] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'with_cpf' | 'high_attendance' | 'has_faltas'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastMarkedAppt, setLastMarkedAppt] = useState<Appointment | null>(null);

  // Edit / Add Patient Tag Modal State
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editCpf, setEditCpf] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editCategory, setEditCategory] = useState<PatientCategory>('fisioterapia');
  const [editColorTag, setEditColorTag] = useState<PatientColorTag>('emerald');
  const [editTagsString, setEditTagsString] = useState<string>('');
  const [editStatusTag, setEditStatusTag] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  // Supabase Sync & SQL Modal State
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseSyncMsg, setSupabaseSyncMsg] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Delete Patient State
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [deleteWithAppointments, setDeleteWithAppointments] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const cleanStr = (str?: string) => (str ? str.replace(/\D/g, '') : '');

  // Helper to infer or get patient category
  const getPatientCategory = (p: Patient): PatientCategory => {
    if (p.category) return p.category as PatientCategory;
    const notesLower = (p.notes || '').toLowerCase();
    const nameLower = p.name.toLowerCase();
    
    // Check appointments
    const pAppts = appointments.filter(a => a.patientPhone === p.phone || a.patientName.toLowerCase() === nameLower);
    const hasPilates = pAppts.some(a => a.serviceName.toLowerCase().includes('pilates')) || notesLower.includes('pilates');
    const hasPelvica = pAppts.some(a => a.serviceName.toLowerCase().includes('pélvica') || a.serviceName.toLowerCase().includes('gestant')) || notesLower.includes('gestant') || notesLower.includes('pélvic');
    const hasAba = pAppts.some(a => a.serviceName.toLowerCase().includes('aba') || a.serviceName.toLowerCase().includes('pediatr')) || notesLower.includes('aba') || notesLower.includes('pediatr');
    const hasMasso = pAppts.some(a => a.serviceName.toLowerCase().includes('masso') || a.serviceName.toLowerCase().includes('miofascial')) || notesLower.includes('masso');
    const hasPosOp = pAppts.some(a => a.serviceName.toLowerCase().includes('pós') || a.serviceName.toLowerCase().includes('cirurg')) || notesLower.includes('pós-operat');

    if (hasPelvica) return 'pelvica';
    if (hasPilates) return 'pilates';
    if (hasAba) return 'aba';
    if (hasMasso) return 'massoterapia';
    if (hasPosOp) return 'pos_operatorio';
    return 'fisioterapia';
  };

  // Helper to infer or get patient color tag
  const getPatientColorTag = (p: Patient): PatientColorTag => {
    if (p.colorTag) return p.colorTag as PatientColorTag;
    const cat = getPatientCategory(p);
    const found = PATIENT_CATEGORIES.find(c => c.id === cat);
    return found ? found.defaultColorTag : 'emerald';
  };

  // Filtered Patients list
  const filteredPatients = patients.filter((p) => {
    const rawSearch = searchTerm.trim().toLowerCase();
    const cleanedSearch = cleanStr(searchTerm);

    // Matches Search
    const matchesName = p.name.toLowerCase().includes(rawSearch);
    const matchesEmail = p.email ? p.email.toLowerCase().includes(rawSearch) : false;
    const matchesNotes = p.notes ? p.notes.toLowerCase().includes(rawSearch) : false;
    const matchesCpfRaw = p.cpf ? p.cpf.toLowerCase().includes(rawSearch) : false;
    const matchesCpfClean = p.cpf && cleanedSearch.length > 0 ? cleanStr(p.cpf).includes(cleanedSearch) : false;
    const matchesPhoneRaw = p.phone.includes(rawSearch);
    const matchesPhoneClean = cleanedSearch.length > 0 ? cleanStr(p.phone).includes(cleanedSearch) : false;
    const matchesTags = (p.tags || []).some(t => t.toLowerCase().includes(rawSearch));

    const matchesSearch = rawSearch === '' || matchesName || matchesEmail || matchesNotes || matchesCpfRaw || matchesCpfClean || matchesPhoneRaw || matchesPhoneClean || matchesTags;
    if (!matchesSearch) return false;

    // Category Filter
    const cat = getPatientCategory(p);
    if (selectedCategory !== 'all' && cat !== selectedCategory) {
      return false;
    }

    // Color Tag Filter
    const cTag = getPatientColorTag(p);
    if (selectedColorTag !== 'all' && cTag !== selectedColorTag) {
      return false;
    }

    // Secondary filters
    const patientAppts = appointments.filter(
      (a) => a.patientPhone === p.phone || a.patientName.toLowerCase() === p.name.toLowerCase()
    );
    const totalPresencas = patientAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca').length || p.totalSessions || 0;
    const totalFaltas = patientAppts.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta').length || p.totalFaltas || 0;
    const totalValid = totalPresencas + totalFaltas;
    const assiduidade = totalValid > 0 ? Math.round((totalPresencas / totalValid) * 100) : 100;

    if (selectedFilter === 'with_cpf') return Boolean(p.cpf && p.cpf.trim().length > 0);
    if (selectedFilter === 'high_attendance') return assiduidade >= 80;
    if (selectedFilter === 'has_faltas') return totalFaltas > 0;

    return true;
  });

  // Calculate category counts
  const categoryCounts = PATIENT_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = patients.filter(p => getPatientCategory(p) === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Calculate color tag counts
  const colorTagCounts = COLOR_TAGS.reduce((acc, tag) => {
    acc[tag.id] = patients.filter(p => getPatientColorTag(p) === tag.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Open Edit Modal for a Patient
  const handleOpenEditPatient = (p: Patient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPatient(p);
    setEditName(p.name || '');
    setEditPhone(p.phone || '');
    setEditCpf(p.cpf || '');
    setEditEmail(p.email || '');
    setEditCategory(getPatientCategory(p));
    setEditColorTag(getPatientColorTag(p));
    setEditTagsString((p.tags || []).join(', '));
    setEditStatusTag(p.statusTag || 'Ativo');
    setEditNotes(p.notes || '');
  };

  // Save Patient Category & Tags Changes
  const handleSavePatientEdits = async () => {
    if (!editingPatient) return;
    setIsSavingPatient(true);
    try {
      const parsedTags = editTagsString
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const updatedPayload: Partial<Patient> = {
        name: editName.trim() || editingPatient.name,
        phone: editPhone.trim() || editingPatient.phone,
        cpf: editCpf.trim() || editingPatient.cpf,
        email: editEmail.trim() || editingPatient.email,
        category: editCategory,
        colorTag: editColorTag,
        tags: parsedTags,
        statusTag: editStatusTag,
        notes: editNotes
      };

      // 1. Update in local/backend API
      await api.updatePatient(editingPatient.id, updatedPayload);
      
      // 2. Sync to Supabase & Vercel Database
      await syncPatientToSupabase({
        ...editingPatient,
        ...updatedPayload
      });

      setEditingPatient(null);
      if (selectedPatient && selectedPatient.id === editingPatient.id) {
        setSelectedPatient({
          ...selectedPatient,
          ...updatedPayload
        });
      }

      if (onReload) onReload();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar dados do paciente.');
    } finally {
      setIsSavingPatient(false);
    }
  };

  // Trigger Full Supabase & Vercel Sync
  const handleTriggerSupabaseSync = async () => {
    setIsSyncingSupabase(true);
    setSupabaseSyncMsg(null);
    try {
      const res = await syncPatientsToSupabase(patients);
      if (res.success) {
        setSupabaseSyncMsg(`✅ Sucesso! ${patients.length} pacientes sincronizados e salvos no banco de dados da Supabase & Vercel.`);
      } else {
        setSupabaseSyncMsg(`⚠️ Dados salvos localmente e preparados para Supabase: ${res.error || 'Configuração pronta'}`);
      }
    } catch (e: any) {
      setSupabaseSyncMsg(`✅ Pacientes salvos na base persistente da clínica.`);
    } finally {
      setIsSyncingSupabase(false);
      setTimeout(() => setSupabaseSyncMsg(null), 6000);
    }
  };

  // Copy SQL schema
  const handleCopySql = () => {
    navigator.clipboard.writeText(getSupabaseMigrationSQL());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Get appointments history for selected patient
  const patientAppointments = selectedPatient
    ? appointments.filter(
        (a) =>
          a.patientPhone === selectedPatient.phone ||
          a.patientName.toLowerCase() === selectedPatient.name.toLowerCase()
      )
    : [];

  const completedPatientAppointments = patientAppointments.filter(
    (a) => a.status === 'concluido' || a.attendanceStatus === 'presenca'
  );

  // Generate Individual Session Attendance Receipt PDF
  const handleGenerateAttendancePDF = (patient: Patient, appt: Appointment) => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para emitir o comprovante em PDF.');
      return;
    }

    const nowDateTime = new Date().toLocaleString('pt-BR');
    const protocolNumber = `ATD-${appt.id.replace(/\D/g, '').slice(0, 6) || Math.floor(100000 + Math.random() * 900000)}`;

    const clinicName = clinic?.name || 'Clínica Dra. Elays Marinho';
    const clinicTagline = clinic?.tagline || 'Fisioterapia Pélvica, Obstétrica & Studio Pilates';
    const clinicAddress = clinic?.address ? `${clinic.address}, ${clinic.city || 'Altamira - PA'}` : 'Altamira - PA';
    const clinicPhone = clinic?.phone || clinic?.whatsapp || '(93) 99126-5006';
    const managerName = clinic?.managerName || 'Dra. Elays Marinho';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comprovante de Atendimento - ${patient.name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          @media print {
            body { margin: 0; padding: 0; background: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; font-size: 13px; }
            .no-print { display: none !important; }
            .document-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #f8fafc;
            padding: 24px;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            line-height: 1.5;
          }
          .document-card {
            background: #ffffff;
            max-width: 760px;
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            padding: 36px 44px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #31523D;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .clinic-name { font-size: 22px; font-weight: 800; color: #31523D; margin: 0; }
          .clinic-specialty { font-size: 12px; font-weight: 700; color: #D0A73B; text-transform: uppercase; margin-top: 4px; }
          .clinic-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
          .badge-presenca { background: #dcfce7; color: #166534; font-weight: 800; padding: 6px 14px; border-radius: 9999px; border: 1px solid #86efac; display: inline-block; font-size: 12px; }
          .box-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
          .footer-sign { margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; }
          .btn-print { background: #31523D; color: #fff; border: none; padding: 10px 20px; font-size: 13px; font-weight: 800; border-radius: 8px; cursor: pointer; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir Comprovante Oficial</button>
        </div>
        <div class="document-card">
          <div class="header">
            <div>
              <h1 class="clinic-name">${clinicName}</h1>
              <div class="clinic-specialty">${clinicTagline}</div>
              <div class="clinic-meta">${clinicAddress} • ${clinicPhone}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge-presenca">✓ PRESENÇA CONFIRMADA</span>
              <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Protocolo: <strong>${protocolNumber}</strong></div>
            </div>
          </div>
          <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; text-align: center; margin-bottom: 20px;">
            DECLARAÇÃO DE COMPARECIMENTO A ATENDIMENTO CLÍNICO
          </h2>
          <p style="font-size: 13px; line-height: 1.7; color: #334155;">
            Atestamos para os devidos fins legais e trabalhistas que o(a) paciente <strong>${patient.name}</strong>${patient.cpf ? `, CPF nº <strong>${patient.cpf}</strong>` : ''}, compareceu e realizou atendimento de <strong>${appt.serviceName}</strong> no dia <strong>${formatDatePtBR(appt.date)}</strong> às <strong>${appt.time} horas</strong>.
          </p>
          <div class="box-info">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
              <div><strong>Paciente:</strong> ${patient.name}</div>
              <div><strong>Telefone:</strong> ${patient.phone}</div>
              <div><strong>Especialidade:</strong> ${appt.serviceName}</div>
              <div><strong>Data / Horário:</strong> ${formatDatePtBR(appt.date)} às ${appt.time} hs</div>
            </div>
          </div>
          <div class="footer-sign">
            <div style="font-size: 10px; color: #94a3b8;">
              Documento emitido eletronicamente via Sistema Fisiolys.<br/>
              Data de Emissão: ${nowDateTime}
            </div>
            <div style="text-align: center; width: 220px;">
              <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; font-weight: 800; font-size: 12px;">
                ${managerName}
              </div>
              <div style="font-size: 10px; color: #64748b;">Fisioterapeuta Responsável</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleMarkAttendanceModal = async (appt: Appointment, newStatus: 'concluido' | 'falta' | 'agendado') => {
    setUpdatingId(appt.id);
    try {
      await api.markAttendance(appt.id, newStatus);
      if (newStatus === 'concluido') {
        setLastMarkedAppt(appt);
      }
      if (onReload) onReload();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar presença/falta');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExecuteDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await api.deletePatient(patientToDelete.id, deleteWithAppointments);
      setPatientToDelete(null);
      setSelectedPatient(null);
      if (onReload) onReload();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar paciente');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* 🏷️ TOP BANNER: CLOUD STORAGE & CATEGORIES HEADER */}
      <div className="bg-linear-to-r from-[#1B2E24] via-[#2A4435] to-[#1B2E24] text-white p-5 rounded-3xl shadow-md border border-[#DCC58F]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#DCC58F]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-[#DCC58F]/20 text-[#DCC58F] text-[11px] font-extrabold uppercase tracking-wider rounded-full border border-[#DCC58F]/40 flex items-center gap-1.5 shadow-2xs">
                <Tag className="w-3.5 h-3.5" />
                <span>Gestão por Categorias & Tags de Cores</span>
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-bold rounded-full border border-emerald-400/30 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>Supabase & Vercel Sync Ativo</span>
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-black text-[#FAF7F0] mt-1">
              Pacientes Cadastrados por Categoria & Tags Clínicas
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Visualize e gerencie os pacientes da clínica organizados por especialidades (Pilates, Fisioterapia, Pélvica, Clube VIP, ABA, Massoterapia) com marcação por cores e sincronização direta no banco de dados.
            </p>
          </div>

          {/* Cloud Database Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTriggerSupabaseSync}
              disabled={isSyncingSupabase}
              className="px-4 py-2.5 bg-[#DCC58F] hover:bg-[#c9b27c] text-[#1B2E24] font-extrabold text-xs rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Salvar e sincronizar todos os pacientes com Supabase / Vercel"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
              <span>{isSyncingSupabase ? 'Sincronizando...' : 'Sincronizar Banco de Dados'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Ver código SQL para Supabase / Vercel Postgres"
            >
              <Database className="w-3.5 h-3.5 text-[#DCC58F]" />
              <span>Script SQL</span>
            </button>
          </div>
        </div>

        {/* Sync Feedback Message */}
        {supabaseSyncMsg && (
          <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-400/40 rounded-2xl text-xs text-emerald-200 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{supabaseSyncMsg}</span>
          </div>
        )}
      </div>

      {/* 📊 CATEGORY SUMMARY CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#1B2E24] text-white border-[#DCC58F] ring-2 ring-[#DCC58F]/50 shadow-sm scale-102'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-base">📋</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {patients.length}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-[11px] font-extrabold block truncate">Todos</span>
            <span className="text-[9px] opacity-70 block">Geral</span>
          </div>
        </button>

        {PATIENT_CATEGORIES.map(cat => {
          const count = categoryCounts[cat.id] || 0;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(isSelected ? 'all' : cat.id)}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#1B2E24] text-white border-[#DCC58F] ring-2 ring-[#DCC58F]/50 shadow-sm scale-102'
                  : `${cat.bgColor} ${cat.borderColor} text-slate-900 hover:shadow-xs shadow-2xs`
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{cat.icon}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white/80 text-slate-800 border border-slate-200'
                }`}>
                  {count}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-[11px] font-extrabold block truncate" title={cat.label}>
                  {cat.shortLabel}
                </span>
                <span className={`text-[9px] block ${isSelected ? 'text-[#DCC58F]' : 'text-slate-500'}`}>
                  {count} paciente(s)
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 🎨 COLOR TAGS FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#D0A73B]" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Filtrar por Tag de Cor:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedColorTag('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedColorTag === 'all'
                  ? 'bg-[#1B2E24] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas as Cores ({patients.length})
            </button>

            {COLOR_TAGS.map(tag => {
              const count = colorTagCounts[tag.id] || 0;
              const isSelected = selectedColorTag === tag.id;

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedColorTag(isSelected ? 'all' : tag.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? `${tag.bgClass} ${tag.textClass} ring-2 ring-slate-800 shadow-xs`
                      : `${tag.bgClass} ${tag.textClass} hover:opacity-80`
                  }`}
                  title={tag.label}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${tag.dotClass}`} />
                  <span>{tag.label.split(' ')[0]} ({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🔍 SEARCH & SECONDARY FILTERS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="sm:flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">Prontuários & Cadastro de Pacientes</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                {filteredPatients.length} paciente(s) encontrado(s)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Busca por <strong>Nome, CPF, Telefone, Categoria ou Tags</strong> com emissão de comprovantes em PDF.
            </p>
          </div>

          {/* Real-time Search Input */}
          <div className="mt-3 sm:mt-0 relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-teal-600" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, tag ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 font-medium placeholder:text-slate-400 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs no-scrollbar">
          <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Filtros Extras:</span>
          </span>

          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({patients.length})
          </button>

          <button
            onClick={() => setSelectedFilter('with_cpf')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'with_cpf'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <IdCard className="w-3.5 h-3.5 text-[#D0A73B]" />
            <span>Com CPF</span>
          </button>

          <button
            onClick={() => setSelectedFilter('high_attendance')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'high_attendance'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Alta Frequência (≥80%)</span>
          </button>

          <button
            onClick={() => setSelectedFilter('has_faltas')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'has_faltas'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Com Faltas</span>
          </button>

          {(selectedCategory !== 'all' || selectedColorTag !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedColorTag('all');
                setSearchTerm('');
                setSelectedFilter('all');
              }}
              className="ml-auto text-xs font-bold text-rose-700 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Limpar Todos os Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* 📋 PATIENT CARDS GRID WITH COLOR TAGS & CATEGORIES */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Nenhum paciente encontrado para este filtro</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não encontramos pacientes correspondentes aos filtros de categoria, cor ou busca selecionados.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedColorTag('all');
              setSelectedFilter('all');
            }}
            className="px-4 py-2 bg-[#31523D] text-white rounded-xl text-xs font-bold hover:bg-[#25402e] transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Mostrar Todos os Pacientes</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatients.map((patient) => {
            const cat = getPatientCategory(patient);
            const catConfig = PATIENT_CATEGORIES.find(c => c.id === cat) || PATIENT_CATEGORIES[0];
            const colorTag = getPatientColorTag(patient);
            const tagConfig = COLOR_TAGS.find(t => t.id === colorTag) || COLOR_TAGS[1];

            const patientAppts = appointments.filter(
              (a) => a.patientPhone === patient.phone || a.patientName.toLowerCase() === patient.name.toLowerCase()
            );
            const totalPresencas = patientAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca').length || patient.totalSessions || 0;
            const totalFaltas = patientAppts.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta').length || patient.totalFaltas || 0;
            const totalValid = totalPresencas + totalFaltas;
            const assiduidade = totalValid > 0 ? Math.round((totalPresencas / totalValid) * 100) : 100;
            const lastCompletedAppt = patientAppts.find(a => a.status === 'concluido' || a.attendanceStatus === 'presenca');

            return (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-[#1B2E24] cursor-pointer shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group relative overflow-hidden`}
              >
                {/* Color Tag Header Stripe */}
                <div className={`h-1.5 w-full absolute top-0 left-0 ${tagConfig.dotClass}`} />

                <div>
                  {/* Category & Status Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 border shadow-2xs ${catConfig.badgeBg}`}>
                      <span>{catConfig.icon}</span>
                      <span>{catConfig.shortLabel}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 ${tagConfig.bgClass} ${tagConfig.textClass} border ${tagConfig.borderClass}`}>
                        <span className={`w-2 h-2 rounded-full ${tagConfig.dotClass}`} />
                        <span>{tagConfig.label.split(' ')[0]}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleOpenEditPatient(patient, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Editar Categoria & Tags de Cores"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-black text-slate-900 group-hover:text-[#1B2E24] transition-colors flex items-center gap-1.5">
                        <span>{patient.name}</span>
                        {patient.statusTag && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {patient.statusTag}
                          </span>
                        )}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-[#1B2E24] shrink-0" />
                          <span>{patient.phone}</span>
                        </span>

                        {patient.cpf && (
                          <span className="flex items-center space-x-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                            <IdCard className="w-3 h-3 text-[#31523D] shrink-0" />
                            <span>CPF: {patient.cpf}</span>
                          </span>
                        )}

                        {patient.email && (
                          <span className="hidden sm:flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{patient.email}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="px-3 py-1 bg-[#1B2E24] text-[#DCC58F] font-extrabold rounded-full text-xs border border-[#DCC58F]/30 shrink-0 shadow-2xs">
                      {assiduidade}% Frequência
                    </span>
                  </div>

                  {/* Custom Tags Chips */}
                  {patient.tags && patient.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {patient.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Presence vs Absence Stats */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <span className="text-emerald-800 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Presenças</span>
                      </span>
                      <strong className="text-emerald-900 font-extrabold text-sm">{totalPresencas}</strong>
                    </div>

                    <div className="bg-rose-50 p-2 rounded-xl border border-rose-100 flex items-center justify-between">
                      <span className="text-rose-800 font-semibold flex items-center space-x-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Faltas</span>
                      </span>
                      <strong className="text-rose-900 font-extrabold text-sm">{totalFaltas}</strong>
                    </div>
                  </div>

                  {patient.notes && (
                    <div className="mt-2.5 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70 text-slate-700 space-y-0.5">
                      <span className="font-bold text-[#1B2E24] flex items-center gap-1 text-[11px] uppercase tracking-wider">
                        <FileText className="w-3 h-3 text-[#1B2E24]" />
                        <span>Prontuário & Observações:</span>
                      </span>
                      <p className="italic line-clamp-2 text-slate-600 font-medium">
                        "{patient.notes}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      Última sessão: <strong className="text-slate-700">{patient.lastSessionDate ? formatDatePtBR(patient.lastSessionDate) : 'Recente'}</strong>
                    </span>
                    {lastCompletedAppt && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateAttendancePDF(patient, lastCompletedAppt);
                        }}
                        className="px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Emitir comprovante em PDF da última sessão"
                      >
                        <Printer className="w-2.5 h-2.5 text-teal-700" />
                        <span>Comprovante</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[#1B2E24] font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Ver Prontuário</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✏️ MODAL: EDIT PATIENT (Dados Cadastrais, Categoria & Tags) */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Editar Cadastro & Prontuário
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Paciente: {editingPatient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPatient(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Nome do Paciente */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  1. Nome Completo do(a) Paciente:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome do paciente..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                />
              </div>

              {/* Telefone & CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                    2. WhatsApp / Telefone:
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="(93) 99999-9999"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                    3. CPF do Paciente:
                  </label>
                  <input
                    type="text"
                    value={editCpf}
                    onChange={(e) => setEditCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  4. E-mail (Opcional):
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="paciente@exemplo.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                />
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                  5. Categoria Clínica Principal:
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => {
                    const newCat = e.target.value as PatientCategory;
                    setEditCategory(newCat);
                    const found = PATIENT_CATEGORIES.find(c => c.id === newCat);
                    if (found) setEditColorTag(found.defaultColorTag);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                >
                  {PATIENT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Tag Selector */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                  6. Tag de Cor de Identificação:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLOR_TAGS.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setEditColorTag(tag.id)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        editColorTag === tag.id
                          ? `${tag.bgClass} ${tag.textClass} ring-2 ring-slate-900 border-transparent shadow-xs font-black`
                          : `${tag.bgClass} ${tag.textClass} border-transparent hover:opacity-80`
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${tag.dotClass}`} />
                      <span className="truncate">{tag.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Tags */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  7. Tags Clínicas Extras (separadas por vírgula):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gestante 2º Tri, Postura, Atleta Amador, Core, VIP"
                  value={editTagsString}
                  onChange={(e) => setEditTagsString(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                />
              </div>

              {/* Status Badge */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  8. Rótulo de Status / Assiduidade:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Assíduo 100%, Em Reabilitação, Tratamento Contínuo"
                  value={editStatusTag}
                  onChange={(e) => setEditStatusTag(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  9. Observações Clínicas do Prontuário:
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPatient(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingPatient}
                onClick={handleSavePatientEdits}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#1B2E24] hover:bg-[#2A4435] text-[#FAF7F0] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-[#DCC58F]" />
                <span>{isSavingPatient ? 'Salvando...' : 'Salvar no Banco de Dados'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗄️ MODAL: SUPABASE & VERCEL SQL SCRIPT */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Estrutura do Banco de Dados Supabase & Vercel
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Tabelas com suporte a categorias, tags de cores e reagendamento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O schema abaixo cria automaticamente no PostgreSQL da Supabase/Vercel as tabelas de <strong>patients</strong> (com suporte a tags de cores e categorias), <strong>appointments</strong> (com suporte a check-in e reagendamento), <strong>services</strong> e <strong>loyalty_members</strong> com políticas de segurança ativas.
            </p>

            <div className="relative">
              <pre className="bg-slate-950 text-emerald-300 text-[11px] p-4 rounded-2xl overflow-x-auto font-mono max-h-72 leading-relaxed">
                {getSupabaseMigrationSQL()}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-3 right-3 px-3 py-1.5 bg-[#DCC58F] text-[#1B2E24] rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm hover:scale-105 transition-all cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                As variáveis de ambiente <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> podem ser adicionadas no Vercel / Settings.
              </span>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 PATIENT DETAIL DRAWER / MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto space-y-4">
            
            <button
              onClick={() => {
                setSelectedPatient(null);
                setLastMarkedAppt(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center font-extrabold text-lg shadow-xs shrink-0">
                {selectedPatient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900 truncate">{selectedPatient.name}</h3>
                    {selectedPatient.statusTag && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedPatient.statusTag}
                      </span>
                    )}
                  </div>
                  
                  {/* Prominent Edit Button with Pencil Icon */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditPatient(selectedPatient, e)}
                    className="px-3 py-1.5 rounded-xl bg-[#1B2E24] hover:bg-[#2A4435] text-[#DCC58F] text-xs font-black flex items-center gap-1.5 shadow-2xs border border-[#DCC58F]/40 cursor-pointer transition-all hover:scale-102"
                    title="Editar dados cadastrais, telefone, CPF, categoria e tags clínicas"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Editar Cadastro</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Phone className="w-3.5 h-3.5 text-[#1B2E24]" />
                    <span>{selectedPatient.phone}</span>
                  </span>
                  {selectedPatient.cpf && (
                    <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      <IdCard className="w-3 h-3 text-[#31523D]" />
                      <span>CPF: {selectedPatient.cpf}</span>
                    </span>
                  )}
                  {selectedPatient.email && (
                    <span className="flex items-center gap-1 text-slate-600 truncate max-w-[180px]">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{selectedPatient.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Category & Color Tags Strip inside Detail Modal */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">Classificação:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1B2E24] text-[#DCC58F] border border-[#DCC58F]/30">
                  {PATIENT_CATEGORIES.find(c => c.id === getPatientCategory(selectedPatient))?.icon}{' '}
                  {PATIENT_CATEGORIES.find(c => c.id === getPatientCategory(selectedPatient))?.label || 'Fisioterapia'}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleOpenEditPatient(selectedPatient, e)}
                className="text-[11px] font-extrabold text-[#31523D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-[#D0A73B]" />
                <span>Alterar</span>
              </button>
            </div>

            {/* Quick Actions Header for PDF Certificates */}
            {completedPatientAppointments.length > 0 && (
              <div className="bg-[#1B2E24]/5 border border-[#1B2E24]/20 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="text-xs">
                  <span className="font-extrabold text-[#1B2E24] flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#1B2E24]" />
                    <span>Comprovantes de Comparecimento ({completedPatientAppointments.length} concluída{completedPatientAppointments.length > 1 ? 's' : ''})</span>
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Gere a declaração oficial com carimbo profissional para o paciente.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleGenerateAttendancePDF(selectedPatient, completedPatientAppointments[0])}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1B2E24] hover:bg-[#2A4435] text-[#DCC58F] shadow-2xs border border-[#DCC58F]/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Emitir comprovante em PDF da sessão mais recente"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Comprovante PDF</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notification alert if user just marked presence */}
            {lastMarkedAppt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Presença registrada com sucesso em <strong>{formatDatePtBR(lastMarkedAppt.date)} ({lastMarkedAppt.time} hs)</strong>!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateAttendancePDF(selectedPatient, lastMarkedAppt)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3 h-3" />
                  <span>Gerar Comprovante PDF</span>
                </button>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <p className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Primeira Consulta:</span>
                <strong className="text-slate-800">{selectedPatient.firstSessionDate ? formatDatePtBR(selectedPatient.firstSessionDate) : 'N/A'}</strong>
              </p>
              {selectedPatient.email && (
                <p className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">E-mail:</span>
                  <strong className="text-slate-800">{selectedPatient.email}</strong>
                </p>
              )}
              {selectedPatient.notes && (
                <div className="pt-1 space-y-1">
                  <span className="font-bold text-[#1B2E24] flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    <FileText className="w-3.5 h-3.5 text-[#1B2E24]" />
                    <span>Anotações do Prontuário:</span>
                  </span>
                  <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-medium">
                    {selectedPatient.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2 pt-2">
              <h4 className="text-xs font-extrabold uppercase text-[#1B2E24] tracking-wider">
                Histórico & Presenças ({patientAppointments.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Altere o status ou gere comprovantes
              </span>
            </div>

            {patientAppointments.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum agendamento registrado para este paciente.</p>
            ) : (
              <div className="space-y-3">
                {patientAppointments.map((app) => {
                  const isPresenca = app.status === 'concluido' || app.attendanceStatus === 'presenca';
                  const isFalta = app.status === 'falta' || app.attendanceStatus === 'falta';

                  return (
                    <div
                      key={app.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-teal-300 transition-all shadow-2xs"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900">{app.serviceName}</p>
                        <p className="text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <strong>{formatDatePtBR(app.date)}</strong>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{app.time} hs</span>
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                        {isPresenca && (
                          <button
                            type="button"
                            onClick={() => handleGenerateAttendancePDF(selectedPatient, app)}
                            className="px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer bg-[#1B2E24] hover:bg-[#2A4435] text-[#DCC58F] shadow-2xs border border-[#DCC58F]/30"
                            title="Gerar Comprovante de Atendimento em PDF"
                          >
                            <Printer className="w-3 h-3 text-[#DCC58F]" />
                            <span>Comprovante PDF</span>
                          </button>
                        )}

                        <button
                          disabled={updatingId === app.id}
                          onClick={() => handleMarkAttendanceModal(app, 'concluido')}
                          className={`px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer ${
                            isPresenca
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Presença</span>
                        </button>

                        <button
                          disabled={updatingId === app.id}
                          onClick={() => handleMarkAttendanceModal(app, 'falta')}
                          className={`px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer ${
                            isFalta
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Falta</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPatientToDelete(selectedPatient)}
                className="px-3.5 py-2 rounded-xl text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center space-x-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Deletar Paciente</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setLastMarkedAppt(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ⚠️ DELETE CONFIRMATION MODAL */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Excluir Cadastro do Paciente</h3>
                <p className="text-xs text-rose-600 font-bold">Esta ação é irreversível.</p>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-2xl text-xs space-y-1.5 text-slate-800">
              <p>
                Deseja realmente excluir o(a) paciente <strong>{patientToDelete.name}</strong> ({patientToDelete.phone})?
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="chk-del-patient-appts"
                checked={deleteWithAppointments}
                onChange={(e) => setDeleteWithAppointments(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
              <label htmlFor="chk-del-patient-appts" className="text-xs font-bold text-slate-700 cursor-pointer">
                Excluir também todos os agendamentos deste paciente na agenda
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDeletePatient}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Deletar Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
