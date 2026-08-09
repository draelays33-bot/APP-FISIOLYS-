import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Appointment, LoyaltyMember, AdminTab } from '../../types';
import { api } from '../../services/api';
import { formatDatePtBR, formatCurrency } from '../../utils/qrUtils';
import {
  Bell,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  X,
  CheckCircle2,
  ChevronRight,
  Volume2,
  VolumeX,
  Sparkles,
  Info
} from 'lucide-react';

export interface ToastNotification {
  id: string;
  type: 'appointment' | 'payment_due' | 'payment_overdue' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetTab?: AdminTab;
  patientName?: string;
  detail?: string;
  autoDismissMs?: number;
}

interface AdminToastsProps {
  appointments: Appointment[];
  onNavigateTab: (tab: AdminTab) => void;
}

// Play a pleasant, non-intrusive notification chime using Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // Audio Context might be blocked until user gesture, ignore silently
  }
};

export const AdminToasts: React.FC<AdminToastsProps> = ({ appointments, onNavigateTab }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [allNotifications, setAllNotifications] = useState<ToastNotification[]>([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('fisiolys_toast_sound') !== 'disabled';
  });

  const knownAppointmentIdsRef = useRef<Set<string>>(new Set());
  const checkedPaymentKeysRef = useRef<Set<string>>(new Set());
  const isInitialApptLoadRef = useRef(true);

  // Toggle sound setting
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('fisiolys_toast_sound', next ? 'enabled' : 'disabled');
  };

  // Helper to add a notification
  const addNotification = useCallback(
    (notifData: Omit<ToastNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: ToastNotification = {
        ...notifData,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };

      if (soundEnabled) {
        playNotificationSound();
      }

      // Add to popup toasts (visible floating box)
      setToasts((prev) => [newNotif, ...prev.slice(0, 4)]); // max 5 visible toasts

      // Add to persistent notification drawer history
      setAllNotifications((prev) => [newNotif, ...prev]);

      // Auto dismiss from toast popup after 7 seconds
      const timeout = notifData.autoDismissMs || 7000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
      }, timeout);
    },
    [soundEnabled]
  );

  // Dismiss a active floating toast
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Mark all notifications as read in the drawer
  const markAllAsRead = () => {
    setAllNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Clear notification history
  const clearNotifications = () => {
    setAllNotifications([]);
    setToasts([]);
  };

  // 1. MONITOR NEW APPOINTMENTS
  useEffect(() => {
    if (!appointments || appointments.length === 0) return;

    if (isInitialApptLoadRef.current) {
      // First load: just record existing appointment IDs without spamming toasts
      appointments.forEach((app) => knownAppointmentIdsRef.current.add(app.id));
      isInitialApptLoadRef.current = false;
      return;
    }

    // Subsequent updates: check for newly added appointments
    appointments.forEach((app) => {
      if (!knownAppointmentIdsRef.current.has(app.id)) {
        knownAppointmentIdsRef.current.add(app.id);

        addNotification({
          type: 'appointment',
          title: '🗓️ Novo Agendamento Recebido!',
          message: `${app.patientName} agendou ${app.serviceName}`,
          detail: `Data: ${formatDatePtBR(app.date)} às ${app.time}hs`,
          patientName: app.patientName,
          targetTab: 'agenda',
        });
      }
    });
  }, [appointments, addNotification]);

  // 2. CHECK UPCOMING/OVERDUE PAYMENTS FROM LOYALTY MEMBERS
  const checkLoyaltyPaymentDueDates = useCallback(async () => {
    try {
      const members = await api.getLoyaltyMembers();
      if (!members || members.length === 0) return;

      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const currentMonthYearStr = `${String(currentMonth).padStart(2, '0')}/${currentYear}`;

      members.forEach((m) => {
        if (m.status === 'inativo') return;

        // Check if member is inadimplente or has overdue months
        if (m.status === 'inadimplente' || (m.overdueMonths && m.overdueMonths.length > 0)) {
          const key = `overdue-${m.id}-${currentMonthYearStr}`;
          if (!checkedPaymentKeysRef.current.has(key)) {
            checkedPaymentKeysRef.current.add(key);

            addNotification({
              type: 'payment_overdue',
              title: '⚠️ Pagamento em Atraso!',
              message: `O assinante ${m.patientName} possui pendências de mensalidade.`,
              detail: `Mensalidade: ${formatCurrency(m.monthlyFee)} • Vencimento dia ${m.dueDay}`,
              patientName: m.patientName,
              targetTab: 'fidelidade',
            });
          }
        } else {
          // Check if due day is within the next 5 days
          const daysUntilDue = m.dueDay - currentDay;
          const hasPaidCurrentMonth = m.payments?.some((p) => p.monthYear === currentMonthYearStr);

          if (!hasPaidCurrentMonth && daysUntilDue >= 0 && daysUntilDue <= 5) {
            const key = `due-${m.id}-${currentMonthYearStr}-${daysUntilDue}`;
            if (!checkedPaymentKeysRef.current.has(key)) {
              checkedPaymentKeysRef.current.add(key);

              let timeMsg = daysUntilDue === 0 ? 'Vence Hoje!' : `Vence em ${daysUntilDue} dia(s) (Dia ${m.dueDay})`;

              addNotification({
                type: 'payment_due',
                title: '💳 Pagamento Próximo do Vencimento',
                message: `Assinatura de ${m.patientName} (${timeMsg})`,
                detail: `Valor: ${formatCurrency(m.monthlyFee)} • Plano Fidelidade`,
                patientName: m.patientName,
                targetTab: 'fidelidade',
              });
            }
          }
        }
      });
    } catch (err) {
      console.warn('Non-blocking: could not check loyalty due dates for toasts:', err);
    }
  }, [addNotification]);

  useEffect(() => {
    checkLoyaltyPaymentDueDates();

    // Re-check payment due dates every 2 minutes
    const interval = setInterval(checkLoyaltyPaymentDueDates, 120000);
    return () => clearInterval(interval);
  }, [checkLoyaltyPaymentDueDates]);

  // Test notification button handler
  const handleTestNotification = () => {
    addNotification({
      type: 'appointment',
      title: '✨ Agendamento de Teste',
      message: 'Paciente Exemplo realizou um agendamento!',
      detail: 'Sua interface administrativa de avisos está funcionando 100%.',
      targetTab: 'agenda',
    });
  };

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  return (
    <>
      {/* 🔔 Admin Header Notification Bell Trigger */}
      <div className="relative inline-flex items-center">
        <button
          id="btn-admin-notifications"
          onClick={() => {
            setShowNotificationDrawer(!showNotificationDrawer);
            if (!showNotificationDrawer) {
              markAllAsRead();
            }
          }}
          className="relative p-2 rounded-xl text-slate-600 hover:text-[#31523D] hover:bg-[#F4F7F4] transition-all border border-transparent hover:border-[#C9D8CB] focus:outline-none"
          title="Notificações e Avisos"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-white shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* 📋 Notification History Drawer Dropdown */}
        {showNotificationDrawer && (
          <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#C9D8CB] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="p-3.5 bg-[#31523D] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#D0A73B]" />
                <h4 className="text-xs font-bold">Central de Avisos & Notificações</h4>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={toggleSound}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                  title={soundEnabled ? 'Som Ativado' : 'Som Desativado'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#D0A73B]" /> : <VolumeX className="w-3.5 h-3.5 opacity-50" />}
                </button>
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions Subbar */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <button
                onClick={handleTestNotification}
                className="text-[#31523D] font-bold hover:underline flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3 text-[#D0A73B]" />
                <span>Testar Notificação</span>
              </button>
              {allNotifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-slate-400 hover:text-red-500 font-medium transition-colors"
                >
                  Limpar histórico
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-2">
              {allNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#31523D]" />
                  <p className="text-xs font-medium">Nenhum aviso no momento</p>
                  <p className="text-[11px] text-slate-400 mt-1">Você receberá alertas automáticos de novos agendamentos e vencimentos de assinaturas aqui.</p>
                </div>
              ) : (
                allNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl transition-all my-1 text-left ${
                      notif.type === 'appointment'
                        ? 'bg-emerald-50/60 border border-emerald-100 hover:bg-emerald-50'
                        : notif.type === 'payment_overdue'
                        ? 'bg-rose-50/60 border border-rose-100 hover:bg-rose-50'
                        : 'bg-amber-50/60 border border-amber-100 hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {notif.type === 'appointment' && <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {notif.type === 'payment_due' && <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
                        {notif.type === 'payment_overdue' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                        {notif.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
                        <span className="text-xs font-bold text-slate-800">{notif.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{notif.timestamp}</span>
                    </div>

                    <p className="text-xs text-slate-700 mt-1">{notif.message}</p>
                    {notif.detail && <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{notif.detail}</p>}

                    {notif.targetTab && (
                      <button
                        onClick={() => {
                          onNavigateTab(notif.targetTab!);
                          setShowNotificationDrawer(false);
                        }}
                        className="mt-2 text-[11px] font-bold text-[#31523D] hover:text-[#23372B] flex items-center space-x-1 hover:underline"
                      >
                        <span>Abrir {notif.targetTab === 'agenda' ? 'Agenda' : notif.targetTab === 'fidelidade' ? 'Fidelidade' : 'Painel'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🚀 Floating Toast Container (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => {
          const isAppt = toast.type === 'appointment';
          const isOverdue = toast.type === 'payment_overdue';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl shadow-xl border backdrop-blur-md transform transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
                isAppt
                  ? 'bg-white/95 border-emerald-300 text-slate-800 ring-2 ring-emerald-500/20'
                  : isOverdue
                  ? 'bg-white/95 border-rose-300 text-slate-800 ring-2 ring-rose-500/20'
                  : 'bg-white/95 border-amber-300 text-slate-800 ring-2 ring-amber-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isAppt
                        ? 'bg-emerald-100 text-emerald-700'
                        : isOverdue
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isAppt ? (
                      <Calendar className="w-5 h-5" />
                    ) : isOverdue ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <DollarSign className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900">{toast.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">agora</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">{toast.message}</p>
                    {toast.detail && <p className="text-[11px] text-slate-500 mt-1 font-medium">{toast.detail}</p>}
                  </div>
                </div>

                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Button */}
              {toast.targetTab && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      onNavigateTab(toast.targetTab!);
                      dismissToast(toast.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-xs ${
                      isAppt
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : isOverdue
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-[#31523D] hover:bg-[#23372B] text-white'
                    }`}
                  >
                    <span>
                      {toast.targetTab === 'agenda'
                        ? 'Ver na Agenda'
                        : toast.targetTab === 'fidelidade'
                        ? 'Ver no Programa Fidelidade'
                        : 'Ver Detalhes'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
