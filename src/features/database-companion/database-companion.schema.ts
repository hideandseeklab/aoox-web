import { z } from "zod"

const HOSTNAME =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

export const companionSchema = z
  .object({
    tool: z.string().min(1, "Pilih alat"),
    access: z.enum(["domain", "port"]),
    host: z.string().trim(),
    https: z.boolean(),
    hostPort: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.access === "domain") {
      if (!v.host) {
        ctx.addIssue({ code: "custom", path: ["host"], message: "Host wajib diisi" })
      } else if (!HOSTNAME.test(v.host)) {
        ctx.addIssue({
          code: "custom",
          path: ["host"],
          message: "Hostname tidak valid, contoh: db.example.com",
        })
      }
    } else {
      const n = Number(v.hostPort)
      if (!v.hostPort) {
        ctx.addIssue({ code: "custom", path: ["hostPort"], message: "Port host wajib diisi" })
      } else if (!Number.isInteger(n) || n < 1 || n > 65535) {
        ctx.addIssue({
          code: "custom",
          path: ["hostPort"],
          message: "Port harus 1 sampai 65535",
        })
      }
    }
  })

export type CompanionInput = z.infer<typeof companionSchema>
