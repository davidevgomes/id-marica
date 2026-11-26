import type { BeneficiaryRecord } from '../types/integra';

export type DwellingHolder = { kind: 'SELF' } | { kind: 'OTHER'; name: string; cpf: string; relationship: string };
export interface EmploymentEntry { employer: string; role: string; startDate: string; endDate: string }
export interface EducationEntry { institution: string; course: string; startDate: string; endDate: string }

export interface CitizenProfile extends BeneficiaryRecord {
  dwellingType: 'CASA' | 'APARTAMENTO';
  dwellingHolder: DwellingHolder;
  employmentHistory: EmploymentEntry[];
  academicHistory: EducationEntry[];
  rentalContractName: string | null;
}

export interface CitizenAccount {
  profile: CitizenProfile;
  revision: number;
}

export class CitizenRequestError extends Error {
  constructor(message: string, publicStatus: number) {
    super(message);
    this.status = publicStatus;
  }

  readonly status: number;
}

export function citizenApiUrl(action: string) {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  return new URL(`api/cidadao?action=${encodeURIComponent(action)}`, base).href;
}

export function citizenAreaUrl() {
  return `${window.location.pathname}?area=municipe`;
}

export async function citizenRequest<T>(action: string, body?: object): Promise<T> {
  const response = await fetch(citizenApiUrl(action), {
    cache: 'no-store',
    ...(body && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new CitizenRequestError(data?.message || 'O cadastro está temporariamente indisponível.', response.status);
  }
  return data;
}
