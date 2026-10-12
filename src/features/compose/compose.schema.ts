import { z } from "zod"

type Translator = (key: string, values?: Record<string, string | number>) => string

/** `t` is bound to the `compose` namespace. */
export const createComposeAppSchema = (t: Translator) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
    gitUrl: z
      .string()
      .trim()
      .min(1, t("validation.gitUrlRequired"))
      .max(500)
      .regex(/^(https?|git):\/\/[^\s#@]+$/, t("validation.gitUrlInvalid")),
    gitBranch: z
      .string()
      .trim()
      .max(100)
      .regex(/^[\w./-]*$/, t("validation.branchInvalid"))
      .optional(),
    composePath: z
      .string()
      .trim()
      .max(200)
      .regex(/^[\w./-]*$/, t("validation.pathInvalid"))
      .optional(),
    // Empty string = anonymous clone.
    gitCredentialId: z
      .string()
      .trim()
      .transform((v) => (v ? v : null)),
    env: z.string().max(20_000).optional(),
    // Empty string = production (the API default); the field is omitted then.
    environmentId: z
      .string()
      .trim()
      .transform((v) => (v ? v : undefined)),
  })

export type ComposeAppInput = z.infer<ReturnType<typeof createComposeAppSchema>>

/** Settings of a template stack: no repository, the compose file itself is edited. */
export const createComposeTemplateSchema = (t: Translator) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
    composeContent: z
      .string()
      .min(1, t("validation.composeRequired"))
      .max(200_000, t("validation.tooLong")),
    env: z.string().max(20_000).optional(),
    // Empty string = production (the API default); the field is omitted then.
    environmentId: z
      .string()
      .trim()
      .transform((v) => (v ? v : undefined)),
  })
