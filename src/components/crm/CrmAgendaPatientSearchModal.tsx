import React, { useState, useMemo } from 'react';
import { 
  Search, Calendar, Clock, Phone, Send, UserPlus, CheckCircle2, 
  X, Filter, ChevronRight, CheckSquare, Square, Smartphone,
  FileText, Sparkles, AlertCircle, RefreshCw, UserCheck, Layers
} from 'lucide-react';
import { Appointment, Patient, CrmLead, ClinicConfig } from '../../types';
import { formatDatePtBR, formatPhoneMask } from '../../utils/qrUtils';
import { openDirectTouchMobileCalendar } from '../../utils/calendarUtils';

export interface UnifiedAgendaPatient {
  id: string;
  sourceType: 'appointment' | 'patient';
  patientName: string;
  patientPhone: string;
  patientCpf?: string;
  serviceName: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  status?: string;
  attendanceStatus?: string;
  notes?: string;
  existingLead?: CrmLead;
}

interface CrmAgendaPatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicAppointments: Appointment[];
  clinicPatients?: Patient[];
  existingLeads: CrmLead[];
  clinicConfig?: Partial<ClinicConfig>;
  onSelectForMessage: (patient: UnifiedAgendaPatient, batchList?: UnifiedAgendaPatient[]) => void;
  onImportAsLead: (patient: UnifiedAgendaPatient) => Promise<void>;
  onImportBatchAsLeads: (patients: UnifiedAgendaPatient[]) => Promise<void>;
  onStartEvaluation?: (patient: UnifiedAgendaPatient) => void;
  initialSearchQuery?: string;
}

export const CrmAgendaPatientSearchModal: React.FC<CrmAgendaPatientSearchModalProps> = ({
  isOpen,
  onClose,
  clinicAppointments = [],
  clinicPatients = [],
  existingLeads = [],
  clinicConfig = {},
  onSelectForMessage,
  onImportAsLead,
  onImportBatchAsLeads,
  onStartEvaluation,
  initialSearchQuery = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'past'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'agendado' | 'concluido' | 'falta' | 'cancelado'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [isBatchImporting, setIsBatchImporting] = useState(false);

  // Current dates for relative filtering
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const weekRangeStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const monthRangeStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);

  // Helper to normalize phone
  const cleanPhone = (phoneStr: string = '') => phoneStr.replace(/\D/g, '');

  // Helper to find if existing lead matches
  const findMatchingLead = (name: string, phone: string) => {
    const cPhone = cleanPhone(phone);
    const lowName = name.toLowerCase().trim();
    return existingLeads.find(l => {
      const lPhone = cleanPhone(l.telefone);
      if (cPhone && lPhone && (cPhone.includes(lPhone) || lPhone.includes(cPhone))) return true;
      if (lowName && l.nome.toLowerCase().trim() === lowName) return true;
      return false;
    });
  };

  // Build unified list from appointments and registered patients
  const unifiedList = useMemo(() => {
    const list: UnifiedAgendaPatient[] = [];
    const seenMap = new Map<string, boolean>();

    // 1. Add all appointments
    clinicAppointments.forEach(appt => {
      const key = `${appt.patientName}_${appt.date}_${appt.time}`;
      seenMap.set(key, true);
      const lead = findMatchingLead(appt.patientName, appt.patientPhone);
      list.push({
        id: `appt_${appt.id}`,
        sourceType: 'appointment',
        patientName: appt.patientName || 'Paciente sem nome',
        patientPhone: appt.patientPhone || '',
        patientCpf: appt.patientCpf,
        serviceName: appt.serviceName || 'Pilates & Fisioterapia',
        date: appt.date,
        time: appt.time,
        status: appt.status,
        attendanceStatus: appt.attendanceStatus,
        notes: appt.notes || appt.planScheduleSummary,
        existingLead: lead
      });
    });

    // 2. Add patients not already covered in appointments
    clinicPatients.forEach(p => {
      const hasAppt = clinicAppointments.some(a => 
        (p.phone && cleanPhone(a.patientPhone) === cleanPhone(p.phone)) ||
        (a.patientName.toLowerCase().trim() === p.name.toLowerCase().trim())
      );
      if (!hasAppt) {
        const lead = findMatchingLead(p.name, p.phone);
        list.push({
          id: `patient_${p.id}`,
          sourceType: 'patient',
          patientName: p.name,
          patientPhone: p.phone,
          patientCpf: p.cpf,
          serviceName: p.serviceName || 'Pilates / Fisioterapia',
          status: 'cadastrado',
          notes: p.notes,
          existingLead: lead
        });
      }
    });

    // Sort by date descending (most recent first) then time
    return list.sort((a, b) => {
      if (a.date && b.date) {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (a.time || '').localeCompare(b.time || '');
      }
      if (a.date) return -1;
      if (b.date) return 1;
      return a.patientName.localeCompare(b.patientName);
    });
  }, [clinicAppointments, clinicPatients, existingLeads]);

  // Filtered List based on Search Query, Date Filter, Status Filter
  const filteredList = useMemo(() => {
    return unifiedList.filter(item => {
      // Search term matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.patientName.toLowerCase().includes(q);
        const matchesPhone = cleanPhone(item.patientPhone).includes(cleanPhone(q));
        const matchesService = item.serviceName.toLowerCase().includes(q);
        const matchesDate = item.date ? formatDatePtBR(item.date).includes(q) : false;
        const matchesCpf = item.patientCpf ? item.patientCpf.includes(q) : false;
        if (!matchesName && !matchesPhone && !matchesService && !matchesDate && !matchesCpf) {
          return false;
        }
      }

      // Date filtering
      if (dateFilter === 'today') {
        if (item.date !== todayStr) return false;
      } else if (dateFilter === 'tomorrow') {
        if (item.date !== tomorrowStr) return false;
      } else if (dateFilter === 'week') {
        if (!item.date || item.date < todayStr || item.date > weekRangeStr) return false;
      } else if (dateFilter === 'month') {
        if (!item.date || item.date < todayStr || item.date > monthRangeStr) return false;
      } else if (dateFilter === 'past') {
        if (!item.date || item.date >= todayStr) return false;
      }

      // Status filtering
      if (statusFilter !== 'all') {
        if (item.status !== statusFilter) return false;
      }

      return true;
    });
  }, [unifiedList, searchQuery, dateFilter, statusFilter, todayStr, tomorrowStr, weekRangeStr, monthRangeStr]);

  if (!isOpen) return null;

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Toggle all selection
  const handleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(item => item.id));
    }
  };

  // Import single lead
  const handleSingleImport = async (item: UnifiedAgendaPatient) => {
    try {
      setImportingId(item.id);
      await onImportAsLead(item);
    } finally {
      setImportingId(null);
    }
  };

  // Import selected batch
  const handleBatchImport = async () => {
    const toImport = filteredList.filter(item => selectedIds.includes(item.id));
    if (toImport.length === 0) return;
    try {
      setIsBatchImporting(true);
      await onImportBatchAsLeads(toImport);
      setSelectedIds([]);
    } finally {
      setIsBatchImporting(false);
    }
  };

  // Send batch message
  const handleBatchSendMessage = () => {
    const selectedPatients = filteredList.filter(item => selectedIds.includes(item.id));
    if (selectedPatients.length === 0) return;
    onSelectForMessage(selectedPatients[0], selectedPatients);
    onClose();
  };

  // Direct touch calendar trigger
  const handleDirectCalendar = (item: UnifiedAgendaPatient) => {
    if (!item.date || !item.time) return;
    openDirectTouchMobileCalendar({
      id: item.id,
      pacienteNome: item.patientName,
      protocolo: item.serviceName,
      data: item.date,
      horario: item.time,
      telefone: item.patientPhone
    }, clinicConfig);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF7F0] w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-[#E4DCC8] flex flex-col overflow-hidden text-[#1B2E24]">
        
        {/* Header */}
        <div className="bg-[#1B2E24] text-[#FAF7F0] p-5 sm:p-6 flex items-start justify-between border-b border-[#2D4E3C] shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#243F30] border border-[#DCC58F]/40 flex items-center justify-center text-[#DCC58F] shadow-sm shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[#FAF7F0]">
                  Buscar Paciente na Agenda & Disparos
                </h3>
                <p className="text-xs text-[#C9D1C8]">
                  Pesquise por nome, telefone ou procedimento agendado para disparar mensagens e sincronizar no CRM.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#C9D1C8] hover:text-white hover:bg-[#243F30] rounded-xl transition-all cursor-pointer"
            title="Fechar busca da agenda"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters Controls Bar */}
        <div className="p-4 sm:p-5 bg-[#F3EEE2] border-b border-[#E4DCC8] space-y-3 shrink-0">
          
          {/* Main Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8C8270] absolute left-3.5 top-3.5" />
            <input
              type="text"
              autoFocus
              placeholder="Digite o nome do paciente, telefone (93), serviço ou data (DD/MM)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border-2 border-[#DCC58F] focus:border-[#1B2E24] rounded-2xl text-sm font-medium text-[#1B2E24] placeholder-[#8C8270] focus:outline-hidden transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-[#8C8270] hover:text-[#1B2E24] p-0.5 rounded-full"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            
            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-[#736B5E] mr-1">Data:</span>
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                    : 'bg-white text-[#5B5A52] border border-[#E4DCC8] hover:bg-[#FAF7F0]'
                }`}
              >
                Todas as Datas
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  dateFilter === 'today'
                    ? 'bg-[#B08A3E] text-white shadow-xs'
                    : 'bg-white text-[#5B5A52] border border-[#E4DCC8] hover:bg-[#FAF7F0]'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Hoje</span>
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('tomorrow')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  dateFilter === 'tomorrow'
                    ? 'bg-[#1B2E24] text-[#DCC58F] shadow-xs'
                    : 'bg-white text-[#5B5A52] border border-[#E4DCC8] hover:bg-[#FAF7F0]'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Amanhã</span>
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('week')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  dateFilter === 'week'
                    ? 'bg-[#1B2E24] text-[#FAF7F0]'
                    : 'bg-white text-[#5B5A52] border border-[#E4DCC8] hover:bg-[#FAF7F0]'
                }`}
              >
                Próximos 7 dias
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('past')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  dateFilter === 'past'
                    ? 'bg-[#736B5E] text-white'
                    : 'bg-white text-[#5B5A52] border border-[#E4DCC8] hover:bg-[#FAF7F0]'
                }`}
              >
                Histórico Anterior
              </button>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-[11px] font-bold text-[#736B5E]">Situação:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-white border border-[#E4DCC8] rounded-xl font-semibold text-[#1B2E24] focus:outline-hidden"
              >
                <option value="all">Todos os Status</option>
                <option value="agendado">Agendados</option>
                <option value="concluido">Concluídos</option>
                <option value="falta">Faltas</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

          </div>

        </div>

        {/* Results Counter & Selection Batch Action Bar */}
        <div className="px-5 py-2.5 bg-[#FAF7F0] border-b border-[#E4DCC8] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-1.5 font-bold text-[#1B2E24] hover:text-[#B08A3E] cursor-pointer"
            >
              {selectedIds.length > 0 && selectedIds.length === filteredList.length ? (
                <CheckSquare className="w-4 h-4 text-[#B08A3E]" />
              ) : (
                <Square className="w-4 h-4 text-[#8C8270]" />
              )}
              <span>
                {selectedIds.length === 0 
                  ? `Selecionar Todos (${filteredList.length})` 
                  : `${selectedIds.length} selecionado(s)`}
              </span>
            </button>

            <span className="text-[#8C8270]">•</span>

            <span className="text-[#736B5E] font-medium">
              {filteredList.length} registro(s) encontrado(s) na agenda
            </span>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchSendMessage}
                className="px-3 py-1.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#DCC58F] rounded-xl font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer border border-[#DCC58F]/40"
              >
                <Send className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Disparar WhatsApp ({selectedIds.length})</span>
              </button>

              <button
                onClick={handleBatchImport}
                disabled={isBatchImporting}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isBatchImporting ? 'Sincronizando...' : `Importar para Leads (${selectedIds.length})`}</span>
              </button>
            </div>
          )}

        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredList.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3 bg-[#F3EEE2]/50 rounded-2xl border border-dashed border-[#E4DCC8]">
              <div className="w-12 h-12 rounded-full bg-[#FAF7F0] text-[#8C8270] flex items-center justify-center mx-auto border border-[#E4DCC8]">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1B2E24]">Nenhum paciente encontrado na agenda</h4>
                <p className="text-xs text-[#736B5E] max-w-md mx-auto mt-1">
                  Não encontramos pacientes com o termo "{searchQuery}". Tente pesquisar por parte do nome, número de telefone ou mude os filtros de data acima.
                </p>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 bg-[#1B2E24] text-[#FAF7F0] rounded-xl text-xs font-bold shadow-xs hover:bg-[#243F30] cursor-pointer"
                >
                  Limpar Filtros e Ver Todos
                </button>
              )}
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isToday = item.date === todayStr;
              const isTomorrow = item.date === tomorrowStr;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#FAF5E8] border-2 border-[#B08A3E] shadow-sm'
                      : 'bg-white border-[#E4DCC8] hover:border-[#B08A3E]/60 shadow-2xs'
                  }`}
                >
                  {/* Left Side: Checkbox + Patient Info */}
                  <div className="flex items-start space-x-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(item.id)}
                      className="mt-1 text-[#8C8270] hover:text-[#1B2E24] cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#B08A3E]" />
                      ) : (
                        <Square className="w-5 h-5 text-[#C4BBA8]" />
                      )}
                    </button>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-[#1B2E24] truncate">
                          {item.patientName}
                        </h4>

                        {/* Existing Lead or New Badge */}
                        {item.existingLead ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Lead no CRM ({item.existingLead.status})</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-amber-700" />
                            <span>Paciente da Agenda</span>
                          </span>
                        )}

                        {/* Status Badge */}
                        {item.status && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            item.status === 'concluido' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            item.status === 'falta' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            item.status === 'cancelado' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {item.status === 'concluido' ? 'Atendimento Concluído' :
                             item.status === 'falta' ? 'Falta Registrada' :
                             item.status === 'cancelado' ? 'Cancelado' : 'Agendamento Confirmado'}
                          </span>
                        )}
                      </div>

                      {/* Details row: Phone + Service + Date/Time */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#736B5E]">
                        {item.patientPhone && (
                          <span className="flex items-center space-x-1 font-mono font-medium text-[#1B2E24]">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{formatPhoneMask(item.patientPhone)}</span>
                          </span>
                        )}

                        <span className="flex items-center space-x-1 font-medium">
                          <Layers className="w-3.5 h-3.5 text-[#B08A3E]" />
                          <span>{item.serviceName}</span>
                        </span>

                        {item.date && (
                          <span className={`flex items-center space-x-1 font-semibold px-2 py-0.5 rounded-md ${
                            isToday ? 'bg-emerald-100 text-emerald-900 font-bold' :
                            isTomorrow ? 'bg-amber-100 text-amber-900 font-bold' :
                            'bg-[#F3EEE2] text-[#1B2E24]'
                          }`}>
                            <Calendar className="w-3.5 h-3.5 text-[#B08A3E]" />
                            <span>
                              {isToday ? `Hoje (${formatDatePtBR(item.date)})` :
                               isTomorrow ? `Amanhã (${formatDatePtBR(item.date)})` :
                               formatDatePtBR(item.date)}
                              {item.time ? ` às ${item.time}` : ''}
                            </span>
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-[#736B5E] italic max-w-xl truncate">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Quick Action Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E4DCC8]">
                    
                    {/* Disparar WhatsApp */}
                    <button
                      onClick={() => {
                        onSelectForMessage(item);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#DCC58F] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-[#DCC58F]/50"
                      title="Abrir tela de disparo de WhatsApp com mensagem personalizada"
                    >
                      <Send className="w-3.5 h-3.5 text-[#DCC58F]" />
                      <span>Disparar WhatsApp</span>
                    </button>

                    {/* Import to CRM Leads */}
                    {!item.existingLead && (
                      <button
                        onClick={() => handleSingleImport(item)}
                        disabled={importingId === item.id}
                        className="px-2.5 py-1.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] shadow-xs transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        title="Cadastrar este paciente da agenda na lista de Leads do CRM"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{importingId === item.id ? 'Importando...' : 'Adicionar ao CRM'}</span>
                      </button>
                    )}

                    {/* Google Mobile Calendar */}
                    {item.date && item.time && (
                      <button
                        onClick={() => handleDirectCalendar(item)}
                        className="p-1.5 bg-[#FAF7F0] hover:bg-white text-[#1B2E24] rounded-xl border border-[#E4DCC8] text-xs font-bold transition-all cursor-pointer"
                        title="📱 Abrir no Google Agenda no celular"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[#B08A3E]" />
                      </button>
                    )}

                    {/* Iniciar Avaliação & TCLE */}
                    {onStartEvaluation && (
                      <button
                        onClick={() => {
                          onStartEvaluation(item);
                          onClose();
                        }}
                        className="p-1.5 bg-[#FAF7F0] hover:bg-white text-[#1B2E24] rounded-xl border border-[#E4DCC8] text-xs font-bold transition-all cursor-pointer"
                        title="📄 Abrir Ficha de Avaliação & TCLE para este paciente"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#736B5E]" />
                      </button>
                    )}

                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F3EEE2] px-5 py-3.5 border-t border-[#E4DCC8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-[#736B5E] text-center sm:text-left">
            💡 Dica: Pacientes marcados na agenda podem receber lembretes de sessão e serem cadastrados com 1 clique.
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#FAF7F0] text-[#1B2E24] rounded-xl font-bold border border-[#E4DCC8] cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
