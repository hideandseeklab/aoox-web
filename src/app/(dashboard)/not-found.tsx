import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <p className="text-sm font-medium">Halaman tidak ditemukan</p>
      <p className="text-sm text-muted-foreground">
        Alamat yang kamu buka tidak ada atau sudah dihapus.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/">Ke dashboard</Link>
      </Button>
    </div>
  )
}
