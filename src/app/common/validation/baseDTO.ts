import { z } from "zod";
import { ApiError } from "../utils/apiError.js";

class BaseDto {
  static baseSchema = z.object({});

  static safeParse<T extends typeof BaseDto>(
    this: T,
    data: unknown,
  ): z.infer<T["baseSchema"]> {
    const result = this.baseSchema.safeParse(data);
    if (!result.success) {
      throw ApiError.badRequest("Validation failed", result.error.issues as unknown as object);
    }
    return result.data as z.infer<T["baseSchema"]>;
  }

  static async parseAsync<T extends typeof BaseDto>(
    this: T,
    data: unknown,
  ): Promise<z.infer<T["baseSchema"]>> {
    const result = await this.baseSchema.safeParseAsync(data);
    if (!result.success) {
      throw ApiError.badRequest("Validation failed", result.error.issues as unknown as object);
    }
    return result.data as z.infer<T["baseSchema"]>;
  }
}

export default BaseDto;