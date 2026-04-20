import DashboardLayout from '@/app/layouts/DashboardLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { stackServerApp } from '@/stack';
import { Metadata } from 'next';
import WebsiteSyncDashboard from '@/components/websites/WebsiteSyncDashboard';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export const metadata: Metadata = {
    title: "Sync Website | Rankerly",
};

export default async function page({ params }: PageProps) {
    const { id: websiteId } = await params;

    const user = await stackServerApp.getUser();


    if (!user) {
        return (
            <DashboardLayout>
                <div className="container mx-auto py-6">
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Please sign in to edit a website</p>
                        <Link href="/signin">
                            <Button className="mt-4">Sign In</Button>
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const userId = user.id;

    return (
        <DashboardLayout>
            <div className="container mx-auto py-6 space-y-6">
                {/* Header with back button */}
                <div className="flex items-center gap-4">
                    <Link href="/app/websites">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Sync Website</h1>
                        <p className="text-muted-foreground mt-1">
                            Sync your website
                        </p>
                    </div>
                </div>

                <WebsiteSyncDashboard websiteId={websiteId} />

            </div>
        </DashboardLayout>
    );
}