import { string, z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("8080"),

  PUBLIC_KEY: z.string(),
  CLIENT_ID: z.string().trim(),
  CLIENT_SECRET: z.string().trim(),
});


const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
