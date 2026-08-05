import React, { useState } from 'react';
import { ScheduleConfig, DaySchedule } from '../../types';
import { api } from '../../services/api';
import { Save, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminScheduleProps {
  schedule: ScheduleConfig;
  onReload: () => void;
}

export const AdminSchedule: React.FC<AdminScheduleProps> = ({ schedule, onReload }) => {
  const [days, setDays] = useState<DaySchedule[]>(schedule.days);
  const [slotInterval, setSlotInterval] = useState<number>(schedule.slotIntervalMinutes || 60);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDayToggle = (index: number) => {
    const updated = [...days];
    updated[index].active = !updated[index].active;
    setDays(updated);
  };

  const handleDayChange = (index: number, field: keyof DaySchedule, value: string) => {
    const updated = [...days];
    updated[index] = { ...updated[index], [field]: value };
    setDays(updated);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.updateScheduleConfig({
        days,
        slotIntervalMinutes: slotInterval,
      });
      setMessage({ type: 'success', text: 'Horários de atendimento e intervalos atualizados com sucesso!' });
      onReload();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar configuração.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveSchedule} className="space-y-6">
      
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Configuração de Horários de Atendimento</h3>
          <p className="text-xs text-slate-500">
            Defina os dias de funcionamento da clínica, horários de início/fim, almoço e duração das janelas de agendamento.
          </p>
        </div>

        <button
          id="btn-save-schedule"
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-xs flex items-center justify-center space-x-2 transition-all shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Interval Setup Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
        <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-teal-600" />
          <span>Intervalo de Grade de Horários (Passo dos Encaixes)</span>
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          Cada opção de horário exibida ao paciente no agendamento público respeitará esta janela de tempo.
        </p>

        <div className="max-w-xs">
          <select
            value={slotInterval}
            onChange={(e) => setSlotInterval(Number(e.target.value))}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800 font-semibold"
          >
            <option value={30}>A cada 30 minutos</option>
            <option value={45}>A cada 45 minutos</option>
            <option value={50}>A cada 50 minutos (Padrão Pilates/Fisio)</option>
            <option value={60}>A cada 60 minutos (1 hora)</option>
          </select>
        </div>
      </div>

      {/* Working Days Table/Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>Grade Semanal de Funcionamento</span>
        </div>

        <div className="divide-y divide-slate-100">
          {days.map((day, idx) => (
            <div
              key={day.dayOfWeek}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                day.active ? 'bg-white' : 'bg-slate-50/60 opacity-60'
              }`}
            >
              {/* Day Toggle */}
              <div className="flex items-center space-x-3 sm:w-48">
                <input
                  type="checkbox"
                  id={`chk-day-${day.dayOfWeek}`}
                  checked={day.active}
                  onChange={() => handleDayToggle(idx)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <label
                  htmlFor={`chk-day-${day.dayOfWeek}`}
                  className="text-sm font-bold text-slate-800 cursor-pointer"
                >
                  {day.dayName}
                </label>
              </div>

              {/* Day Hours Controls */}
              {day.active ? (
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Início Atendimento
                    </label>
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => handleDayChange(idx, 'startTime', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Início Almoço
                    </label>
                    <input
                      type="time"
                      value={day.lunchStart || ''}
                      onChange={(e) => handleDayChange(idx, 'lunchStart', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Fim Almoço
                    </label>
                    <input
                      type="time"
                      value={day.lunchEnd || ''}
                      onChange={(e) => handleDayChange(idx, 'lunchEnd', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Término Atendimento
                    </label>
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => handleDayChange(idx, 'endTime', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium italic">
                  Clínica Fechada / Sem Atendimento
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </form>
  );
};
