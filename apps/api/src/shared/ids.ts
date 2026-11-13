import { randomInt, randomUUID } from 'node:crypto';

/** Gerador de identificadores, injetável para testes. */
export interface IdGenerator {
  /** Identificador único (UUID v4). */
  id(): string;
  /** Código de resgate legível, sem caracteres ambíguos (ex.: `CDE-7KQ4-M2XP`). */
  redemptionCode(): string;
}

/** Sem 0, O, 1, I e L, para facilitar a leitura no balcão da loja. */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomBlock(length: number): string {
  let block = '';
  for (let i = 0; i < length; i++) block += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return block;
}

export const cryptoIds: IdGenerator = {
  id: () => randomUUID(),
  redemptionCode: () => `CDE-${randomBlock(4)}-${randomBlock(4)}`,
};

export const REDEMPTION_CODE_PATTERN = /^CDE-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;
