import type { NextFunction, Request, Response } from "express";
import ApiError from "../../common/utils/apiError.js";
import ApiResponse from "../../common/utils/apiResponce.js";
import { env } from "../../common/configs/envValidation.js";

export default class authController {
  static async tokenExchange(req: Request, res: Response, next: NextFunction) {
    const { code } = req.body;
    if (!code) {
      throw ApiError.badRequest("code is required");
    }

    const clientId = env.CLIENT_ID;
    const clientSecret = env.CLIENT_SECRET;

    try {
      const response = await fetch("http://localhost:8080/api/v1/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSerect: clientSecret, code }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ApiError(response.status, "Token exchange failed");
      }

      const tokens = await response.json();
      return ApiResponse(
        res,
        200,
        "token exchange successfully",
        tokens as object,
      );
    } catch (err) {
      throw ApiError.internal("Could not reach auth server", err as any);
    }
  }
  static async refreshTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
        console.log("done");
        
      const body = JSON.stringify({
        refreshToken,
        clientId: env.CLIENT_ID,
        clientSerect: env.CLIENT_SECRET,
      });
      console.log();
      

      const rawData = await fetch(
        "http://localhost:8080/api/v1/auth/reset-token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        },
      );
      const freshTokens = await rawData.json();
      console.log(freshTokens);
      
      return ApiResponse(
        res,
        200,
        "fresh tokens generated",
        freshTokens as Object,
      );
    } catch (error) {
        console.log(error);
        
        throw ApiError.internal("refreshToken genereted problem ", error as any)
    }
  }
  static async userInfo(req: Request, res: Response, next: NextFunction) {
    try {
        const user = (req as any).user
    return ApiResponse(res, 200, "get user info successfully", user);
    } catch (error) {
       throw ApiError.internal("something went wrong in fetching user info", error as any)
    }
    
  }
}
