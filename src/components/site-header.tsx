import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePageStore } from "@/store/usePageStore"
import { Skeleton } from "./ui/skeleton"
import { UsageRemaining } from "./subscription/UsageRemaining"
import { SubscriptionBadge } from "./subscription/SubscriptionBadge"

export function SiteHeader() {
  const pathname = usePathname()
  const pageName = usePageStore((state) => state.pageName)

  if (pathname === "/app/scan") {
    return (
      <header className="fixed top-4 right-4 z-50">
        <div
          className="
            flex h-10 w-10
            items-center justify-center
            rounded-lg border
            bg-background/95
            backdrop-blur
            supports-[backdrop-filter]:bg-background/60
            shadow-lg
          "
        >
          <SidebarTrigger />
        </div>
      </header>
    )
  }

  return (
     <header
  className="
    shrink-0 border-b
    transition-[width,height]
    ease-linear
    group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)
  "
>
  <div
    className="
      flex flex-col
      lg:flex-row lg:items-center
      gap-3 lg:gap-2
      px-3 py-3
      lg:px-6
      min-h-(--header-height)
    "
  >
    {/* Left Section */}
    <div className="flex items-center min-w-0 gap-2">
      <SidebarTrigger className="shrink-0" />

      <Separator
        orientation="vertical"
        className="hidden lg:block h-4"
      />

      <h1 className="truncate text-sm lg:text-base font-medium">
        {pageName === "Unknown Page" ? (
          <Skeleton className="h-4 w-24 rounded" />
        ) : (
          pageName
        )}
      </h1>
    </div>

    {/* Right Section */}
    <div
      className="
        flex flex-wrap
        items-center
        gap-2 lg:gap-4
        lg:ml-auto
        w-full lg:w-auto
      "
    >
      <UsageRemaining showExpiry />
      <SubscriptionBadge size="md" />
    </div>
  </div>
</header>
  )
}