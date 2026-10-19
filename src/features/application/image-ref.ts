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

/**
 * What the "Image" line of an image-source application shows: the image that is actually deployed
 * (`currentImage`) when there is one, otherwise the configured reference. `configured` is set only
 * when the configured target differs from the deployed one (for example after a failed deploy of a
 * newer tag), so the header can add a secondary note.
 */
export function imageDisplay(app: {
  imageRef: string | null
  currentImage: string | null
}): { shown: string; configured: string | null } {
  const configured = effectiveImageRef(app.imageRef ?? "")
  if (!app.currentImage) return { shown: configured, configured: null }
  const running = effectiveImageRef(app.currentImage)
  return {
    shown: running,
    configured: configured && configured !== running ? configured : null,
  }
}
