import { exportSPKI, importJWK } from "jose";
import jwt from "jsonwebtoken";





interface TokenPayload extends jwt.JwtPayload {
  sub: string;
  given_name: string;
  family_name: string;
  email: string;
  contact_num: string;
  age: number | null;
}




export async function getPublicPem(): Promise<string> {
  const raw = process.env.PUBLIC_KEY;
  if (!raw) throw new Error("PUBLIC_KEY env var is not set");
  const jwk = JSON.parse(raw);
  const key = await importJWK(jwk, "RS256");
  return exportSPKI(key as any);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const pem = await getPublicPem();
  return jwt.verify(token, pem, { algorithms: ["RS256"] }) as TokenPayload;
}