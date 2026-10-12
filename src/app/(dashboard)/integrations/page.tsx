import { redirect } from "next/navigation"

/** No overview page: the group opens on Git credentials, the one every member can use. */
export default function IntegrationsIndexPage() {
  redirect("/integrations/git")
}
