import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Calendar,
  Sparkles,
  Crown,
  DollarSign,
  ArrowRight,
  Phone,
  Clock,
  CheckCircle2,
  FileText,
  Tag,
  Filter
} from 'lucide-react';
import { Appointment, Patient, Service, LoyaltyMember, ClinicConfig } from '../../types';
import { formatCurrency, formatDatePtBR } from '../../utils/qrUtils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  appointments: Appointment[];
  services: Service[];
  loyaltyMembers: LoyaltyMember[];
  clinic: ClinicConfig | null;
  onNavigateToView: (view: 'public' | 'services' | 'patient_portal' | 'admin', extraParams?: { tab?: string; query?: string; service?: Service }) => void;
}

type SearchCategory = 'all' | 'patients' | 'appointments' | 'services' | 'loyalty';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  patients,
  appointments,
  services,
  loyaltyMembers,
  clinic,
  onNavigateToView,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const cleanQuery = query.trim().toLowerCase();

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    if (!cleanQuery) return patients.slice(0, 4);
    return patients.filter((p) =>
      p.name.toLowerCase().includes(cleanQuery) ||
      (p.phone && p.phone.replace(/\D/g, '').includes(cleanQuery.replace(/\D/g, ''))) ||
      (p.cpf && p.cpf.replace(/\D/g, '').includes(cleanQuery.replace(/\D/g, ''))) ||
      (p.email && p.email.toLowerCase().includes(cleanQuery)) ||
      (p.notes && p.notes.toLowerCase().includes(cleanQuery))
    );
  }, [patients, cleanQuery]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    if (!cleanQuery) return appointments.slice(0, 4);
    return appointments.filter((a) =>
      a.patientName.toLowerCase().includes(cleanQuery) ||
      a.serviceName.toLowerCase().includes(cleanQuery) ||
      (a.date && a.date.includes(cleanQuery)) ||
      (a.time && a.time.includes(cleanQuery)) ||
      (a.patientPhone && a.patientPhone.replace(/\D/g, '').includes(cleanQuery.replace(/\D/g, ''))) ||
      (a.status && a.status.toLowerCase().includes(cleanQuery))
    );
  }, [appointments, cleanQuery]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    if (!cleanQuery) return services.slice(0, 4);
    return services.filter((s) =>
      s.name.toLowerCase().includes(cleanQuery) ||
      s.category.toLowerCase().includes(cleanQuery) ||
      s.description.toLowerCase().includes(cleanQuery) ||
      (s.tag && s.tag.toLowerCase().includes(cleanQuery))
    );
  }, [services, cleanQuery]);

  // Filtered Loyalty Members
  const filteredLoyalty = useMemo(() => {
    if (!cleanQuery) return loyaltyMembers.slice(0, 3);
    return loyaltyMembers.filter((m) =>
      m.patientName.toLowerCase().includes(cleanQuery) ||
      (m.patientPhone && m.patientPhone.replace(/\D/g, '').includes(cleanQuery.replace(/\D/g, ''))) ||
      (m.patientCpf && m.patientCpf.replace(/\D/g, '').includes(cleanQuery.replace(/\D/g, ''))) ||
      m.beneficiaries.some((b) => b.name.toLowerCase().includes(cleanQuery))
    );
  }, [loyaltyMembers, cleanQuery]);

  const totalResults =
    (category === 'all' || category === 'patients' ? filteredPatients.length : 0) +
    (category === 'all' || category === 'appointments' ? filteredAppointments.length : 0) +
    (category === 'all' || category === 'services' ? filteredServices.length : 0) +
    (category === 'all' || category === 'loyalty' ? filteredLoyalty.length : 0);

  if (!isOpen) return null;

  return (
    <div
      id="global-search-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden mt-6 sm:mt-12 transition-all flex flex-col max-h-[85vh]">
        
        {/* Search Header with Magnifying Glass */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#31523D]">
              <Search className="w-5 h-5" />
            </div>
            
            <input
              ref={inputRef}
              id="global-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pacientes, consultas, tratamentos, planos ou recibos..."
              className="w-full pl-11 pr-24 py-3.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-2xl border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31523D] focus:border-transparent transition-all"
            />

            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {query && (
                <button
                  id="btn-clear-search"
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-mono font-bold bg-slate-200 text-slate-600 rounded-md">
                ESC
              </span>
              <button
                onClick={onClose}
                className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                category === 'all'
                  ? 'bg-[#31523D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tudo
            </button>

            <button
              onClick={() => setCategory('patients')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                category === 'patients'
                  ? 'bg-[#31523D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Pacientes ({filteredPatients.length})</span>
            </button>

            <button
              onClick={() => setCategory('appointments')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                category === 'appointments'
                  ? 'bg-[#31523D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Consultas ({filteredAppointments.length})</span>
            </button>

            <button
              onClick={() => setCategory('services')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                category === 'services'
                  ? 'bg-[#31523D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7E611D]" />
              <span>Tratamentos ({filteredServices.length})</span>
            </button>

            <button
              onClick={() => setCategory('loyalty')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                category === 'loyalty'
                  ? 'bg-[#31523D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Fidelidade R$ 99 ({filteredLoyalty.length})</span>
            </button>
          </div>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {totalResults === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                Nenhum resultado encontrado para "{query}"
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Tente buscar pelo nome da paciente, telefone, especialidade (Pilates, Fisioterapia) ou número de recibo.
              </p>
            </div>
          ) : (
            <>
              {/* SECTION: PACIENTES */}
              {(category === 'all' || category === 'patients') && filteredPatients.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#31523D] flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-[#D0A73B]" />
                      <span>Pacientes Encontradas ({filteredPatients.length})</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => {
                          onClose();
                          onNavigateToView('patient_portal', { query: patient.name });
                        }}
                        className="p-3 bg-white hover:bg-[#F5EED3]/30 rounded-2xl border border-slate-200 hover:border-[#D0A73B] transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 group-hover:text-[#31523D]">
                              {patient.name}
                            </span>
                            <span className="text-[10px] font-bold bg-[#EAF0DB] text-[#31523D] px-2 py-0.5 rounded-full">
                              {patient.totalSessions || 0} sessões
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{patient.phone}</span>
                            {patient.cpf && (
                              <span className="text-[10px] font-mono text-slate-400">
                                • CPF: {patient.cpf}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-[#31523D] group-hover:text-[#23372B]">
                          <span>Ver Ficha & Extrato</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: AGENDAMENTOS / CONSULTAS */}
              {(category === 'all' || category === 'appointments') && filteredAppointments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Agendamentos & Consultas ({filteredAppointments.length})</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredAppointments.map((appt) => (
                      <div
                        key={appt.id}
                        onClick={() => {
                          onClose();
                          onNavigateToView('admin', { tab: 'agenda' });
                        }}
                        className="p-3 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-black text-slate-900 group-hover:text-emerald-900">
                              {appt.patientName}
                            </span>
                            <p className="text-[11px] font-semibold text-[#31523D]">
                              {appt.serviceName}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              appt.status === 'confirmado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : appt.status === 'concluido'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {appt.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {formatDatePtBR(appt.date)} às {appt.time}h
                            </span>
                          </span>
                          <span className="font-bold text-slate-800">
                            {formatCurrency(appt.price || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: SERVIÇOS & TRATAMENTOS */}
              {(category === 'all' || category === 'services') && filteredServices.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#7E611D] flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D0A73B]" />
                      <span>Tratamentos & Sessões ({filteredServices.length})</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => {
                          onClose();
                          onNavigateToView('public', { service });
                        }}
                        className="p-3 bg-white hover:bg-[#F5EED3]/40 rounded-2xl border border-slate-200 hover:border-[#D0A73B] transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 group-hover:text-[#31523D]">
                              {service.name}
                            </span>
                            <span className="text-xs font-extrabold text-[#7E611D]">
                              {formatCurrency(service.price)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {service.description}
                          </p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                            {service.durationMinutes} min • {service.category}
                          </span>
                          <span className="text-[#31523D] flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>Agendar</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: FIDELIDADE R$ 99 */}
              {(category === 'all' || category === 'loyalty') && filteredLoyalty.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#31523D] flex items-center space-x-1.5">
                      <Crown className="w-3.5 h-3.5 text-[#D0A73B]" />
                      <span>Assinantes Fidelidade R$ 99 ({filteredLoyalty.length})</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredLoyalty.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          onClose();
                          onNavigateToView('admin', { tab: 'fidelidade' });
                        }}
                        className="p-3 bg-white hover:bg-emerald-50/40 rounded-2xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 group-hover:text-emerald-900">
                            {member.patientName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Saldo: {formatCurrency(member.accumulatedBalance)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>Vencimento: Todo dia {member.dueDay}</span>
                          <span>{member.beneficiaries.length} dependente(s)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Search Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#31523D]">Dica:</span>
            <span>Busque por nome, telefone, valor ou serviço</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
