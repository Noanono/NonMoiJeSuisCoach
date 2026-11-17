import { describe, expect, test } from 'bun:test';
import { formatCode, newSecret, parseCode, roomIdOf } from './serverCode';

const HOST = 'Ab3dEf6hIj9kLm2nOp5qRs';

describe('code de serveur (MULTI-12)', () => {
  test('un secret neuf fait 16 caractères base32, et change à chaque fois', () => {
    const a = newSecret();
    expect(a).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
    expect(newSecret()).not.toBe(a);
  });

  test('formaté puis relu, le code ne change pas', () => {
    const code = { secret: newSecret(), hostId: HOST };
    const text = formatCode(code);
    expect(text).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}\.[0-9A-Za-z]{22}$/);
    expect(parseCode(text)).toEqual(code);
  });

  test('saisie à la main : minuscules, espaces, O pour 0 et I/L pour 1 sont tolérés', () => {
    const code = { secret: '0123456789ABCDEF', hostId: HOST };
    expect(parseCode(`  o123 4567-89ab-cdef.${HOST} `)).toEqual(code);
    expect(parseCode(`i123456789abcdef.${HOST}`)).toEqual({ ...code, secret: '1123456789ABCDEF' });
  });

  test('codes mal copiés refusés', () => {
    expect(parseCode('')).toBeNull();
    expect(parseCode('ABCD-EFGH-JKMN-PQRS')).toBeNull();
    expect(parseCode(`ABCD-EFGH-JKMN.${HOST}`)).toBeNull();
    expect(parseCode(`ABCD-EFGH-JKMN-PQRU.${HOST}`)).toBeNull();
    expect(parseCode('ABCD-EFGH-JKMN-PQRS.court')).toBeNull();
    // L'identifiant de l'hôte est sensible à la casse : on ne le « corrige » pas.
    expect(parseCode(`ABCD-EFGH-JKMN-PQRS.${HOST}!`)).toBeNull();
  });

  test('la salle porte une empreinte du secret, jamais le secret', async () => {
    const secret = newSecret();
    const room = await roomIdOf(secret);
    expect(room).toMatch(/^[0-9a-f]{32}$/);
    expect(room).not.toContain(secret.toLowerCase());
    expect(await roomIdOf(secret)).toBe(room);
    expect(await roomIdOf(newSecret())).not.toBe(room);
  });
});
