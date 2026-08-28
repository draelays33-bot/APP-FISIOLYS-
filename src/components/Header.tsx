import React, { useState, useEffect } from 'react';
import { AppView, ClinicConfig } from '../types';
import { UserCheck, Shield, Lock, Unlock, KeyRound, AlertCircle, X, Users, Sparkles, Search, Settings, Menu, Brain, Bot, LayoutDashboard, Eye, EyeOff, FileText, ClipboardList, FolderHeart, Calendar as CalendarIcon, Gift, MapPin } from 'lucide-react';
import { Logo } from './Logo';
import { verifyAdminPassword } from '../utils/securityUtils';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  clinic: ClinicConfig | null;
  isAdminAuthenticated: boolean;
  onAdminLoginSuccess: () => void;
  onAdminLogout: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenGeminiChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  clinic,
  isAdminAuthenticated,
  onAdminLoginSuccess,
  onAdminLogout,
  onOpenSearch,
  onOpenSettings,
  onOpenGeminiChat,
}) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [targetViewAfterAuth, setTargetViewAfterAuth] = useState<AppView>('admin');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleAdminTabClick = () => {
    if (isAdminAuthenticated) {
      onViewChange('admin');
      setIsMobileMenuOpen(false);
    } else {
      setTargetViewAfterAuth('admin');
      setEnteredPassword('');
      setShowPassword(false);
      setPasswordError(null);
      setIsPasswordModalOpen(true);
      setIsMobileMenuOpen(false);
    }
  };

  const handleCrmClick = () => {
    if (isAdminAuthenticated) {
      onViewChange('crm');
      setIsMobileMenuOpen(false);
    } else {
      setTargetViewAfterAuth('crm');
      setEnteredPassword('');
      setShowPassword(false);
      setPasswordError(null);
      setIsPasswordModalOpen(true);
      setIsMobileMenuOpen(false);
    }
  };

  const handleSelectView = (view: AppView) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(enteredPassword)) {
      setPasswordError(null);
      setIsPasswordModalOpen(false);
      onAdminLoginSuccess();
      onViewChange(targetViewAfterAuth || 'admin');
    } else {
      setPasswordError('Senha incorreta! Por favor, digite a senha master da Dra. Elays (011809).');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FAF7F0]/95 backdrop-blur-md border-b border-[#E4DCC8] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Clinic Brand with Logo */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0 cursor-pointer" onClick={() => handleSelectView('public')}>
              <Logo size="md" logoUrl={clinic?.logoUrl} />
              <span className="hidden xl:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCC58F]/25 text-[#1B2E24] border border-[#B08A3E]/30">
                Altamira/PA
              </span>
            </div>

            {/* Middle Quick Universal Search Bar (Desktop) */}
            {onOpenSearch && (
              <div className="hidden lg:flex items-center flex-1 max-w-xs xl:max-w-sm mx-2">
                <button
                  id="btn-header-search-bar"
                  onClick={onOpenSearch}
                  className="w-full flex items-center justify-between px-3.5 py-2 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#5B5A52] hover:text-[#26241F] rounded-full border border-[#E4DCC8] text-xs font-medium transition-all cursor-pointer shadow-2xs group"
                  title="Pesquisar no App (Pacientes, Horários, Serviços, Planos e Recibos)"
                >
                  <div className="flex items-center space-x-2">
                    <Search className="w-3.5 h-3.5 text-[#B08A3E] group-hover:scale-110 transition-transform" />
                    <span>Buscar no app...</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#FAF7F0] text-[#5B5A52] rounded border border-[#E4DCC8]">
                    ⌘K
                  </span>
                </button>
              </div>
            )}

            {/* Desktop Navigation Tabs (Visible >= 860px) */}
            <div className="hidden min-[860px]:flex items-center space-x-3 shrink-0">
              
              {/* Desktop Clean Editorial Navigation */}
              <nav aria-label="Menu Principal" className="flex items-center space-x-4 mr-1">
                
                {/* 1. Início */}
                <button
                  id="btn-nav-inicio"
                  onClick={() => {
                    if (currentView !== 'public') {
                      onViewChange('public');
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`text-xs sm:text-[13px] tracking-tight transition-all shrink-0 cursor-pointer ${
                    currentView === 'public'
                      ? 'font-bold text-[#1B2E24]'
                      : 'text-[#6E6A5E] hover:text-[#1B2E24] font-medium'
                  }`}
                  title="Página Inicial da Fisiolys"
                >
                  Início
                </button>

                {/* 2. Agendar Atendimento */}
                <button
                  id="btn-view-public"
                  onClick={() => {
                    if (currentView !== 'public') {
                      onViewChange('public');
                    }
                    setTimeout(() => {
                      const el = document.getElementById('agendamento') || document.getElementById('booking-form');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                      else window.scrollTo({ top: 350, behavior: 'smooth' });
                    }, 50);
                  }}
                  className="text-xs sm:text-[13px] tracking-tight text-[#6E6A5E] hover:text-[#1B2E24] font-medium transition-all shrink-0 cursor-pointer"
                  title="Agendamento Online de Consultas e Sessões"
                >
                  Agendar Atendimento
                </button>

                {/* 3. Serviços & Tratamentos */}
                <button
                  id="btn-view-services"
                  onClick={() => {
                    if (currentView !== 'public') {
                      onViewChange('public');
                    }
                    setTimeout(() => {
                      const el = document.getElementById('servicos');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className="text-xs sm:text-[13px] tracking-tight text-[#6E6A5E] hover:text-[#1B2E24] font-medium transition-all shrink-0 cursor-pointer"
                  title="Serviços e Especialidades Clínicas"
                >
                  Serviços & Tratamentos
                </button>

                {/* 4. Planos & Clube */}
                <button
                  id="btn-view-plans"
                  onClick={() => {
                    if (currentView !== 'public') {
                      onViewChange('public');
                    }
                    setTimeout(() => {
                      const el = document.getElementById('promocoes') || document.getElementById('fidelidade');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className="text-xs sm:text-[13px] tracking-tight text-[#6E6A5E] hover:text-[#1B2E24] font-medium transition-all shrink-0 cursor-pointer"
                  title="Planos Mensais e Clube Fidelidade R$ 99"
                >
                  Planos & Clube
                </button>

                {/* 5. Localização */}
                <button
                  id="btn-view-location"
                  onClick={() => {
                    if (currentView !== 'public') {
                      onViewChange('public');
                    }
                    setTimeout(() => {
                      const el = document.getElementById('localizacao');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className="text-xs sm:text-[13px] tracking-tight text-[#6E6A5E] hover:text-[#1B2E24] font-medium transition-all shrink-0 cursor-pointer"
                  title="Localização e Endereço da Clínica"
                >
                  Localização
                </button>

              </nav>

              {/* ÁREA DA DRA. ELAYS / PAINEL INTERNO (Next to search) */}
              <button
                id="btn-view-admin"
                onClick={handleAdminTabClick}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                  currentView === 'admin' || currentView === 'crm'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#DCC58F] ring-2 ring-[#DCC58F]/40'
                    : 'bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] border-[#1B2E24]'
                }`}
                title={isAdminAuthenticated ? "Painel Interno de Gestão da Dra. Elays" : "Área Restrita da Dra. Elays (Senha: 011809)"}
              >
                <Shield className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Área da Dra. Elays</span>
                {!isAdminAuthenticated ? (
                  <Lock className="w-3 h-3 text-[#DCC58F] ml-0.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                )}
              </button>

              {/* Quick Search Button (Desktop) */}
              {onOpenSearch && (
                <button
                  id="btn-header-search"
                  onClick={onOpenSearch}
                  className="p-2 rounded-full bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] border border-[#E4DCC8] transition-all cursor-pointer"
                  title="Buscar no app (⌘K)"
                >
                  <Search className="w-4 h-4 text-[#1B2E24]" />
                </button>
              )}

              {/* Quick Settings & Passwords Button */}
              {onOpenSettings && (
                <button
                  id="btn-header-settings"
                  onClick={onOpenSettings}
                  className="p-2 rounded-full bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] border border-[#E4DCC8] transition-all cursor-pointer"
                  title="Configurações & Alteração de Senhas"
                >
                  <Settings className="w-4 h-4 text-[#5B5A52]" />
                </button>
              )}

              {/* Admin Logout / Lock Button if currently logged in */}
              {isAdminAuthenticated && (currentView === 'admin' || currentView === 'crm') && (
                <button
                  onClick={onAdminLogout}
                  className="p-2 text-[#5B5A52] hover:text-rose-700 rounded-full hover:bg-[#F3EEE2] transition-colors cursor-pointer"
                  title="Bloquear Painel / Sair"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}

            </div>

            {/* Mobile / Tablet (<860px) Controls & Hamburger Trigger */}
            <div className="flex min-[860px]:hidden items-center space-x-2 shrink-0">
              
              {/* Mobile / Tablet Área Dra. Elays Button */}
              <button
                id="btn-mobile-admin"
                onClick={handleAdminTabClick}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                  currentView === 'admin' || currentView === 'crm'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] border-[#DCC58F] ring-2 ring-[#DCC58F]/40'
                    : 'bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] border-[#1B2E24]'
                }`}
                title={isAdminAuthenticated ? "Painel Interno de Gestão da Dra. Elays" : "Área Restrita da Dra. Elays (Senha: 011809)"}
              >
                <Shield className="w-3.5 h-3.5 text-[#DCC58F]" />
                <span>Área Dra. Elays</span>
                {!isAdminAuthenticated ? (
                  <Lock className="w-2.5 h-2.5 text-[#DCC58F]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                )}
              </button>

              {onOpenSearch && (
                <button
                  id="btn-mobile-search"
                  onClick={onOpenSearch}
                  className="p-2 rounded-full bg-[#F3EEE2] text-[#1B2E24] border border-[#E4DCC8] hover:bg-[#ECE4D3] transition-all cursor-pointer"
                  title="Buscar no app"
                >
                  <Search className="w-4 h-4 text-[#1B2E24]" />
                </button>
              )}

              {onOpenSettings && (
                <button
                  id="btn-mobile-settings"
                  onClick={onOpenSettings}
                  className="p-2 rounded-full bg-[#F3EEE2] text-[#1B2E24] border border-[#E4DCC8] hover:bg-[#ECE4D3] transition-all cursor-pointer"
                  title="Configurações"
                >
                  <Settings className="w-4 h-4 text-[#5B5A52]" />
                </button>
              )}

              <button
                id="btn-mobile-menu-toggle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 rounded-full bg-[#1B2E24] text-[#FAF7F0] hover:bg-[#22392C] transition-all cursor-pointer shadow-xs flex items-center justify-center"
                aria-label="Abrir Menu de Navegação"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile / Tablet Collapsible Menu (<860px) */}
        {isMobileMenuOpen && (
          <div className="min-[860px]:hidden bg-[#FAF7F0] border-b border-[#E4DCC8] shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
              
              {/* 1. Início */}
              <button
                onClick={() => {
                  handleSelectView('public');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'public'
                    ? 'bg-[#1B2E24] text-[#FAF7F0]'
                    : 'text-[#26241F] hover:bg-[#F3EEE2]'
                }`}
              >
                <UserCheck className="w-4 h-4 text-[#DCC58F]" />
                <span>Início</span>
              </button>

              {/* 2. Agendar Atendimento */}
              <button
                onClick={() => {
                  handleSelectView('public');
                  setTimeout(() => {
                    const el = document.getElementById('agendamento') || document.getElementById('booking-form');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else window.scrollTo({ top: 350, behavior: 'smooth' });
                  }, 100);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#26241F] hover:bg-[#F3EEE2] transition-all cursor-pointer"
              >
                <CalendarIcon className="w-4 h-4 text-[#B08A3E]" />
                <span>Agendar Atendimento</span>
              </button>

              {/* 3. Serviços & Tratamentos */}
              <button
                onClick={() => {
                  handleSelectView('public');
                  setTimeout(() => {
                    const el = document.getElementById('servicos');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#26241F] hover:bg-[#F3EEE2] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#B08A3E]" />
                <span>Serviços & Tratamentos</span>
              </button>

              {/* 4. Planos & Clube */}
              <button
                onClick={() => {
                  handleSelectView('public');
                  setTimeout(() => {
                    const el = document.getElementById('promocoes') || document.getElementById('fidelidade');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#26241F] hover:bg-[#F3EEE2] transition-all cursor-pointer"
              >
                <Gift className="w-4 h-4 text-[#B08A3E]" />
                <span>Planos & Clube Fidelidade</span>
              </button>

              {/* 5. Localização */}
              <button
                onClick={() => {
                  handleSelectView('public');
                  setTimeout(() => {
                    const el = document.getElementById('localizacao');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#26241F] hover:bg-[#F3EEE2] transition-all cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#B08A3E]" />
                <span>Localização & Endereço</span>
              </button>

              {/* 6. PRONTUÁRIO DO PACIENTE (CPF AUTH) */}
              <button
                id="btn-menu-prontuario-paciente"
                onClick={() => handleSelectView('patient_portal')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'patient_portal'
                    ? 'bg-[#1B2E24] text-[#DCC58F] shadow-sm'
                    : 'text-[#26241F] hover:bg-[#F3EEE2]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ClipboardList className="w-4 h-4 text-[#DCC58F]" />
                  <div className="text-left">
                    <span className="font-bold block">Prontuário do Paciente</span>
                    <span className="text-[10px] text-[#736B5E] block">Evoluções, Ficha, Contratos & Recibos</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-[#DCC58F]/30 text-[#1B2E24] px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0 ml-2">
                  <Lock className="w-2.5 h-2.5" />
                  <span>CPF</span>
                </span>
              </button>

              {/* 7. ÁREA DA DRA. ELAYS / PAINEL INTERNO */}
              <button
                onClick={handleAdminTabClick}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'admin' || currentView === 'crm'
                    ? 'bg-[#1B2E24] text-[#DCC58F]'
                    : 'bg-[#1B2E24] text-[#FAF7F0] hover:bg-[#22392C]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4 text-[#DCC58F]" />
                  <div className="text-left">
                    <span className="font-bold block">Área da Dra. Elays</span>
                    <span className="text-[10px] text-[#DCC58F]/80 block">Agenda, Prontuário, Financeiro, Serviços & CRM</span>
                  </div>
                </div>
                {!isAdminAuthenticated ? (
                  <span className="text-[10px] font-bold bg-[#DCC58F]/30 text-[#1B2E24] px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0 ml-2">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Senha</span>
                  </span>
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                )}
              </button>

            </div>
          </div>
        )}
      </header>

      {/* PASSWORD PROTECTION MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1B2E24]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F0] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#E4DCC8] relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-[#5B5A52] hover:text-[#26241F] p-1.5 rounded-full hover:bg-[#F3EEE2] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1B2E24] text-[#DCC58F] border border-[#B08A3E]/40 flex items-center justify-center mx-auto shadow-md">
                <Shield className="w-7 h-7 text-[#DCC58F]" />
              </div>

              <div>
                <h3 className="text-lg font-serif font-bold text-[#1B2E24] tracking-tight">
                  Área Restrita da Dra. Elays
                </h3>
                <p className="text-xs text-[#5B5A52] mt-1">
                  Ambiente seguro e sigiloso. Digite a senha master da Dra. Elays para acessar os módulos de Agenda, Prontuário, Financeiro, Serviços e CRM.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#26241F] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Senha Master de Acesso:</span>
                  <span className="text-[11px] font-normal text-[#848278]">(Padrão: 011809)</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#5B5A52] absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    placeholder="Digite a senha master..."
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F3EEE2] border border-[#E4DCC8] rounded-xl text-sm font-bold text-[#26241F] tracking-widest focus:outline-hidden focus:ring-2 focus:ring-[#B08A3E] focus:border-[#B08A3E] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 text-[#5B5A52] hover:text-[#1B2E24] transition-colors cursor-pointer"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="w-1/3 py-2.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#26241F] rounded-full text-xs font-semibold transition-all cursor-pointer border border-[#E4DCC8]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] rounded-full text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer border border-emerald-800"
                >
                  <Unlock className="w-4 h-4 text-[#DCC58F]" />
                  <span>Acessar Painel</span>
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
    </>
  );
};

