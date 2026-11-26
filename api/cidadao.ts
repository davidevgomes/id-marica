import { createHmac } from 'node:crypto';
import type { ApiRequest, ApiResponse } from '../server/http.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { datavalidAvailable, datavalidResult, startDatavalid } from '../server/datavalid.js';
import { citizenProfileSchema } from '../server/citizenSchema.js';
import { CONTRACT_LIMIT, MIN_CITIZEN_PASSWORD, cpfDigits, isCpfValid } from '../src/data/citizenValidation.js';

const COOKIE = '__Host-id-marica-session';
const PROOF_COOKIE = '__Host-id-marica-proof';
const authOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

function sessionCookie(token = '', seconds = 0) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}

function failure(res: ApiResponse, status: number, message: string) {
  return res.status(status).json({ message });
}

async function rateLimited(admin: SupabaseClient, key: string, max: number) {
  const { data, error } = await admin.rpc('citizen_rate_limit', { bucket_key: key, max_attempts: max });
  if (error) throw error;
  return data !== true;
}

function readContract(input: unknown) {
  if (!input || typeof input !== 'object' || !('name' in input) || !('data' in input)) return;
  const { name, data } = input;
  if (typeof name !== 'string' || name.length > 180 || !/\.pdf$/i.test(name) ||
      typeof data !== 'string' || data.length > Math.ceil(CONTRACT_LIMIT / 3) * 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return;
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length > CONTRACT_LIMIT || bytes.toString('base64') !== data ||
      bytes.subarray(0, 5).toString('ascii') !== '%PDF-') return;
  return { name, data };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const url = process.env.SUPABASE_URL;
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const cpfSecret = process.env.ID_MARICA_CPF_SECRET;
  if (!url || !publishable || !secretKey || !cpfSecret || cpfSecret.length < 32) {
    return failure(res, 503, 'O cadastro está temporariamente indisponível.');
  }

  const hash = (value: string) => createHmac('sha256', cpfSecret).update(value).digest('hex');
  const emailFor = (cpf: string) => `cpf-${hash('cpf:' + cpfDigits(cpf)).slice(0, 48)}@contas.idmarica.invalid`;
  const action = req.query.action;
  const admin = createClient(url, secretKey, authOptions);
  const auth = createClient(url, publishable, authOptions);
  const token = req.cookies[COOKIE];

  try {
    if (req.method === 'GET' && (action === 'perfil' || action === 'contrato')) {
      const { data: identity } = token ? await auth.auth.getUser(token) : { data: { user: null } };
      if (!identity.user?.email?.endsWith('@contas.idmarica.invalid')) {
        return failure(res, 401, 'Entre com CPF e senha para continuar.');
      }
      if (action === 'contrato') {
        const { data, error } = await admin.from('citizen_profiles').select('contract_pdf')
          .eq('user_id', identity.user.id).maybeSingle();
        if (error) throw error;
        if (!data?.contract_pdf) return failure(res, 404, 'Contrato indisponível.');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="contrato-de-aluguel.pdf"');
        return res.status(200).send(Buffer.from(data.contract_pdf, 'base64'));
      }

      const { data, error } = await admin.from('citizen_profiles').select('profile, revision')
        .eq('user_id', identity.user.id).maybeSingle();
      if (error) throw error;
      return data ? res.status(200).json(data) : failure(res, 404, 'Cadastro ainda não concluído.');
    }

    if (req.method !== 'POST') return failure(res, 405, 'Método indisponível.');
    if (req.headers.origin !== `https://${req.headers.host}` ||
        !req.headers['content-type']?.startsWith('application/json')) {
      return failure(res, 403, 'Origem da solicitação inválida.');
    }
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const ip = String(req.headers['x-vercel-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();
    const registrationOpen = process.env.ID_MARICA_ALLOW_REGISTRATION === 'true';
    const biometricRequired = process.env.ID_MARICA_REQUIRE_BIOMETRY !== 'false';
    const biometricAvailable = datavalidAvailable();
    const proofId = req.cookies[PROOF_COOKIE];
    const validProofId = proofId && /^[a-f0-9-]{36}$/i.test(proofId);

    if (action === 'biometria-iniciar' || action === 'biometria-resultado') {
      if (!registrationOpen || !biometricAvailable) return failure(res, 503, 'A verificação facial ainda não está disponível.');
      if (typeof body.cpf !== 'string' || !isCpfValid(body.cpf)) return failure(res, 400, 'Informe um CPF válido.');
      const cpf = cpfDigits(body.cpf);
      const key = hash('biometria:' + cpf);
      const starting = action === 'biometria-iniciar';
      if (await rateLimited(admin, hash(`${action}:ip:${ip}`), starting ? 12 : 32) ||
          await rateLimited(admin, hash(`${action}:cpf:${key}`), starting ? 3 : 16)) {
        return failure(res, 429, 'Muitas tentativas. Aguarde 15 minutos.');
      }
      if (starting) {
        if (body.authorize !== true) return failure(res, 400, 'Confirme que você quer iniciar a verificação facial.');
        const pin = await startDatavalid(cpf);
        if (!pin) return failure(res, 422, 'Não foi possível iniciar a verificação para esse CPF. Procure atendimento presencial.');
        const { data, error } = await admin.from('citizen_identity_checks').insert({ cpf_key: key, pin }).select('id').single();
        if (error) throw error;
        res.setHeader('Set-Cookie', `${PROOF_COOKIE}=${data.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`);
        return res.status(200).json({ pin });
      }
      if (!validProofId) return failure(res, 400, 'Inicie uma nova verificação.');
      const { data, error } = await admin.from('citizen_identity_checks')
        .select('pin, started_at, verified_at').eq('id', proofId).eq('cpf_key', key).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (error) throw error;
      if (!data) return failure(res, 400, 'A verificação expirou. Gere um novo código.');
      if (data.verified_at) return res.status(200).json({ status: 'verified' });
      const status = await datavalidResult(cpf, data.pin, data.started_at);
      if (status === 'verified') {
        const { error: updateError } = await admin.from('citizen_identity_checks').update({ verified_at: new Date().toISOString() }).eq('id', proofId);
        if (updateError) throw updateError;
      }
      return res.status(200).json({ status });
    }
    if (action === 'sair') {
      res.setHeader('Set-Cookie', sessionCookie());
      return res.status(200).json({ ok: true });
    }

    if (!['cpf', 'entrar', 'cadastrar', 'salvar'].includes(String(action))) {
      return failure(res, 404, 'Serviço indisponível.');
    }

    if (action === 'cpf' || action === 'entrar' || action === 'cadastrar') {
      if (typeof body.cpf !== 'string' || !isCpfValid(body.cpf)) return failure(res, 400, 'Informe um CPF válido.');
      const email = emailFor(body.cpf);
      if (await rateLimited(admin, hash(`${action}:ip:${ip}`), action === 'cpf' ? 24 : 12) ||
          await rateLimited(admin, hash(`${action}:cpf:${email}`), 8)) {
        return failure(res, 429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.');
      }

      if (action === 'cpf') {
        const { data, error } = await admin.rpc('citizen_account_exists', { account_email: email });
        if (error) throw error;
        return res.status(200).json({ registered: data === true, registrationOpen: registrationOpen && (!biometricRequired || biometricAvailable), biometricAvailable, biometricRequired });
      }
      if (typeof body.password !== 'string' || body.password.length < MIN_CITIZEN_PASSWORD ||
          Buffer.byteLength(body.password) > 72) {
        return failure(res, 400, 'Informe uma senha válida, com pelo menos 10 caracteres e até 72 bytes.');
      }
      if (action === 'entrar') {
        const { data, error } = await auth.auth.signInWithPassword({ email, password: body.password });
        if (error || !data.session) return failure(res, 401, 'CPF ou senha inválidos.');
        const { data: profile, error: readError } = await admin.from('citizen_profiles').select('revision')
          .eq('user_id', data.user.id).maybeSingle();
        if (readError) throw readError;
        if (!profile) return failure(res, 409, 'O cadastro está incompleto. Conclua o formulário usando a senha já escolhida.');
        res.setHeader('Set-Cookie', sessionCookie(data.session.access_token, data.session.expires_in));
        return res.status(200).json({ ok: true });
      }
      if (!registrationOpen) {
        return failure(res, 503, 'Novos cadastros ainda não estão disponíveis.');
      }
    }

    const validated = citizenProfileSchema.safeParse(body.profile);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      return failure(res, 400, issue.path.length === 0 ? issue.message : 'Revise os campos obrigatórios, os CPFs e as datas do cadastro.');
    }
    const draft = validated.data;
    const contract = readContract(body.contract);
    if (body.contract != null && !contract) return failure(res, 400, 'Anexe um contrato em PDF de até 2 MB.');

    const password = typeof body.password === 'string' ? body.password : '';
    let userId: string;
    let newSession;
    let facialVerifiedAt: string | undefined;
    const email = emailFor(draft.cpf);
    if (action === 'cadastrar') {
      if (typeof body.cpf !== 'string' || email !== emailFor(body.cpf)) return failure(res, 400, 'O CPF do cadastro precisa ser o CPF consultado.');
      if (validProofId) {
        const { data, error } = await admin.from('citizen_identity_checks')
          .select('verified_at').eq('id', proofId).eq('cpf_key', hash('biometria:' + cpfDigits(draft.cpf)))
          .gt('expires_at', new Date().toISOString()).maybeSingle();
        if (error) throw error;
        facialVerifiedAt = data?.verified_at ?? undefined;
      }
      if (biometricRequired && !facialVerifiedAt) return failure(res, 403, 'Conclua a verificação facial para cadastrar-se ou procure atendimento presencial.');
      if (draft.housingType === 'ALUGADA' && !contract) return failure(res, 400, 'Anexe o contrato de aluguel.');
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error && !['email_exists', 'user_already_exists'].includes(created.error.code ?? '')) throw created.error;
      const { data, error } = await auth.auth.signInWithPassword({ email, password });
      if (error || !data.session) return failure(res, 409, 'Use a senha já escolhida para este CPF ou acesse o cadastro existente.');
      userId = data.user.id;
      newSession = data.session;
    } else {
      const { data: identity } = token ? await auth.auth.getUser(token) : { data: { user: null } };
      if (!identity.user) return failure(res, 401, 'Entre novamente com CPF e senha.');
      if (identity.user.email !== email) return failure(res, 403, 'O CPF do titular não pode ser alterado.');
      userId = identity.user.id;
    }

    const { data: current, error: readError } = await admin.from('citizen_profiles')
      .select('profile, revision, contract_name').eq('user_id', userId).maybeSingle();
    if (readError) throw readError;
    if (action === 'cadastrar' && current) return failure(res, 409, 'Este CPF já tem cadastro. Entre com sua senha.');
    if (action === 'salvar' && (!current || current.revision !== body.revision)) {
      return failure(res, 409, 'O cadastro foi atualizado em outra sessão. Reabra a Área do Munícipe antes de editar.');
    }

    const rental = draft.housingType === 'ALUGADA';
    const contractName = rental ? contract?.name ?? current?.contract_name ?? null : null;
    if (rental && !contractName) return failure(res, 400, 'Anexe o contrato de aluguel.');

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    now.setUTCDate(now.getUTCDate() + 90);
    const profile = {
      ...draft,
      id: userId,
      householdSize: 1 + draft.householdMembers.length,
      rentValue: rental ? draft.rentValue : 0,
      rentalContractName: contractName,
      selfDeclaration: { ...draft.selfDeclaration, crossCheckStatus: 'AGUARDANDO_CRUZAMENTO', crossCheckNotes: '' },
      documents: current?.profile.documents ?? {
        idDocAttached: false, residenceProofAttached: false, facialVerified: Boolean(facialVerifiedAt),
        facialConsentLgpd: Boolean(facialVerifiedAt), facialVerifiedAt,
      },
      registeredAt: current?.profile.registeredAt ?? today,
      lastUpdatedAt: today,
      nextDueDate: now.toISOString().slice(0, 10),
      pendingValidation: true,
      history: current?.profile.history ?? [],
    };

    const revision = (current?.revision ?? 0) + 1;
    const row = {
      profile, revision, contract_name: contractName,
      ...(!rental || contract ? { contract_pdf: rental ? contract?.data : null } : {}),
    };
    const result = current
      ? await admin.from('citizen_profiles').update(row).eq('user_id', userId).eq('revision', current.revision).select('revision').maybeSingle()
      : await admin.from('citizen_profiles').insert({ ...row, user_id: userId }).select('revision').single();
    if (result.error?.code === '23505' || (!result.error && !result.data)) {
      return failure(res, 409, 'O cadastro já foi salvo. Acesse a Área do Munícipe.');
    }
    if (result.error) throw result.error;
    if (newSession) {
      res.setHeader('Set-Cookie', [
        sessionCookie(newSession.access_token, newSession.expires_in),
        `${PROOF_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      ]);
    }
    return res.status(200).json({ profile, revision });
  } catch {
    return failure(res, 503, 'Não foi possível concluir a solicitação agora. Tente novamente.');
  }
}
