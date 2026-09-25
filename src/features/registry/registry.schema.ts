import { z } from "zod"

export const externalRegistrySchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  url: z
    .string()
    .trim()
    .min(1, "URL wajib diisi")
    .max(255)
    .regex(
      /^(https?:\/\/)?[a-z0-9.-]+(:\d+)?(\/.*)?$/i,
      "Contoh: ghcr.io atau registry.example.com:5000"
    ),
  username: z.string().trim().max(255).optional(),
  password: z.string().max(4096).optional(),
  imagePrefix: z.string().trim().max(255).optional(),
})

export type ExternalRegistryInput = z.infer<typeof externalRegistrySchema>
