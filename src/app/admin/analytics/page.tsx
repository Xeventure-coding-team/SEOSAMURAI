import PageHeader from "@/components/admin/page-header";
import AnalyticsDashboard from "@/components/admin/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Track visitors, sessions, and engagement over the last 30 days."
      />
      <AnalyticsDashboard />
    </div>
  );
}