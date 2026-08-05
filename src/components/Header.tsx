import React from 'react';
import { AppView, ClinicConfig } from '../types';
import { UserCheck, Shield } from 'lucide-react';
import { Logo } from './Logo';
import { DownloadAppQRSection } from './public/DownloadAppQRSection';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  clinic: ClinicConfig | null;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, clinic }) => {
  return (
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
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block">
              <DownloadAppQRSection compact clinicName={clinic?.name} />
            </div>

            <div className="bg-[#F4F7F4] p-1 rounded-xl flex items-center border border-[#C9D8CB]/80">
              <button
                id="btn-view-public"
                onClick={() => onViewChange('public')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'public'
                    ? 'bg-white text-[#294232] shadow-xs font-bold border border-[#D0A73B]/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 text-[#5F6D33]" />
                <span>Agendamento Paciente</span>
              </button>

              <button
                id="btn-view-admin"
                onClick={() => onViewChange('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'admin'
                    ? 'bg-[#31523D] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4 text-[#D0A73B]" />
                <span>Painel Gestor</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};


