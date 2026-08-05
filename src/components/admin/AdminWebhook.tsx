import React, { useState, useEffect } from 'react';
import { ClinicConfig, ReminderLog } from '../../types';
import { api } from '../../services/api';
import { Send, Radio, Terminal, Bell, Clock, RefreshCw, CheckCircle2, MessageSquare } from 'lucide-react';

interface AdminWebhookProps {
  clinic: ClinicConfig;
  onReload: () => void;
}

export const AdminWebhook: React.FC<AdminWebhookProps> = ({ clinic, onReload }) => {
  const [webhookUrl, setWebhookUrl] = useState<string>(clinic.webhookUrl || '');
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(clinic.webhookEnabled !== false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await api.getReminderLogs();
      setReminderLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');
    try {
      await api.updateClinic({
        webhookUrl,
        webhookEnabled,
      });
      setSaveMessage('Configuração de Webhook salva com sucesso!');
      onReload();
    } catch (err: any) {
      setSaveMessage('Erro ao salvar configuração de Webhook.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      const res = await api.testWebhook(webhookUrl);
      setTestResponse(res);
    } catch (err: any) {
      setTestResponse({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h3 className="text-lg font-bold text-slate-800">Notificações por Webhook (n8n / Make / WhatsApp APIs)</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Dispare um aviso automático para o seu WhatsApp ou sistema de gestão assim que um novo agendamento for realizado no site.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Setup Form Card */}
        <form onSubmit={handleSaveWebhook} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <Radio className="w-4 h-4 text-teal-600 animate-pulse" />
            <span>Configuração do Endpoint HTTP</span>
          </h4>

          {saveMessage && (
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              ✓ {saveMessage}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              URL do Webhook (POST) *
            </label>
            <input
              type="url"
              required
              placeholder="https://n8n.suaclinica.com/webhook/agendamento"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Suporta n8n, Make.com, Evolution API, Z-API ou servidor HTTP customizado.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="chk-webhook-enabled"
              checked={webhookEnabled}
              onChange={(e) => setWebhookEnabled(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label htmlFor="chk-webhook-enabled" className="text-xs font-semibold text-slate-700">
              Ativar Disparo Automático ao Agendar
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              id="btn-test-webhook"
              disabled={testing || !webhookUrl}
              onClick={handleTestWebhook}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center space-x-1.5 transition-all"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-teal-600" />}
              <span>{testing ? 'Disparando...' : 'Testar Disparo'}</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
            >
              {saving ? 'Salvando...' : 'Salvar Webhook'}
            </button>
          </div>
        </form>

        {/* Live Test Response Inspector */}
        <div className="bg-slate-900 rounded-2xl p-6 text-slate-200 shadow-2xs font-mono text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-slate-400">
              <span className="flex items-center space-x-1.5 font-bold text-[11px] uppercase tracking-wider text-teal-400">
                <Terminal className="w-4 h-4 text-teal-400" />
                <span>Inspetor de Disparo HTTP</span>
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">JSON Payload</span>
            </div>

            {testResponse ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span>Status do Envio:</span>
                  <span className={`font-bold ${testResponse.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testResponse.success ? `200 OK (Sucesso)` : `Erro HTTP ${testResponse.status || ''}`}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] overflow-x-auto max-h-56">
                  <pre className="text-emerald-300">
                    {JSON.stringify(testResponse, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <p>Clique em "Testar Disparo" acima para enviar uma notificação de teste e inspecionar o JSON.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Aviso de Sistema:</span>
            <span className="text-teal-400 font-semibold">Integrado ao Backend Node.js</span>
          </div>

        </div>

      </div>

      {/* Automated 4-Hour Reminders Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Bell className="w-4 h-4 text-[#5F6D33]" />
              <span>Histórico de Lembretes Automáticos (4 Horas Antes da Sessão)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              O sistema verifica continuamente os agendamentos do dia e dispara o aviso de sessão 4 horas antes do horário marcado.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span>Atualizar Logs</span>
          </button>
        </div>

        {reminderLogs.length === 0 ? (
          <div className="p-8 text-center bg-[#F4F7F4]/50 rounded-xl border border-dashed border-[#C9D8CB] text-slate-500 text-xs space-y-1">
            <Clock className="w-6 h-6 mx-auto text-[#5F6D33] opacity-60" />
            <p className="font-semibold text-slate-700">Nenhum disparo de 4h registrado ainda.</p>
            <p className="text-[11px]">Os lembretes são acionados automaticamente 4h antes de cada sessão confirmada.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {reminderLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-[#EAF0DB] text-[#31523D] flex items-center justify-center shrink-0 font-bold">
                    🔔
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <strong className="text-slate-800 font-bold">{log.patientName}</strong>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                        {log.patientPhone}
                      </span>
                      <span className="text-[10px] bg-[#EAF0DB] text-[#31523D] px-2 py-0.5 rounded-full font-bold">
                        {log.serviceName}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Sessão em: <strong>{log.date} às {log.time} hs</strong>
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1 italic bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                      "{log.message}"
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Disparado {new Date(log.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Canal: {log.channel === 'whatsapp_webhook' ? 'WhatsApp (Webhook)' : 'Interno do Sistema'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
