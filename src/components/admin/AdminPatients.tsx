import React, { useState } from 'react';
import { Patient, Appointment } from '../../types';
import { formatDatePtBR } from '../../utils/qrUtils';
import { api } from '../../services/api';
import { Search, UserCheck, Calendar, Phone, Mail, FileText, ChevronRight, X, Clock, CheckCircle2, XCircle, Award, IdCard, Filter, RefreshCw } from 'lucide-react';

interface AdminPatientsProps {
  patients: Patient[];
  appointments: Appointment[];
  onReload?: () => void;
}

export const AdminPatients: React.FC<AdminPatientsProps> = ({ patients, appointments, onReload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'with_cpf' | 'high_attendance' | 'has_faltas'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Helper function to strip non-alphanumeric characters for flexible CPF/phone matching
  const cleanStr = (str?: string) => (str ? str.replace(/\D/g, '') : '');

  const filteredPatients = patients.filter((p) => {
    const rawSearch = searchTerm.trim().toLowerCase();
    const cleanedSearch = cleanStr(searchTerm);

    // Matches
    const matchesName = p.name.toLowerCase().includes(rawSearch);
    const matchesEmail = p.email ? p.email.toLowerCase().includes(rawSearch) : false;
    const matchesNotes = p.notes ? p.notes.toLowerCase().includes(rawSearch) : false;
    
    // CPF matching (both formatted and unformatted digits)
    const matchesCpfRaw = p.cpf ? p.cpf.toLowerCase().includes(rawSearch) : false;
    const matchesCpfClean = p.cpf && cleanedSearch.length > 0 ? cleanStr(p.cpf).includes(cleanedSearch) : false;

    // Phone matching (both formatted and digits only)
    const matchesPhoneRaw = p.phone.includes(rawSearch);
    const matchesPhoneClean = cleanedSearch.length > 0 ? cleanStr(p.phone).includes(cleanedSearch) : false;

    const matchesSearch = rawSearch === '' || matchesName || matchesEmail || matchesNotes || matchesCpfRaw || matchesCpfClean || matchesPhoneRaw || matchesPhoneClean;

    // Secondary category filters
    if (!matchesSearch) return false;

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

  // Get appointments history for selected patient
  const patientAppointments = selectedPatient
    ? appointments.filter(
        (a) =>
          a.patientPhone === selectedPatient.phone ||
          a.patientName.toLowerCase() === selectedPatient.name.toLowerCase()
      )
    : [];

  const handleMarkAttendanceModal = async (apptId: string, newStatus: 'concluido' | 'falta' | 'agendado') => {
    setUpdatingId(apptId);
    try {
      await api.markAttendance(apptId, newStatus);
      if (onReload) onReload();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar presença/falta');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar with Search & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="sm:flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">Prontuários & Cadastro de Pacientes</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                {filteredPatients.length} paciente(s)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Localização instantânea por <strong>Nome, CPF, Telefone ou Anotações do Prontuário</strong>.
            </p>
          </div>

          {/* Real-time Search Input */}
          <div className="mt-3 sm:mt-0 relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-teal-600" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF (ex: 341.892) ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 font-medium placeholder:text-slate-400 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
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
            <span>Filtros:</span>
          </span>

          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({patients.length})
          </button>

          <button
            onClick={() => setSelectedFilter('with_cpf')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'has_faltas'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Com Faltas</span>
          </button>

          {searchTerm && (
            <span className="ml-auto text-[11px] text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              Filtrado por: "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* Patient List Grid */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Nenhum prontuário encontrado</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não encontramos nenhum paciente correspondente à busca "{searchTerm}". Verifique o nome ou número de CPF digitado.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedFilter('all'); }}
            className="px-4 py-2 bg-[#31523D] text-white rounded-xl text-xs font-bold hover:bg-[#25402e] transition-all inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Limpar Filtro e Mostrar Todos</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatients.map((patient) => {
            const patientAppts = appointments.filter(
              (a) => a.patientPhone === patient.phone || a.patientName.toLowerCase() === patient.name.toLowerCase()
            );
            const totalPresencas = patientAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca').length || patient.totalSessions || 0;
            const totalFaltas = patientAppts.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta').length || patient.totalFaltas || 0;
            const totalValid = totalPresencas + totalFaltas;
            const assiduidade = totalValid > 0 ? Math.round((totalPresencas / totalValid) * 100) : 100;

            return (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-500 cursor-pointer shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                        {patient.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-teal-600 shrink-0" />
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

                    <span className="px-3 py-1 bg-[#31523D] text-[#D0A73B] font-extrabold rounded-full text-xs border border-[#D0A73B]/30 shrink-0 shadow-2xs">
                      {assiduidade}% Frequência
                    </span>
                  </div>

                  {/* Presence vs Absence Stats */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
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
                    <div className="mt-3 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70 text-slate-700 space-y-0.5">
                      <span className="font-bold text-teal-800 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                        <FileText className="w-3 h-3 text-teal-600" />
                        <span>Prontuário / Observações:</span>
                      </span>
                      <p className="italic line-clamp-2 text-slate-600">
                        "{patient.notes}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Último atendimento: <strong className="text-slate-700">{patient.lastSessionDate ? formatDatePtBR(patient.lastSessionDate) : 'Recente'}</strong>
                  </span>
                  <span className="text-teal-700 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Ver Prontuário Completo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Patient History & Medical Records Detail Drawer / Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto space-y-4">
            
            <button
              onClick={() => setSelectedPatient(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-extrabold text-lg shadow-xs">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-teal-600" />
                    <span>{selectedPatient.phone}</span>
                  </span>
                  {selectedPatient.cpf && (
                    <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <IdCard className="w-3 h-3 text-teal-700" />
                      <span>CPF: {selectedPatient.cpf}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

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
                  <span className="font-bold text-[#31523D] flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Anotações do Prontuário:</span>
                  </span>
                  <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-medium">
                    {selectedPatient.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2 pt-2">
              <h4 className="text-xs font-extrabold uppercase text-[#31523D] tracking-wider">
                Histórico & Presenças ({patientAppointments.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Altere a frequência com 1 clique
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
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-teal-300 transition-all shadow-2xs"
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

                      <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                        <button
                          disabled={updatingId === app.id}
                          onClick={() => handleMarkAttendanceModal(app.id, 'concluido')}
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
                          onClick={() => handleMarkAttendanceModal(app.id, 'falta')}
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

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

