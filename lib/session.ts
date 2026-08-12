import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId?: string;
  isAdmin?: boolean;
  expiresAt: number;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const session = await encrypt({ userId, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    sameSite: "lax",
    path: "/",
  });
}

export async function createAdminSession() {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const session = await encrypt({ isAdmin: true, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return decrypt(session);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
