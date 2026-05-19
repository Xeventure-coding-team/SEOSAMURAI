export default function CalendarHeader({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="
        flex flex-wrap
        flex-col sm:flex-row
        sm:items-center
        justify-between
        gap-3 sm:gap-4
        p-3 sm:p-4
        bg-background
        rounded-lg sm:rounded-xl
        w-full
      "
    >
      {children}
    </div>
  )
}