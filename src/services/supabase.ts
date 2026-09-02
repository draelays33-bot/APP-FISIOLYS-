import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Patient, Appointment, Service, LoyaltyMember, CrmLead, CrmAvaliacao } from '../types';

// Detect Supabase environment variables from client-side Vite or Node runtime
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 
                    (import.meta as any).env?.SUPABASE_URL ||
                    (typeof process !== 'undefined' ? process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL : '') || '';

const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
                         (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
                         (import.meta as any).env?.SUPABASE_ANON_KEY ||
                         (import.meta as any).env?.SUPABASE_SECRET_KEY ||
                         (typeof process !== 'undefined' ? 
                            process.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
                            process.env?.SUPABASE_ANON_KEY || 
                            process.env?.VITE_SUPABASE_ANON_KEY || 
                            process.env?.SUPABASE_SECRET_KEY ||
                            process.env?.SUPABASE_SERVICE_ROLE_KEY : '') || '';

export const ADMIN_EMAIL = (import.meta as any).env?.VITE_ADMIN_EMAIL ||
                           (import.meta as any).env?.ADMIN_EMAIL ||
                           (typeof process !== 'undefined' ? process.env?.ADMIN_EMAIL || process.env?.VITE_ADMIN_EMAIL : '') || 
                           'dra.elays33@gmail.com';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  if (supabaseUrl && supabaseAnonKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
      return supabaseInstance;
    } catch (e) {
      console.warn('[Supabase] Failed to initialize Supabase client:', e);
    }
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
}

export function getSupabaseConfigInfo() {
  return {
    isConfigured: isSupabaseConfigured(),
    url: supabaseUrl ? `${supabaseUrl.slice(0, 18)}...` : 'Não configurado (Usando persistência local/Vercel)',
    tables: ['patients', 'appointments', 'services', 'loyalty_members', 'crm_leads', 'crm_avaliacoes'],
    status: isSupabaseConfigured() ? 'conectado' : 'local_ativo'
  };
}

/**
 * SQL Script to generate all tables in Supabase / Vercel Postgres
 */
export function getSupabaseMigrationSQL(): string {
  return `-- =========================================================================
-- SCHEMA COMPLETO FISIOLYS PARA SUPABASE & VERCEL POSTGRES
-- Inclui suporte a Categorias de Pacientes, Tags de Cores e Reagendamento
-- =========================================================================

-- 1. TABELA DE PACIENTES COM CATEGORIAS, TAGS E TRANCAMENTO DE SESSÕES
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    birth_date DATE,
    rg TEXT,
    gender TEXT,
    profession TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    guardian_name TEXT,
    health_insurance TEXT,
    address TEXT,
    city TEXT DEFAULT 'Altamira - PA',
    category TEXT DEFAULT 'fisioterapia',      -- 'pilates', 'fisioterapia', 'pelvica', 'fidelidade', 'aba', 'massoterapia', 'pos_operatorio', 'outros'
    color_tag TEXT DEFAULT 'emerald',          -- 'purple', 'emerald', 'rose', 'amber', 'blue', 'sky', 'orange', 'red'
    tags TEXT[] DEFAULT '{}',                  -- Array de tags personalizadas (ex: ['Postura', 'Gestante', 'VIP'])
    status_tag TEXT DEFAULT 'Ativo',
    is_locked BOOLEAN DEFAULT false,           -- Trancamento / Congelamento de sessões
    lock_start_date DATE,                      -- Data de início do trancamento
    lock_end_date DATE,                        -- Data prevista de retorno
    lock_reason TEXT,                          -- Motivo do trancamento
    lock_notes TEXT,                           -- Observações do trancamento
    locked_at TIMESTAMP WITH TIME ZONE,
    first_session_date DATE,
    last_session_date DATE,
    total_sessions INTEGER DEFAULT 0,
    total_faltas INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE AGENDAMENTOS (SUPORTE A REAGENDAMENTO E CHECK-IN)
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_email TEXT,
    patient_cpf TEXT,
    patient_birth_date DATE,
    patient_address TEXT,
    patient_city TEXT,
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_price NUMERIC(10, 2) NOT NULL,
    duration_minutes INTEGER DEFAULT 50,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    frequency_type TEXT DEFAULT 'sessao_unica',
    status TEXT DEFAULT 'agendado',            -- 'agendado', 'confirmado', 'concluido', 'falta', 'cancelado', 'reagendado'
    attendance_status TEXT DEFAULT 'pendente', -- 'pendente', 'presenca', 'falta'
    attendance_notes TEXT,
    payment_method TEXT DEFAULT 'pix',
    checked_in_at TIMESTAMP WITH TIME ZONE,
    check_in_method TEXT,
    notes TEXT,
    webhook_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE SERVIÇOS & PLANOS
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL,                    -- 'pilates', 'fisioterapia', 'massoterapia', 'aba', 'outros'
    active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DO CLUBE DE FIDELIDADE FISIOLYS (R$ 99/MÊS)
CREATE TABLE IF NOT EXISTS public.loyalty_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    cpf TEXT,
    plan_name TEXT DEFAULT 'Clube Fisiolys Bem-Estar',
    monthly_fee NUMERIC(10, 2) DEFAULT 99.00,
    status TEXT DEFAULT 'ativo',               -- 'ativo', 'pausado', 'inadimplente', 'cancelado'
    joined_date DATE NOT NULL,
    accumulated_balance NUMERIC(10, 2) DEFAULT 0.00,
    total_spent NUMERIC(10, 2) DEFAULT 0.00,
    beneficiaries JSONB DEFAULT '[]'::jsonb,
    payments JSONB DEFAULT '[]'::jsonb,
    overdue_months TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. POLÍTICAS DE ACESSO (ROW LEVEL SECURITY)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público e autenticado aos dados da clínica" 
ON public.patients FOR ALL USING (true);

CREATE POLICY "Acesso público e autenticado aos agendamentos" 
ON public.appointments FOR ALL USING (true);

CREATE POLICY "Acesso público e autenticado aos serviços" 
ON public.services FOR ALL USING (true);

CREATE POLICY "Acesso público e autenticado ao clube fidelidade" 
ON public.loyalty_members FOR ALL USING (true);
`;
}

/**
 * Synchronize all patients to Supabase
 */
export async function syncPatientsToSupabase(patients: Patient[]): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: true, count: patients.length }; // Stored locally
  }

  try {
    const formatted = patients.map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email || null,
      cpf: p.cpf || null,
      birth_date: p.birthDate || null,
      rg: p.rg || null,
      gender: p.gender || null,
      profession: p.profession || null,
      emergency_contact: p.emergencyContact || null,
      emergency_phone: p.emergencyPhone || null,
      guardian_name: p.guardianName || null,
      health_insurance: p.healthInsurance || null,
      address: p.address || null,
      city: p.city || 'Altamira - PA',
      category: p.category || 'fisioterapia',
      color_tag: p.colorTag || 'emerald',
      tags: p.tags || [],
      status_tag: p.statusTag || 'Ativo',
      is_locked: Boolean(p.isLocked),
      lock_start_date: p.lockStartDate || null,
      lock_end_date: p.lockEndDate || null,
      lock_reason: p.lockReason || null,
      lock_notes: p.lockNotes || null,
      locked_at: p.lockedAt || null,
      first_session_date: p.firstSessionDate || null,
      last_session_date: p.lastSessionDate || null,
      total_sessions: p.totalSessions || 0,
      total_faltas: p.totalFaltas || 0,
      notes: p.notes || null,
      created_at: p.createdAt || new Date().toISOString()
    }));

    const { error } = await client.from('patients').upsert(formatted, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Patient upsert warning:', error.message);
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: formatted.length };
  } catch (err: any) {
    console.warn('[Supabase] Sync patients error:', err);
    return { success: false, count: 0, error: err?.message || 'Erro de sincronização' };
  }
}

/**
 * Synchronize single patient update
 */
export async function syncPatientToSupabase(patient: Patient): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const payload = {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email || null,
      cpf: patient.cpf || null,
      birth_date: patient.birthDate || null,
      rg: patient.rg || null,
      gender: patient.gender || null,
      profession: patient.profession || null,
      emergency_contact: patient.emergencyContact || null,
      emergency_phone: patient.emergencyPhone || null,
      guardian_name: patient.guardianName || null,
      health_insurance: patient.healthInsurance || null,
      address: patient.address || null,
      city: patient.city || 'Altamira - PA',
      category: patient.category || 'fisioterapia',
      color_tag: patient.colorTag || 'emerald',
      tags: patient.tags || [],
      status_tag: patient.statusTag || 'Ativo',
      is_locked: Boolean(patient.isLocked),
      lock_start_date: patient.lockStartDate || null,
      lock_end_date: patient.lockEndDate || null,
      lock_reason: patient.lockReason || null,
      lock_notes: patient.lockNotes || null,
      locked_at: patient.lockedAt || null,
      first_session_date: patient.firstSessionDate || null,
      last_session_date: patient.lastSessionDate || null,
      total_sessions: patient.totalSessions || 0,
      total_faltas: patient.totalFaltas || 0,
      notes: patient.notes || null
    };

    const { error } = await client.from('patients').upsert([payload], { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Single patient sync warning:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Exception syncing patient:', e);
    return false;
  }
}

/**
 * Synchronize appointment (including reschedule and attendance changes)
 */
export async function syncAppointmentToSupabase(appt: Appointment): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const payload = {
      id: appt.id,
      patient_name: appt.patientName,
      patient_phone: appt.patientPhone,
      patient_email: appt.patientEmail || null,
      patient_cpf: appt.patientCpf || null,
      service_id: appt.serviceId,
      service_name: appt.serviceName,
      service_price: appt.servicePrice,
      duration_minutes: appt.durationMinutes || 50,
      date: appt.date,
      time: appt.time,
      status: appt.status,
      attendance_status: appt.attendanceStatus || 'pendente',
      attendance_notes: appt.attendanceNotes || null,
      payment_method: appt.paymentMethod || 'pix',
      checked_in_at: appt.checkedInAt || null,
      check_in_method: appt.checkInMethod || null,
      notes: appt.notes || null
    };

    const { error } = await client.from('appointments').upsert([payload], { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Appointment sync warning:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Exception syncing appointment:', e);
    return false;
  }
}
