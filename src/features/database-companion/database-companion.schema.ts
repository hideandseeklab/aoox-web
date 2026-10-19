import { z } from "zod"

const HOSTNAME =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

type Translator = (key: string, values?: Record<string, string | number>) => string

export const createCompanionSchema = (t: Translator) =>
  z
  .object({
    tool: z.string().min(1, t("companion.validation.toolRequired")),
    access: z.enum(["domain", "port"]),
    host: z.string().trim(),
    https: z.boolean(),
    hostPort: z.string().trim(),
    // The admin UI holds full database access: closed to the internet by default.
    hostPortBind: z.enum(["public", "loopback"]).default("loopback"),
  })
  .superRefine((v, ctx) => {
    if (v.access === "domain") {
      if (!v.host) {
        ctx.addIssue({ code: "custom", path: ["host"], message: t("companion.validation.hostRequired") })
      } else if (!HOSTNAME.test(v.host)) {
        ctx.addIssue({
          code: "custom",
          path: ["host"],
          message: t("companion.validation.hostInvalid"),
        })
      }
    } else {
      const n = Number(v.hostPort)
      if (!v.hostPort) {
        ctx.addIssue({ code: "custom", path: ["hostPort"], message: t("companion.validation.portRequired") })
      } else if (!Number.isInteger(n) || n < 1 || n > 65535) {
        ctx.addIssue({
          code: "custom",
          path: ["hostPort"],
          message: t("companion.validation.portRange"),
        })
      }
    }
  })

export type CompanionInput = z.infer<ReturnType<typeof createCompanionSchema>>
