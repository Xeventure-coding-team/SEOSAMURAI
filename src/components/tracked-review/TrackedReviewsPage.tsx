"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Trash2, Star } from 'lucide-react';
import { useGMBStore } from '@/store/gmbStore';
import useLocationStore from '@/store/locationStore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface DeletedReview {
    id: string;
    reviewId: string;
    reviewerName: string | null;
    rating: number | null;
    comment: string | null;
    deletedAt: Date | null;
    createTime: Date | null;
    rawData?: any;
    locationName?: string;
    profilePhotoUrl?: string | null;
}

interface TrackingResult {
    success: boolean;
    totalFetched: number;
    newReviews: number;
    deletedReviews: number;
    deletedReviewsList: DeletedReview[];
    error?: string;
}

export default function TrackedReviewsPage() {
    const [isTracking, setIsTracking] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [deletedReviews, setDeletedReviews] = useState<DeletedReview[]>([]);
    const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const accountId = useGMBStore((state) => state.accountId);
    const accessToken = useGMBStore((state) => state.accessToken);

    useEffect(() => {
        // Only load deleted reviews when accountId is available
        if (accountId) {
            loadDeletedReviews();
        }
    }, [accountId]);

    const loadDeletedReviews = async () => {
        if (!accountId) return;
        
        setIsLoading(true);
        try {
            const response = await fetch(`/api/tracked-review/deleted?accountId=${accountId}`);
            if (response.ok) {
                const data = await response.json();
                setDeletedReviews(data.deletedReviews || []);
            } else {
                console.error("Failed to load deleted reviews");
            }
        } catch (err) {
            console.error("Error loading deleted reviews:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrackNow = async () => {
        setIsTracking(true);
        setError(null);
        setTrackingResult(null);

        try {
            const response = await fetch('/api/tracked-review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId,
                    accessToken,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to track reviews');
            }

            const result = await response.json();
            setTrackingResult(result);
            
            // Reload deleted reviews after tracking to get fresh data
            await loadDeletedReviews();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsTracking(false);
        }
    };

    const renderStars = (rating: number | null) => {
        if (!rating) return null;
        return (
            <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                    />
                ))}
            </div>
        );
    };

    const getInitials = (name: string | null) => {
        if (!name) return 'A';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getProfileImage = (review: DeletedReview) => {
        // Use profilePhotoUrl from the review if available, otherwise try rawData
        return review.profilePhotoUrl || review.rawData?.reviewer?.profilePhotoUrl || null;
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Tracked Reviews</h1>
                <p className="text-muted-foreground">
                    Track and monitor deleted Google My Business reviews
                </p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Review Tracking</CardTitle>
                    <CardDescription>
                        Click "Track Now" to update your reviews and check if any have been removed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleTrackNow}
                        disabled={isTracking || !accountId}
                        className="w-full sm:w-auto"
                    >
                        {isTracking ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Tracking Reviews...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Track Now
                            </>
                        )}
                    </Button>

                    {trackingResult && !error && (
                        <Alert className="mt-4">
                            <AlertDescription>
                                <div className="space-y-1">
                                    <p><strong>Total Reviews Fetched:</strong> {trackingResult.totalFetched}</p>
                                    <p><strong>New Reviews Saved:</strong> {trackingResult.newReviews}</p>
                                    <p><strong>Deleted Reviews Found:</strong> {trackingResult.deletedReviews}</p>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Deleted Reviews</CardTitle>
                            <CardDescription>
                                Reviews that have been removed from Google My Business
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-lg">
                            {deletedReviews.length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <Loader2 className="mx-auto h-12 w-12 mb-3 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">Loading deleted reviews...</p>
                        </div>
                    ) : deletedReviews.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Trash2 className="mx-auto h-12 w-12 mb-3 opacity-20" />
                            <p>No deleted reviews found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {deletedReviews.map((review) => (
                                <Card key={review.id} className="border-destructive/50 bg-destructive/5">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-10 w-10 flex-shrink-0">
                                                <AvatarImage 
                                                    src={getProfileImage(review)} 
                                                    alt={review.reviewerName || 'Anonymous'} 
                                                />
                                                <AvatarFallback className="bg-primary/10 text-primary text-sm ">
                                                    {getInitials(review.reviewerName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-sm truncate capitalize">
                                                            {review.reviewerName || 'Anonymous'}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {renderStars(review.rating)}
                                                        </div>
                                                        {review.locationName && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {review.locationName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                                                        Deleted
                                                    </Badge>
                                                </div>
                                                
                                                {review.comment && (
                                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                                                        {review.comment}
                                                    </p>
                                                )}
                                                
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                    {review.createTime && (
                                                        <span>
                                                            Posted: {new Date(review.createTime).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {review.deletedAt && (
                                                        <span className="text-destructive">
                                                            Deleted: {new Date(review.deletedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}