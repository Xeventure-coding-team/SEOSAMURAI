import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePageStore } from "@/store/usePageStore"
import { Skeleton } from "./ui/skeleton"

export function SiteHeader() {
  const pathname = usePathname()
  const pageName = usePageStore((state) => state.pageName)

  if (pathname === "/app/scan") {
    return (
      <header className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center border rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
        <SidebarTrigger />
      </header>
    )
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">
          {pageName === "Unknown Page" ? (
            <Skeleton className="h-4 w-24 rounded" />
          ) : (
            pageName
          )}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          {/* right-side actions */}
        </div>
      </div>
    </header>
  )
}