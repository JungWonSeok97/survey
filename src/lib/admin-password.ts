import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
    if (error) reject(error); else resolve(key);
  });
});
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
// Missing accounts also perform scrypt, so credential errors follow the same path.
export const DUMMY_HASH = `scrypt-v1$${"0".repeat(32)}$${"0".repeat(128)}`;
export async function verifyPassword(password: string, encoded: string) {
  const valid = /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded);
  const [, salt, digest] = (valid ? encoded : DUMMY_HASH).split("$");
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(digest, "hex")) && valid;
}
