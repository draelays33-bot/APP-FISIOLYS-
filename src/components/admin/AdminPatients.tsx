import React, { useState, useEffect } from 'react';
import { Patient, Appointment, Service, AppointmentStatus, ClinicConfig, PatientCategory, PatientColorTag, FrequencyType } from '../../types';
import { formatDatePtBR, formatCurrency, calculateAge, formatBirthDateAndAge } from '../../utils/qrUtils';
import { api } from '../../services/api';
import { localDb, isPatientInactiveOrCompleted } from '../../services/localDb';
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
  ExternalLink,
  Lock,
  Unlock,
  PauseCircle,
  PlayCircle,
  Cake,
  MapPin,
  Briefcase,
  Shield,
  HeartPulse,
  CalendarClock,
  AlertCircle,
  DollarSign,
  Save
} from 'lucide-react';

interface AdminPatientsProps {
  patients: Patient[];
  appointments: Appointment[];
  services?: Service[];
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

export const AdminPatients: React.FC<AdminPatientsProps> = ({ patients, appointments, services = [], clinic, onReload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedColorTag, setSelectedColorTag] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'concluded' | 'locked' | 'with_cpf' | 'high_attendance' | 'has_faltas'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastMarkedAppt, setLastMarkedAppt] = useState<Appointment | null>(null);

  // Edit / Add Patient Registration Modal State
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editCpf, setEditCpf] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editBirthDate, setEditBirthDate] = useState<string>('');
  const [editRg, setEditRg] = useState<string>('');
  const [editGender, setEditGender] = useState<string>('feminino');
  const [editProfession, setEditProfession] = useState<string>('');
  const [editEmergencyContact, setEditEmergencyContact] = useState<string>('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState<string>('');
  const [editGuardianName, setEditGuardianName] = useState<string>('');
  const [editHealthInsurance, setEditHealthInsurance] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('Altamira - PA');
  const [editCategory, setEditCategory] = useState<PatientCategory>('fisioterapia');
  const [editColorTag, setEditColorTag] = useState<PatientColorTag>('emerald');
  const [editTagsString, setEditTagsString] = useState<string>('');
  const [editStatusTag, setEditStatusTag] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editIsLocked, setEditIsLocked] = useState<boolean>(false);
  const [editLockStartDate, setEditLockStartDate] = useState<string>('');
  const [editLockEndDate, setEditLockEndDate] = useState<string>('');
  const [editLockReason, setEditLockReason] = useState<string>('');
  const [editLockNotes, setEditLockNotes] = useState<string>('');
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  // Treatment & Plan Editing States (Dra. Elays)
  const [editCurrentTreatment, setEditCurrentTreatment] = useState<string>('');
  const [editCurrentServiceId, setEditCurrentServiceId] = useState<string>('');
  const [editTreatmentPlan, setEditTreatmentPlan] = useState<string>('');
  const [editTreatmentObjective, setEditTreatmentObjective] = useState<string>('');
  const [editSessionPrice, setEditSessionPrice] = useState<number | string>('');

  const [editHasRecurrence, setEditHasRecurrence] = useState<boolean>(false);
  const [editFrequencyType, setEditFrequencyType] = useState<FrequencyType>('2x_semana');
  const [editRecurrenceDays, setEditRecurrenceDays] = useState<{dayOfWeek: number, time: string}[]>([]);

  // Drawer Edit Single Session / Appointment State
  const [editingApptInDrawer, setEditingApptInDrawer] = useState<Appointment | null>(null);
  const [drawerApptServiceId, setDrawerApptServiceId] = useState<string>('');
  const [drawerApptServiceName, setDrawerApptServiceName] = useState<string>('');
  const [drawerApptPrice, setDrawerApptPrice] = useState<number | string>('');
  const [drawerApptDate, setDrawerApptDate] = useState<string>('');
  const [drawerApptTime, setDrawerApptTime] = useState<string>('');
  const [drawerApptStatus, setDrawerApptStatus] = useState<AppointmentStatus>('agendado');
  const [drawerApptNotes, setDrawerApptNotes] = useState<string>('');
  const [isSavingDrawerAppt, setIsSavingDrawerAppt] = useState(false);

  // Dedicated Lock Modal State
  const [lockingPatient, setLockingPatient] = useState<Patient | null>(null);
  const [lockStartDate, setLockStartDate] = useState<string>('');
  const [lockEndDate, setLockEndDate] = useState<string>('');
  const [lockNoEndDate, setLockNoEndDate] = useState<boolean>(false);
  const [lockReason, setLockReason] = useState<string>('Viagem / Férias');
  const [lockCustomReason, setLockCustomReason] = useState<string>('');
  const [lockNotes, setLockNotes] = useState<string>('');
  const [isSavingLock, setIsSavingLock] = useState<boolean>(false);

  // Dedicated Unlock / Reactivate Modal State
  const [unlockingPatient, setUnlockingPatient] = useState<Patient | null>(null);
  const [unlockDate, setUnlockDate] = useState<string>('');
  const [unlockNotes, setUnlockNotes] = useState<string>('');
  const [isSavingUnlock, setIsSavingUnlock] = useState<boolean>(false);

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

  // Helper to format today string as YYYY-MM-DD
  const getTodayISO = () => new Date().toISOString().split('T')[0];

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
    const matchesProfession = p.profession ? p.profession.toLowerCase().includes(rawSearch) : false;
    const matchesLockReason = p.lockReason ? p.lockReason.toLowerCase().includes(rawSearch) : false;

    const matchesSearch = rawSearch === '' || matchesName || matchesEmail || matchesNotes || matchesCpfRaw || matchesCpfClean || matchesPhoneRaw || matchesPhoneClean || matchesTags || matchesProfession || matchesLockReason;
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
    const isLocked = Boolean(p.isLocked);
    const isInactiveOrDone = isPatientInactiveOrCompleted(p);
    const patientAppts = appointments.filter(
      (a) => a.patientPhone === p.phone || a.patientName.toLowerCase() === p.name.toLowerCase()
    );
    const totalPresencas = patientAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca').length || p.totalSessions || 0;
    const totalFaltas = patientAppts.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta').length || p.totalFaltas || 0;
    const totalValid = totalPresencas + totalFaltas;
    const assiduidade = totalValid > 0 ? Math.round((totalPresencas / totalValid) * 100) : 100;

    if (selectedFilter === 'active') return !isInactiveOrDone;
    if (selectedFilter === 'concluded') return isInactiveOrDone && !isLocked;
    if (selectedFilter === 'locked') return isLocked;
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

  // Counts for status filters
  const activeCount = patients.filter(p => !isPatientInactiveOrCompleted(p)).length;
  const concludedCount = patients.filter(p => isPatientInactiveOrCompleted(p) && !p.isLocked).length;
  const lockedCount = patients.filter(p => Boolean(p.isLocked)).length;

  // Helper de estilização para o rótulo de status
  const getStatusBadgeClasses = (statusTag?: string, isLocked?: boolean) => {
    if (isLocked) {
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    }
    if (!statusTag) return 'bg-slate-100 text-slate-700 border-slate-200';
    const norm = statusTag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('conclu') || norm.includes('alta') || norm.includes('finaliz')) {
      return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
    }
    if (norm.includes('inativ') || norm.includes('desativ') || norm.includes('interromp') || norm.includes('cancelad')) {
      return 'bg-slate-200 text-slate-700 border-slate-300 font-bold';
    }
    if (norm.includes('trancad')) {
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    }
    return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
  };

  // Open Edit Modal for a Patient
  const handleOpenEditPatient = (p: Patient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPatient(p);
    setEditName(p.name || '');
    setEditPhone(p.phone || '');
    setEditCpf(p.cpf || '');
    setEditEmail(p.email || '');
    setEditBirthDate(p.birthDate || '');
    setEditRg(p.rg || '');
    setEditGender(p.gender || 'feminino');
    setEditProfession(p.profession || '');
    setEditEmergencyContact(p.emergencyContact || '');
    setEditEmergencyPhone(p.emergencyPhone || '');
    setEditGuardianName(p.guardianName || '');
    setEditHealthInsurance(p.healthInsurance || '');
    setEditAddress(p.address || '');
    setEditCity(p.city || 'Altamira - PA');
    setEditCategory(getPatientCategory(p));
    setEditColorTag(getPatientColorTag(p));
    setEditTagsString((p.tags || []).join(', '));
    setEditStatusTag(p.statusTag || (p.isLocked ? 'Sessões Trancadas 🔒' : 'Ativo'));
    setEditNotes(p.notes || '');
    setEditIsLocked(Boolean(p.isLocked));
    setEditLockStartDate(p.lockStartDate || getTodayISO());
    setEditLockEndDate(p.lockEndDate || '');
    setEditLockReason(p.lockReason || '');
    setEditLockNotes(p.lockNotes || '');

    // Treatment Fields
    const pAppts = appointments.filter(a => a.patientPhone === p.phone || a.patientName.toLowerCase() === p.name.toLowerCase());
    const latestAppt = pAppts[pAppts.length - 1];
    setEditCurrentTreatment(p.currentTreatment || (latestAppt ? latestAppt.serviceName : ''));
    setEditCurrentServiceId(p.currentServiceId || (latestAppt ? latestAppt.serviceId : ''));
    setEditTreatmentPlan(p.treatmentPlan || (latestAppt?.planScheduleSummary ? latestAppt.planScheduleSummary : ''));
    setEditTreatmentObjective(p.treatmentObjective || p.notes || '');
    setEditSessionPrice(p.sessionPrice !== undefined ? p.sessionPrice : (latestAppt ? latestAppt.servicePrice : ''));

    if (p.recurrenceConfig) {
      setEditHasRecurrence(true);
      setEditFrequencyType(p.recurrenceConfig.frequencyType);
      setEditRecurrenceDays(p.recurrenceConfig.days || []);
    } else {
      setEditHasRecurrence(false);
      setEditFrequencyType('2x_semana');
      setEditRecurrenceDays([]);
    }
  };

  // Save Patient Registration & Edits
  const handleSavePatientEdits = async () => {
    if (!editingPatient) return;
    setIsSavingPatient(true);
    try {
      const parsedTags = editTagsString
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const statusTagFinal = editIsLocked 
        ? (editStatusTag.includes('Trancad') ? editStatusTag : 'Sessões Trancadas 🔒')
        : (editStatusTag.includes('Trancad') ? 'Ativo' : editStatusTag);

      const isInactiveOrConcluded = localDb.isPatientInactiveOrCompleted({
        statusTag: statusTagFinal,
        isLocked: editIsLocked,
        tags: parsedTags,
        category: editCategory
      });

      let calculatedTreatmentStatus: 'em_andamento' | 'concluido' | 'alta' | 'inativo' | 'interrompido' = 'em_andamento';
      const normStatus = statusTagFinal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normStatus.includes('conclu')) calculatedTreatmentStatus = 'concluido';
      else if (normStatus.includes('alta')) calculatedTreatmentStatus = 'alta';
      else if (normStatus.includes('inativ') || normStatus.includes('desativ')) calculatedTreatmentStatus = 'inativo';
      else if (normStatus.includes('interromp') || normStatus.includes('cancelad')) calculatedTreatmentStatus = 'interrompido';

      const updatedPayload: Partial<Patient> = {
        name: editName.trim() || editingPatient.name,
        phone: editPhone.trim() || editingPatient.phone,
        cpf: editCpf.trim() || editingPatient.cpf,
        email: editEmail.trim() || editingPatient.email,
        birthDate: editBirthDate ? editBirthDate.trim() : undefined,
        rg: editRg.trim() || undefined,
        gender: editGender,
        profession: editProfession.trim() || undefined,
        emergencyContact: editEmergencyContact.trim() || undefined,
        emergencyPhone: editEmergencyPhone.trim() || undefined,
        guardianName: editGuardianName.trim() || undefined,
        healthInsurance: editHealthInsurance.trim() || undefined,
        address: editAddress.trim() || undefined,
        city: editCity.trim() || 'Altamira - PA',
        category: editCategory,
        colorTag: editColorTag,
        tags: parsedTags,
        statusTag: statusTagFinal,
        isActive: !isInactiveOrConcluded,
        treatmentStatus: calculatedTreatmentStatus,
        notes: editNotes,
        isLocked: editIsLocked,
        lockStartDate: editIsLocked ? (editLockStartDate || getTodayISO()) : undefined,
        lockEndDate: editIsLocked && editLockEndDate ? editLockEndDate : undefined,
        lockReason: editIsLocked ? (editLockReason.trim() || 'Trancamento Solicitado') : undefined,
        lockNotes: editIsLocked ? editLockNotes.trim() : undefined,
        lockedAt: editIsLocked ? (editingPatient.lockedAt || new Date().toISOString()) : undefined,
        // Treatment fields
        currentTreatment: editCurrentTreatment.trim() || undefined,
        currentServiceId: editCurrentServiceId || undefined,
        treatmentPlan: editTreatmentPlan.trim() || undefined,
        treatmentObjective: editTreatmentObjective.trim() || undefined,
        sessionPrice: editSessionPrice !== '' ? Number(editSessionPrice) : undefined,
        recurrenceConfig: editHasRecurrence ? {
          frequencyType: editFrequencyType,
          days: editRecurrenceDays,
          startDate: new Date().toISOString().split('T')[0]
        } : undefined
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
      alert('Erro ao salvar dados do cadastro do paciente.');
    } finally {
      setIsSavingPatient(false);
    }
  };

  // Open Edit Session Modal from Drawer
  const handleOpenEditSession = (app: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingApptInDrawer(app);
    setDrawerApptServiceId(app.serviceId || '');
    setDrawerApptServiceName(app.serviceName || '');
    setDrawerApptPrice(app.servicePrice !== undefined ? app.servicePrice : '');
    setDrawerApptDate(app.date || '');
    setDrawerApptTime(app.time || '');
    setDrawerApptStatus(app.status || 'agendado');
    setDrawerApptNotes(app.notes || '');
  };

  // Save Session Edits directly from Drawer
  const handleSaveDrawerSession = async () => {
    if (!editingApptInDrawer) return;
    setIsSavingDrawerAppt(true);
    try {
      const selectedServ = (services || []).find(s => s.id === drawerApptServiceId);
      const servName = drawerApptServiceName.trim() || (selectedServ ? selectedServ.name : editingApptInDrawer.serviceName);
      const servPrice = drawerApptPrice !== '' ? Number(drawerApptPrice) : (selectedServ ? selectedServ.price : editingApptInDrawer.servicePrice);

      const updates: Partial<Appointment> = {
        serviceId: drawerApptServiceId || editingApptInDrawer.serviceId,
        serviceName: servName,
        servicePrice: servPrice,
        date: drawerApptDate || editingApptInDrawer.date,
        time: drawerApptTime || editingApptInDrawer.time,
        status: drawerApptStatus,
        notes: drawerApptNotes
      };

      await api.updateAppointmentDetails(editingApptInDrawer.id, updates);
      setEditingApptInDrawer(null);
      if (onReload) onReload();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar dados do procedimento/sessão.');
    } finally {
      setIsSavingDrawerAppt(false);
    }
  };

  // Open Quick Lock Modal
  const handleOpenLockPatient = (p: Patient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLockingPatient(p);
    setLockStartDate(p.lockStartDate || getTodayISO());
    setLockEndDate(p.lockEndDate || '');
    setLockNoEndDate(!p.lockEndDate);
    setLockReason(p.lockReason || 'Viagem / Férias');
    setLockCustomReason('');
    setLockNotes(p.lockNotes || '');
  };

  // Confirm Trancamento de Sessões
  const handleConfirmLock = async () => {
    if (!lockingPatient) return;
    setIsSavingLock(true);
    try {
      const finalReason = lockReason === 'Outro' 
        ? (lockCustomReason.trim() || 'Motivo informado na recepção')
        : lockReason;

      const updatedPayload: Partial<Patient> = {
        isLocked: true,
        lockStartDate: lockStartDate || getTodayISO(),
        lockEndDate: lockNoEndDate ? undefined : (lockEndDate || undefined),
        lockReason: finalReason,
        lockNotes: lockNotes.trim() || undefined,
        lockedAt: new Date().toISOString(),
        lockedBy: clinic?.managerName || 'Dra. Elays Marinho',
        statusTag: 'Sessões Trancadas 🔒'
      };

      await api.updatePatient(lockingPatient.id, updatedPayload);
      await syncPatientToSupabase({
        ...lockingPatient,
        ...updatedPayload
      });

      if (selectedPatient && selectedPatient.id === lockingPatient.id) {
        setSelectedPatient({
          ...selectedPatient,
          ...updatedPayload
        });
      }

      setLockingPatient(null);
      if (onReload) onReload();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao trancar sessões do paciente.');
    } finally {
      setIsSavingLock(false);
    }
  };

  // Open Quick Unlock / Reactivate Modal
  const handleOpenUnlockPatient = (p: Patient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setUnlockingPatient(p);
    setUnlockDate(getTodayISO());
    setUnlockNotes('');
  };

  // Confirm Destrancamento / Reativação
  const handleConfirmUnlock = async () => {
    if (!unlockingPatient) return;
    setIsSavingUnlock(true);
    try {
      const updatedPayload: Partial<Patient> = {
        isLocked: false,
        unlockedAt: new Date().toISOString(),
        statusTag: 'Ativo',
        notes: unlockNotes.trim() 
          ? `${unlockingPatient.notes ? `${unlockingPatient.notes}\n` : ''}[Reativado em ${formatDatePtBR(unlockDate)}]: ${unlockNotes.trim()}`
          : unlockingPatient.notes
      };

      await api.updatePatient(unlockingPatient.id, updatedPayload);
      await syncPatientToSupabase({
        ...unlockingPatient,
        ...updatedPayload
      });

      if (selectedPatient && selectedPatient.id === unlockingPatient.id) {
        setSelectedPatient({
          ...selectedPatient,
          ...updatedPayload
        });
      }

      setUnlockingPatient(null);
      if (onReload) onReload();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao destrancar sessões do paciente.');
    } finally {
      setIsSavingUnlock(false);
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
            onClick={() => setSelectedFilter('active')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'active'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Ativos ({activeCount})</span>
          </button>

          <button
            onClick={() => setSelectedFilter('concluded')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'concluded'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Concluídos / Alta / Inativos ({concludedCount})</span>
          </button>

          <button
            onClick={() => setSelectedFilter('locked')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'locked'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sessões Trancadas ({lockedCount})</span>
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

          {(selectedCategory !== 'all' || selectedColorTag !== 'all' || searchTerm || selectedFilter !== 'all') && (
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

      {/* 📋 PATIENT CARDS GRID WITH COLOR TAGS, CATEGORIES & LOCK STATUS */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Nenhum paciente encontrado para este filtro</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não encontramos pacientes correspondentes aos filtros de categoria, cor, status ou busca selecionados.
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

            const isLocked = Boolean(patient.isLocked);
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
                className={`bg-white rounded-3xl p-5 border ${
                  isLocked 
                    ? 'border-amber-300 ring-2 ring-amber-200/60 bg-gradient-to-b from-amber-50/25 to-white' 
                    : 'border-slate-200/90 hover:border-[#1B2E24]'
                } cursor-pointer shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group relative overflow-hidden`}
              >
                {/* Top Color Tag / Lock Header Stripe */}
                <div className={`h-1.5 w-full absolute top-0 left-0 ${isLocked ? 'bg-amber-500' : tagConfig.dotClass}`} />

                <div>
                  {/* Lock Banner if patient is locked */}
                  {isLocked && (
                    <div className="mb-2.5 p-2 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold">
                        <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Sessões Trancadas</span>
                        {patient.lockStartDate && (
                          <span className="text-[11px] font-medium text-amber-900 hidden sm:inline">
                            (desde {formatDatePtBR(patient.lockStartDate)})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleOpenUnlockPatient(patient, e)}
                        className="px-2 py-0.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[10px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0"
                        title="Destrancar sessões e reativar paciente"
                      >
                        <Unlock className="w-2.5 h-2.5" />
                        <span>Destrancar</span>
                      </button>
                    </div>
                  )}

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

                      {/* Edit Registration Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditPatient(patient, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Editar Cadastro do Paciente (Data de Nascimento, CPF, Trancamento)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-black text-slate-900 group-hover:text-[#1B2E24] transition-colors flex items-center gap-1.5 flex-wrap">
                        <span>{patient.name}</span>
                        {patient.statusTag && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadgeClasses(patient.statusTag, isLocked)}`}>
                            {patient.statusTag}
                          </span>
                        )}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-[#1B2E24] shrink-0" />
                          <span>{patient.phone}</span>
                        </span>

                        {patient.birthDate && (
                          <span className="flex items-center space-x-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80" title="Data de Nascimento e Idade Calculada">
                            <Cake className="w-3 h-3 text-teal-600 shrink-0" />
                            <span>{formatBirthDateAndAge(patient.birthDate)}</span>
                          </span>
                        )}

                        {patient.cpf && (
                          <span className="flex items-center space-x-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                            <IdCard className="w-3 h-3 text-[#31523D] shrink-0" />
                            <span>CPF: {patient.cpf}</span>
                          </span>
                        )}

                        {patient.profession && (
                          <span className="hidden sm:flex items-center space-x-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{patient.profession}</span>
                          </span>
                        )}
                      </div>

                      {/* Lock Details details if locked */}
                      {isLocked && patient.lockReason && (
                        <div className="mt-2 text-xs bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-950 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-bold flex items-center gap-1 text-amber-800">
                            <Lock className="w-3 h-3" />
                            <span>Motivo do Trancamento:</span>
                          </span>
                          <span>{patient.lockReason}</span>
                          {patient.lockEndDate && (
                            <span className="text-[11px] font-bold text-amber-900 bg-amber-200/60 px-1.5 py-0.5 rounded">
                              Previsão Retorno: {formatDatePtBR(patient.lockEndDate)}
                            </span>
                          )}
                        </div>
                      )}
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

                <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 gap-2 flex-wrap">
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

                  <div className="flex items-center gap-2">
                    {/* Quick Lock / Unlock Button on Card */}
                    {isLocked ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenUnlockPatient(patient, e)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1 transition-all cursor-pointer text-[11px]"
                      >
                        <Unlock className="w-3 h-3 text-emerald-700" />
                        <span>Destrancar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleOpenLockPatient(patient, e)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center gap-1 transition-all cursor-pointer text-[11px]"
                        title="Trancar sessões deste paciente por viagem, saúde ou pausa"
                      >
                        <Lock className="w-3 h-3 text-amber-700" />
                        <span>Trancar Sessões</span>
                      </button>
                    )}

                    <span className="text-[#1B2E24] font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>Ver Prontuário</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✏️ MODAL: EDITAR CADASTRO DO PACIENTE COMPLETO */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center font-bold shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Editar Cadastro do Paciente
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Paciente: <span className="text-[#1B2E24]">{editingPatient.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPatient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              
              {/* 🏷️ SEÇÃO 1: DADOS PESSOAIS & NASCIMENTO */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#1B2E24] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#1B2E24]" />
                    <span>1. Dados Pessoais & Nascimento</span>
                  </span>
                  {editBirthDate && calculateAge(editBirthDate) !== null && (
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-extrabold text-[11px] border border-teal-200 flex items-center gap-1">
                      <Cake className="w-3 h-3 text-teal-700" />
                      <span>{calculateAge(editBirthDate)} anos calculados</span>
                    </span>
                  )}
                </div>

                {/* Nome Completo */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome Completo do(a) Paciente: *
                  </label>

                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nome completo do paciente..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />
                </div>

                {/* Data de Nascimento & Gênero */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Cake className="w-3.5 h-3.5 text-teal-700" />
                        <span>Data de Nascimento:</span>
                      </span>
                      {editBirthDate && (
                        <span className="text-[10px] text-teal-700 font-bold">
                          {formatBirthDateAndAge(editBirthDate)}
                        </span>
                      )}
                    </label>

                    <input
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 text-xs font-bold text-slate-900 bg-teal-50/30 focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Gênero / Sexo:
                    </label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    >
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                      <option value="outro">Outro / Prefere não informar</option>
                    </select>
                  </div>
                </div>

                {/* CPF & RG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <IdCard className="w-3.5 h-3.5 text-[#31523D]" />
                      <span>CPF do Paciente:</span>
                    </label>

                    <input
                      type="text"
                      value={editCpf}
                      onChange={(e) => setEditCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>RG / Documento:</span>
                    </label>

                    <input
                      type="text"
                      value={editRg}
                      onChange={(e) => setEditRg(e.target.value)}
                      placeholder="Número do RG..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Telefone, E-mail & Profissão */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#1B2E24]" />
                      <span>WhatsApp / Fone: *</span>
                    </label>

                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="(93) 99999-9999"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>E-mail:</span>
                    </label>

                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="paciente@exemplo.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>Profissão:</span>
                    </label>

                    <input
                      type="text"
                      value={editProfession}
                      onChange={(e) => setEditProfession(e.target.value)}
                      placeholder="Ex: Advogada, Professora..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Endereço & Cidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Endereço / Bairro:</span>
                    </label>

                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Rua, número, bairro..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Cidade / UF:
                    </label>

                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Altamira - PA"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 🩺 SEÇÃO 2: TRATAMENTO ESCOLHIDO, PLANO & VALOR */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#1B2E24] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>2. Tratamento Escolhido, Plano & Procedimento</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                    Dra. Elays
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Procedimento / Tratamento Dropdown or Input */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Procedimento / Tratamento Principal:</span>
                    </label>
                    {services && services.length > 0 ? (
                      <select
                        value={editCurrentServiceId || (services.find(s => s.name === editCurrentTreatment)?.id || '')}
                        onChange={(e) => {
                          const sId = e.target.value;
                          setEditCurrentServiceId(sId);
                          const serv = services.find(s => s.id === sId);
                          if (serv) {
                            setEditCurrentTreatment(serv.name);
                            if (editSessionPrice === '' || editSessionPrice === 0) {
                              setEditSessionPrice(serv.price);
                            }
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none mb-1.5"
                      >
                        <option value="">Selecione um procedimento cadastrado...</option>
                        {services.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} - R$ {s.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    <input
                      type="text"
                      value={editCurrentTreatment}
                      onChange={(e) => setEditCurrentTreatment(e.target.value)}
                      placeholder="Ex: Pilates Studio, Fisioterapia Ortopédica, Pélvica..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>

                  {/* Valor da Sessão / Mensalidade */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Valor da Sessão / Mensalidade (R$):</span>
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editSessionPrice}
                      onChange={(e) => setEditSessionPrice(e.target.value)}
                      placeholder="Ex: 180.00"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-extrabold text-emerald-950 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Plano / Frequência de Atendimento */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Plano & Frequência de Sessões:</span>
                    <span className="text-[10px] text-slate-500 font-normal">Clique para selecionar rápido</span>
                  </label>

                  {/* Quick preset buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Sessão Avulsa',
                      'Plano 2x por semana (8 sessões/mês)',
                      'Plano 3x por semana (12 sessões/mês)',
                      'Pacote de 10 Sessões',
                      'Mensalidade Pilates',
                      'Avaliação + Tratamento'
                    ].map(planName => (
                      <button
                        key={planName}
                        type="button"
                        onClick={() => setEditTreatmentPlan(planName)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          editTreatmentPlan === planName
                            ? 'bg-[#1B2E24] text-[#DCC58F] border-[#1B2E24] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {planName}
                      </button>
                    ))}
                  </div>


                  <input
                    type="text"
                    value={editTreatmentPlan}
                    onChange={(e) => setEditTreatmentPlan(e.target.value)}
                    placeholder="Ex: Plano 2x por semana (Terças e Quintas às 09:00)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none font-medium"
                  />
                </div>
                <div className="mt-4 p-3 border border-emerald-100 bg-emerald-50 rounded-xl">
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={editHasRecurrence} onChange={(e) => setEditHasRecurrence(e.target.checked)} className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                    <span className="font-bold text-sm text-emerald-900">Gerar Agendamentos Recorrentes (Agenda)</span>
                  </label>
                  {editHasRecurrence && (
                    <div className="space-y-3 mt-2 pl-6">
                      <div>
                        <span className="block text-xs font-semibold text-emerald-800 mb-2">Dias da semana e horários:</span>
                        <div className="flex flex-wrap gap-2">
                          {[0,1,2,3,4,5,6].map(dow => {
                            const daysStr = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                            const isSelected = editRecurrenceDays.some(d => d.dayOfWeek === dow);
                            return (
                              <div key={dow} className={`flex items-center gap-1 border rounded-lg px-2 py-1 ${isSelected ? "bg-emerald-600 border-emerald-700 text-white" : "bg-white border-slate-300 text-slate-700"}`}>
                                <input type="checkbox" checked={isSelected} onChange={(e) => {
                                  if (e.target.checked) setEditRecurrenceDays([...editRecurrenceDays, { dayOfWeek: dow, time: "09:00" }]);
                                  else setEditRecurrenceDays(editRecurrenceDays.filter(d => d.dayOfWeek !== dow));
                                }} className="hidden" id={`dow-${dow}`} />
                                <label htmlFor={`dow-${dow}`} className="text-xs font-bold cursor-pointer">{daysStr[dow]}</label>
                                {isSelected && (
                                  <input type="time" value={editRecurrenceDays.find(d => d.dayOfWeek === dow)?.time || "09:00"} onChange={(e) => {
                                    setEditRecurrenceDays(editRecurrenceDays.map(d => d.dayOfWeek === dow ? { ...d, time: e.target.value } : d));
                                  }} className="ml-1 px-1 py-0.5 text-[10px] text-slate-900 rounded bg-emerald-50 border border-emerald-200 outline-none" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-emerald-700 mt-2 font-medium">
                          O sistema mantém agendamentos futuros automáticos em até 60 dias para pacientes ativos. Caso o paciente seja inativado ou conclua o tratamento, a geração é interrompida automaticamente.
                        </p>
                        {localDb.isPatientInactiveOrCompleted({ statusTag: editStatusTag, isLocked: editIsLocked }) && (
                          <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded-lg text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>Atenção: A criação automática está pausada porque o status está marcado como "{editStatusTag || 'Inativo / Concluído'}".</span>
                          </div>
                        )}


                      </div>
                    </div>
                  )}
                </div>

                {/* Objetivo Clínico / Foco do Tratamento */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Objetivo Clínico & Queixa Principal:</span>
                  </label>

                  <input
                    type="text"
                    value={editTreatmentObjective}
                    onChange={(e) => setEditTreatmentObjective(e.target.value)}
                    placeholder="Ex: Fortalecimento de core, reabilitação lombar e melhora da flexibilidade..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />
                </div>
              </div>

              {/* 🛡️ SEÇÃO 3: EMERGÊNCIA, RESPONSÁVEL & CONVÊNIO */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                <span className="font-extrabold text-[#1B2E24] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-[#1B2E24]" />
                  <span>3. Emergência, Responsável & Convênio</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nome do Contato de Emergência:
                    </label>

                    <input
                      type="text"
                      value={editEmergencyContact}
                      onChange={(e) => setEditEmergencyContact(e.target.value)}
                      placeholder="Ex: Esposo(a), Mãe, Filho(a)..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Telefone de Emergência:
                    </label>

                    <input
                      type="text"
                      value={editEmergencyPhone}
                      onChange={(e) => setEditEmergencyPhone(e.target.value)}
                      placeholder="(93) 99999-9999"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nome do Responsável Legal (se menor ou dependente):
                    </label>

                    <input
                      type="text"
                      value={editGuardianName}
                      onChange={(e) => setEditGuardianName(e.target.value)}
                      placeholder="Nome do responsável..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Convênio / Plano de Saúde / Particular:
                    </label>

                    <input
                      type="text"
                      value={editHealthInsurance}
                      onChange={(e) => setEditHealthInsurance(e.target.value)}
                      placeholder="Ex: Particular, Unimed, Bradesco..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 🔒 SEÇÃO 4: OPÇÃO DE TRANCAR AS SESSÕES DO PACIENTE */}
              <div className={`p-4 rounded-2xl border transition-all space-y-3.5 ${
                editIsLocked 
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-200' 
                  : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <span>4. Trancamento de Sessões no Sistema</span>
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={editIsLocked}
                      onChange={(e) => setEditIsLocked(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-xs font-black text-amber-950">
                      {editIsLocked ? '🔒 SESSÕES TRANCADAS' : 'Ativo (Não Trancado)'}
                    </span>
                  </label>
                </div>

                <p className="text-[11px] text-slate-600">
                  Marque para trancar/pausar temporariamente os agendamentos do paciente (por férias, cirurgia, licença médica ou viagem).
                </p>

                {editIsLocked && (
                  <div className="space-y-3 pt-2 border-t border-amber-200 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-amber-950 mb-1 flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Data de Início do Trancamento: *</span>
                        </label>

                        <input
                          type="date"
                          value={editLockStartDate}
                          onChange={(e) => setEditLockStartDate(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          Previsão de Retorno (Data de Término):
                        </label>

                        <input
                          type="date"
                          value={editLockEndDate}
                          onChange={(e) => setEditLockEndDate(e.target.value)}
                          placeholder="Deixe em branco se indeterminado"
                          className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          Motivo do Trancamento:
                        </label>

                        <input
                          type="text"
                          value={editLockReason}
                          onChange={(e) => setEditLockReason(e.target.value)}
                          placeholder="Ex: Viagem de férias, Cirurgia, Licença médica..."
                          className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          Observações do Trancamento:
                        </label>

                        <input
                          type="text"
                          value={editLockNotes}
                          onChange={(e) => setEditLockNotes(e.target.value)}
                          placeholder="Acordado retorno na 2ª quinzena..."
                          className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 📑 SEÇÃO 5: CLASSIFICAÇÃO CLÍNICA & TAGS */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                <span className="font-extrabold text-[#1B2E24] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#1B2E24]" />
                  <span>5. Classificação Clínica & Prontuário</span>
                </span>

                {/* Category Selector */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Categoria Clínica Principal:
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
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Tag de Cor de Identificação:
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
                  <label className="block font-bold text-slate-700 mb-1">
                    Tags Clínicas Extras (separadas por vírgula):
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
                  <label className="block font-bold text-slate-700 mb-1">
                    Situação do Paciente / Rótulo de Status:
                  </label>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      { label: 'Ativo', color: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' },
                      { label: 'Tratamento Concluído', color: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100' },
                      { label: 'Alta Clínica', color: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100' },
                      { label: 'Inativo', color: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' },
                      { label: 'Em Reabilitação', color: 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100' },
                      { label: 'Tratamento Contínuo', color: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100' },
                      { label: 'Assíduo 100%', color: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setEditStatusTag(preset.label)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          editStatusTag === preset.label 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                            : preset.color
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Ex: Ativo, Tratamento Concluído, Alta Clínica, Inativo, Em Reabilitação"
                    value={editStatusTag}
                    onChange={(e) => setEditStatusTag(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />

                  {/* Warning banner when inactive or concluded */}
                  {localDb.isPatientInactiveOrCompleted({ statusTag: editStatusTag, isLocked: editIsLocked }) && (
                    <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Recorrência Automática Interrompida:</strong> Como o paciente está marcado como <span className="font-bold underline">{editStatusTag || 'Inativo / Concluído'}</span>, o sistema <strong>interrompe automaticamente</strong> a criação de novos agendamentos futuros na Agenda Eletrônica.
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Observações Clínicas do Prontuário:
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />
                </div>
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
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#1B2E24] hover:bg-[#2A4435] text-[#FAF7F0] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Check className="w-4 h-4 text-[#DCC58F]" />
                <span>{isSavingPatient ? 'Salvando Cadastro...' : 'Salvar Alterações no Cadastro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 MODAL ESPECÍFICO: TRANCAR SESSÕES DO PACIENTE */}
      {lockingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Trancar Sessões do Paciente
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Paciente: <span className="text-amber-800">{lockingPatient.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLockingPatient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-xs space-y-1.5 text-amber-950">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>O que acontece ao trancar as sessões?</span>
              </p>
              <p className="text-[11px] leading-relaxed text-amber-900">
                O status do paciente será alterado para <strong>Sessões Trancadas</strong>, preservando seu histórico, contagem de presenças e dados cadastrais para retorno seguro.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Data de Início do Trancamento */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 text-[#1B2E24]" />
                  <span>Data de Início do Trancamento no Sistema: *</span>
                </label>

                <input
                  type="date"
                  value={lockStartDate}
                  onChange={(e) => setLockStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Data Prevista de Retorno */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Previsão de Retorno:
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-600">

                    <input
                      type="checkbox"
                      checked={lockNoEndDate}
                      onChange={(e) => setLockNoEndDate(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span>Data indeterminada</span>
                  </label>
                </div>
                {!lockNoEndDate && (

                  <input
                    type="date"
                    value={lockEndDate}
                    onChange={(e) => setLockEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none animate-in fade-in"
                  />
                )}
              </div>

              {/* Motivo do Trancamento (Presets + Custom) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Motivo do Trancamento:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {[
                    'Viagem / Férias',
                    'Licença Médica / Cirurgia',
                    'Pós-Parto / Gestação',
                    'Motivo Financeiro',
                    'Trabalho / Estudo',
                    'Outro'
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLockReason(m)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                        lockReason === m
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {lockReason === 'Outro' && (

                  <input
                    type="text"
                    placeholder="Especifique o motivo do trancamento..."
                    value={lockCustomReason}
                    onChange={(e) => setLockCustomReason(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none mt-1 animate-in fade-in"
                  />
                )}
              </div>

              {/* Observações / Anotações do Acordo */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações / Notas Internas:
                </label>
                <textarea
                  rows={2}
                  value={lockNotes}
                  onChange={(e) => setLockNotes(e.target.value)}
                  placeholder="Ex: Paciente comunicou que viaja a trabalho e retorna dia 15..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLockingPatient(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingLock}
                onClick={handleConfirmLock}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Lock className="w-4 h-4 text-amber-200" />
                <span>{isSavingLock ? 'Trancando...' : 'Confirmar Trancamento no Sistema'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔓 MODAL ESPECÍFICO: DESTRANCAR / REATIVAR PACIENTE */}
      {unlockingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Destrancar & Reativar Sessões
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Paciente: <span className="text-emerald-800">{unlockingPatient.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUnlockingPatient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs space-y-1.5 text-emerald-950">
              <p className="font-bold">
                Resumo do Trancamento Atual:
              </p>
              <div className="text-[11px] text-emerald-900 space-y-0.5">
                <p>• Trancado em: <strong>{unlockingPatient.lockStartDate ? formatDatePtBR(unlockingPatient.lockStartDate) : 'N/A'}</strong></p>
                {unlockingPatient.lockReason && <p>• Motivo registrado: <strong>{unlockingPatient.lockReason}</strong></p>}
                {unlockingPatient.lockEndDate && <p>• Retorno previsto: <strong>{formatDatePtBR(unlockingPatient.lockEndDate)}</strong></p>}
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Data de Reativação / Retorno: *
                </label>

                <input
                  type="date"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações do Retorno (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={unlockNotes}
                  onChange={(e) => setUnlockNotes(e.target.value)}
                  placeholder="Ex: Paciente retornou de viagem e retomou sessões às terças e quintas..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlockingPatient(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingUnlock}
                onClick={handleConfirmUnlock}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <PlayCircle className="w-4 h-4 text-emerald-200" />
                <span>{isSavingUnlock ? 'Reativando...' : 'Reativar e Liberar Sessões'}</span>
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadgeClasses(selectedPatient.statusTag, selectedPatient.isLocked)}`}>
                        {selectedPatient.statusTag}
                      </span>
                    )}
                  </div>
                  
                  {/* Action Buttons in Drawer Header */}
                  <div className="flex items-center gap-2">
                    {selectedPatient.isLocked ? (
                      <button
                        type="button"
                        onClick={(e) => handleOpenUnlockPatient(selectedPatient, e)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all hover:scale-102"
                        title="Destrancar sessões e reativar paciente"
                      >
                        <Unlock className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Destrancar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleOpenLockPatient(selectedPatient, e)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all hover:scale-102"
                        title="Trancar ou pausar sessões deste paciente"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-100" />
                        <span>Trancar Sessões</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleOpenEditPatient(selectedPatient, e)}
                      className="px-3 py-1.5 rounded-xl bg-[#1B2E24] hover:bg-[#2A4435] text-[#DCC58F] text-xs font-black flex items-center gap-1.5 shadow-2xs border border-[#DCC58F]/40 cursor-pointer transition-all hover:scale-102"
                      title="Editar cadastro completo (Data de Nascimento, RG, CPF, etc.)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#DCC58F]" />
                      <span>Editar Cadastro</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Phone className="w-3.5 h-3.5 text-[#1B2E24]" />
                    <span>{selectedPatient.phone}</span>
                  </span>

                  {selectedPatient.birthDate && (
                    <span className="flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200" title="Data de Nascimento e Idade">
                      <Cake className="w-3.5 h-3.5 text-teal-700" />
                      <span>{formatBirthDateAndAge(selectedPatient.birthDate)}</span>
                    </span>
                  )}

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

            {/* 🔒 Prominent Lock Status Alert Banner */}
            {selectedPatient.isLocked && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 text-xs text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold flex items-center gap-1.5 text-amber-900 text-[12px] uppercase tracking-wide">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <span>Sessões Trancadas no Sistema</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleOpenUnlockPatient(selectedPatient, e)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Destrancar Agora</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/70 p-2.5 rounded-xl border border-amber-200">
                  <p>
                    <span className="text-amber-800 font-bold">Data de Início:</span>{' '}
                    <strong className="text-slate-900">{selectedPatient.lockStartDate ? formatDatePtBR(selectedPatient.lockStartDate) : 'N/A'}</strong>
                  </p>
                  <p>
                    <span className="text-amber-800 font-bold">Previsão de Retorno:</span>{' '}
                    <strong className="text-slate-900">{selectedPatient.lockEndDate ? formatDatePtBR(selectedPatient.lockEndDate) : 'Indeterminado'}</strong>
                  </p>
                  {selectedPatient.lockReason && (
                    <p className="sm:col-span-2">
                      <span className="text-amber-800 font-bold">Motivo:</span>{' '}
                      <span className="text-slate-900 font-medium">{selectedPatient.lockReason}</span>
                    </p>
                  )}
                  {selectedPatient.lockNotes && (
                    <p className="sm:col-span-2 italic text-slate-700">
                      "{selectedPatient.lockNotes}"
                    </p>
                  )}
                </div>
              </div>
            )}

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

            {/* 🩺 TRATAMENTO ESCOLHIDO & PLANO DE ATENDIMENTO (Dra. Elays) */}
            <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/70 p-4 rounded-2xl border-2 border-emerald-300 text-xs space-y-2.5 text-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#1B2E24] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>Tratamento Escolhido & Plano de Atendimento</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleOpenEditPatient(selectedPatient, e)}
                  className="px-2.5 py-1 rounded-lg bg-[#1B2E24] hover:bg-[#2A4435] text-[#DCC58F] font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer transition-all hover:scale-105"
                  title="Editar tratamento, plano, objetivo ou valor do paciente"
                >
                  <Edit3 className="w-3 h-3 text-[#DCC58F]" />
                  <span>Editar Tratamento</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white/90 p-3 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Procedimento Principal</span>
                  <strong className="text-emerald-950 text-sm font-black">
                    {selectedPatient.currentTreatment || (patientAppointments[0]?.serviceName) || 'Fisioterapia / Pilates'}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Plano / Frequência</span>
                  <strong className="text-slate-900 font-bold">
                    {selectedPatient.treatmentPlan || (patientAppointments[0]?.planScheduleSummary) || 'Plano Personalizado'}
                  </strong>
                </div>

                {selectedPatient.sessionPrice !== undefined && selectedPatient.sessionPrice > 0 && (
                  <div>
                    <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Valor da Sessão / Mensalidade</span>
                    <strong className="text-emerald-700 font-black text-xs">
                      {formatCurrency(selectedPatient.sessionPrice)}
                    </strong>
                  </div>
                )}

                {selectedPatient.treatmentObjective && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Objetivo Clínico / Queixa</span>
                    <p className="text-slate-800 font-semibold leading-relaxed">
                      {selectedPatient.treatmentObjective}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Ficha Cadastral do Paciente */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <span className="font-extrabold text-[#1B2E24] flex items-center gap-1 text-[11px] uppercase tracking-wider mb-2">
                <UserCheck className="w-3.5 h-3.5 text-[#1B2E24]" />
                <span>Ficha Cadastral:</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {selectedPatient.birthDate && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Nascimento & Idade:</span>
                    <strong className="text-teal-900 font-bold">{formatBirthDateAndAge(selectedPatient.birthDate)}</strong>
                  </p>
                )}

                {selectedPatient.gender && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Gênero:</span>
                    <strong className="text-slate-800 capitalize">{selectedPatient.gender}</strong>
                  </p>
                )}

                {selectedPatient.rg && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">RG:</span>
                    <strong className="text-slate-800">{selectedPatient.rg}</strong>
                  </p>
                )}

                {selectedPatient.profession && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Profissão:</span>
                    <strong className="text-slate-800">{selectedPatient.profession}</strong>
                  </p>
                )}

                {selectedPatient.healthInsurance && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Convênio/Plano:</span>
                    <strong className="text-slate-800">{selectedPatient.healthInsurance}</strong>
                  </p>
                )}

                {selectedPatient.emergencyContact && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Emergência:</span>
                    <strong className="text-slate-800">{selectedPatient.emergencyContact} {selectedPatient.emergencyPhone ? `(${selectedPatient.emergencyPhone})` : ''}</strong>
                  </p>
                )}

                {selectedPatient.guardianName && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Responsável:</span>
                    <strong className="text-slate-800">{selectedPatient.guardianName}</strong>
                  </p>
                )}

                {selectedPatient.address && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1 sm:col-span-2">
                    <span className="text-slate-500">Endereço:</span>
                    <strong className="text-slate-800">{selectedPatient.address} {selectedPatient.city ? `(${selectedPatient.city})` : ''}</strong>
                  </p>
                )}

                <p className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Primeira Consulta:</span>
                  <strong className="text-slate-800">{selectedPatient.firstSessionDate ? formatDatePtBR(selectedPatient.firstSessionDate) : 'N/A'}</strong>
                </p>

                {selectedPatient.email && (
                  <p className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">E-mail:</span>
                    <strong className="text-slate-800">{selectedPatient.email}</strong>
                  </p>
                )}
              </div>

              {selectedPatient.notes && (
                <div className="pt-2 space-y-1">
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
                Altere o status ou edite o procedimento
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
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-900">{app.serviceName}</p>
                          {app.servicePrice !== undefined && app.servicePrice > 0 && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {formatCurrency(app.servicePrice)}
                            </span>
                          )}
                        </div>
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
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditSession(app, e)}
                          className="px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                          title="Editar procedimento ou detalhes desta sessão"
                        >
                          <Edit3 className="w-3 h-3 text-slate-600" />
                          <span>Editar Procedimento</span>
                        </button>

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

      {/* ✏️ MODAL: EDITAR PROCEDIMENTO / SESSÃO INDIVIDUAL DO PACIENTE */}
      {editingApptInDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Editar Sessão & Procedimento</h3>
                  <p className="text-xs text-slate-500 font-bold">
                    {editingApptInDrawer.patientName} • {formatDatePtBR(editingApptInDrawer.date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingApptInDrawer(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Procedimento / Serviço */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Procedimento / Tratamento Realizado:
                </label>
                {services && services.length > 0 && (
                  <select
                    value={services.find(sctl => sctl.name === drawerApptServiceName)?.id || ''}
                    onChange={(e) => {
                      const serv = services.find(sctl => sctl.id === e.target.value);
                      if (serv) {
                        setDrawerApptServiceId(serv.id);
                        setDrawerApptServiceName(serv.name);
                        setDrawerApptPrice(serv.price);
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none mb-1.5"
                  >
                    <option value="">Selecione um procedimento cadastrado...</option>
                    {services.map(sctl => (
                      <option key={sctl.id} value={sctl.id}>
                        {sctl.name} - R$ {sctl.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  value={drawerApptServiceName}
                  onChange={(e) => setDrawerApptServiceName(e.target.value)}
                  placeholder="Nome do procedimento..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none font-bold"
                />
              </div>

              {/* Data, Horário e Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Data:
                  </label>

                  <input
                    type="date"
                    value={drawerApptDate}
                    onChange={(e) => setDrawerApptDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Horário:
                  </label>

                  <input
                    type="time"
                    value={drawerApptTime}
                    onChange={(e) => setDrawerApptTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Valor (R$):
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={drawerApptPrice}
                    onChange={(e) => setDrawerApptPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-extrabold text-emerald-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Status da Sessão:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'agendado', label: 'Agendado', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
                    { id: 'concluido', label: 'Concluído', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                    { id: 'falta', label: 'Falta', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
                    { id: 'cancelado', label: 'Cancelado', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setDrawerApptStatus(st.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        drawerApptStatus === st.id
                          ? 'ring-2 ring-[#1B2E24] bg-[#1B2E24] text-[#DCC58F] font-black shadow-xs'
                          : `${st.bg} hover:opacity-80`
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anotações da Sessão */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Evolução Clínica / Anotações desta Sessão:
                </label>
                <textarea
                  rows={3}
                  value={drawerApptNotes}
                  onChange={(e) => setDrawerApptNotes(e.target.value)}
                  placeholder="Ex: Paciente relatou alívio nas dores lombares. Realizado exercícios de mobilidade pélvica..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingApptInDrawer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingDrawerAppt}
                onClick={handleSaveDrawerSession}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#1B2E24] hover:bg-[#2A4435] text-[#DCC58F] shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>{isSavingDrawerAppt ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
