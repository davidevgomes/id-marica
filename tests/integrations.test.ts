import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import gtfs from 'gtfs-realtime-bindings';
import { isCpfValid } from '../src/data/citizenValidation.js';
import { transitVehicles } from '../api/ept.js';
import { verifyDatavalidToken } from '../server/datavalid.js';

test('valida CPF com ou sem pontuação e rejeita repetição ou dígito errado', () => {
  assert(isCpfValid('111.444.777-35'));
  assert(isCpfValid('11144477735'));
  assert(!isCpfValid('111.444.777-36'));
  assert(!isCpfValid('00000000000'));
});

test('só aceita resultado facial assinado, vinculado ao CPF, código e contratante', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS512');
  const jwks = { keys: [await exportJWK(publicKey)] };
  const expected = { cpf: '11144477735', pin: 'A12345678', started: new Date().toISOString(), audience: '00000000000000' };
  const issueToken = (similarity: number) => new SignJWT({
    pin: expected.pin, selo_biometrico: 'A', face_similaridade: similarity,
  }).setProtectedHeader({ alg: 'RS512' }).setIssuer('Datavalid').setSubject(expected.cpf)
    .setAudience(expected.audience).setIssuedAt().setNotBefore('0s').sign(privateKey);

  const approved = await issueToken(0.91);
  assert(await verifyDatavalidToken(approved, jwks, expected));
  assert.equal(await verifyDatavalidToken(approved, jwks, { ...expected, pin: 'B12345678' }), false);
  assert.equal(await verifyDatavalidToken(await issueToken(0.50), jwks, expected), false);
  await assert.rejects(verifyDatavalidToken(approved, jwks, { ...expected, cpf: '11144477736' }));
  await assert.rejects(verifyDatavalidToken(approved.replace(/\.[^.]+$/, '.AAAA'), jwks, expected));
});

test('decodifica posição e velocidade em um quadro completo de GTFS-RT', () => {
  const now = Date.now();
  const feed = gtfs.transit_realtime.FeedMessage.encode({
    header: { gtfsRealtimeVersion: '2.0', timestamp: Math.floor(now / 1000) },
    entity: [
      { id: '12', vehicle: { trip: { routeId: 'E01' }, position: { latitude: -22.9, longitude: -42.8, speed: 10 } } },
      { id: '13', vehicle: { position: { latitude: 91, longitude: -42.8 } } },
    ],
  }).finish();
  const vehicles = transitVehicles(feed, now);
  assert.equal(vehicles.length, 1);
  assert.equal(vehicles[0].line, 'E01');
  assert.equal(vehicles[0].speed, 36);
  assert(Math.abs(vehicles[0].lat + 22.9) < 0.001);
});
