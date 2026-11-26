import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';
import { z } from 'zod';

const API = 'https://gateway.apiserpro.serpro.gov.br';
const APP = `${API}/datavalid/v5/pessoa-fisica/app`;
const BASE_CONFIG = ['DATAVALID_CLIENT_ID', 'DATAVALID_CLIENT_SECRET', 'DATAVALID_CNPJ', 'DATAVALID_GCC_URL', 'DATAVALID_GCC_AUTH'];

export function datavalidAvailable() {
  return BASE_CONFIG.every((name) => Boolean(process.env[name])) && /^\d{14}$/.test(process.env.DATAVALID_CNPJ ?? '');
}

let cachedToken: { value: string; until: number } | undefined;
async function bearer() {
  if (cachedToken && cachedToken.until > Date.now()) return cachedToken.value;
  const credentials = Buffer.from(`${process.env.DATAVALID_CLIENT_ID}:${process.env.DATAVALID_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${API}/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials', redirect: 'error', signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) throw new Error('Autenticação Datavalid indisponível.');
  const data = z.object({ access_token: z.string().min(1), expires_in: z.coerce.number().positive() }).parse(await response.json());
  cachedToken = { value: data.access_token, until: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
  return data.access_token;
}

async function request(path: string, token: string, body?: object) {
  return fetch(`${APP}/${path}`, {
    ...(body && { method: 'POST', body: JSON.stringify(body) }),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    redirect: 'error', signal: AbortSignal.timeout(5000),
  });
}

export async function startDatavalid(cpf: string) {
  const gccUrl = new URL(process.env.DATAVALID_GCC_URL!);
  if (gccUrl.protocol !== 'https:') throw new Error('GCC deve usar HTTPS.');
  const [authorization, token] = await Promise.all([
    fetch(gccUrl, {
      method: 'POST', body: JSON.stringify({ cpf, purpose: 'id-marica-enrollment' }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DATAVALID_GCC_AUTH}` },
      redirect: 'error', signal: AbortSignal.timeout(5000),
    }),
    bearer(),
  ]);
  if (!authorization.ok) throw new Error('Autorização da GCC indisponível.');
  // O adaptador da GCC contratada entrega a autorização e o CNPJ nos campos da API Datavalid.
  const privacy = z.object({ token: z.string().min(1), cnpj_anuente: z.string().regex(/^\d{14}$/) }).parse(await authorization.json());
  const response = await request('pin', token, { cpf, tipo: 'FACIAL', expira_em: 10, qtd_tentativas: 3, privacidade: privacy });
  if (response.status === 422) return null;
  if (!response.ok) throw new Error('Não foi possível iniciar o Datavalid.');
  return z.object({ pin: z.string().regex(/^[A-Z0-9]{9}$/) }).parse(await response.json()).pin;
}

export async function verifyDatavalidToken(jws: string, jwks: Parameters<typeof createLocalJWKSet>[0], expected: { cpf: string; pin: string; started: string; audience: string }) {
  const { payload } = await jwtVerify(jws, createLocalJWKSet(jwks), {
    algorithms: ['RS512'], issuer: 'Datavalid', subject: expected.cpf, audience: expected.audience,
    requiredClaims: ['iat', 'nbf'], maxTokenAge: '15m', clockTolerance: 15,
  });
  return payload.pin === expected.pin && payload.selo_biometrico === 'A' &&
    typeof payload.face_similaridade === 'number' && payload.face_similaridade >= 0.85 && payload.face_similaridade <= 1 &&
    Number(payload.iat) >= Math.floor(new Date(expected.started).getTime() / 1000) - 15;
}

export async function datavalidResult(cpf: string, pin: string, started: string) {
  const token = await bearer();
  const response = await request('resultado', token, { cpf, pin });
  if ([404, 409, 422].includes(response.status)) return 'pending';
  if (!response.ok) throw new Error('Resultado Datavalid indisponível.');
  const data = z.object({ jws: z.string().min(1) }).parse(await response.json());
  const keys = await request('jwks', token);
  if (!keys.ok) throw new Error('Chaves Datavalid indisponíveis.');
  const valid = await verifyDatavalidToken(data.jws, await keys.json() as JSONWebKeySet, { cpf, pin, started, audience: process.env.DATAVALID_CNPJ! });
  return valid ? 'verified' : 'rejected';
}
