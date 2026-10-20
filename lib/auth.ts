import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, client } from "../db";
import { authSessions, users } from "../db/schema";
const scrypt = promisify(scryptCb);
export const COOKIE = "mi_entreno_session";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length !== 64) return null;
  const [row] = await db
    .select({ id: users.id, username: users.username })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(
      and(
        eq(authSessions.tokenHash, hashToken(token)),
        gt(authSessions.expiresAt, new Date()),
      ),
    );
  return row ?? null;
}
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [salt, hash] = encoded.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? ""))
    return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
export async function login(username: string, password: string) {
  const bucket = Math.floor(Date.now() / 900000);
  const [attempt] =
    await client`INSERT INTO login_attempts(bucket,attempts) VALUES (${bucket},1) ON CONFLICT (bucket) DO UPDATE SET attempts=login_attempts.attempts+1 RETURNING attempts`;
  if (attempt.attempts > 10)
    return {
      error: "Demasiados intentos. Espera hasta 15 minutos.",
      status: 429,
    } as const;
  await client`DELETE FROM login_attempts WHERE bucket < ${bucket - 1}`;
  const valid = await verifyPassword(
    password,
    process.env.AUTH_PASSWORD_HASH ?? "",
  );
  if (!valid || username !== process.env.AUTH_USERNAME)
    return { error: "Credenciales incorrectas", status: 401 } as const;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  if (!user)
    return {
      error: "Instancia pendiente de inicializar",
      status: 503,
    } as const;
  const token = randomBytes(32).toString("hex");
  await client`DELETE FROM auth_sessions WHERE expires_at < now()`;
  await db.insert(authSessions).values({
    tokenHash: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.APP_ORIGIN?.startsWith("https://") ?? false,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 86400,
  });
  return { ok: true } as const;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await db
      .delete(authSessions)
      .where(eq(authSessions.tokenHash, hashToken(token)));
  jar.delete(COOKIE);
}
