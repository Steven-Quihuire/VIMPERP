import { Algorithm, hash, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '../domain/auth';

const argon2Options = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export const createArgon2PasswordHasher = (): PasswordHasher => ({
  hash: async (value) => hash(value, argon2Options),
  verify: async (valueHash, value) => verify(valueHash, value, argon2Options),
});
