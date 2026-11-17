/**
 * Identité du coach dans ce navigateur : il retrouve son club en revenant. En pair-à-pair, un secret
 * l'accompagne : l'hôte n'en garde que l'empreinte et refuse quiconque prétend être ce coach sans lui (MULTI-14).
 */
import { randomHex } from '../../server/secure';

const COACH_ID_KEY = 'nmjsc-coach-id';
const SECRET_KEY = 'nmjsc-coach-secret';
const PROFILE_KEY = 'nmjsc-coach-profile';

export interface CoachProfile {
  name: string;
  clubName: string;
}

/** Sans stockage (navigation privée stricte) : identité le temps de la session. */
const memory = new Map<string, string>();

function readOrCreate(key: string, create: () => string): string {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = create();
    localStorage.setItem(key, created);
    return created;
  } catch {
    if (!memory.has(key)) memory.set(key, create());
    return memory.get(key)!;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

export function localCoachId(): string {
  return readOrCreate(COACH_ID_KEY, () => `coach-${randomHex(16)}`);
}

export function localCoachSecret(): string {
  return readOrCreate(SECRET_KEY, () => randomHex(32));
}

/** Code de reprise accepté (C10) : ce navigateur devient celui du coach. */
export function adoptIdentity(identity: { coachId: string; name: string; clubName: string; secret?: string }): void {
  write(COACH_ID_KEY, identity.coachId);
  if (identity.secret) write(SECRET_KEY, identity.secret);
  saveProfile({ name: identity.name, clubName: identity.clubName });
}

export function savedProfile(): CoachProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as CoachProfile;
  } catch {
    // Profil illisible : on repart de zéro.
  }
  return { name: '', clubName: '' };
}

export function saveProfile(profile: CoachProfile): void {
  write(PROFILE_KEY, JSON.stringify(profile));
}
