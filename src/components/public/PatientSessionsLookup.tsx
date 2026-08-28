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
    <div id="patient-sessions-lookup" className="bg-creme-card rounded-3xl p-6 md:p-8 border border-linha shadow-sm max-w-4xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-linha/60 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-verde-900 text-dourado-suave flex items-center justify-center font-bold text-xl shadow-xs shrink-0 border border-verde-800">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-carvao">Área do Paciente • Consulta de Frequência</h3>
            <p className="text-xs text-carvao-suave font-sans">
              Veja o total de sessões já realizadas, presença em aulas/fisioterapia e histórico de datas.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            id="close-sessions-lookup-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-creme text-carvao border border-linha transition-all self-start md:self-auto cursor-pointer"
          >
            Fechar Consulta
          </button>
        )}
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="bg-white p-5 rounded-2xl border border-linha space-y-3 shadow-2xs">
        <label className="block text-xs font-bold uppercase text-verde-900 tracking-wider">
          Digite seu Telefone (WhatsApp) ou Nome Completo:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-carvao-suave/60" />
            <input
              id="patient-lookup-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: (93) 99188-4422 ou Maria Silva"
              className="w-full pl-10 pr-4 py-3 rounded-full border border-linha bg-creme text-carvao text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-verde-900 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            id="patient-lookup-search-btn"
            disabled={loading}
            className="px-6 py-3 bg-verde-900 hover:bg-verde-800 disabled:opacity-50 text-creme rounded-full text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs shrink-0 cursor-pointer border border-verde-800"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-dourado-suave" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <span>Consultar Minhas Sessões</span>
                <ArrowRight className="w-4 h-4 text-dourado-suave" />
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-carvao-suave font-sans">
          Digite apenas o seu número ou primeiro nome para consultar todas as presenças registradas.
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
          <div className="bg-verde-900 text-creme p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-verde-800">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-dourado/20 border border-dourado/40 flex items-center justify-center text-dourado font-bold text-xl">
                {patientData?.name ? patientData.name.charAt(0) : 'P'}
              </div>
              <div>
                <h4 className="text-lg font-serif font-bold text-creme">{patientData?.name || query}</h4>
                <p className="text-xs text-creme/70 flex items-center space-x-2 mt-0.5 font-sans">
                  <span>{patientData?.phone || query}</span>
                  {patientData?.firstSessionDate && (
                    <span>• Paciente desde {formatDatePtBR(patientData.firstSessionDate)}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/15 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-creme/70 font-bold">
                Assiduidade & Presença
              </span>
              <span className="text-xl font-bold text-dourado-suave font-serif">
                {attendancePercentage}% Frequência
              </span>
            </div>
          </div>

          {/* Metrics 4-Card Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            <div className="bg-white p-4 rounded-2xl border border-linha text-center shadow-2xs">
              <div className="flex items-center justify-center space-x-1 text-verde-900 text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-verde-900" />
                <span>Sessões Realizadas</span>
              </div>
              <span className="text-2xl font-serif font-bold text-carvao">{stats.totalPresencas}</span>
              <span className="block text-[10px] text-carvao-suave mt-0.5">Presenças confirmadas</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-linha text-center shadow-2xs">
              <div className="flex items-center justify-center space-x-1 text-rose-800 text-xs font-bold mb-1">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Faltas Registradas</span>
              </div>
              <span className="text-2xl font-serif font-bold text-rose-900">{stats.totalFaltas}</span>
              <span className="block text-[10px] text-carvao-suave mt-0.5">Ausências registradas</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-linha text-center shadow-2xs">
              <div className="flex items-center justify-center space-x-1 text-dourado text-xs font-bold mb-1">
                <Calendar className="w-4 h-4 text-dourado" />
                <span>Próximas Agendadas</span>
              </div>
              <span className="text-2xl font-serif font-bold text-carvao">{stats.totalAgendados}</span>
              <span className="block text-[10px] text-carvao-suave mt-0.5">Sessões marcadas</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-linha text-center shadow-2xs">
              <div className="flex items-center justify-center space-x-1 text-carvao-suave text-xs font-bold mb-1">
                <Award className="w-4 h-4 text-dourado" />
                <span>Total de Histórico</span>
              </div>
              <span className="text-2xl font-serif font-bold text-carvao">{stats.totalGeral}</span>
              <span className="block text-[10px] text-carvao-suave mt-0.5">Registros na clínica</span>
            </div>

          </div>

          {/* Detailed Timeline Table */}
          <div className="bg-white rounded-2xl border border-linha overflow-hidden shadow-2xs">
            <div className="p-4 bg-creme border-b border-linha flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-verde-900 tracking-wider flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-dourado" />
                <span>Histórico Completo de Datas & Horários ({history.length})</span>
              </h4>
              <span className="text-[11px] text-carvao-suave font-medium">Ordem cronológica</span>
            </div>

            <div className="divide-y divide-linha/60">
              {history.map((app) => {
                const isPresenca = app.status === 'concluido' || app.attendanceStatus === 'presenca';
                const isFalta = app.status === 'falta' || app.attendanceStatus === 'falta';

                return (
                  <div key={app.id} className="p-4 hover:bg-creme/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-serif font-bold text-sm text-carvao">{app.serviceName}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-carvao-suave font-medium">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-dourado" />
                          <strong className="text-carvao">{formatDatePtBR(app.date)}</strong>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-carvao-suave" />
                          <span>{app.time} hs</span>
                        </span>
                        <span className="text-carvao-suave/70">• {app.durationMinutes || 50} min</span>
                      </div>
                      {app.notes && (
                        <p className="text-[11px] text-carvao-suave italic bg-creme p-1.5 rounded-lg border border-linha inline-block font-sans">
                          Obs: {app.notes}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      {isPresenca ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-verde-900/10 text-verde-900 border border-verde-900/20 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-verde-900" />
                          <span>Presença Confirmada</span>
                        </span>
                      ) : isFalta ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center space-x-1.5">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Falta Registrada</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-creme text-carvao-suave border border-linha flex items-center space-x-1.5">
                          <Clock className="w-4 h-4 text-dourado" />
                          <span>Agendado</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Assistance */}
          <div className="bg-white p-4 rounded-2xl border border-linha flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-carvao-suave">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-verde-900 shrink-0" />
              <span>Dúvidas sobre o seu pacote de sessões ou reagendamento de faltas?</span>
            </div>
            <a
              id="patient-lookup-whatsapp-help-btn"
              href="https://wa.me/5593991265006?text=Ol%C3%A1!%20Estou%20consultando%20minhas%20sess%C3%B5es%20no%20app%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida."
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-verde-900 text-creme font-bold rounded-full hover:bg-verde-800 transition-all flex items-center space-x-1.5 shrink-0 border border-verde-800 shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5 text-dourado-suave" />
              <span>Falar na Recepção</span>
            </a>
          </div>

        </div>
      )}

    </div>
  );
};
