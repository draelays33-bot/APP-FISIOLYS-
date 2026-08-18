import React, { useMemo } from 'react';
import {
  Patient,
  Appointment,
  Service,
  ClinicConfig
} from '../../types';
import { formatDatePtBR, formatPhoneMask } from '../../utils/qrUtils';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Clock,
  Sparkles,
  Printer,
  Calendar,
  Flame,
  Activity,
  Heart,
  QrCode,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface PatientFrequencyProps {
  patient: Patient;
  appointments: Appointment[];
  services: Service[];
  clinic: ClinicConfig;
}

export const PatientFrequency: React.FC<PatientFrequencyProps> = ({
  patient,
  appointments,
  services,
  clinic,
}) => {
  // Sort appointments by date descending
  const sortedAppts = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const da = `${a.date}T${a.time}`;
      const dbTime = `${b.date}T${b.time}`;
      return dbTime.localeCompare(da);
    });
  }, [appointments]);

  // Frequency statistics calculation
  const frequencyStats = useMemo(() => {
    let presencas = 0;
    let faltas = 0;
    let agendadosFuturos = 0;
    let checkinQrCodeCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    // Day of week frequency tracker
    const dayOfWeekCount: Record<string, number> = {
      'Domingo': 0,
      'Segunda-feira': 0,
      'Terça-feira': 0,
      'Quarta-feira': 0,
      'Quinta-feira': 0,
      'Sexta-feira': 0,
      'Sábado': 0,
    };

    const daysMap = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    // Monthly attendance tracker (last 6 months)
    const monthlyAttendance: Record<string, { presencas: number; total: number }> = {};

    sortedAppts.forEach(appt => {
      if (appt.status === 'cancelado' && appt.attendanceStatus !== 'falta') return;

      const isFuture = appt.date > todayStr;
      if (isFuture && appt.status === 'agendado') {
        agendadosFuturos++;
        return;
      }

      if (appt.attendanceStatus === 'presenca' || appt.status === 'concluido') {
        presencas++;
        if (appt.checkInMethod === 'qrcode' || appt.checkedInAt) {
          checkinQrCodeCount++;
        }

        // Count day of week
        if (appt.date) {
          const dateObj = new Date(appt.date + 'T12:00:00');
          const dayName = daysMap[dateObj.getDay()];
          if (dayName) {
            dayOfWeekCount[dayName] = (dayOfWeekCount[dayName] || 0) + 1;
          }

          // Count month
          const monthKey = appt.date.slice(0, 7); // YYYY-MM
          if (!monthlyAttendance[monthKey]) {
            monthlyAttendance[monthKey] = { presencas: 0, total: 0 };
          }
          monthlyAttendance[monthKey].presencas++;
          monthlyAttendance[monthKey].total++;
        }
      } else if (appt.attendanceStatus === 'falta' || appt.status === 'falta') {
        faltas++;
        if (appt.date) {
          const monthKey = appt.date.slice(0, 7);
          if (!monthlyAttendance[monthKey]) {
            monthlyAttendance[monthKey] = { presencas: 0, total: 0 };
          }
          monthlyAttendance[monthKey].total++;
        }
      }
    });

    const totalRealizadosOuFaltas = presencas + faltas;
    const taxaAssiduidade = totalRealizadosOuFaltas > 0 
      ? Math.round((presencas / totalRealizadosOuFaltas) * 100) 
      : 100;

    // Preferred days
    const sortedDays = Object.entries(dayOfWeekCount)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    // Current streak (consecutive presences without absence in the latest sessions)
    let currentStreak = 0;
    for (const appt of sortedAppts) {
      if (appt.date > todayStr) continue;
      if (appt.attendanceStatus === 'presenca' || appt.status === 'concluido') {
        currentStreak++;
      } else if (appt.attendanceStatus === 'falta' || appt.status === 'falta') {
        break;
      }
    }

    // Average weekly frequency estimate (sessions in the last 60 days / ~8.5 weeks)
    const sessionsLast60Days = sortedAppts.filter(a => {
      if (a.attendanceStatus !== 'presenca' && a.status !== 'concluido') return false;
      const apptTime = new Date(a.date + 'T12:00:00').getTime();
      const nowTime = new Date().getTime();
      const diffDays = (nowTime - apptTime) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 60;
    }).length;

    const mediaSemanal = sessionsLast60Days > 0 ? (sessionsLast60Days / 8.5).toFixed(1) : (presencas > 0 ? '1.5' : '0');

    return {
      presencas,
      faltas,
      agendadosFuturos,
      taxaAssiduidade,
      checkinQrCodeCount,
      preferredDays: sortedDays.slice(0, 2).map(d => d[0]),
      currentStreak,
      mediaSemanal,
      monthlyAttendance
    };
  }, [sortedAppts]);

  // Performance badge determination
  const getBadgeInfo = (rate: number, presencas: number) => {
    if (presencas >= 10 && rate >= 90) {
      return {
        title: 'Paciente Ouro • Assiduidade Exemplar',
        color: 'bg-[#F5EED3] text-[#7E611D] border-[#D0A73B]/40',
        icon: Sparkles,
        desc: 'Excelente comprometimento com a evolução e plano de reabilitação/pilates.'
      };
    }
    if (rate >= 80) {
      return {
        title: 'Paciente Frequente • Ótima Constância',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: Award,
        desc: 'Ritmo contínuo garantindo resultados terapêuticos consistentes.'
      };
    }
    if (rate >= 60) {
      return {
        title: 'Paciente Regular • Em Evolução',
        color: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: TrendingUp,
        desc: 'Frequência regular. Manter as sessões semanais potencializa os benefícios.'
      };
    }
    return {
      title: 'Atenção à Frequência',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Info,
      desc: 'Evitar faltas garante a continuidade do alívio das dores e ganho muscular.'
    };
  };

  const badge = getBadgeInfo(frequencyStats.taxaAssiduidade, frequencyStats.presencas);

  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Taxa de Assiduidade */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Taxa de Presença
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 flex items-baseline space-x-1">
              <span>{frequencyStats.taxaAssiduidade}%</span>
              <span className="text-xs font-semibold text-emerald-700">assiduidade</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, frequencyStats.taxaAssiduidade))}%` }}
              />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex justify-between">
            <span>{frequencyStats.presencas} presenças</span>
            <span>{frequencyStats.faltas} faltas</span>
          </div>
        </div>

        {/* Card 2: Sequência de Assiduidade (Streak) */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Sequência Atual
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 flex items-baseline space-x-1">
              <span>{frequencyStats.currentStreak}</span>
              <span className="text-xs font-semibold text-amber-700">
                {frequencyStats.currentStreak === 1 ? 'sessão consecutiva' : 'sessões consecutivas'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {frequencyStats.currentStreak > 0 
                ? 'Em ritmo contínuo sem faltas recentes!' 
                : 'Mantenha o foco nos seus horários agendados.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-amber-800 font-medium flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-600" />
            <span>Regularidade melhora o prognóstico</span>
          </div>
        </div>

        {/* Card 3: Frequência Semanal Média */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Média Semanal
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#31523D]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-[#31523D] flex items-baseline space-x-1">
              <span>{frequencyStats.mediaSemanal}x</span>
              <span className="text-xs font-semibold text-slate-500">por semana</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {frequencyStats.preferredDays.length > 0 
                ? `Dias mais frequentes: ${frequencyStats.preferredDays.join(', ')}`
                : 'Horários distribuídos ao longo da semana'}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            Fisioterapia & Pilates Clínico
          </div>
        </div>

        {/* Card 4: Check-ins na Recepção */}
        <div className="bg-white rounded-2xl p-5 border border-[#D0A73B]/30 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7E611D] uppercase tracking-wider">
              Check-in Presencial
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F5EED3] text-[#7E611D] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 flex items-baseline space-x-1">
              <span>{frequencyStats.checkinQrCodeCount}</span>
              <span className="text-xs font-semibold text-[#7E611D]">via QR / Recepção</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Presenças registradas na chegada à clínica.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Recepção ágil sem filas</span>
          </div>
        </div>

      </div>

      {/* Recognition Badge Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${badge.color}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-2xs">
            <badge.icon className="w-5 h-5 text-inherit" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold">{badge.title}</h3>
            <p className="text-xs opacity-90">{badge.desc}</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold shadow-2xs border border-slate-200/80 flex items-center justify-center space-x-1.5 shrink-0 transition-colors"
        >
          <Printer className="w-3.5 h-3.5 text-[#31523D]" />
          <span>Imprimir Relatório de Frequência</span>
        </button>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Histórico de Presenças & Faltas ({sortedAppts.length})</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Registro oficial de assiduidade acompanhado pela Dra. {clinic.managerName}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>{frequencyStats.presencas} Presenças</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200">
              <XCircle className="w-3 h-3" />
              <span>{frequencyStats.faltas} Faltas</span>
            </span>
          </div>
        </div>

        {sortedAppts.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">Nenhum registro de atendimento encontrado</h4>
            <p className="text-xs text-slate-500 mt-1">Os atendimentos concluídos serão listados aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Data & Horário</th>
                  <th className="py-3 px-4">Procedimento / Serviço</th>
                  <th className="py-3 px-4">Status da Frequência</th>
                  <th className="py-3 px-4">Horário Check-in</th>
                  <th className="py-3 px-4">Registro / Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAppts.map((appt) => {
                  const isPresenca = appt.attendanceStatus === 'presenca' || appt.status === 'concluido';
                  const isFalta = appt.attendanceStatus === 'falta' || appt.status === 'falta';
                  const isPendente = appt.status === 'agendado';

                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDatePtBR(appt.date)}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 font-bold">{appt.time} hs</span>
                        </div>
                      </td>

                      {/* Service Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{appt.serviceName}</div>
                        <div className="text-[11px] text-slate-400">{appt.durationMinutes || 50} minutos</div>
                      </td>

                      {/* Attendance Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPresenca && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Presente / Concluído</span>
                          </span>
                        )}
                        {isFalta && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Falta Registrada</span>
                          </span>
                        )}
                        {isPendente && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Horário Agendado</span>
                          </span>
                        )}
                      </td>

                      {/* Check-in Timestamp & Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {appt.checkedInAt ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{new Date(appt.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} hs</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                              <QrCode className="w-2.5 h-2.5" />
                              <span>{appt.checkInMethod === 'qrcode' ? 'QR Code Recepção' : 'Portal Paciente'}</span>
                            </div>
                          </div>
                        ) : isPresenca ? (
                          <span className="text-slate-400 text-[11px]">Presença confirmada</span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Attendance Notes */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {appt.attendanceNotes || appt.notes || <span className="text-slate-300">Sessão terapêutica regular</span>}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
