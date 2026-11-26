import { z } from 'zod';
import { isCpfValid } from '../src/data/citizenValidation.js';

const text = (limit = 180) => z.string().trim().max(limit);
const cpf = text(14).refine(isCpfValid, 'CPF inválido.');
const optionalDate = z.union([z.literal(''), z.iso.date()]);
const birthDate = z.iso.date().refine((value) => value >= '1900-01-01' && value <= new Date().toISOString().slice(0, 10));
const amount = z.number().min(0).max(100_000_000);
const relationship = z.enum(['Cônjuge / Companheiro(a)', 'Filho(a)', 'Mãe / Pai', 'Neto(a)', 'Irmão(ã)', 'Outro']);
const coords = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);
const dates = { startDate: z.iso.date(), endDate: optionalDate };

export const citizenProfileSchema = z.object({
  cpf,
  fullName: text().min(4),
  birthDate,
  gender: z.enum(['Feminino', 'Masculino', 'Outro', 'Prefiro não informar']),
  maritalStatus: z.enum(['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)']),
  education: z.enum(['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Pós-graduação']),
  phone: text(30),
  email: z.union([z.literal(''), z.email().max(254)]),
  dependentsCount: z.number().int().min(0).max(30),
  familyComposition: text(300),
  householdMembers: z.array(z.object({
    id: text(60), fullName: text().min(3), cpf, relationship, birthDate,
  })).max(30),
  selfDeclaration: z.object({
    cadUnicoRegistered: z.boolean(), nis: text(30).optional(), ubsRegistered: z.boolean(),
    ubsName: text().optional(), crasRegistered: z.boolean(), crasName: text().optional(),
    publicSchoolStudent: z.boolean(), schoolName: text().optional(),
    studentScope: z.enum(['Titular', 'Dependente(s)', 'Titular e dependente(s)']).optional(),
    passaporteUniversitario: z.boolean(), universityName: text().optional(), universityCourse: text().optional(),
    declaredPolicies: z.array(text()).max(70),
  }),
  profession: text(),
  employmentStatus: z.enum(['EMPREGADO', 'DESEMPREGADO', 'AUTONOMO', 'INFORMAL', 'APOSENTADO', 'ESTUDANTE']),
  workRegime: z.enum(['CLT', 'ESTATUTARIO', 'MEI', 'INFORMAL', 'SEM_VINCULO', 'APOSENTADO']),
  employerName: text(),
  economicSector: text(),
  individualIncome: amount,
  householdTotalIncome: amount,
  incomeContributorsCount: z.number().int().min(0).max(31),
  otherIncomeSources: amount,
  socialPrograms: z.array(z.object({ name: text().min(1), monthlyValue: amount })).max(50),
  address: text(300).min(5),
  neighborhood: text().min(1),
  districtId: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  cep: text(9),
  coords,
  housingType: z.enum(['PROPRIA', 'ALUGADA', 'TEMPORARIA', 'CEDIDA', 'FINANCIADA', 'OUTRA']),
  dwellingType: z.enum(['CASA', 'APARTAMENTO']),
  dwellingHolder: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('SELF') }),
    z.object({ kind: z.literal('OTHER'), name: text().min(3), cpf, relationship: text(80).min(2) }),
  ]),
  rentValue: amount,
  workLocationBairro: text().optional(),
  workCoords: coords.optional(),
  employmentHistory: z.array(z.object({ employer: text().min(1), role: text().min(1), ...dates })).max(30),
  academicHistory: z.array(z.object({ institution: text().min(1), course: text().min(1), ...dates })).max(30),
}).superRefine((profile, ctx) => {
  const cpfs = [profile.cpf, ...profile.householdMembers.map((member) => member.cpf)].map((value) => value.replace(/\D/g, ''));
  if (new Set(cpfs).size !== cpfs.length) ctx.addIssue({ code: 'custom', message: 'Cada morador deve ter um CPF diferente.' });
  if (profile.dependentsCount > profile.householdMembers.length) ctx.addIssue({ code: 'custom', message: 'Informe os dependentes entre os moradores do imóvel.' });
  for (const record of [...profile.employmentHistory, ...profile.academicHistory]) {
    if (record.endDate && record.endDate < record.startDate) ctx.addIssue({ code: 'custom', message: 'A data final precisa ser posterior à data de início.' });
  }
});
