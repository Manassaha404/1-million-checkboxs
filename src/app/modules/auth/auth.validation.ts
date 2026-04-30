import { z } from "zod";
import BaseDto from "../../common/validation/baseDTO.js";
export class tokenExchangeDto extends BaseDto {
  static baseSchema = z.object({
    code: z.string(),
  });
}

export class refreshTokenDto extends BaseDto {
  static baseSchema = z.object({
    refreshToken: z.string(),
  });
}