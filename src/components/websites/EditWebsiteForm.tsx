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
    Type,
    ImageIcon,
    Upload,
    X,
    MessageSquare,
    Star,
    Clock,
    MapPin,
    Mail,
    AlertCircle,
} from 'lucide-react';
import { usePageStore } from '@/store/usePageStore';

const formSchema = z.object({
    title: z.string().min(1, 'Business title is required'),
    description: z.string().optional(),
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

interface EditWebsiteFormProps {
    websiteId: string;
    initialData: {
        title: string;
        description?: string;
        logoUrl?: string;
        primaryColor: string;
        secondaryColor: string;
        fontFamily: string;
        enabledSections: string[];
    };
    onSuccess?: () => void;
}

type FormValues = z.input<typeof formSchema>;

export function EditWebsiteForm({ websiteId, initialData, onSuccess }: EditWebsiteFormProps) {
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(initialData.logoUrl || null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const router = useRouter();
    

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData.title,
            description: initialData.description || '',
            primaryColor: initialData.primaryColor || '#10b981',
            secondaryColor: initialData.secondaryColor || '#f59e0b',
            fontFamily: initialData.fontFamily || 'Inter',
            enabledSections: initialData.enabledSections || ['hero', 'reviews', 'gallery', 'contact'],
        },
    });


    const setPageName = usePageStore((state) => state.setPageName);


   useEffect(() => {
     setPageName('Edit Website')
   },[])


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
        setLoading(true);
        const loadingToast = toast.loading('Updating website...');

        try {
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description || '');
            formData.append('primaryColor', data.primaryColor);
            formData.append('secondaryColor', data.secondaryColor);
            formData.append('fontFamily', data.fontFamily);
            formData.append('enabledSections', JSON.stringify(data.enabledSections));

            if (logoFile) {
                formData.append('logo', logoFile);
            }

            const response = await axios.put(
                `/api/websites/${websiteId}`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            );

            toast.success('Website updated successfully!', { id: loadingToast });

            if (onSuccess) {
                onSuccess();
            } else {
                router.refresh();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update website', { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Section */}
                <div className="lg:col-span-2 space-y-8">
                    <Form {...form}>
                        <form id="edit-website-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* Step 1: Website Details */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                            1
                                        </div>
                                        <div>
                                            <CardTitle>Website Details</CardTitle>
                                            <CardDescription>Update your website information</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Business Title */}
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Business Title *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="My Business Name" />
                                                </FormControl>
                                                <FormDescription>
                                                    The name displayed on your website
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
                                                    Brief description of your business
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Logo Upload */}
                                    <FormItem>
                                        <FormLabel>Business Logo</FormLabel>
                                        <FormControl>
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-6">
                                                    {logoPreview ? (
                                                        <div className="relative">
                                                            <img
                                                                src={logoPreview}
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
                                                                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
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
                                </CardContent>
                            </Card>

                            {/* Step 2: Design */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                            2
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

                                    {/* Font Family */}
                                    <FormField
                                        control={form.control}
                                        name="fontFamily"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Type className="h-4 w-4" />
                                                    Font Family
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'Inter'}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12">
                                                            <SelectValue placeholder="Inter" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {fontOptions.map((font) => (
                                                            <SelectItem key={font.value} value={font.value}>
                                                                <div className="flex items-center justify-between gap-6">
                                                                    <span style={{ fontFamily: font.fontFamily }}>
                                                                        {font.label}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {font.category}
                                                                    </span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Choose a font that matches your brand
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* Step 3: Content Sections */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                            3
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
                                            className="h-full w-full object-cover rounded-md"
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

                            {/* Font Preview */}
                            {form.watch('fontFamily') && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Font Style</Label>
                                    <div
                                        className="p-4 rounded border border-input bg-muted"
                                        style={{
                                            fontFamily: fontOptions.find(f => f.value === form.watch('fontFamily'))?.fontFamily
                                        }}
                                    >
                                        <p className="text-sm font-medium">The quick brown fox jumps</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {form.watch('fontFamily')}
                                        </p>
                                    </div>
                                </div>
                            )}

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

                            {/* Update Button */}
                            <Button
                                type="submit"
                                form="edit-website-form"
                                disabled={loading}
                                className="w-full h-10 text-base"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        Save Changes
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