import React, { useState } from 'react';
import { Patient, Appointment } from '../../types';
import { formatDatePtBR } from '../../utils/qrUtils';
import { Search, UserCheck, Calendar, Phone, Mail, FileText, ChevronRight, X, Clock } from 'lucide-react';

interface AdminPatientsProps {
  patients: Patient[];
  appointments: Appointment[];
}

export const AdminPatients: React.FC<AdminPatientsProps> = ({ patients, appointments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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

  return (
    <div className="space-y-6">
      
      {/* Top Bar with Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs sm:flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Cadastro & Histórico de Pacientes</h3>
          <p className="text-xs text-slate-500">
            Acompanhe o total de sessões, histórico de agendamentos e prontuário simples.
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
          return (
            <div
              key={patient.id}
              onClick={() => setSelectedPatient(patient)}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-400 cursor-pointer shadow-2xs transition-all flex flex-col justify-between"
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

                  <span className="px-3 py-1 bg-teal-50 text-teal-800 rounded-full text-xs font-bold border border-teal-100 shrink-0">
                    {patient.totalSessions} {patient.totalSessions === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>

                {patient.notes && (
                  <p className="mt-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600 italic line-clamp-2">
                    "{patient.notes}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Último atendimento: <strong className="text-slate-700">{patient.lastSessionDate ? formatDatePtBR(patient.lastSessionDate) : 'Recente'}</strong>
                </span>
                <span className="text-teal-700 font-bold flex items-center space-x-0.5">
                  <span>Ver Histórico</span>
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedPatient(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedPatient.name}</h3>
                <p className="text-xs text-slate-500">{selectedPatient.phone}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-5 text-slate-700">
              <p><strong>Total de Sessões Registradas:</strong> {selectedPatient.totalSessions}</p>
              <p><strong>Primeira Consulta:</strong> {selectedPatient.firstSessionDate ? formatDatePtBR(selectedPatient.firstSessionDate) : 'N/A'}</p>
              {selectedPatient.notes && (
                <p className="pt-1 text-slate-600 italic">
                  <strong>Anotações Médicas / Fisio:</strong> {selectedPatient.notes}
                </p>
              )}
            </div>

            <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">
              Histórico de Agendamentos ({patientAppointments.length})
            </h4>

            {patientAppointments.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum histórico individual encontrado.</p>
            ) : (
              <div className="space-y-2.5">
                {patientAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{app.serviceName}</p>
                      <p className="text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDatePtBR(app.date)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{app.time} hs</span>
                        </span>
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      app.status === 'concluido'
                        ? 'bg-emerald-100 text-emerald-800'
                        : app.status === 'agendado'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
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
