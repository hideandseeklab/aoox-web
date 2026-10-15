/**
 * The tag Docker will actually use for an image reference: a reference with neither a tag nor a
 * digest gets `:latest`. Only the last path segment decides, so a registry host with a port
 * (`localhost:5000/team/app`) is not mistaken for a tag.
 */
export function effectiveImageRef(ref: string): string {
  const value = ref.trim()
  if (!value || value.includes("@")) return value
  const last = value.slice(value.lastIndexOf("/") + 1)
  return last.includes(":") ? value : `${value}:latest`
}
