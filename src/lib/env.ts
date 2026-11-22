// src/lib/env.ts
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  get jwtSecret() {
    return required('JWT_SECRET');
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN ?? '1h';
  },
  get bcryptRounds() {
    return Number(process.env.BCRYPT_ROUNDS ?? 10);
  },
};