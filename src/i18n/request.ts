import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./config"
import { NAMESPACES } from "./namespaces"

// next-intl without i18n routing: the locale comes from a cookie, never from the URL.
// The dictionary is split into one file per namespace (messages/<locale>/<namespace>.json);
// each file is a dynamic import with a static prefix, so the bundler includes every file
// (nothing is read from the filesystem at runtime, which matters for the standalone image).
export default getRequestConfig(async () => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(stored) ? stored : DEFAULT_LOCALE
  const entries = await Promise.all(
    NAMESPACES.map(
      async (ns) =>
        [
          ns,
          (await import(`../../messages/${locale}/${ns}.json`)).default,
        ] as const
    )
  )
  return { locale, messages: Object.fromEntries(entries) }
})
