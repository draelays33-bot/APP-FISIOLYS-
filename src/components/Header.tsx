import React, { useState, useEffect } from 'react';
import { AppView, ClinicConfig } from '../types';
import { UserCheck, Shield, Lock, Unlock, KeyRound, AlertCircle, X, Users, Sparkles, Printer } from 'lucide-react';
import { Logo } from './Logo';
import { DownloadAppQRSection } from './public/DownloadAppQRSection';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  clinic: ClinicConfig | null;
  isAdminAuthenticated: boolean;
  onAdminLoginSuccess: () => void;
  onAdminLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  clinic,
  isAdminAuthenticated,
  onAdminLoginSuccess,
  onAdminLogout,
}) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const ADMIN_PASSWORD = '011809';

  const handleAdminTabClick = () => {
    if (isAdminAuthenticated) {
      onViewChange('admin');
    } else {
      setEnteredPassword('');
      setPasswordError(null);
      setIsPasswordModalOpen(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPassword.trim() === ADMIN_PASSWORD) {
      setPasswordError(null);
      setIsPasswordModalOpen(false);
      onAdminLoginSuccess();
      onViewChange('admin');
    } else {
      setPasswordError('Senha incorreta! Acesso restrito à gestão da Dra. Elays Marinho.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#3D674C]/15 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Clinic Brand with Custom Logo */}
            <div className="flex items-center space-x-3">
              <Logo size="md" logoUrl={clinic?.logoUrl} />
              <span className="hidden lg:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#769E82]/10 text-[#31523D] border border-[#769E82]/30">
                Altamira/PA
              </span>
            </div>

            {/* View Switcher Controls & QR App Download */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden xl:block">
                <DownloadAppQRSection compact clinicName={clinic?.name} />
              </div>

              {/* Top Navigation Tabs */}
              <div className="bg-[#F4F7F4] p-1 rounded-xl flex items-center space-x-1 border border-[#C9D8CB]/80 overflow-x-auto max-w-full">
                
                {/* Tab 1: Agendamento do Paciente */}
                <button
                  id="btn-view-public"
                  onClick={() => onViewChange('public')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    currentView === 'public'
                      ? 'bg-white text-[#294232] shadow-xs font-bold border border-[#D0A73B]/30'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Agendamento de Consultas e Sessões do Paciente"
                >
                  <UserCheck className="w-4 h-4 text-[#5F6D33]" />
                  <span className="hidden sm:inline">Agendamento</span>
                  <span className="sm:hidden">Agendar</span>
                </button>

                {/* Tab 2: Serviços/Tratamentos */}
                <button
                  id="btn-view-services"
                  onClick={() => onViewChange('services')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    currentView === 'services'
                      ? 'bg-white text-[#294232] shadow-xs font-bold border border-[#D0A73B]/30'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Catálogo de Serviços e Tratamentos da Clínica"
                >
                  <Sparkles className="w-4 h-4 text-[#7E611D]" />
                  <span className="hidden sm:inline">Serviços/Tratamentos</span>
                  <span className="sm:hidden">Serviços</span>
                </button>

                {/* Tab 3: Gestão do Paciente */}
                <button
                  id="btn-view-patient-portal"
                  onClick={() => onViewChange('patient_portal')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    currentView === 'patient_portal'
                      ? 'bg-white text-[#294232] shadow-xs font-bold border border-[#D0A73B]/30'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Extrato de valores pagos em Fisioterapia e Pilates, frequência, check-in e recibos"
                >
                  <Users className="w-4 h-4 text-[#D0A73B]" />
                  <span className="hidden sm:inline">Gestão do Paciente</span>
                  <span className="sm:hidden">Gestão</span>
                </button>

                {/* Tab 4: Painel Gestor (Protected with Password 011809) */}
                <button
                  id="btn-view-admin"
                  onClick={handleAdminTabClick}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-[#31523D] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={isAdminAuthenticated ? "Painel de Gestão da Clínica" : "Área Restrita (Requer Senha)"}
                >
                  {isAdminAuthenticated ? (
                    <Shield className="w-4 h-4 text-[#D0A73B]" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span className="hidden sm:inline">Painel Gestor</span>
                  <span className="sm:hidden">Gestor</span>
                </button>

              </div>

              {/* Admin Logout / Lock Button if currently logged in */}
              {isAdminAuthenticated && currentView === 'admin' && (
                <button
                  onClick={onAdminLogout}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Bloquear Painel / Sair"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* ADMIN PASSWORD PROTECTION MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#D0A73B]/30 relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#31523D] text-[#D0A73B] border border-[#D0A73B]/40 flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Acesso Restrito • Painel Gestor
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Digite a senha de segurança da administração para acessar a agenda e configurações da <strong>Dra. Elays Marinho</strong>.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Senha do Gestor:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    autoFocus
                    placeholder="Digite a senha..."
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 tracking-widest focus:outline-hidden focus:ring-2 focus:ring-[#31523D] focus:border-[#31523D] transition-all"
                  />
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
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <Unlock className="w-4 h-4 text-[#D0A73B]" />
                  <span>Desbloquear Painel</span>
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400">
                Fisiolys Fisioterapia e Pilates • Altamira/PA
              </span>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
