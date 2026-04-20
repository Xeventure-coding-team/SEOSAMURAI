// components/websites/websites-table.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
    MoreHorizontal,
    Search,
    Globe,
    Eye,
    Edit,
    Trash2,
    RefreshCw,
    Copy,
    ExternalLink,
    CheckCircle,
    XCircle,
    Star,
} from 'lucide-react';
import { getWebsiteUrl } from '@/lib/website-url';
import Link from 'next/link';

interface WebsiteCachedData {
    id: string;
    websiteId: string;
    businessInfo: any;
    reviews: any;
    photos: any;
    posts: any;
    lastSyncedAt: string | null;
    nextSyncAt: string | null;
    syncInterval: number;
    isSyncing: boolean;
    lastSyncError: string | null;
}

interface Website {
    id: string;
    subdomain: string;
    title: string;
    description: string | null;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    enabledSections: string[];
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    cachedData: WebsiteCachedData | null;
}

interface ApiResponse {
    websites: Website[];
}

export function WebsitesTable() {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    const fetchWebsites = async () => {
        try {
            setLoading(true);
            const response = await axios.get<ApiResponse>('/api/websites');
            setWebsites(response.data.websites);
        } catch (error) {
            console.error('Error fetching websites:', error);
            toast.error('Failed to load websites. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWebsites();
    }, []);

    const handleDelete = async () => {
        if (!selectedWebsite) return;

        const loadingToast = toast.loading('Deleting website...');

        try {
            await axios.delete(`/api/websites/${selectedWebsite.id}`);
            toast.success('Website deleted successfully', { id: loadingToast });
            fetchWebsites();
        } catch (error) {
            console.error('Error deleting website:', error);
            toast.error('Failed to delete website', { id: loadingToast });
        } finally {
            setDeleteDialogOpen(false);
            setSelectedWebsite(null);
        }
    };

    const handleSync = async (websiteId: string) => {
        setSyncingId(websiteId);
        const loadingToast = toast.loading('Starting sync process...');

        try {
            await axios.post(`/api/websites/${websiteId}/sync`);
            toast.success('Sync started successfully! Data will be updated shortly.', {
                id: loadingToast,
                icon: '🔄'
            });
            setTimeout(() => fetchWebsites(), 2000);
        } catch (error) {
            console.error('Error syncing website:', error);
            toast.error('Failed to start sync. Please try again.', { id: loadingToast });
        } finally {
            setSyncingId(null);
        }
    };

    const handlePublishToggle = async (website: Website) => {
        const action = !website.isPublished ? 'publishing' : 'unpublishing';
        const loadingToast = toast.loading(`${action} website...`);

        try {
            await axios.patch(`/api/websites/${website.id}`, {
                isPublished: !website.isPublished,
            });
            toast.success(`Website ${!website.isPublished ? 'published' : 'unpublished'} successfully!`, {
                id: loadingToast,
                icon: !website.isPublished ? '🎉' : '📝'
            });
            fetchWebsites();
        } catch (error) {
            console.error('Error toggling publish status:', error);
            toast.error(`Failed to ${action} website. Please try again.`, { id: loadingToast });
        }
    };

    const handleCopyUrl = (subdomain: string) => {
        const url = getWebsiteUrl(subdomain);
        navigator.clipboard.writeText(url);
        toast.success('URL copied to clipboard!', {
            icon: '📋',
            duration: 2000
        });
    };



    const formatDate = (date: string | null) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getBusinessRating = (website: Website) => {
        const rating = website.cachedData?.businessInfo?.rating;
        if (!rating) return null;
        return (
            <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                {website.cachedData?.businessInfo?.userRatingCount && (
                    <span className="text-xs text-muted-foreground">
                        ({website.cachedData.businessInfo.userRatingCount})
                    </span>
                )}
            </div>
        );
    };

    const getLastSyncStatus = (website: Website) => {
        const data = website?.cachedData;

        if (!data?.lastSyncedAt) {
            return { text: 'Never synced', variant: 'secondary' as const };
        }

        if (data?.isSyncing) {
            return { text: 'Syncing...', variant: 'secondary' as const };
        }

        if (data?.lastSyncError) {
            return { text: 'Sync failed', variant: 'destructive' as const };
        }

        const diffMs = Date.now() - new Date(data.lastSyncedAt).getTime();

        const minutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // ⏱ Less than 1 hour
        if (minutes < 60) {
            return { text: `${minutes}m ago`, variant: 'default' as const };
        }

        // ⏱ Less than 24 hours
        if (hours < 24) {
            return { text: `${hours}h ago`, variant: 'default' as const };
        }

        // 📅 Days
        if (days > 7) {
            return { text: `Stale (${days}d ago)`, variant: 'destructive' as const };
        }

        if (days > 1) {
            return { text: `${days}d ago`, variant: 'warning' as const };
        }

        return { text: '1d ago', variant: 'default' as const };
    };

    const filteredWebsites = websites.filter(website =>
        website.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        website.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        website.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <LoadingSkeleton />;
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <CardTitle>Your Websites</CardTitle>
                            <CardDescription>
                                Manage all your business websites and their settings
                            </CardDescription>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search websites..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredWebsites.length === 0 ? (
                        <EmptyState searchTerm={searchTerm} />
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Website</TableHead>
                                        <TableHead>Business Info</TableHead>
                                        <TableHead>Subdomain</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Sync</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Sections</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredWebsites.map((website) => (
                                        <TableRow key={website.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {website.logoUrl ? (
                                                        <img
                                                            src={website.logoUrl}
                                                            alt={website.title}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="h-8 w-8 rounded-full flex items-center justify-center"
                                                            style={{ backgroundColor: website.primaryColor }}
                                                        >
                                                            <Globe className="h-4 w-4 text-white" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold">{website.title}</div>
                                                        {website.description && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                {website.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {getBusinessRating(website)}
                                                    {website.cachedData?.businessInfo?.formattedAddress && (
                                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                            {website.cachedData.businessInfo.formattedAddress}
                                                        </div>
                                                    )}
                                                    {website.cachedData?.businessInfo?.internationalPhoneNumber && (
                                                        <div className="text-xs">
                                                            {website.cachedData.businessInfo.internationalPhoneNumber}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                        {website.subdomain}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleCopyUrl(website.subdomain)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={website.isPublished ? "default" : "secondary"}
                                                        className="cursor-pointer"
                                                        onClick={() => handlePublishToggle(website)}
                                                    >
                                                        {website.isPublished ? (
                                                            <>
                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                Published
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Draft
                                                            </>
                                                        )}
                                                    </Badge>
                                                    {website.isPublished && website.publishedAt && (
                                                        <span className="text-xs text-muted-foreground hidden md:inline">
                                                            since {new Date(website.publishedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={getLastSyncStatus(website).variant}>
                                                        {getLastSyncStatus(website).text}
                                                    </Badge>
                                                    {syncingId === website.id && (
                                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                                    )}
                                                    {website.cachedData?.lastSyncError && (
                                                        <div className="text-xs text-red-600 truncate max-w-[150px]">
                                                            {website.cachedData.lastSyncError}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">
                                                    {formatDate(website.createdAt)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {website.enabledSections.slice(0, 2).map((section) => (
                                                        <Badge key={section} variant="outline" className="text-xs capitalize">
                                                            {section}
                                                        </Badge>
                                                    ))}
                                                    {website.enabledSections.length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{website.enabledSections.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => window.open(getWebsiteUrl(website.subdomain), '_blank')}
                                                        >
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            View Website
                                                        </DropdownMenuItem>
                                                        <Link href={`/app/websites/sync/${website.id}`}>
                                                            <DropdownMenuItem>
                                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                                Sync Data
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <DropdownMenuSeparator />
                                                        <Link href={`/app/websites/edit/${website.id}`}>
                                                            <DropdownMenuItem>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit Website
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => {
                                                                setSelectedWebsite(website);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the website
                            "{selectedWebsite?.title}" and remove all associated data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function LoadingSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-7 w-40 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-72" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {[...Array(8)].map((_, i) => (
                                    <TableHead key={i}>
                                        <Skeleton className="h-4 w-20" />
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(8)].map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ searchTerm }: { searchTerm: string }) {
    return (
        <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No websites found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm
                    ? `No websites matching "${searchTerm}"`
                    : "Get started by creating your first website"}
            </p>
            {!searchTerm && (
                <Button className="mt-4">
                    Create Website
                </Button>
            )}
        </div>
    );
}