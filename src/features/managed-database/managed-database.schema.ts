import { z } from "zod"

type Translator = (key: string, values?: Record<string, string | number>) => string

export const createDatabaseSchema = (t: Translator) =>
  z.object({
  name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
  engine: z.enum(["postgres", "mysql", "mariadb", "redis", "valkey", "mongodb"]),
  // Only meaningful when engine === "postgres"; empty = plain Postgres.
  variant: z
    .enum(["pgvector", "postgis", "timescaledb", ""])
    .optional()
    .transform((v) => (v ? v : null)),
  imageTag: z
    .string()
    .trim()
    .max(64)
    .regex(/^[\w.-]*$/, t("validation.invalidImageTag"))
    .optional(),
  hostPort: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(65535)])
    .transform((v) => (v === "" ? null : v)),
  // New published database ports default to this server only.
  hostPortBind: z.enum(["public", "loopback"]).default("loopback"),
})

export type DatabaseInput = z.infer<ReturnType<typeof createDatabaseSchema>>
