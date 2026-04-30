import type { Response } from "express";


export function ApiResponse(
  res: Response,
  statusCode: number,
  message: string,
  data?: object | null,
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
  });
}

export default ApiResponse;
