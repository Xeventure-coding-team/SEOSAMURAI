import { NextResponse } from "next/server"

interface DateObject {
    year: number
    month: number
    day: number
}

async function fetchLocationInsights(locationId: string, accessToken: string, startDate: DateObject, endDate: DateObject) {
    try {
        // Clean the location ID - remove 'locations/' prefix if present
        const cleanId = locationId.replace(/^locations\//, "");

        const url = new URL(`https://businessprofileperformance.googleapis.com/v1/locations/${cleanId}:fetchMultiDailyMetricsTimeSeries`);

        // Valid metrics according to current Google Business Profile Performance API
        const metrics = [
            'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
            'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
            'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
            'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
            'BUSINESS_CONVERSATIONS',
            'BUSINESS_DIRECTION_REQUESTS',
            'CALL_CLICKS',
            'WEBSITE_CLICKS',
            'BUSINESS_BOOKINGS',
            'BUSINESS_FOOD_ORDERS',
            'BUSINESS_FOOD_MENU_CLICKS',
        ];

        // Add metrics to URL (use 'dailyMetrics' for the multi endpoint)
        metrics.forEach(metric => url.searchParams.append('dailyMetrics', metric));

        // Add date range (corrected parameter names)
        url.searchParams.append('dailyRange.start_date.year', startDate.year.toString());
        url.searchParams.append('dailyRange.start_date.month', startDate.month.toString());
        url.searchParams.append('dailyRange.start_date.day', startDate.day.toString());
        url.searchParams.append('dailyRange.end_date.year', endDate.year.toString());
        url.searchParams.append('dailyRange.end_date.month', endDate.month.toString());
        url.searchParams.append('dailyRange.end_date.day', endDate.day.toString());

        console.log('Fetching GMB insights from:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('GMB API Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GMB API Error Response:', errorText);

            // Handle specific error cases
            if (response.status === 401) {
                throw new Error('Unauthorized: Invalid or expired access token');
            } else if (response.status === 403) {
                throw new Error('Forbidden: Insufficient permissions to access this location');
            } else if (response.status === 404) {
                throw new Error('Location not found: Check if the location ID is correct');
            }

            throw new Error(`GMB API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('GMB API Success Response:', JSON.stringify(data, null, 2));

        return data;
    } catch (error) {
        console.error('Error in fetchLocationInsights:', error);
        throw error;
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const locationId = searchParams.get("location_name") || searchParams.get("place_id");
        const accessToken = searchParams.get("access_token");
        const startDateStr = searchParams.get("start_date");
        const endDateStr = searchParams.get("end_date");

        console.log('API Request Parameters:', {
            locationId: locationId ? `${locationId.substring(0, 20)}...` : null,
            accessToken: accessToken ? 'Present' : 'Missing',
            startDate: startDateStr,
            endDate: endDateStr
        });

        if (!locationId || !accessToken) {
            return NextResponse.json(
                {
                    error: "Missing required parameters",
                    required: ["location_name (or place_id)", "access_token"],
                    received: {
                        locationId: !!locationId,
                        accessToken: !!accessToken
                    },
                },
                { status: 400 }
            );
        }

        // Calculate dates
        const today = new Date();
        let endDate: DateObject = {
            year: today.getFullYear(),
            month: today.getMonth() + 1,
            day: today.getDate()
        };

        let startDate: DateObject;
        const defaultStart = new Date(today);
        defaultStart.setDate(defaultStart.getDate() - 30);
        startDate = {
            year: defaultStart.getFullYear(),
            month: defaultStart.getMonth() + 1,
            day: defaultStart.getDate()
        };

        // Override with provided dates if available
        if (endDateStr) {
            const [year, month, day] = endDateStr.split('-').map(Number);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                endDate = { year, month, day };
            } else {
                return NextResponse.json({ error: "Invalid end_date format. Use YYYY-MM-DD." }, { status: 400 });
            }
        }

        if (startDateStr) {
            const [year, month, day] = startDateStr.split('-').map(Number);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                startDate = { year, month, day };
            } else {
                return NextResponse.json({ error: "Invalid start_date format. Use YYYY-MM-DD." }, { status: 400 });
            }
        }

        // Validate date range
        const startD = new Date(startDate.year, startDate.month - 1, startDate.day);
        const endD = new Date(endDate.year, endDate.month - 1, endDate.day);
        if (startD > endD) {
            return NextResponse.json({ error: "start_date must be before or equal to end_date." }, { status: 400 });
        }

        // Adjust end date to account for data latency (typically 48-72 hours delay in API)
        const adjustedEnd = new Date(endD);
        adjustedEnd.setDate(adjustedEnd.getDate() - 3);
        endDate = {
            year: adjustedEnd.getFullYear(),
            month: adjustedEnd.getMonth() + 1,
            day: adjustedEnd.getDate()
        };

        console.log('Adjusted Date Range (accounting for API latency):', { startDate, endDate });

        // Fetch insights
        const insightsData = await fetchLocationInsights(locationId, accessToken, startDate, endDate);

        // Compute totals per category (metric)
        const totals: { [key: string]: number } = {};
        if (insightsData && insightsData.multiDailyMetricTimeSeries) {
            insightsData.multiDailyMetricTimeSeries.forEach((multi: any) => {
                if (multi.dailyMetricTimeSeries) {
                    multi.dailyMetricTimeSeries.forEach((series: any) => {
                        const metric = series.dailyMetric;
                        let sum = 0;
                        if (series.timeSeries && series.timeSeries.datedValues) {
                            series.timeSeries.datedValues.forEach((dv: any) => {
                                sum += parseInt(dv.value || '0', 10);
                            });
                        }
                        totals[metric] = sum;
                    });
                }
            });
        }

        // If no data is returned, create empty structure
        if (!insightsData || !insightsData.multiDailyMetricTimeSeries || insightsData.multiDailyMetricTimeSeries.length === 0) {
            console.log('No insights data returned from GMB API');

            return NextResponse.json({
                insights: {
                    multiDailyMetricTimeSeries: []
                },
                totals,
                message: "No insights data available for the specified date range. Note: There may be a 48-72 hour delay in data availability."
            });
        }

        return NextResponse.json({
            insights: insightsData,
            totals,
            dateRange: { startDate, endDate }
        });

    } catch (error: any) {
        console.error("API Route Error:", error);

        return NextResponse.json(
            {
                error: "Error fetching GMB insights",
                message: error.message,
                debug: process.env.NODE_ENV === "development" ? {
                    stack: error.stack,
                    name: error.name
                } : undefined,
            },
            { status: 500 }
        );
    }
}