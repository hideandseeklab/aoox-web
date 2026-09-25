import { z } from "zod"

const port = z.coerce.number().int().min(1).max(65535)

const baseSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  sourceType: z.enum(["git", "image"]).default("git"),
  // Validated per source below (git needs gitUrl, image needs imageRef).
  gitUrl: z.string().trim().max(500),
  imageRef: z
    .string()
    .trim()
    .max(300)
    .regex(/^([a-z0-9][a-z0-9._\-\/:@]*)?$/, "Referensi image tidak valid"),
  // Empty string = public image.
  imageRegistryId: z
    .string()
    .trim()
    .transform((v) => (v ? v : null)),
  autoUpdate: z.boolean().default(false),
  deployMode: z.enum(["container", "service"]).default("container"),
  replicas: z.coerce.number().int().min(1).max(20).default(1),
  // Empty = any node.
  swarmNodeId: z
    .string()
    .trim()
    .transform((v) => (v ? v : null)),
  swarmConstraint: z
    .string()
    .trim()
    .max(200)
    .regex(
      /^(node\.(id|hostname|role|platform\.(os|arch)|labels\.[A-Za-z0-9_.-]+)(==|!=)[A-Za-z0-9_.:/-]+)?$/,
      "Format: node.labels.<key>==<nilai>, node.role==worker, node.hostname!=<nama>"
    )
    .transform((v) => (v ? v : null)),
  updateParallelism: z.coerce.number().int().min(1).max(20).default(1),
  updateDelaySeconds: z.coerce.number().int().min(0).max(600).default(2),
  updateOrder: z.enum(["auto", "start-first", "stop-first"]).default("auto"),
  autoUpdateIntervalMinutes: z.coerce
    .number()
    .int()
    .min(5)
    .max(1440)
    .default(60),
  gitBranch: z
    .string()
    .trim()
    .max(100)
    .regex(/^[\w./-]*$/, "Nama branch tidak valid")
    .optional(),
  dockerfilePath: z
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
  containerPort: port.default(3000),
  // Empty string = not published.
  hostPort: z
    .union([z.literal(""), port])
    .transform((v) => (v === "" ? null : v)),
  // Empty string = no health check.
  healthcheckPath: z
    .string()
    .trim()
    .max(255)
    .regex(/^(\/\S*)?$/, "Harus diawali / (mis. /health)")
    .transform((v) => (v ? v : null)),
  // Empty string = unlimited.
  cpuMillicores: z
    .union([z.literal(""), z.coerce.number().int().min(100).max(64_000)])
    .transform((v) => (v === "" ? null : v)),
  memoryMb: z
    .union([z.literal(""), z.coerce.number().int().min(64).max(1_048_576)])
    .transform((v) => (v === "" ? null : v)),
  deploymentKeep: z.coerce.number().int().min(1).max(100).default(10),
  env: z.string().max(20_000).optional(),
  buildArgs: z.string().max(5_000).optional(),
  buildType: z
    .enum(["dockerfile", "nixpacks", "railpack", "static"])
    .default("dockerfile"),
  // Static sites: empty command = files already in the repo.
  staticBuildCommand: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v ? v : null)),
  staticOutputDir: z
    .string()
    .trim()
    .max(200)
    .regex(/^(?!\/)(?!.*\.\.)[\w./-]*$/, "Folder relatif dari root repo")
    .transform((v) => v || "dist"),
  staticSpa: z.boolean().default(true),
  // Empty string = the aoox host.
  serverId: z
    .string()
    .trim()
    .transform((v) => (v ? v : null)),
  previewsEnabled: z.boolean().default(false),
  previewDomain: z
    .string()
    .trim()
    .max(253)
    .regex(/^(([a-z0-9-]+\.)+[a-z0-9-]+)?$/i, "Domain tidak valid")
    .transform((v) => (v ? v : null)),
})

export const applicationSchema = baseSchema.superRefine((v, ctx) => {
  if (v.sourceType === "git") {
    if (!v.gitUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["gitUrl"],
        message: "URL git wajib diisi",
      })
    } else if (!/^(https?|git):\/\/[^\s#]+$/.test(v.gitUrl)) {
      ctx.addIssue({
        code: "custom",
        path: ["gitUrl"],
        message: "Harus URL http(s) atau git://",
      })
    }
  } else if (!v.imageRef) {
    ctx.addIssue({
      code: "custom",
      path: ["imageRef"],
      message: "Referensi image wajib diisi",
    })
  }
})

export type ApplicationInput = z.infer<typeof applicationSchema>
