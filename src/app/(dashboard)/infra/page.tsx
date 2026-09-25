import { redirect } from "next/navigation"

/** No overview page: the group opens on the proxy, the thing every install needs first. */
export default function InfraIndexPage() {
  redirect("/infra/proxy")
}
