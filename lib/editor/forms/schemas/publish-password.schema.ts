import { z } from "zod";

export const PUBLISH_PASSWORD_MIN_LENGTH = 8;

export const publishPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        PUBLISH_PASSWORD_MIN_LENGTH,
        `Use at least ${PUBLISH_PASSWORD_MIN_LENGTH} characters`,
      )
      .max(128, "Use at most 128 characters"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export type PublishPasswordValues = z.infer<typeof publishPasswordSchema>;
