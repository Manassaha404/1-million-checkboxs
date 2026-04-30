import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import path from "node:path";
import { redisState } from "./common/configs/redis.js";
import cors from "cors";
import { importJWK, exportSPKI } from "jose";
import jwt from "jsonwebtoken";
import authRouter from "./modules/auth/auth.routes.js";
import { errorHandler } from "./common/middlewares/errorHandler.js";
import ApiError from "./common/utils/apiError.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import ApiResponse from "./common/utils/apiResponce.js";

const app: Express = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.resolve("public")));
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth", authRouter);

app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({ health: true });
});

app.get(
  "/api/v1/checkbox",
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const rawData = await redisState.get("checkboxs");

      if (!rawData) {
        throw ApiError.notFound();
      }

      const checkboxs: boolean[] = JSON.parse(rawData);
      
      return ApiResponse(res, 200, "checkBoxFetch successfully", checkboxs)
    } catch (err) {
      console.error("Redis error:", err);
      res.status(500).json({ error: "Failed to read checkbox state" });
    }
  },
);

app.use((_req, _res, next) => {
  next(ApiError.notFound("Route not found"));
});

app.use(errorHandler);

export default app;
