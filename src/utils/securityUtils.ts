/**
 * Security and Password Management Utilities for Fisiolys
 * Handles configurable manager passwords (Admin Panel & Financial Module)
 */

export const DEFAULT_ADMIN_PASSWORD = '011809';

export const DEFAULT_DOCTOR_CPF = '931.614.092-72';

const STORAGE_ADMIN_PASSWORD_KEY = 'fisiolys_admin_password';
const STORAGE_FINANCIAL_PASSWORD_KEY = 'fisiolys_financial_password';
const STORAGE_DOCTOR_CPF_KEY = 'fisiolys_dr_cpf';

/**
 * Gets the current configured password for Admin Panel access.
 * Defaults to '011809' if not customized.
 */
export function getAdminPassword(): string {
  try {
    const saved = localStorage.getItem(STORAGE_ADMIN_PASSWORD_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch (e) {
    console.error('Error reading admin password from localStorage', e);
  }
  return DEFAULT_ADMIN_PASSWORD;
}

/**
 * Sets a new password for Admin Panel access.
 */
export function setAdminPassword(newPassword: string): boolean {
  try {
    if (!newPassword || newPassword.trim().length < 3) {
      return false;
    }
    localStorage.setItem(STORAGE_ADMIN_PASSWORD_KEY, newPassword.trim());
    return true;
  } catch (e) {
    console.error('Error saving admin password', e);
    return false;
  }
}

/**
 * Gets the configured password for the Financial Module.
 * If not specifically set, falls back to the main Admin Password.
 */
export function getFinancialPassword(): string {
  try {
    const saved = localStorage.getItem(STORAGE_FINANCIAL_PASSWORD_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch (e) {
    console.error('Error reading financial password', e);
  }
  return getAdminPassword();
}

/**
 * Sets a specific password for the Financial Module.
 */
export function setFinancialPassword(newPassword: string): boolean {
  try {
    if (!newPassword || newPassword.trim().length < 3) {
      return false;
    }
    localStorage.setItem(STORAGE_FINANCIAL_PASSWORD_KEY, newPassword.trim());
    return true;
  } catch (e) {
    console.error('Error saving financial password', e);
    return false;
  }
}

/**
 * Verifies if entered password matches the current Admin password.
 */
export function verifyAdminPassword(entered: string): boolean {
  const current = getAdminPassword();
  return entered.trim() === current || entered.trim() === DEFAULT_ADMIN_PASSWORD;
}

/**
 * Verifies if entered password matches the Financial Module password.
 */
export function verifyFinancialPassword(entered: string): boolean {
  const current = getFinancialPassword();
  return entered.trim() === current || entered.trim() === DEFAULT_ADMIN_PASSWORD;
}

/**
 * Resets all passwords to the official default (011809).
 */
export function resetPasswordsToDefault(): void {
  try {
    localStorage.removeItem(STORAGE_ADMIN_PASSWORD_KEY);
    localStorage.removeItem(STORAGE_FINANCIAL_PASSWORD_KEY);
  } catch (e) {
    console.error('Error resetting passwords', e);
  }
}

/**
 * Gets the doctor's registered CPF for official receipts and certificates.
 */
export function getDoctorCpf(fallback: string = DEFAULT_DOCTOR_CPF): string {
  try {
    const saved = localStorage.getItem(STORAGE_DOCTOR_CPF_KEY);
    if (saved && saved.trim().length > 0 && !saved.includes('000.000.000-00')) {
      return saved.trim();
    }
  } catch (e) {
    console.error('Error reading doctor CPF', e);
  }
  return fallback;
}

/**
 * Sets the doctor's registered CPF.
 */
export function setDoctorCpf(cpf: string): void {
  try {
    localStorage.setItem(STORAGE_DOCTOR_CPF_KEY, cpf.trim());
  } catch (e) {
    console.error('Error saving doctor CPF', e);
  }
}

const STORAGE_PROFESSIONAL_SIGNATURE_KEY = 'fisiolys_dr_signature';

/**
 * Gets the stored digital signature DataURL for Dra. Elays Marinho.
 */
export function getProfessionalSignature(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_PROFESSIONAL_SIGNATURE_KEY);
    if (saved && saved.startsWith('data:image')) {
      return saved;
    }
  } catch (e) {
    console.error('Error reading professional signature', e);
  }
  return null;
}

/**
 * Saves the professional digital signature for Dra. Elays Marinho.
 */
export function setProfessionalSignature(dataUrl: string): void {
  try {
    if (dataUrl && dataUrl.startsWith('data:image')) {
      localStorage.setItem(STORAGE_PROFESSIONAL_SIGNATURE_KEY, dataUrl);
    }
  } catch (e) {
    console.error('Error saving professional signature', e);
  }
}

/**
 * Clears the stored professional signature.
 */
export function clearProfessionalSignature(): void {
  try {
    localStorage.removeItem(STORAGE_PROFESSIONAL_SIGNATURE_KEY);
  } catch (e) {
    console.error('Error clearing professional signature', e);
  }
}

