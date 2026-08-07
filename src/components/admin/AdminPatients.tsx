import React, { useState } from 'react';
import { Patient, Appointment } from '../../types';
import { formatDatePtBR } from '../../utils/qrUtils';
import { api } from '../../services/api';
import { Search, UserCheck, Calendar, Phone, Mail, FileText, ChevronRight, X, Clock, CheckCircle2, XCircle, Award } from 'lucide-react';

interface AdminPatientsProps {
  patients: Patient[];
  appointments: Appointment[];
  onReload?: () => void;
}

export const AdminPatients: React.FC<AdminPatientsProps> = ({ patients, appointments, onReload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  );

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
      
      {/* Top Bar with Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs sm:flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Cadastro & Frequência de Pacientes</h3>
          <p className="text-xs text-slate-500">
            Acompanhe o total de sessões realizadas, faltas acumuladas e histórico completo por paciente.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Patient List */}
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
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-400 cursor-pointer shadow-2xs transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">{patient.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-teal-600" />
                        <span>{patient.phone}</span>
                      </span>
                      {patient.email && (
                        <span className="hidden sm:flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{patient.email}</span>
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-[#31523D] text-[#D0A73B] font-extrabold rounded-full text-xs border border-[#D0A73B]/30 shrink-0">
                    {assiduidade}% Frequência
                  </span>
                </div>

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
                  <p className="mt-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600 italic line-clamp-2">
                    "{patient.notes}"
                  </p>
                )}
              </div>

              <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Último atendimento: <strong className="text-slate-700">{patient.lastSessionDate ? formatDatePtBR(patient.lastSessionDate) : 'Recente'}</strong>
                </span>
                <span className="text-teal-700 font-bold flex items-center space-x-0.5">
                  <span>Ver Histórico & Dar Presença</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient History Detail Drawer / Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative max-h-[90vh] overflow-y-auto space-y-4">
            
            <button
              onClick={() => setSelectedPatient(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-extrabold text-lg shadow-xs">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedPatient.name}</h3>
                <p className="text-xs text-slate-500">{selectedPatient.phone}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <p><strong>Primeira Consulta:</strong> {selectedPatient.firstSessionDate ? formatDatePtBR(selectedPatient.firstSessionDate) : 'N/A'}</p>
              {selectedPatient.notes && (
                <p className="pt-1 text-slate-600 italic">
                  <strong>Anotações / Prontuário:</strong> {selectedPatient.notes}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold uppercase text-[#31523D] tracking-wider">
                Histórico & Marcação de Presença ({patientAppointments.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Altere o status em 1 clique
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
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-teal-300 transition-all"
                    >
                      <div>
                        <p className="font-extrabold text-slate-800">{app.serviceName}</p>
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
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
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

