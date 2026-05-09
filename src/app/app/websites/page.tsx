import { WebsitesTable } from '@/components/websites/websites-table';
import DashboardLayout from '@/app/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { stackServerApp } from '@/stack';
import { Metadata } from 'next';
import { UsageGate } from '@/components/usage-gate';
import { SlotBadge } from '@/components/slot-badge';

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
            <div className="container mx-auto py-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Websites</h1>
                        <p className="text-muted-foreground">
                            Manage and monitor all your business websites
                        </p>
                    </div>

                    <div className='flex gap-4 items-center flex-wrap'>
                        <SlotBadge slot="websites" label="Websites" />

                        <UsageGate slot="websites">
                            <Button asChild size="lg" className="shrink-0">
                                <Link href="/app/websites/create">
                                    <Plus className="h-5 w-5 mr-2" />
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