import { z } from "zod"

export const signInSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
})

export type SignInInput = z.infer<typeof signInSchema>

export const setupSchema = z.object({
  name: z.string().trim().max(100, "Maksimal 100 karakter").optional(),
  email: z.email("Email tidak valid"),
  password: z
    .string()
    .min(8, "Minimal 8 karakter")
    .max(128, "Maksimal 128 karakter"),
})

export type SetupInput = z.infer<typeof setupSchema>
