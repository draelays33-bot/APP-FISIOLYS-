import React, { useState } from 'react';
import { api } from '../../services/api';
import { Appointment, Patient } from '../../types';
import { formatDatePtBR } from '../../utils/qrUtils';
import { Search, CheckCircle2, XCircle, Calendar, Clock, User, Award, Percent, RefreshCw, AlertCircle, ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';

interface PatientSessionsLookupProps {
  clinicName?: string;
  defaultQuery?: string;
  onClose?: () => void;
}

export const PatientSessionsLookup: React.FC<PatientSessionsLookupProps> = ({
  clinicName = "Fisiolys Fisioterapia e Pilates",
  defaultQuery = "",
  onClose
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    totalPresencas: 0,
    totalFaltas: 0,
    totalAgendados: 0,
    totalGeral: 0
  });

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setError("Por favor, digite seu telefone ou nome para pesquisar.");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await api.getPatientHistory(query.trim());
      if (!res.found) {
        setError("Nenhum registro de atendimento encontrado para este telefone ou nome. Verifique os dados ou fale com a clínica.");
        setPatientData(null);
        setHistory([]);
      } else {
        setPatientData(res.patient);
        setHistory(res.history);
        setStats(res.stats);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao consultar o histórico de sessões.");
    } finally {
      setLoading(false);
    }
  };

  const totalCalculated = stats.totalPresencas + stats.totalFaltas;
  const attendancePercentage = totalCalculated > 0
    ? Math.round((stats.totalPresencas / totalCalculated) * 100)
    : 100;

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#C9D8CB] shadow-sm max-w-4xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#1E3326]">Área do Paciente • Consulta de Frequência</h3>
            <p className="text-xs text-slate-500">
              Veja o total de sessões já realizadas, presença em aulas/fisioterapia e histórico de datas.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all self-start md:self-auto cursor-pointer"
          >
            Fechar Consulta
          </button>
        )}
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="bg-[#F7F9F7] p-4 rounded-2xl border border-[#C9D8CB]/80 space-y-3">
        <label className="block text-xs font-bold uppercase text-[#31523D] tracking-wider">
          🔍 Digite seu Telefone (WhatsApp) ou Nome Completo:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: (93) 99188-4422 ou Maria Silva"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#31523D] shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#31523D] hover:bg-[#23372B] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#D0A73B]" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <span>Consultar Minhas Sessões</span>
                <ArrowRight className="w-4 h-4 text-[#D0A73B]" />
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          💡 Digite apenas o seu número ou primeiro nome para consultar todas as presenças registradas.
        </p>
      </form>

      {/* Error / Alert Message */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{error}</p>
            <p className="text-[11px] text-amber-700 mt-1">
              Dúvidas sobre o número cadastrado? Fale diretamente com a recepção pelo WhatsApp (93) 99126-5006.
            </p>
          </div>
        </div>
      )}

      {/* Results view */}
      {searched && history.length > 0 && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Patient Card Header */}
          <div className="bg-gradient-to-r from-[#31523D] to-[#213829] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#D0A73B]/20 border border-[#D0A73B]/40 flex items-center justify-center text-[#D0A73B] font-extrabold text-xl">
                {patientData?.name ? patientData.name.charAt(0) : 'P'}
              </div>
              <div>
                <h4 className="text-lg font-extrabold">{patientData?.name || query}</h4>
                <p className="text-xs text-[#C9D8CB] flex items-center space-x-2 mt-0.5">
                  <span>📱 {patientData?.phone || query}</span>
                  {patientData?.firstSessionDate && (
                    <span>• Paciente desde {formatDatePtBR(patientData.firstSessionDate)}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/15 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-[#C9D8CB] font-bold">
                Assiduidade & Presença
              </span>
              <span className="text-xl font-extrabold text-[#D0A73B]">
                {attendancePercentage}% Frequência
              </span>
            </div>
          </div>

          {/* Metrics 3-Card Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 text-center">
              <div className="flex items-center justify-center space-x-1 text-emerald-800 text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sessões Realizadas</span>
              </div>
              <span className="text-2xl font-extrabold text-emerald-900">{stats.totalPresencas}</span>
              <span className="block text-[10px] text-emerald-700 mt-0.5">Presenças confirmadas</span>
            </div>

            <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 text-center">
              <div className="flex items-center justify-center space-x-1 text-rose-800 text-xs font-bold mb-1">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Faltas Registradas</span>
              </div>
              <span className="text-2xl font-extrabold text-rose-900">{stats.totalFaltas}</span>
              <span className="block text-[10px] text-rose-700 mt-0.5">Ausências justificadas/faltas</span>
            </div>

            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 text-center">
              <div className="flex items-center justify-center space-x-1 text-blue-800 text-xs font-bold mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Próximas Agendadas</span>
              </div>
              <span className="text-2xl font-extrabold text-blue-900">{stats.totalAgendados}</span>
              <span className="block text-[10px] text-blue-700 mt-0.5">Sessões marcadas</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <div className="flex items-center justify-center space-x-1 text-slate-700 text-xs font-bold mb-1">
                <Award className="w-4 h-4 text-slate-500" />
                <span>Total de Histórico</span>
              </div>
              <span className="text-2xl font-extrabold text-slate-800">{stats.totalGeral}</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">Registros na clínica</span>
            </div>

          </div>

          {/* Detailed Timeline Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase text-[#31523D] tracking-wider flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#D0A73B]" />
                <span>Histórico Completo de Datas & Horários ({history.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">Ordem cronológica</span>
            </div>

            <div className="divide-y divide-slate-100">
              {history.map((app) => {
                const isPresenca = app.status === 'concluido' || app.attendanceStatus === 'presenca';
                const isFalta = app.status === 'falta' || app.attendanceStatus === 'falta';

                return (
                  <div key={app.id} className="p-4 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-800">{app.serviceName}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-700">{formatDatePtBR(app.date)}</strong>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{app.time} hs</span>
                        </span>
                        <span className="text-slate-400">• {app.durationMinutes || 50} min</span>
                      </div>
                      {app.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 inline-block">
                          Obs: {app.notes}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      {isPresenca ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>✅ PRESENÇA REALIZADA</span>
                        </span>
                      ) : isFalta ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1.5">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>❌ FALTA REGISTRADA</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200 flex items-center space-x-1.5">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>📅 AGENDADO PENDENTE</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Assistance */}
          <div className="bg-[#F4F7F4] p-4 rounded-2xl border border-[#C9D8CB] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-[#31523D] shrink-0" />
              <span>Dúvidas sobre o seu pacote de sessões ou reagendamento de faltas?</span>
            </div>
            <a
              href="https://wa.me/5593991265006?text=Ol%C3%A1!%20Estou%20consultando%20minhas%20sess%C3%B5es%20no%20app%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida."
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#31523D] text-white font-bold rounded-xl hover:bg-[#23372B] transition-all flex items-center space-x-1.5 shrink-0"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Falar na Recepção</span>
            </a>
          </div>

        </div>
      )}

    </div>
  );
};
