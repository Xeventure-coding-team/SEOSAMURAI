import { WebsitesTable } from '@/components/websites/websites-table';
import DashboardLayout from '@/app/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Globe, Plus } from 'lucide-react';
import Link from 'next/link';
import { stackServerApp } from '@/stack';
import { Metadata } from 'next';
import { UsageGate } from '@/components/usage-gate';
import { SlotBadge } from '@/components/slot-badge';
import { SlotInfoBanner } from '@/components/SlotInfoBanner';
import { UsageBadge } from '@/components/usage-badge';

export const metadata: Metadata = {
    title: "Websites | Rankerly",
};

export default async function page() {
    const user = await stackServerApp.getUser();

    if (!user) {
        return (
            <DashboardLayout>
                <div className="container mx-auto py-6">
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Please sign in to view your websites</p>
                        <Link href="/signin">
                            <Button className="mt-4">Sign In</Button>
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>




            <div className="container mx-auto space-y-6">

                <SlotInfoBanner
                    slot="websites"
                    resourceName="Website"
                    upgradeHref="/app/settings/billing"
                />

                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                            <Globe className="h-3.5 w-3.5" />
                            Website Management
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight">
                            Business websites
                        </h1>

                        <p className="mt-4 max-w-2xl text-muted-foreground">
                            Create, manage, and monitor websites connected to your business locations.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                    
                        <UsageGate slot="websites">
                            <Button asChild>
                                <Link href="/app/websites/create">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Website
                                </Link>
                            </Button>
                        </UsageGate>
                    </div>
                </div>
                <WebsitesTable />
            </div>
        </DashboardLayout>
    );
}