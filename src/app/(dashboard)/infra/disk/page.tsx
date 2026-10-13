import { redirect } from "next/navigation"

/** The disk card moved into the Docker page (strip under the title); old links land there. */
export default function DiskPage() {
  redirect("/infra/docker")
}
