// components/websites/create-website-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Loader2,
    Building2,
    MapPin,
    Phone,
    Star,
    Image as ImageIcon,
    MessageSquare,
    Mail,
    Clock,
    Store,
    AlertCircle,
    Upload,
    X,
    Type,
    Globe,
    Lock,
} from 'lucide-react';
import { useGMBStore } from '@/store/gmbStore';
import { usePageStore } from '@/store/usePageStore';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    locationId: z.string().min(1, 'Please select a location'),
    placeId: z.string().optional(),
    subdomain: z.string()
        .min(3, 'Subdomain must be at least 3 characters')
        .max(50, 'Subdomain must be less than 50 characters')
        .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
    title: z.string().optional(),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
    enabledSections: z.array(z.string()).default(['hero', 'reviews', 'gallery', 'contact']),
});

const sectionOptions = [
    { id: 'hero', label: 'Hero Section', icon: Star },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'about', label: 'About', icon: Building2 },
    { id: 'hours', label: 'Business Hours', icon: Clock },
    { id: 'map', label: 'Location Map', icon: MapPin },
];

const fontOptions = [
    { value: 'Inter', label: 'Inter', category: 'Sans-serif', fontFamily: 'var(--font-inter)' },
    { value: 'Outfit', label: 'Outfit', category: 'Sans-serif', fontFamily: 'var(--font-outfit)' },
    { value: 'Roboto', label: 'Roboto', category: 'Sans-serif', fontFamily: '"Roboto"' },
    { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif', fontFamily: '"Open Sans"' },
    { value: 'Poppins', label: 'Poppins', category: 'Sans-serif', fontFamily: '"Poppins"' },
    { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif', fontFamily: '"Montserrat"' },
    { value: 'Lato', label: 'Lato', category: 'Sans-serif', fontFamily: '"Lato"' },
    { value: 'Nunito', label: 'Nunito', category: 'Sans-serif', fontFamily: '"Nunito"' },
    { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif', fontFamily: '"Playfair Display"' },
    { value: 'Merriweather', label: 'Merriweather', category: 'Serif', fontFamily: '"Merriweather"' },
    { value: 'DM Sans', label: 'DM Sans', category: 'Sans-serif', fontFamily: '"DM Sans"' },
    { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'Sans-serif', fontFamily: '"Plus Jakarta Sans"' },
    { value: 'Space Grotesk', label: 'Space Grotesk', category: 'Sans-serif', fontFamily: '"Space Grotesk"' },
];

interface Location {
    name: string;
    displayName?: string;
    locationName?: string;
    metadata?: {
        locationName?: string;
    };
}

interface CreateWebsiteFormProps {
    userId: string;
    onSuccessRedirect?: string;
    onSuccess?: () => void;
}

type FormValues = z.input<typeof formSchema>

export function CreateWebsiteForm({ userId, onSuccessRedirect, onSuccess }: CreateWebsiteFormProps) {
    const [loading, setLoading] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocationData, setSelectedLocationData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const setPageName = usePageStore((state) => state.setPageName);

    useEffect(() => {
        setPageName('Create New Website');
    }, [])


    const router = useRouter();
    const gmbAccountId = useGMBStore((state) => state.accountId);
    const accessToken = useGMBStore((state) => state.accessToken);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            locationId: '',
            placeId: '',
            subdomain: '',
            title: '',
            description: '',
            logoUrl: '',
            primaryColor: '#10b981',
            secondaryColor: '#f59e0b',
            fontFamily: 'Inter',
            enabledSections: ['hero', 'reviews', 'gallery', 'contact'],
        },
    });

    const getLocationDisplayName = (location: any) => {
        return location.locationData?.name ||
            location.displayName ||
            location.locationName ||
            location.metadata?.locationName ||
            location.name?.split('/').pop() ||
            'Unnamed Location';
    };

    const fetchLocations = async () => {
        if (!accessToken) {
            toast.error("Access token missing. Please re-authenticate GMB.");
            return;
        }

        if (!gmbAccountId) {
            toast.error("No GMB account selected. Please select an account first.");
            return;
        }

        try {
            setLoadingLocations(true);
            setError(null);

            const response = await axios.get(`/api/gmb/locations`, {
                params: {
                    accessToken: accessToken,
                    accountId: gmbAccountId
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.data.accounts && response.data.accounts.length > 0) {
                setLocations(response.data.accounts);
            } else {
                toast.error("No business locations found. Check your GMB account.");
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || "Failed to fetch locations";
            toast.error(`Unable to load locations: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            setLoadingLocations(false);
        }
    };

    const fetchLocationDetails = async (locationName: string) => {
        if (!accessToken || !gmbAccountId) {
            toast.error("Missing credentials. Please re-authenticate GMB.");
            return;
        }

        try {
            setLoadingDetails(true);
            setError(null);



            const response = await axios.get(`/api/gmb/location`, {
                params: {
                    location_name: locationName,
                    access_token: accessToken,
                    gmb_account_id: gmbAccountId,
                    with_posts: true
                }
            });

            if (response.data) {
                setSelectedLocationData(response.data);

                // Extract business info from the response
                const locationData = response.data.location?.locationData || response.data.location?.data || {};
                const businessName = locationData.name || response.data.location?.location || 'My Business';
                const description = response.data.location?.description || '';
                const address = locationData.formatted_address || '';
                const phone = response.data.location?.phoneNumbers?.primaryPhone || '';
                const rating = response.data.reviews?.averageRating || locationData.rating || null;
                const totalReviews = response.data.reviews?.totalReviewCount || 0;
                const placeId = response.data.location?.metadata?.placeId || '';

                // Generate subdomain from business name
                const suggestedSubdomain = businessName
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                    .substring(0, 50);

                form.setValue('subdomain', suggestedSubdomain);
                form.setValue('title', businessName);
                form.setValue('description', description);
                form.setValue('placeId', placeId);

                toast.success(`${businessName} selected! You can now customize your website.`);
            } else {
                toast.error("No details found for this location.");
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || "Failed to fetch location details";
            toast.error(`Unable to load location details: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleLocationChange = async (locationName: string) => {
        form.setValue('locationId', locationName);
        await fetchLocationDetails(locationName);
    };

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo must be less than 2MB');
            return;
        }

        // Store the file and show preview
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
    };

    const onSubmit = async (data: FormValues) => {
        if (!selectedLocationData && data.locationId) {
            await fetchLocationDetails(data.locationId);
            if (!selectedLocationData) {
                toast.error("Please wait for location details to load");
                return;
            }
        }

        const currentPlaceId = form.getValues('placeId');
        setLoading(true);
        const loadingToast = toast.loading('Creating website and importing business data...');

        try {
            const formData = new FormData();
            // REQUIRED FIELDS
            formData.append('userId', userId || '');
            formData.append('placeId', currentPlaceId || data.placeId || '');
            formData.append('subdomain', data.subdomain);

            // Optional fields
            if (data.locationId) formData.append('locationId', data.locationId);
            if (gmbAccountId) formData.append('accountId', gmbAccountId);
            if (data.title) formData.append('title', data.title);
            if (data.description) formData.append('description', data.description);
            if (data.primaryColor) formData.append('primaryColor', data.primaryColor);
            if (data.secondaryColor) formData.append('secondaryColor', data.secondaryColor);
            if (data.fontFamily) formData.append('fontFamily', data.fontFamily);
            if (data.enabledSections) formData.append('enabledSections', JSON.stringify(data.enabledSections));
            if (logoFile) formData.append('logo', logoFile);

            // ✅ SEND FULL DATA (NO FILTERING)
            if (selectedLocationData) {

                // ✅ Get all reviews safely
                const allReviews =
                    selectedLocationData.location.reviews?.reviews || [];

                // ✅ Rating helper
                const getRating = (review: any) => {
                    if (review.rating) return Number(review.rating);
                    if (review.starRating === 'FIVE') return 5;
                    if (review.starRating === 'FOUR') return 4;
                    if (review.starRating === 'THREE') return 3;
                    if (review.starRating === 'TWO') return 2;
                    if (review.starRating === 'ONE') return 1;
                    return 0;
                };

                // ✅ Top 10 reviews
                const top10Reviews = allReviews
                    .filter(r => getRating(r) >= 4)
                    .sort((a, b) => {
                        const ratingDiff = getRating(b) - getRating(a);
                        if (ratingDiff !== 0) return ratingDiff;

                        const timeA = new Date(a.createTime || a.time || 0).getTime();
                        const timeB = new Date(b.createTime || b.time || 0).getTime();
                        return timeB - timeA;
                    })
                    .slice(0, 10);

                // ✅ Top 10 media
                const top10Media =
                    selectedLocationData.location.media?.mediaItems?.slice(0, 10) || [];

                const cleanLocation = { ...selectedLocationData.location };

                // ❌ remove heavy / duplicate fields
                delete cleanLocation.media;
                delete cleanLocation.reviews

                const payload = {
                    location: cleanLocation,
                    locationData: selectedLocationData.location.locationData,

                    reviews: top10Reviews,
                    media: top10Media,
                    posts: selectedLocationData.scheduledPosts || [],

                    businessInfo: {
                        displayName:
                            selectedLocationData.location?.locationData?.name ||
                            selectedLocationData.location?.data?.name,

                        formattedAddress:
                            selectedLocationData.location?.locationData?.formatted_address ||
                            selectedLocationData.location?.data?.formatted_address,

                        phoneNumber: selectedLocationData.location?.phoneNumbers?.primaryPhone,

                        websiteUri: selectedLocationData.location?.website,

                        rating:
                            selectedLocationData.location?.rating ||
                            selectedLocationData.reviews?.averageRating,

                        totalReviewCount:
                            selectedLocationData.reviews?.totalReviewCount ||
                            allReviews.length,

                        description:
                            data.description ||
                            selectedLocationData.location?.data?.profile?.description,

                        openingHours:
                            selectedLocationData.location?.opening_hours ||
                            selectedLocationData.location?.data?.opening_hours,
                    }
                };


                // ✅ IMPORTANT: send as separate fields (BEST PRACTICE)
                formData.append('businessInfo', JSON.stringify(payload.businessInfo));
                formData.append('reviews', JSON.stringify(payload.reviews));
                formData.append('media', JSON.stringify(payload.media));
                formData.append('posts', JSON.stringify(payload.posts));
                formData.append('location', JSON.stringify(payload.location));
                formData.append('locationData', JSON.stringify(payload.locationData));
            }

            // ✅ FIX: removed wrong return
            const response = await axios.post('/api/websites', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success('Website created successfully!', { id: loadingToast });

            form.reset();
            setSelectedLocationData(null);
            setLocations([]);
            setLogoPreview(null);
            setLogoFile(null);

            if (onSuccess) {
                router.push(`/app/websites/${response.data.website.id}`);
            }

        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create website', { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (accessToken && gmbAccountId && locations.length === 0 && !loadingLocations) {
            fetchLocations();
        }
    }, [accessToken, gmbAccountId]);

    if (!gmbAccountId || !accessToken) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                            <AlertCircle className="h-12 w-12 text-yellow-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">GMB Account Required</h3>
                        <p className="text-muted-foreground mb-4">
                            Please connect your Google My Business account first to create a website.
                        </p>
                        <Button onClick={() => router.push('/settings/integrations')}>
                            Connect GMB Account
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Section */}
                <div className="lg:col-span-2 space-y-8">
                    <Form {...form}>
                        <form id="create-website-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* Step 1: Location Selection */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                            1
                                        </div>
                                        <div>
                                            <CardTitle>Select Your Business</CardTitle>
                                            <CardDescription>Choose your Google My Business location</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="locationId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Business Location *</FormLabel>
                                                <Select
                                                    onValueChange={handleLocationChange}
                                                    value={field.value}
                                                    disabled={loadingLocations || loadingDetails}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={
                                                                loadingLocations
                                                                    ? "Loading locations..."
                                                                    : "Choose your business location"
                                                            } />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {locations.map((location) => {
                                                            const isLocked = location.is_active === false;

                                                            return (
                                                                <SelectItem
                                                                    key={location.id}
                                                                    value={location.id}
                                                                    disabled={isLocked}
                                                                    className={cn(
                                                                        isLocked && "opacity-60 cursor-not-allowed"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {isLocked ? (
                                                                            <Lock className="h-4 w-4 text-muted-foreground/50" />
                                                                        ) : (
                                                                            <Store className="h-4 w-4" />
                                                                        )}
                                                                        <span className={cn(
                                                                            isLocked && "line-through text-muted-foreground/60"
                                                                        )}>
                                                                            {getLocationDisplayName(location)}
                                                                        </span>
                                                                        {isLocked && (
                                                                            <span className="text-xs text-muted-foreground/50 ml-auto">
                                                                                Locked
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Your business data will be imported from Google My Business
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Loading State */}
                                    {loadingDetails && (
                                        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                                    Fetching business details...
                                                </p>
                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                    Importing data from Google My Business
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Business Information Preview */}
                                    {selectedLocationData && !loadingDetails && (
                                        <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                                            <h4 className="flex items-center gap-2 font-semibold text-green-900 dark:text-green-100">
                                                <Building2 className="h-4 w-4" />
                                                Business Information
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3">
                                                    <Store className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Business Name</p>
                                                        <p className="font-medium">
                                                            {selectedLocationData.location?.locationData?.name ||
                                                                selectedLocationData.location?.location}
                                                        </p>
                                                    </div>
                                                </div>

                                                {selectedLocationData.location?.locationData?.formatted_address && (
                                                    <div className="flex items-start gap-3">
                                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Address</p>
                                                            <p className="text-sm">{selectedLocationData.location.locationData.formatted_address}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedLocationData.location?.phoneNumbers?.primaryPhone && (
                                                    <div className="flex items-start gap-3">
                                                        <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Phone</p>
                                                            <p className="text-sm">{selectedLocationData.location.phoneNumbers.primaryPhone}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedLocationData.reviews && (
                                                    <div className="flex items-center gap-3">
                                                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Rating</p>
                                                            <p className="text-sm font-medium">
                                                                {selectedLocationData.reviews.averageRating?.toFixed(1)} ★ ({selectedLocationData.reviews.totalReviewCount} reviews)
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Step 2: Website Details */}
                            {selectedLocationData && !loadingDetails && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                                2
                                            </div>
                                            <div>
                                                <CardTitle>Website Details</CardTitle>
                                                <CardDescription>Configure your website information</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Subdomain */}
                                        <FormField
                                            control={form.control}
                                            name="subdomain"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subdomain *</FormLabel>
                                                    <FormControl>
                                                        <div className="flex">
                                                            <Input {...field} placeholder="my-business" className="rounded-r-none" />
                                                            <div className="bg-muted px-4 flex items-center rounded-r-md border border-l-0 text-muted-foreground text-sm font-medium">
                                                                .rankerly.app
                                                            </div>
                                                        </div>
                                                    </FormControl>
                                                    <FormDescription>
                                                        Your website will be available at <span className="font-mono font-semibold">{field.value || 'your-subdomain'}.rankerly.app</span>
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Business Title */}
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Business Title</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="My Business Name" />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Auto-filled from your Google My Business account
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Description */}
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Business Description</FormLabel>
                                                    <FormControl>
                                                        <textarea
                                                            {...field}
                                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            placeholder="Describe your business..."
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Auto-filled from your Google My Business profile
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Logo Upload */}
                                        <FormField
                                            control={form.control}
                                            name="logoUrl"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Business Logo</FormLabel>
                                                    <FormControl>
                                                        <div className="space-y-3">
                                                            <div className="flex items-start gap-6">
                                                                {logoPreview || field.value ? (
                                                                    <div className="relative">
                                                                        <img
                                                                            src={logoPreview || field.value}
                                                                            alt="Logo preview"
                                                                            className="h-24 w-24 rounded-lg object-cover border shadow-sm"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={removeLogo}
                                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition shadow-md"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 flex-shrink-0">
                                                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                                    </div>
                                                                )}

                                                                <div className="flex-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => document.getElementById('logo-upload')?.click()}
                                                                        disabled={uploadingLogo}
                                                                    >
                                                                        {uploadingLogo ? (
                                                                            <>
                                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                                Uploading...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Upload className="mr-2 h-4 w-4" />
                                                                                {logoPreview || field.value ? 'Change Logo' : 'Upload Logo'}
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                    <input
                                                                        id="logo-upload"
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={handleLogoSelect}
                                                                        disabled={uploadingLogo}
                                                                    />
                                                                    <p className="text-xs text-muted-foreground mt-2">
                                                                        Square image recommended • Max 2MB
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 3: Design */}
                            {selectedLocationData && !loadingDetails && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                                3
                                            </div>
                                            <div>
                                                <CardTitle>Design & Theme</CardTitle>
                                                <CardDescription>Customize your website appearance</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Colors */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm">Colors</h4>
                                            <div className="grid grid-cols-2 gap-6">
                                                <FormField
                                                    control={form.control}
                                                    name="primaryColor"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Primary Color</FormLabel>
                                                            <FormControl>
                                                                <div className="flex gap-3 items-center">
                                                                    <Input
                                                                        {...field}
                                                                        type="color"
                                                                        className="h-12 w-16 p-1 cursor-pointer rounded"
                                                                    />
                                                                    <Input
                                                                        {...field}
                                                                        type="text"
                                                                        placeholder="#10b981"
                                                                        className="flex-1"
                                                                    />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="secondaryColor"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Secondary Color</FormLabel>
                                                            <FormControl>
                                                                <div className="flex gap-3 items-center">
                                                                    <Input
                                                                        {...field}
                                                                        type="color"
                                                                        className="h-12 w-16 p-1 cursor-pointer rounded"
                                                                    />
                                                                    <Input
                                                                        {...field}
                                                                        type="text"
                                                                        placeholder="#f59e0b"
                                                                        className="flex-1"
                                                                    />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 4: Content Sections */}
                            {selectedLocationData && !loadingDetails && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                                4
                                            </div>
                                            <div>
                                                <CardTitle>Website Sections</CardTitle>
                                                <CardDescription>Choose which sections to include on your site</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={form.control}
                                            name="enabledSections"
                                            render={() => (
                                                <FormItem>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        {sectionOptions.map((section) => (
                                                            <FormField
                                                                key={section.id}
                                                                control={form.control}
                                                                name="enabledSections"
                                                                render={({ field }) => {
                                                                    const Icon = section.icon;
                                                                    const isChecked = field.value?.includes(section.id);
                                                                    return (
                                                                        <FormItem key={section.id} className="space-y-0">
                                                                            <FormControl>
                                                                                <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${isChecked
                                                                                    ? 'border-primary bg-primary/5'
                                                                                    : 'border-input hover:border-muted-foreground/50'
                                                                                    }`}>
                                                                                    <Checkbox
                                                                                        checked={isChecked}
                                                                                        onCheckedChange={(checked) => {
                                                                                            return checked
                                                                                                ? field.onChange([...(field.value || []), section.id])
                                                                                                : field.onChange(
                                                                                                    (field.value || []).filter(
                                                                                                        (value) => value !== section.id
                                                                                                    )
                                                                                                );
                                                                                        }}
                                                                                    />
                                                                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                                                                    <span className="font-medium text-sm">{section.label}</span>
                                                                                </label>
                                                                            </FormControl>
                                                                        </FormItem>
                                                                    );
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Hidden Fields */}
                            <FormField
                                control={form.control}
                                name="placeId"
                                render={({ field }) => (
                                    <FormItem className="hidden">
                                        <FormControl>
                                            <Input {...field} type="hidden" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />


                        </form>
                    </Form>
                </div>

                {/* Side Preview Card */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-8 h-fit">
                        <CardHeader className="border-b">
                            <CardTitle className="text-lg">Preview</CardTitle>
                            <CardDescription>Your website details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Logo Preview */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo</Label>
                                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                                    {logoPreview ? (
                                        <img
                                            src={logoPreview}
                                            alt="Logo preview"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : form.watch('logoUrl') ? (
                                        <img
                                            src={form.watch('logoUrl')}
                                            alt="Logo preview"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Building2 className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                            </div>

                            {/* Business Name */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business Name</Label>
                                <p className="font-semibold text-foreground">
                                    {form.watch('title') || 'Your Business Name'}
                                </p>
                            </div>

                            {/* Subdomain */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website URL</Label>
                                <div className="bg-muted p-3 rounded-lg text-sm break-all">
                                    <span className="text-muted-foreground">{form.watch('subdomain') || 'your-domain'}</span>
                                    <span className="text-muted-foreground">.rankerly.app</span>
                                </div>
                            </div>

                            {/* Colors Preview */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colors</Label>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-1">Primary</p>
                                        <div
                                            className="h-12 rounded border border-input"
                                            style={{ backgroundColor: form.watch('primaryColor') || '#10b981' }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-1">Secondary</p>
                                        <div
                                            className="h-12 rounded border border-input"
                                            style={{ backgroundColor: form.watch('secondaryColor') || '#f59e0b' }}
                                        />
                                    </div>
                                </div>
                            </div>

                           
                            {/* Sections Summary */}
                            {form.watch('enabledSections')?.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {form.watch('enabledSections').map((section) => {
                                            const sectionLabel = sectionOptions.find(s => s.id === section)?.label || section;
                                            return (
                                                <span
                                                    key={section}
                                                    className="bg-primary/10 text-primary text-xs rounded-full px-2.5 py-1 font-medium"
                                                >
                                                    {sectionLabel}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Create Button */}
                            <Button
                                type="submit"
                                form="create-website-form"
                                disabled={loading || !form.formState.isValid || !selectedLocationData}
                                className="w-full h-10 text-base"
                            >
                                {(loading || loadingDetails) ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Globe className="mr-2 h-4 w-4" />
                                        Create Website
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
