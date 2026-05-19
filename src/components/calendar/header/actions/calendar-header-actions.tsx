export default function CalendarHeaderActions({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="
        flex flex-wrap
        w-full sm:w-auto
        items-center
        justify-between sm:justify-start
        gap-2
      "
    >
      {children}
    </div>
  )
}