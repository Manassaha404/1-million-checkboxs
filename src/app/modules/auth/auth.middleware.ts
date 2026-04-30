import type { NextFunction } from "express";
import { verifyToken } from "../../common/utils/jwt.utils.js";
import type { Request, Response } from "express";
import ApiError from "../../common/utils/apiError.js";
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.badRequest("Missing or malformed Authorization header");
  }

  const token = authHeader.slice(7);

  try {
    (req as any).user = await verifyToken(token);
    next();
  } catch (err) {
    throw ApiError.unAuthorized("token is expired or invalid")
  }
}
