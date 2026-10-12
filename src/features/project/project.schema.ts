import { z } from "zod"

type Translator = (
  key: string,
  values?: Record<string, string | number>
) => string

/** Built per request/render with a translator for the `projects` namespace. */
export const createProjectSchema = (t: Translator) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("validation.nameRequired"))
      .max(100, t("validation.maxChars", { max: 100 })),
    description: z
      .string()
      .trim()
      .max(500, t("validation.maxChars", { max: 500 }))
      .optional(),
  })

export type ProjectInput = z.infer<ReturnType<typeof createProjectSchema>>
