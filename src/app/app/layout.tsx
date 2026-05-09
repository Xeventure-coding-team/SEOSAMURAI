import { stackServerApp } from "@/stack";
import { getUsageData } from "@/lib/get-usage-data";
import SWRFallbackProvider from "@/components/SWRFallbackProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await stackServerApp.getUser();
  const usageFallback = user ? await getUsageData(user.id) : null;

  return (
    <SWRFallbackProvider usageFallback={usageFallback}>
      {children}
    </SWRFallbackProvider>
  );
}   