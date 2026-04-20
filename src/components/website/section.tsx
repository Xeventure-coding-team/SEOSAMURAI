export function Section({
  id,
  title,
  primary,
  children,
  action,
}: {
  id: string;
  title: string;
  primary: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className="py-12 md:py-16 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: primary }} />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{title}</h2>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function ContactRow({
  icon,
  label,
  primary,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 p-5 hover:bg-gray-50 transition-colors group">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform"
        style={{ backgroundColor: primary }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}
