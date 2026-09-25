import { z } from "zod"

export const composeAppSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  gitUrl: z
    .string()
    .trim()
    .min(1, "URL git wajib diisi")
    .max(500)
    .regex(
      /^(https?|git):\/\/[^\s#@]+$/,
      "Harus URL http(s)/git tanpa kredensial"
    ),
  gitBranch: z
    .string()
    .trim()
    .max(100)
    .regex(/^[\w./-]*$/, "Nama branch tidak valid")
    .optional(),
  composePath: z
    .string()
    .trim()
    .max(200)
    .regex(/^[\w./-]*$/, "Path tidak valid")
    .optional(),
  // Empty string = anonymous clone.
  gitCredentialId: z
    .string()
    .trim()
    .transform((v) => (v ? v : null)),
  env: z.string().max(20_000).optional(),
})

export type ComposeAppInput = z.infer<typeof composeAppSchema>

/** Settings of a template stack: no repository, the compose file itself is edited. */
export const composeTemplateSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  composeContent: z
    .string()
    .min(1, "File compose wajib diisi")
    .max(200_000, "Terlalu panjang"),
  env: z.string().max(20_000).optional(),
})
