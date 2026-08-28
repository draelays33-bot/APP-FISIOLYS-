import React, { useState, useEffect, useCallback } from 'react';
import { AppView, ClinicConfig, Service, ScheduleConfig, Appointment, Patient, LoyaltyMember } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { PublicBooking } from './components/public/PublicBooking';
import { ServicesCatalogView } from './components/public/ServicesCatalogView';
import { PatientPortal } from './components/patient/PatientPortal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { FisiolysCRM } from './components/crm/FisiolysCRM';
import { GeminiChatbot } from './components/common/GeminiChatbot';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { SettingsModal } from './components/common/SettingsModal';
import { RefreshCw, AlertCircle, Sparkles, Lock, Brain, X, Users, KeyRound, Unlock, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { verifyAdminPassword } from './utils/securityUtils';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        const actionParam = urlParams.get('action');
        const tabParam = urlParams.get('tab');
        const checkinParam = urlParams.get('checkin');

        if (actionParam === 'checkin' || tabParam === 'checkin' || checkinParam === 'true') {
          return 'patient_portal';
        }
        if (viewParam === 'crm') {
          return 'crm';
        }
        if (viewParam === 'admin') {
          return 'admin';
        }
        if (viewParam === 'patient_portal' || viewParam === 'gestao' || viewParam === 'frequencia' || viewParam === 'checkin') {
          return 'patient_portal';
        }
        if (viewParam === 'services' || viewParam === 'servicos' || viewParam === 'tratamentos') {
          return 'services';
        }
        if (viewParam === 'public' || viewParam === 'agendamento') {
          return 'public';
        }
      }
    } catch (e) {
      console.error("Error reading URL parameters", e);
    }
    return 'public';
  });

  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loyaltyMembers, setLoyaltyMembers] = useState<LoyaltyMember[]>([]);
  const [preselectedService, setPreselectedService] = useState<Service | null>(null);
  const [patientPortalInitialTab, setPatientPortalInitialTab] = useState<string>('frequencia');
  const [patientPortalInitialCpf, setPatientPortalInitialCpf] = useState<string>('');

  // Search, Settings and Gemini Chatbot Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState(false);
  const [isCrmAuthModalOpen, setIsCrmAuthModalOpen] = useState(false);
  const [crmAuthPassword, setCrmAuthPassword] = useState('');
  const [showCrmPassword, setShowCrmPassword] = useState(false);
  const [crmAuthError, setCrmAuthError] = useState<string | null>(null);

  // Password Authentication State for Admin Panel & CRM
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('fisiolys_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keyboard shortcut for search: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [clinicRes, servicesRes, scheduleRes, apptsRes, patientsRes, loyaltyRes] = await Promise.all([
        api.getClinic(),
        api.getServices(),
        api.getScheduleConfig(),
        api.getAppointments(),
        api.getPatients(),
        api.getLoyaltyMembers().catch(() => []),
      ]);

      setClinic(clinicRes);
      setServices(servicesRes);
      setSchedule(scheduleRes);
      setAppointments(apptsRes);
      setPatients(patientsRes);
      setLoyaltyMembers(loyaltyRes);
    } catch (err: any) {
      console.error("Error loading application data:", err);
      setError("Não foi possível carregar os dados da clínica. Verifique se o servidor está ativo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdminLoginSuccess = () => {
    try {
      sessionStorage.setItem('fisiolys_admin_auth', 'true');
    } catch (e) {
      console.error(e);
    }
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    try {
      sessionStorage.removeItem('fisiolys_admin_auth');
    } catch (e) {
      console.error(e);
    }
    setIsAdminAuthenticated(false);
    setCurrentView('patient_portal');
  };

  const handleViewChange = (view: AppView) => {
    if (view === 'admin' && !isAdminAuthenticated) {
      return;
    }
    setCurrentView(view);
  };

  const handleSearchNavigate = (type: string, item: any) => {
    if (type === 'patient') {
      setPatientPortalInitialTab('frequencia');
      setCurrentView('patient_portal');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (type === 'service') {
      setPreselectedService(item as Service);
      setCurrentView('public');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (type === 'appointment') {
      if (isAdminAuthenticated) {
        setCurrentView('admin');
      } else {
        setPatientPortalInitialTab('proximos');
        setCurrentView('patient_portal');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (type === 'loyalty') {
      setPatientPortalInitialTab('fidelidade');
      setCurrentView('patient_portal');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-creme flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-verde-900 text-dourado-suave border border-verde-800 flex items-center justify-center shadow-md animate-bounce mb-4">
          <Sparkles className="w-7 h-7 text-dourado" />
        </div>
        <div className="flex items-center space-x-2 text-verde-900 font-bold text-sm font-sans">
          <RefreshCw className="w-4 h-4 animate-spin text-dourado" />
          <span>Carregando Fisiolys Fisioterapia e Pilates...</span>
        </div>
      </div>
    );
  }

  if (error || !clinic || !schedule) {
    return (
      <div className="min-h-screen bg-creme flex flex-col items-center justify-center p-4">
        <div className="max-w-md bg-creme-card rounded-3xl p-6 shadow-sm border border-linha text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-serif font-bold text-carvao">Falha ao Conectar</h3>
          <p className="text-xs text-carvao-suave mt-1 mb-4 font-sans">{error || "Não foi possível carregar a configuração inicial."}</p>
          <button
            onClick={loadData}
            className="px-5 py-2.5 bg-verde-900 hover:bg-verde-800 text-creme font-bold text-xs rounded-full shadow-xs cursor-pointer border border-verde-800"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creme text-carvao font-sans antialiased selection:bg-dourado/20 selection:text-carvao">
      
      {/* Top Header with Search, Settings & Tabs */}
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        clinic={clinic}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onAdminLogout={handleAdminLogout}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGeminiChat={() => setIsGeminiChatOpen(true)}
      />

      {/* Main View Area */}
      <main>
        {currentView === 'public' && (
          <PublicBooking
            clinic={clinic}
            services={services}
            initialService={preselectedService}
            onBookingSuccess={loadData}
            onNavigateToServices={() => {
              setCurrentView('services');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToPatientPortal={(tab?: string) => {
              if (tab === 'checkin') {
                setPatientPortalInitialTab('checkin');
              } else if (tab === 'proximos' || tab === 'reagendar') {
                setPatientPortalInitialTab('proximos');
              } else if (tab === 'avaliacao' || tab === 'prontuario' || tab === 'evolucoes' || tab === 'exames') {
                setPatientPortalInitialTab('avaliacao');
              } else if (tab === 'contratos' || tab === 'tcle') {
                setPatientPortalInitialTab('contratos');
              } else if (tab === 'extrato') {
                setPatientPortalInitialTab('extrato');
              } else if (tab === 'fidelidade') {
                setPatientPortalInitialTab('fidelidade');
              } else {
                setPatientPortalInitialTab(tab || 'frequencia');
              }
              setCurrentView('patient_portal');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToCrm={() => {
              handleViewChange('crm');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'services' && (
          <ServicesCatalogView
            clinic={clinic}
            services={services}
            onSelectServiceToBook={(service) => {
              setPreselectedService(service);
              setCurrentView('public');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'patient_portal' && (
          <PatientPortal
            clinic={clinic}
            services={services}
            appointments={appointments}
            patients={patients}
            loyaltyMembers={loyaltyMembers}
            initialTab={patientPortalInitialTab}
            onNavigateToBooking={() => {
              setPreselectedService(null);
              setCurrentView('public');
            }}
            onReload={loadData}
          />
        )}

        {currentView === 'crm' && (
          isAdminAuthenticated ? (
            <div className="py-2">
              <FisiolysCRM
                onBackToSite={() => setCurrentView('public')}
                onOpenGeminiChat={() => setIsGeminiChatOpen(true)}
              />
            </div>
          ) : (
            <div className="max-w-md mx-auto my-20 p-8 bg-[#FAF7F0] rounded-3xl border border-[#E4DCC8] shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center mx-auto shadow-md border border-[#B08A3E]/40">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1B2E24]">Acesso Restrito ao CRM Fisiolys</h2>
              <p className="text-xs text-[#5B5A52] leading-relaxed font-sans">
                Esta área exige a senha de segurança profissional da <strong>Dra. Elays Marinho</strong>.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (verifyAdminPassword(crmAuthPassword)) {
                    handleAdminLoginSuccess();
                    setCrmAuthError(null);
                  } else {
                    setCrmAuthError('Senha incorreta! Por favor, tente novamente.');
                  }
                }}
                className="space-y-3 pt-2"
              >
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#5B5A52] absolute left-3.5 top-3" />
                  <input
                    type={showCrmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={crmAuthPassword}
                    onChange={(e) => {
                      setCrmAuthPassword(e.target.value);
                      if (crmAuthError) setCrmAuthError(null);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl text-sm font-bold text-center text-[#1B2E24] tracking-widest focus:outline-hidden focus:ring-2 focus:ring-[#B08A3E]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCrmPassword(!showCrmPassword)}
                    className="absolute right-3 top-2.5 p-1 text-[#5B5A52] hover:text-[#1B2E24] transition-colors cursor-pointer"
                    title={showCrmPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showCrmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {crmAuthError && (
                  <p className="text-xs text-rose-600 font-semibold">{crmAuthError}</p>
                )}
                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentView('public')}
                    className="w-1/2 py-2.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#26241F] rounded-full text-xs font-semibold transition-all cursor-pointer border border-[#E4DCC8]"
                  >
                    Voltar ao Site
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] rounded-full text-xs font-bold transition-all cursor-pointer border border-[#B08A3E] shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5 text-[#DCC58F]" />
                    <span>Entrar no CRM</span>
                  </button>
                </div>
              </form>
            </div>
          )
        )}

        {currentView === 'admin' && (
          isAdminAuthenticated ? (
            <AdminDashboard
              clinic={clinic}
              services={services}
              schedule={schedule}
              appointments={appointments}
              patients={patients}
              onReload={loadData}
            />
          ) : (
            <div className="max-w-md mx-auto my-20 p-8 bg-creme-card rounded-3xl border border-linha shadow-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-verde-900 text-dourado-suave flex items-center justify-center mx-auto shadow-md border border-verde-800">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-serif font-bold text-carvao">Acesso Restrito ao Painel Gestor</h2>
              <p className="text-xs text-carvao-suave leading-relaxed font-sans">
                Esta área exige a senha de segurança da administração da <strong>Dra. Elays Marinho</strong>.
              </p>
              <button
                onClick={() => setCurrentView('patient_portal')}
                className="px-6 py-3 bg-verde-900 hover:bg-verde-800 text-creme font-bold rounded-full text-xs transition-all shadow-xs cursor-pointer border border-verde-800"
              >
                Ir para Gestão do Paciente
              </button>
            </div>
          )
        )}
      </main>

      {/* FLOATING WHATSAPP BUTTON (Replacing bottom CRM position) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-2">
        <a
          id="btn-floating-whatsapp"
          href={`https://wa.me/5593991265006?text=${encodeURIComponent('Olá Dra. Elays, gostaria de tirar uma dúvida sobre o agendamento e atendimento na Fisiolys!')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center space-x-3 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-2xl hover:shadow-3xl border-2 border-white/80 hover:scale-105 transition-all duration-300 cursor-pointer"
          title="Falar no WhatsApp com a Fisiolys"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#1da851] flex items-center justify-center border border-white/40 shadow-inner">
              <MessageCircle className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-200 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center space-x-1.5">
              <span className="block text-xs font-bold tracking-tight text-white">WhatsApp Fisiolys</span>
            </div>
            <span className="block text-[10px] text-white/95 font-medium">(93) 99126-5006 • Atendimento</span>
          </div>
        </a>
      </div>

      {/* CRM FLOATING AUTH MODAL */}
      {isCrmAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1B2E24]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#E4DCC8] relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsCrmAuthModalOpen(false);
                setCrmAuthPassword('');
                setShowCrmPassword(false);
                setCrmAuthError(null);
              }}
              className="absolute top-4 right-4 text-[#5B5A52] hover:text-[#26241F] p-1.5 rounded-full hover:bg-[#F3EEE2] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1B2E24] text-[#DCC58F] border border-[#B08A3E]/40 flex items-center justify-center mx-auto shadow-md">
                <Users className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-serif font-bold text-[#1B2E24] tracking-tight">
                  Acesso Restrito ao CRM Fisiolys
                </h3>
                <p className="text-xs text-[#5B5A52] mt-1">
                  Digite sua senha de segurança de fisioterapeuta para acessar o CRM, funil e prontuários.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (verifyAdminPassword(crmAuthPassword)) {
                  handleAdminLoginSuccess();
                  setIsCrmAuthModalOpen(false);
                  setCrmAuthPassword('');
                  setShowCrmPassword(false);
                  setCrmAuthError(null);
                  setCurrentView('crm');
                } else {
                  setCrmAuthError('Senha incorreta! Por favor, verifique e tente novamente.');
                }
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#26241F] uppercase tracking-wider mb-1.5">
                  Senha de Segurança:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#5B5A52] absolute left-3.5 top-3" />
                  <input
                    type={showCrmPassword ? 'text' : 'password'}
                    autoFocus
                    placeholder="••••••••"
                    value={crmAuthPassword}
                    onChange={(e) => {
                      setCrmAuthPassword(e.target.value);
                      if (crmAuthError) setCrmAuthError(null);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl text-sm font-bold text-[#26241F] tracking-widest focus:outline-hidden focus:ring-2 focus:ring-[#B08A3E]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCrmPassword(!showCrmPassword)}
                    className="absolute right-3 top-2.5 p-1 text-[#5B5A52] hover:text-[#1B2E24] transition-colors cursor-pointer"
                    title={showCrmPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showCrmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {crmAuthError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{crmAuthError}</span>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCrmAuthModalOpen(false);
                    setCrmAuthPassword('');
                    setShowCrmPassword(false);
                    setCrmAuthError(null);
                  }}
                  className="w-1/3 py-2.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#26241F] rounded-full text-xs font-semibold transition-all cursor-pointer border border-[#E4DCC8]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] rounded-full text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer border border-emerald-800"
                >
                  <Unlock className="w-4 h-4 text-[#DCC58F]" />
                  <span>Entrar no CRM</span>
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-[#E4DCC8] text-center">
              <span className="text-[11px] text-[#5B5A52]">
                Fisiolys Fisioterapia e Pilates • Altamira/PA • Dra. Elays Marinho
              </span>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI CHATBOT OVERLAY MODAL */}
      {isGeminiChatOpen && (
        <div className="fixed inset-0 z-50 bg-[#1B2E24]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] rounded-3xl w-full max-w-3xl h-[90vh] max-h-[850px] shadow-2xl border border-[#E4DCC8] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-3 bg-[#1B2E24] text-[#FAF7F0] flex items-center justify-between px-5 border-b border-emerald-800">
              <div className="flex items-center space-x-2.5">
                <Brain className="w-5 h-5 text-[#FDE68A]" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight font-serif text-[#FAF7F0]">Assistente IA Dra. Elays Marinho</h3>
                  <p className="text-[10px] text-emerald-300">Powered by Gemini com Pensamento Clínico Avançado</p>
                </div>
              </div>
              <button
                onClick={() => setIsGeminiChatOpen(false)}
                className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                title="Fechar Chatbot"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-3 sm:p-4">
              <GeminiChatbot className="h-full" />
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL SEARCH MODAL (Lupa de Busca) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        patients={patients}
        appointments={appointments}
        services={services}
        loyaltyMembers={loyaltyMembers}
        onNavigate={handleSearchNavigate}
      />

      {/* QUICK SETTINGS & PASSWORDS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        clinic={clinic}
      />

    </div>
  );
}
