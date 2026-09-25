import { z } from "zod"

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi")
    .max(100, "Maksimal 100 karakter"),
  description: z.string().trim().max(500, "Maksimal 500 karakter").optional(),
  // Only present on the project settings form (create has no env field).
  env: z.string().max(20_000, "Maksimal 20000 karakter").optional(),
})

export type ProjectInput = z.infer<typeof projectSchema>
