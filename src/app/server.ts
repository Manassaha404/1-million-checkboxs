import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import path from "node:path";
import { redisState } from "../redis.js";
import cors from "cors";
import { importJWK, exportSPKI } from "jose";
import jwt from "jsonwebtoken";

const app: Express = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.resolve("public")));
app.use(express.urlencoded({ extended: true }));



interface TokenPayload extends jwt.JwtPayload {
  sub: string;
  given_name: string;
  family_name: string;
  email: string;
  contact_num: string;
  age: number | null;
}





async function getPublicPem(): Promise<string> {
  const raw = process.env.PUBLIC_KEY;
  if (!raw) throw new Error("PUBLIC_KEY env var is not set");
  const jwk = JSON.parse(raw);
  const key = await importJWK(jwk, "RS256");
  return exportSPKI(key as any);
}


async function verifyToken(token: string): Promise<TokenPayload> {
  const pem = await getPublicPem();
  return jwt.verify(token, pem, { algorithms: ["RS256"] }) as TokenPayload;
}

async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7); 

  try {
    (req as any).user = await verifyToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: "Access token is invalid or expired" });
  }
}

app.post("/auth/token", async (req: Request, res: Response): Promise<void> => { 
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const clientId     = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("CLIENT_ID or CLIENT_SECRET env vars are not set");
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  try {
    const response = await fetch("http://localhost:8080/api/v1/auth/token", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSerect: clientSecret, code }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Auth server error:", response.status, errorBody);
      res.status(response.status).json({ error: "Token exchange failed" });
      return;
    }

    const tokens = await response.json(); 
    res.status(200).json(tokens);
  } catch (err) {
    console.error("Token exchange fetch failed:", err);
    res.status(502).json({ error: "Could not reach auth server" });
  }
});

app.post("/auth/refresh", async (req: Request, res: Response): Promise<void> => { 

  
  const {refreshToken} = req.body;
  
  const body = JSON.stringify({refreshToken, clientId: process.env.CLIENT_ID, clientSerect: process.env.CLIENT_SECRET});

  const rawData = await fetch('http://localhost:8080/api/v1/auth/reset-token', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  const freshTokens = await rawData.json();

  
  res.json(freshTokens)
});


app.get("/auth/info", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(400).json({ error: "Provide the id_token as a Bearer token in Authorization header" });
    return;
  }

  const idToken = authHeader.slice(7);

  try {
    const payload = await verifyToken(idToken);
    res.status(200).json(payload);
  } catch (err) {
    res.status(401).json({ error: "id_token is invalid or expired" });
  }
});


app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({ health: true });
});


app.get("/checkbox", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rawData = await redisState.get("checkboxs");

    if (!rawData) {
      res.status(404).json({ error: "Checkbox state not found" });
      return;
    }

    const checkboxs: boolean[] = JSON.parse(rawData);
    res.json({ checkboxs });
  } catch (err) {
    console.error("Redis error:", err);
    res.status(500).json({ error: "Failed to read checkbox state" });
  }
});

export default app;