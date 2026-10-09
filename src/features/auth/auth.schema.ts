import { z } from "zod"

/** Translator for the `auth` namespace (from `getTranslations("auth")`). */
type Translate = (key: string) => string

export const signInSchema = (t: Translate) =>
  z.object({
    email: z.email(t("validation.emailInvalid")),
    password: z.string().min(1, t("validation.passwordRequired")),
  })

export type SignInInput = z.infer<ReturnType<typeof signInSchema>>

export const setupSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().max(100, t("validation.max100")).optional(),
    email: z.email(t("validation.emailInvalid")),
    password: z
      .string()
      .min(8, t("validation.min8"))
      .max(128, t("validation.max128")),
  })

export type SetupInput = z.infer<ReturnType<typeof setupSchema>>
