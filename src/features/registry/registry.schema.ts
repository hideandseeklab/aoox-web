import { z } from "zod"

/** `t` translates keys of the `registry` namespace (see `registry.validation.*`). */
export const externalRegistrySchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")).max(100),
    url: z
      .string()
      .trim()
      .min(1, t("validation.urlRequired"))
      .max(255)
      .regex(
        /^(https?:\/\/)?[a-z0-9.-]+(:\d+)?(\/.*)?$/i,
        t("validation.urlExample")
      ),
    username: z.string().trim().max(255).optional(),
    password: z.string().max(4096).optional(),
    imagePrefix: z.string().trim().max(255).optional(),
  })

export type ExternalRegistryInput = z.infer<
  ReturnType<typeof externalRegistrySchema>
>
