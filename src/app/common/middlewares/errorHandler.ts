import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError.js";


export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {


  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: err.data,
    });
    return;
  }

  if (err instanceof Error) {
    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      ...(isDev && { error: err.message, stack: err.stack }),
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
}
