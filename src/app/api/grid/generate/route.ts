import { NextRequest, NextResponse } from 'next/server';

// Types
interface GridPoint {
    lat: number;
    lng: number;
    index: number;
}

interface RankingResult {
    gridPoint: GridPoint;
    rank: number | null;
    businessFound: boolean;
    results: GooglePlacesResult[];
    error?: string;
    matchDetails?: string;
    detectedBusinessName?: string;
}

interface GooglePlacesResult {
    id: string;
    displayName: {
        text: string;
        languageCode?: string;
    };
    formattedAddress?: string;
    location: {
        latitude: number;
        longitude: number;
    };
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    businessStatus?: string;
    priceLevel?: string;
    googleMapsUri?: string;
}

interface GridRankingRequest {
    center: {
        lat: number;
        lng: number;
    };
    gridSize: string;
    distance: string;
    keyword?: string;
    keywords?: string;
    keywordsList?: string[]; // Support for array of keywords
    businessName: string;
    businessPlaceId?: string;
    location_name: string;
    newAccessToken: string;
    alternativeNames?: string[];
    exactMatchOnly?: boolean;
    autoDetectBusinessName?: boolean;
}

interface GridRankingResponse {
    success: boolean;
    data?: {
        center: { lat: number; lng: number };
        gridSize: string;
        distance: string;
        keyword: string;
        businessName: string;
        originalBusinessName?: string;
        totalGridPoints: number;
        rankings: RankingResult[];
        summary: {
            averageRank: number;
            bestRank: number;
            worstRank: number;
            visibilityPercentage: number;
            topRankings: number;
            goodRankings: number;
            poorRankings: number;
            notFound: number;
        };
        metadata?: {
            detectedFromGMB?: boolean;
            autoDetectedNames?: string[];
        };
    };
    error?: string;
    message?: string;
}

// Validation helpers
function isValidCoordinate(lat: number, lng: number): boolean {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180 &&
        !isNaN(lat) && !isNaN(lng)
    );
}

function validateGridSize(gridSize: string): { isValid: boolean; error?: string } {
    if (!gridSize || typeof gridSize !== 'string') {
        return { isValid: false, error: 'Grid size must be a string' };
    }

    const parsed = parseGridSize(gridSize);
    if (parsed < 1 || parsed > 49) {
        return { isValid: false, error: 'Grid size must be between 1 and 49 points' };
    }

    const sqrt = Math.sqrt(parsed);
    if (!Number.isInteger(sqrt)) {
        return { isValid: false, error: 'Grid size must be a perfect square (e.g., 9, 25, 49)' };
    }

    return { isValid: true };
}

function validateDistance(distance: string): { isValid: boolean; error?: string } {
    if (!distance || typeof distance !== 'string') {
        return { isValid: false, error: 'Distance must be a string' };
    }

    const meters = distanceToMeters(distance);
    if (meters <= 0 || meters > 50000) {
        return { isValid: false, error: 'Distance must be between 0 and 50km (or equivalent)' };
    }

    return { isValid: true };
}

function distanceToMeters(distance: string): number {
    if (!distance) return 0;

    const match = distance.match(/^(\d*\.?\d+)\s*(mile|miles|km|kilometer|kilometers|m|meter|meters)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.includes('mile')) {
        return value * 1609.34;
    } else if (unit.includes('km') || unit.includes('kilometer')) {
        return value * 1000;
    } else if (unit.includes('m') || unit.includes('meter')) {
        return value;
    }

    return 0;
}

function parseGridSize(gridSize: string): number {
    if (!gridSize) return 0;
    const match = gridSize.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function generateGridPoints(
    center: { lat: number; lng: number },
    gridSize: number,
    radiusMeters: number
): GridPoint[] {
    const points: GridPoint[] = [];
    const gridSide = Math.sqrt(gridSize);

    const latStep = (radiusMeters / 111320) / (gridSide - 1) * 2;
    const lngStep = (radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180))) / (gridSide - 1) * 2;

    let index = 0;
    for (let i = 0; i < gridSide; i++) {
        for (let j = 0; j < gridSide; j++) {
            const lat = center.lat - (radiusMeters / 111320) + (i * latStep);
            const lng = center.lng - (radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180))) + (j * lngStep);

            points.push({
                lat: parseFloat(lat.toFixed(6)),
                lng: parseFloat(lng.toFixed(6)),
                index: index++
            });
        }
    }

    return points;
}

function preprocessText(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\b(the|and|&|inc|llc|ltd|limited|company|co|corp|corporation)\b/g, '')
        .trim();
}

function calculateAdvancedSimilarity(str1: string, str2: string): number {
    const processed1 = preprocessText(str1);
    const processed2 = preprocessText(str2);

    if (processed1 === processed2) return 1.0;

    if (processed1.includes(processed2) || processed2.includes(processed1)) {
        return 0.8;
    }

    const words1 = new Set(processed1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(processed2.split(' ').filter(w => w.length > 2));

    if (words1.size === 0 && words2.size === 0) return 0;
    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

function extractBusinessNames(businessNameInput: string): string[] {
    const names: string[] = [];

    if (businessNameInput.startsWith('locations/')) {
        return [businessNameInput];
    }

    names.push(businessNameInput);

    const variations = [
        businessNameInput.replace(/\b(pvt|ltd|limited|inc|llc|corporation|corp|co\.?)\b/gi, '').trim(),
        businessNameInput.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
    ];

    variations.forEach(variation => {
        if (variation && variation !== businessNameInput && !names.includes(variation)) {
            names.push(variation);
        }
    });

    return names;
}

// Enhanced Google Places search with better keyword handling
async function searchGooglePlaces(
    location: { lat: number; lng: number },
    keywords: string | string[],
    apiKey: string,
    accessToken: string,
    businessName?: string,
    gridDistance?: string // Add grid distance parameter
): Promise<GooglePlacesResult[]> {
    // Handle keywords - can be string, array, or derived from business name
    let searchQuery = '';

    if (Array.isArray(keywords) && keywords.length > 0) {
        searchQuery = keywords[0]; // Use first keyword for primary search
    } else if (typeof keywords === 'string' && keywords.trim()) {
        searchQuery = keywords.trim();
    } else if (businessName && !businessName.startsWith('locations/')) {
        searchQuery = businessName;
    }

    if (!searchQuery) {
        searchQuery = 'establishment'; // Default fallback
    }

    // Calculate dynamic search radius based on grid distance
    let searchRadius = 5000; // Default 5km
    
    if (gridDistance) {
        const gridRadiusMeters = distanceToMeters(gridDistance);
        // Use a percentage of grid radius as search radius, with min/max bounds
        searchRadius = Math.min(Math.max(gridRadiusMeters * 0.4, 2000), 50000); // Min 2km, Max 50km
        console.log(`Grid distance: ${gridDistance}, Grid radius: ${gridRadiusMeters}m, Search radius: ${searchRadius}m`);
    }

    const query = encodeURIComponent(searchQuery);
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${searchRadius}&type=establishment&key=${apiKey}&keyword=${query}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = null;

            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                // Error text is not JSON
            }

            let detailedError = `Google Places API error: ${response.status} ${response.statusText}`;

            switch (response.status) {
                case 403:
                    detailedError = `🔒 API ACCESS ERROR (403): Check if Places API is enabled and billing is active. Access Token: ${accessToken.substring(0, 20)}...`;
                    break;
                case 400:
                    detailedError = `❌ BAD REQUEST ERROR (400): ${errorData?.error_message || errorText}`;
                    break;
                case 429:
                    detailedError = `⏱️ RATE LIMIT ERROR (429): Too many requests. ${errorData?.error_message || errorText}`;
                    break;
                case 401:
                    detailedError = `🚫 AUTHENTICATION ERROR (401): Invalid access token or API key. ${errorData?.error_message || errorText}`;
                    break;
                default:
                    detailedError = `🔧 API ERROR (${response.status}): ${errorData?.error_message || errorText}`;
            }
            throw new Error(detailedError);
        }

        const data = await response.json();

        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response format from Google Places API');
        }

        if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(`Google Places API returned status: ${data.status} - ${data.error_message || 'Unknown error'}`);
        }

        const results = (data.results || []).map((place: any) => ({
            id: place.place_id,
            displayName: {
                text: place.name,
                languageCode: 'en'
            },
            formattedAddress: place.vicinity || place.formatted_address,
            location: {
                latitude: place.geometry?.location?.lat || 0,
                longitude: place.geometry?.location?.lng || 0
            },
            rating: place.rating,
            userRatingCount: place.user_ratings_total,
            types: place.types,
            businessStatus: place.business_status,
            priceLevel: place.price_level ? `PRICE_LEVEL_${place.price_level}` : undefined,
            googleMapsUri: `https://maps.google.com/maps/place/?q=place_id:${place.place_id}`
        }));

        console.log(`Found ${results.length} results at location ${location.lat},${location.lng} with radius ${searchRadius}m`);
        return results;
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('fetch')) {
                throw new Error(`Network error connecting to Google Places API: ${error.message}`);
            }
            throw error;
        }
        throw new Error(`Unknown error in Google Places API: ${String(error)}`);
    }
}

async function getBusinessNameFromLocationId(
    locationId: string,
    accessToken: string
): Promise<string | null> {
    if (!locationId.startsWith('locations/')) {
        return null;
    }

    try {
        const url = `https://mybusiness.googleapis.com/v4/${locationId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.locationName || data.name || null;
        }
    } catch (error) {
        console.warn(`Could not fetch business name from GMB API for ${locationId}:`, error);
    }

    return null;
}

function detectPotentialBusinessName(
    results: GooglePlacesResult[],
    center: { lat: number; lng: number },
    businessPlaceId?: string,
    maxDistance: number = 200
): string | null {
    // If we have a place ID, look for exact match first
    if (businessPlaceId) {
        const exactMatch = results.find(r => r.id === businessPlaceId);
        if (exactMatch) {
            return exactMatch.displayName?.text || null;
        }
    }

    // Find businesses closest to center that aren't generic locations
    const businessResults = results.filter(result => {
        const types = result.types || [];
        const isGenericLocation = types.includes('locality') || types.includes('political') || types.includes('administrative_area_level_1');
        const hasBusinessTypes = types.some(type =>
            ['store', 'restaurant', 'lodging', 'establishment', 'point_of_interest', 'business'].includes(type)
        );
        return !isGenericLocation && (hasBusinessTypes || result.rating !== undefined);
    });

    if (businessResults.length === 0) return null;

    const businessesWithDistance = businessResults.map(business => {
        const lat1 = center.lat;
        const lng1 = center.lng;
        const lat2 = business.location.latitude;
        const lng2 = business.location.longitude;

        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return { business, distance };
    });

    businessesWithDistance.sort((a, b) => a.distance - b.distance);

    if (businessesWithDistance[0] && businessesWithDistance[0].distance <= maxDistance) {
        return businessesWithDistance[0].business.displayName?.text || null;
    }

    return null;
}

// Enhanced business rank finding with Place ID priority
function findBusinessRank(
    results: GooglePlacesResult[],
    businessName: string,
    businessPlaceId?: string,
    alternativeNames?: string[],
    exactMatchOnly?: boolean,
    center?: { lat: number; lng: number },
    autoDetect?: boolean
): { rank: number | null; found: boolean; matchDetails: string; detectedBusinessName?: string } {
    if (!results || results.length === 0) {
        return { rank: null, found: false, matchDetails: 'No results to search' };
    }

    // PRIORITY 1: Check by Place ID (most accurate)
    if (businessPlaceId) {
        for (let i = 0; i < results.length; i++) {
            if (results[i].id === businessPlaceId) {
                return {
                    rank: i + 1,
                    found: true,
                    matchDetails: `Found by Place ID: ${businessPlaceId} -> "${results[i].displayName?.text}"`
                };
            }
        }
    }

    // PRIORITY 2: Auto-detection for GMB location IDs
    if (businessName.startsWith('locations/') && autoDetect && center) {
        const detectedName = detectPotentialBusinessName(results, center, businessPlaceId);
        if (detectedName) {

            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const resultName = result.displayName?.text;

                if (resultName && resultName.toLowerCase().trim() === detectedName.toLowerCase().trim()) {
                    return {
                        rank: i + 1,
                        found: true,
                        matchDetails: `Auto-detected and found: "${detectedName}" at rank ${i + 1}`,
                        detectedBusinessName: detectedName
                    };
                }
            }
        }
    }

    // PRIORITY 3: Name matching (if not a GMB location ID)
    if (!businessName.startsWith('locations/')) {
        const searchNames = extractBusinessNames(businessName);
        if (alternativeNames) {
            searchNames.push(...alternativeNames);
        }

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const resultName = result.displayName?.text;

            if (!resultName) continue;

            for (const searchName of searchNames) {
                if (!searchName || searchName.startsWith('locations/')) continue;

                // Exact match
                if (resultName.toLowerCase().trim() === searchName.toLowerCase().trim()) {
                    return {
                        rank: i + 1,
                        found: true,
                        matchDetails: `Exact match: "${resultName}" = "${searchName}"`
                    };
                }

                // Fuzzy matching if not exact only
                if (!exactMatchOnly) {
                    const similarity = calculateAdvancedSimilarity(resultName, searchName);

                    if (similarity >= 0.7) {
                        return {
                            rank: i + 1,
                            found: true,
                            matchDetails: `Fuzzy match (${similarity.toFixed(2)}): "${resultName}" ≈ "${searchName}"`
                        };
                    }

                    // Contains match
                    if (searchName.length >= 3) {
                        const resultLower = resultName.toLowerCase();
                        const searchLower = searchName.toLowerCase();

                        if (resultLower.includes(searchLower) || searchLower.includes(resultLower)) {

                            return {
                                rank: i + 1,
                                found: true,
                                matchDetails: `Contains match: "${resultName}" contains "${searchName}"`
                            };
                        }
                    }
                }
            }
        }
    }

    // Generate helpful suggestions
    let suggestionText = '';
    if (businessName.startsWith('locations/')) {
        const topBusinesses = results
            .filter(r => r.displayName?.text && !r.types?.includes('locality'))
            .slice(0, 3)
            .map(r => r.displayName?.text)
            .join('", "');

        suggestionText = ` | 💡 Try: businessName: "${results[0]?.displayName?.text || 'First Result'}" or check Place ID accuracy`;
    }

    const availableNames = results.slice(0, 5).map(r => r.displayName?.text).filter(Boolean).join(', ');

    return {
        rank: null,
        found: false,
        matchDetails: `No match found. Searched: ${businessName}${businessPlaceId ? ` (ID: ${businessPlaceId})` : ''}. Available: ${availableNames}${results.length > 5 ? '...' : ''}${suggestionText}`
    };
}

function calculateSummary(rankings: RankingResult[]) {
    const validRanks = rankings.filter(r => r.rank !== null).map(r => r.rank!);
    const notFound = rankings.filter(r => !r.businessFound).length;

    if (validRanks.length === 0) {
        return {
            averageRank: 0,
            bestRank: 0,
            worstRank: 0,
            visibilityPercentage: 0,
            topRankings: 0,
            goodRankings: 0,
            poorRankings: 0,
            notFound
        };
    }

    const averageRank = validRanks.reduce((a, b) => a + b, 0) / validRanks.length;
    const bestRank = Math.min(...validRanks);
    const worstRank = Math.max(...validRanks);
    const visibilityPercentage = (validRanks.length / rankings.length) * 100;

    const topRankings = validRanks.filter(rank => rank <= 3).length;
    const goodRankings = validRanks.filter(rank => rank >= 4 && rank <= 10).length;
    const poorRankings = validRanks.filter(rank => rank > 10).length;

    return {
        averageRank: Math.round(averageRank * 100) / 100,
        bestRank,
        worstRank,
        visibilityPercentage: Math.round(visibilityPercentage * 100) / 100,
        topRankings,
        goodRankings,
        poorRankings,
        notFound
    };
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest): Promise<NextResponse<GridRankingResponse>> {
    try {
        let body: GridRankingRequest;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: 'Invalid JSON in request body'
            }, { status: 400 });
        }

        const { center, gridSize, distance, businessName, newAccessToken, businessPlaceId } = body;

        // Handle multiple keyword formats
        let keywords: string | string[] = '';
        if (body.keywordsList && Array.isArray(body.keywordsList)) {
            keywords = body.keywordsList;
        } else if (body.keywords) {
            keywords = body.keywords;
        } else if (body.keyword) {
            keywords = body.keyword;
        }

        // Validation (same as before)
        if (!center) {
            return NextResponse.json({
                success: false,
                error: 'Missing required field: center'
            }, { status: 400 });
        }

        if (!newAccessToken || typeof newAccessToken !== 'string' || newAccessToken.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Missing required field: newAccessToken'
            }, { status: 400 });
        }

        if (!isValidCoordinate(center.lat, center.lng)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180'
            }, { status: 400 });
        }

        const gridValidation = validateGridSize(gridSize);
        if (!gridValidation.isValid) {
            return NextResponse.json({
                success: false,
                error: `Invalid grid size: ${gridValidation.error}`
            }, { status: 400 });
        }

        const distanceValidation = validateDistance(distance);
        if (!distanceValidation.isValid) {
            return NextResponse.json({
                success: false,
                error: `Invalid distance: ${distanceValidation.error}`
            }, { status: 400 });
        }

        if (!businessName || typeof businessName !== 'string' || businessName.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Missing or invalid businessName'
            }, { status: 400 });
        }

        // Try to get actual business name from GMB location ID
        let actualBusinessName = businessName;
        let detectedFromGMB = false;

        if (businessName.startsWith('locations/')) {
            try {
                const gmbBusinessName = await getBusinessNameFromLocationId(businessName, newAccessToken);
                if (gmbBusinessName) {
                    actualBusinessName = gmbBusinessName;
                    detectedFromGMB = true;
                } else {
                    console.log('❌ Could not retrieve business name from GMB API. Will use auto-detection.');
                }
            } catch (error) {
                console.warn('❌ Failed to fetch business name from GMB API:', error);
            }
        }

        const googleApiKey = process.env.PLACES_KEY || process.env.GOOGLE_PLACES_API_KEY;
        if (!googleApiKey) {
            return NextResponse.json({
                success: false,
                error: 'Google Places API key not configured'
            }, { status: 500 });
        }

        if (googleApiKey.length < 30 || !googleApiKey.startsWith('AIza')) {
            return NextResponse.json({
                success: false,
                error: 'Invalid Google Places API key format'
            }, { status: 500 });
        }

        const gridSizeNum = parseGridSize(gridSize);
        const radiusMeters = distanceToMeters(distance);

        
        const gridPoints = generateGridPoints(center, gridSizeNum, radiusMeters);

        if (gridPoints.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Failed to generate grid points'
            }, { status: 400 });
        }

        // Perform searches with enhanced error handling
        const rankings: RankingResult[] = [];
        const batchSize = 2; // Conservative batch size
        const baseDelay = 1200;

        for (let i = 0; i < gridPoints.length; i += batchSize) {
            const batch = gridPoints.slice(i, i + batchSize);

            const batchPromises = batch.map(async (point, batchIndex) => {
                try {
                    const delayMs = baseDelay + (Math.random() * 800) + (batchIndex * 300);
                    await delay(delayMs);

                    // Pass distance parameter to searchGooglePlaces
                    const results = await searchGooglePlaces(
                        { lat: point.lat, lng: point.lng },
                        keywords,
                        googleApiKey,
                        newAccessToken,
                        businessPlaceId,
                        actualBusinessName,
                    );

                    const { rank, found, matchDetails, detectedBusinessName } = findBusinessRank(
                        results,
                        actualBusinessName,
                        body.businessPlaceId,
                        body.alternativeNames,
                        body.exactMatchOnly,
                        center,
                        body.autoDetectBusinessName !== false && businessName.startsWith('locations/')
                    );

                    return {
                        gridPoint: point,
                        rank,
                        businessFound: found,
                        results: results.slice(0, 20),
                        matchDetails,
                        detectedBusinessName: detectedBusinessName || (detectedFromGMB ? actualBusinessName : undefined)
                    };
                } catch (error) {

                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

                    if (errorMessage.includes('403') || errorMessage.includes('401') || errorMessage.includes('API KEY')) {
                        throw new Error(`Critical API Error: ${errorMessage}`);
                    }

                    return {
                        gridPoint: point,
                        rank: null,
                        businessFound: false,
                        results: [],
                        error: errorMessage,
                        matchDetails: `Error occurred: ${errorMessage}`
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            rankings.push(...batchResults);

            if (i + batchSize < gridPoints.length) {
                await delay(600); // Inter-batch delay
            }
        }

        const summary = calculateSummary(rankings);

        // Enhanced logging
        const foundCount = rankings.filter(r => r.businessFound).length;
        const emptyResultsCount = rankings.filter(r => r.results.length === 0).length;
        const detectedNames = rankings
            .filter(r => r.detectedBusinessName)
            .map(r => r.detectedBusinessName)
            .filter((name, index, self) => self.indexOf(name) === index);

        // Return enhanced response
        return NextResponse.json({
            success: true,
            data: {
                center,
                gridSize,
                distance,
                businessPlaceId: businessPlaceId,
                keyword: Array.isArray(keywords) ? keywords.join(', ') : keywords || '',
                businessName: actualBusinessName,
                originalBusinessName: businessName !== actualBusinessName ? businessName : undefined,
                totalGridPoints: rankings.length,
                rankings,
                summary,
                metadata: {
                    detectedFromGMB,
                    autoDetectedNames: detectedNames.length > 0 ? detectedNames : undefined,
                    searchStrategy: businessName.startsWith('locations/') ? 'GMB Location ID + Auto-detect' : 'Name-based matching',
                    placeIdProvided: !!body.businessPlaceId,
                    keywordsUsed: Array.isArray(keywords) ? keywords : [keywords].filter(Boolean),
                    gridRadiusMeters: radiusMeters,
                    searchRadiusUsed: Math.min(Math.max(radiusMeters * 0.4, 2000), 50000),
                    emptyResultsCount,
                    successRate: Math.round((foundCount / rankings.length) * 100 * 100) / 100
                }
            }
        });

    } catch (error) {
        console.error('💥 API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
}


export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        success: true,
        message: 'Enhanced GMB Grid Ranking API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: [
            'Place ID priority matching',
            'Enhanced auto-detection',
            'Multiple keyword formats support',
            'Better error handling',
            'Improved logging and debugging'
        ]
    });
}