import React, { useState, useEffect, useCallback } from 'react';
import { AppView, ClinicConfig, Service, ScheduleConfig, Appointment, Patient } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { PublicBooking } from './components/public/PublicBooking';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('public');

  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [clinicRes, servicesRes, scheduleRes, apptsRes, patientsRes] = await Promise.all([
        api.getClinic(),
        api.getServices(),
        api.getScheduleConfig(),
        api.getAppointments(),
        api.getPatients(),
      ]);

      setClinic(clinicRes);
      setServices(servicesRes);
      setSchedule(scheduleRes);
      setAppointments(apptsRes);
      setPatients(patientsRes);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8F3] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-[#31523D] text-[#D0A73B] border border-[#D0A73B]/30 flex items-center justify-center shadow-md animate-bounce mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="flex items-center space-x-2 text-[#31523D] font-bold text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-[#5F6D33]" />
          <span>Carregando Fisiolys Fisioterapia e Pilates...</span>
        </div>
      </div>
    );
  }

  if (error || !clinic || !schedule) {
    return (
      <div className="min-h-screen bg-[#F7F8F3] flex flex-col items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-2xl p-6 shadow-sm border border-[#C9D8CB] text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Falha ao Conectar</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">{error || "Não foi possível carregar a configuração inicial."}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-[#31523D] hover:bg-[#23372B] text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F3] text-slate-800 font-sans antialiased selection:bg-[#F5EED3] selection:text-[#7E611D]">
      
      {/* Top Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        clinic={clinic}
      />

      {/* Main View Area */}
      <main>
        {currentView === 'public' ? (
          <PublicBooking
            clinic={clinic}
            services={services}
            onBookingSuccess={loadData}
          />
        ) : (
          <AdminDashboard
            clinic={clinic}
            services={services}
            schedule={schedule}
            appointments={appointments}
            patients={patients}
            onReload={loadData}
          />
        )}
      </main>

    </div>
  );
}
