import { notFound } from "next/navigation"

// Catch-all for unknown dashboard addresses: static and dynamic routes win over
// a catch-all, so this only receives URLs that no other page matches. Calling
// notFound() renders (dashboard)/not-found.tsx inside the dashboard layout, with
// a 404 status.
export default function DashboardUnknownPage() {
  notFound()
}
