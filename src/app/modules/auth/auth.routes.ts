import { Router } from "express";
import { validate } from "../../common/middlewares/validation.js";
import { refreshTokenDto, tokenExchangeDto } from "./auth.validation.js";
import authController from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

const authRouter:Router = Router();

authRouter.post("/token", validate(tokenExchangeDto), authController.tokenExchange)
authRouter.post("/refresh", validate(refreshTokenDto), authController.refreshTokens)
authRouter.get("/info", requireAuth, authController.userInfo)
export default authRouter;