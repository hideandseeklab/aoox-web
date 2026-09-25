import { z } from "zod"

export const databaseSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  engine: z.enum(["postgres", "mysql", "mariadb", "redis"]),
  imageTag: z
    .string()
    .trim()
    .max(64)
    .regex(/^[\w.-]*$/, "Tag image tidak valid")
    .optional(),
  hostPort: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(65535)])
    .transform((v) => (v === "" ? null : v)),
})
