import DashboardLayout from '@/app/layouts/DashboardLayout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { stackServerApp } from '@/stack';
import { EditWebsiteForm } from '@/components/websites/EditWebsiteForm';
import { Metadata } from 'next';
import { prisma } from '../../../../../../lib/prisma';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export const metadata: Metadata = {
    title: "Edit Website | Rankerly",
};


// Function to fetch website data
async function fetchWebsiteData(websiteId: string, userId: string) {
    try {
        const website = await prisma.website.findFirst({
            where: { id: websiteId, userId },
            include: { cachedData: true },
        });

        return website;
    } catch (error) {
        console.error('Error fetching website:', error);
        return null;
    }
}

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

    // Fetch the website data
    const websiteData = await fetchWebsiteData(websiteId, userId);

    if (!websiteData) {
        return (
            <DashboardLayout>
                <div className="container mx-auto py-6">
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Website not found</p>
                        <Link href="/app/websites">
                            <Button className="mt-4">Back to Websites</Button>
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

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
                        <h1 className="text-3xl font-bold tracking-tight">Edit Website</h1>
                        <p className="text-muted-foreground mt-1">
                            Edit your website details for {websiteData.name || 'your website'}
                        </p>
                    </div>
                </div>

                {/* Edit Form with website data */}
                <EditWebsiteForm
                    websiteId={websiteId}
                    userId={userId}
                    initialData={websiteData}
                    onSuccessRedirect="/app/websites"
                />
            </div>
        </DashboardLayout>
    );
}