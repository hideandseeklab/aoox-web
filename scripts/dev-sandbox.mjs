// `next dev` for a sandboxed agent shell on Windows (see AGENTS.md "Local dev in a sandbox").
// Points the @swc/core native cache at a short path under the user profile and pre-creates
// `swc-native-<SID>\v1` there. Does nothing special on other platforms or when
// SWC_NATIVE_BINDING_CACHE is already set. Usage: npm run dev:sandbox -- -p 3151
import { execFileSync, spawn } from "node:child_process"
import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const env = { ...process.env }
if (process.platform === "win32" && !env.SWC_NATIVE_BINDING_CACHE) {
  const csv = execFileSync(
    join(process.env.SystemRoot ?? "C:/Windows", "System32", "whoami.exe"),
    ["/user", "/fo", "csv", "/nh"],
    { encoding: "utf8" }
  )
  const sid = csv.trim().split(",").pop()?.replaceAll('"', "")
  if (!sid?.startsWith("S-"))
    throw new Error(`Could not read the user SID: ${csv}`)
  const root = join(homedir(), ".swc-cache")
  mkdirSync(join(root, `swc-native-${sid}`, "v1"), { recursive: true })
  env.SWC_NATIVE_BINDING_CACHE = root
}

const child = spawn(
  process.execPath,
  [
    join(
      import.meta.dirname,
      "..",
      "node_modules",
      "next",
      "dist",
      "bin",
      "next"
    ),
    "dev",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", env }
)
child.on("exit", (code) => process.exit(code ?? 0))
