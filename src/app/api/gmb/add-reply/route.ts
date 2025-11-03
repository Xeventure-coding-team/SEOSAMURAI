import { NextRequest, NextResponse } from 'next/server'
import axios, { AxiosError } from 'axios'

interface QueryParams {
  accountId: string
  locationId: string
  selectedId: string
  selectedText: string
  accessToken: string
}

interface RequestBody {
  accountId: string
  locationId: string
  selectedId: string
  selectedText?: string
  accessToken: string
}

interface ErrorResponse {
  error: string
  details?: string
}

interface SuccessResponse {
  success: boolean
  data?: any
  message?: string
}

// Helper function to validate common parameters
function validateCommonParams(params: Partial<QueryParams>) {
  const { accountId, locationId, selectedId, accessToken } = params

  if (!accessToken) {
    return { error: 'Access token is required', status: 400 }
  }

  if (!accountId) {
    return { error: 'Account ID is required', status: 400 }
  }

  if (!locationId) {
    return { error: 'Location ID is required', status: 400 }
  }

  if (!selectedId) {
    return { error: 'Review ID is required', status: 400 }
  }

  return null
}

// Helper function to parse request parameters
async function parseRequestParams(request: NextRequest, requireText: boolean = false): Promise<{ params: Partial<QueryParams>, error?: NextResponse }> {
  const url = new URL(request.url)
  let params: Partial<QueryParams>

  // Check if data is in query parameters or request body
  if (url.searchParams.has('accountId')) {
    // Data from query parameters
    params = {
      accountId: url.searchParams.get('accountId') || '',
      locationId: url.searchParams.get('locationId') || '',
      selectedId: url.searchParams.get('selectedId') || '',
      selectedText: url.searchParams.get('selectedText') || '',
      accessToken: url.searchParams.get('accessToken') || '',
    }
  } else {
    // Data from request body
    try {
      const body: RequestBody = await request.json()
      params = {
        accountId: body.accountId,
        locationId: body.locationId,
        selectedId: body.selectedId,
        selectedText: body.selectedText,
        accessToken: body.accessToken,
      }
    } catch (parseError) {
      return {
        params: {},
        error: NextResponse.json(
          {
            error: 'Invalid request format',
            details: 'Please provide data either as query parameters or JSON body'
          },
          { status: 400 }
        )
      }
    }
  }

  // Validate common parameters
  const validationError = validateCommonParams(params)
  if (validationError) {
    return {
      params,
      error: NextResponse.json(
        { error: validationError.error },
        { status: validationError.status }
      )
    }
  }

  // Validate reply text if required
  if (requireText) {
    if (!params.selectedText || params.selectedText.trim().length === 0) {
      return {
        params,
        error: NextResponse.json(
          { error: 'Reply text is required and cannot be empty' },
          { status: 400 }
        )
      }
    }

    const trimmedText = params.selectedText.trim()
    if (trimmedText.length > 4096) {
      return {
        params,
        error: NextResponse.json(
          {
            error: 'Reply text too long',
            details: 'Reply must be under 4096 characters'
          },
          { status: 400 }
        )
      }
    }
  }

  return { params }
}

// Helper function to handle API errors
function handleApiError(error: any): NextResponse<ErrorResponse> {
  console.error('API Error:', error)

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError

    // Handle specific HTTP status codes
    if (axiosError.response?.status === 401) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          details: 'Access token is invalid or expired'
        },
        { status: 401 }
      )
    }

    if (axiosError.response?.status === 403) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          details: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    if (axiosError.response?.status === 404) {
      return NextResponse.json(
        {
          error: 'Resource not found',
          details: 'The specified review, location, or account was not found'
        },
        { status: 404 }
      )
    }

    if (axiosError.response?.status === 409) {
      return NextResponse.json(
        {
          error: 'Conflict',
          details: axiosError.response?.data?.error?.message || 'A conflict occurred with the current state of the resource'
        },
        { status: 409 }
      )
    }

    if (axiosError.response?.status === 429) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Handle network errors
    if (axiosError.code === 'ECONNABORTED') {
      return NextResponse.json(
        {
          error: 'Request timeout',
          details: 'The request to Google My Business API timed out'
        },
        { status: 504 }
      )
    }

    // Generic API error
    return NextResponse.json(
      {
        error: 'Google My Business API error',
        details: axiosError.response?.data?.error?.message || axiosError.message || 'Unknown API error'
      },
      { status: axiosError.response?.status || 500 }
    )
  }

  // Handle other errors
  return NextResponse.json(
    {
      error: 'Operation failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    },
    { status: 500 }
  )
}

// CREATE/UPDATE Reply - PUT Method
export async function PUT(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { params, error } = await parseRequestParams(request, true)
    if (error) {
      return error
    }

    const { accountId, locationId, selectedId, selectedText, accessToken } = params

    const cleanAccountId = accountId !== undefined ? accountId.replace('accounts/', '') : accountId

    // Make request to Google My Business API to add/update reply
    const apiUrl = `https://mybusiness.googleapis.com/v4/accounts/${cleanAccountId}/locations/${locationId}/reviews/${selectedId}/reply`

    const response = await axios.put(
      apiUrl,
      {
        comment: selectedText!.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Reply added/updated successfully',
        data: response.data
      },
      { status: 200 }
    )

  } catch (error) {
    return handleApiError(error)
  }
}

// CREATE Reply - POST Method (alternative to PUT)
export async function POST(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const body = await request.json()
    const { accountId, locationId, selectedId, selectedText, accessToken } = body

    // Validate required fields
    if (!accountId || !locationId || !selectedId || !selectedText || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          details: 'accountId, locationId, selectedId, selectedText, and accessToken are required'
        },
        { status: 400 }
      )
    }

    // Clean the accountId - remove "accounts/" prefix if present
    const cleanAccountId = accountId.replace('accounts/', '')

    // Construct the review name according to Google's format
    const reviewName = `accounts/${cleanAccountId}/locations/${locationId}/reviews/${selectedId}`

    // Correct API URL format from the documentation
    const apiUrl = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`

    // Correct request body format - should be a ReviewReply object
    const requestBody = {
      comment: selectedText.trim()
    }

    console.log('Request Body:', requestBody)

    const response = await axios.put(
      apiUrl,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // Increased timeout
      }
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Reply created/updated successfully',
        data: response.data
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('POST Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      requestData: error.config?.data
    })

    // Handle specific Google API errors
    if (error.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Resource not found',
          details: 'The review, location, or account could not be found. Verify that:\n1. The location exists and is verified\n2. The review exists\n3. You have proper permissions\n4. The account/location IDs are correct'
        },
        { status: 404 }
      )
    }

    if (error.response?.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          details: 'Access denied. Check that:\n1. Your OAuth token has the correct scopes (business.manage)\n2. The location is verified\n3. You have permission to manage this business'
        },
        { status: 403 }
      )
    }

    if (error.response?.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: 'Invalid or expired access token. Please refresh your OAuth token.'
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Unknown error',
        details: error.response?.data?.error?.details || 'An unexpected error occurred'
      },
      { status: error.response?.status || 500 }
    )
  }
}

// READ Reply - GET Method
export async function GET(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { params, error } = await parseRequestParams(request, false)
    if (error) return error

    const { accountId, locationId, selectedId, accessToken } = params

    // Make request to Google My Business API to get reply
    const apiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${selectedId}/reply`

    const response = await axios.get(
      apiUrl,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Reply retrieved successfully',
        data: response.data
      },
      { status: 200 }
    )

  } catch (error) {
    // Handle 404 specifically for GET (reply might not exist)
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          message: 'No reply found for this review',
          data: null
        },
        { status: 404 }
      )
    }
    return handleApiError(error)
  }
}

// DELETE Reply - DELETE Method
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { accountId, locationId, selectedId, accessToken } = body

    // Validate required fields
    if (!accountId || !locationId || !selectedId || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          details: 'accountId, locationId, selectedId, and accessToken are required'
        },
        { status: 400 }
      )
    }

    // Construct the correct API URL according to Google's documentation
    // Format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    const reviewName = `accounts/${accountId.replace('accounts/', '')}/locations/${locationId}/reviews/${selectedId}`
    const apiUrl = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`

    console.log('Delete API URL:', apiUrl)
    console.log('Review Name:', reviewName)

    const response = await axios.delete(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Reply deleted successfully',
        data: response.data
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('DELETE Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    })

    // Handle specific Google API errors
    if (error.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Resource not found',
          details: 'The review reply does not exist, or the review/location/account could not be found.'
        },
        { status: 404 }
      )
    }

    if (error.response?.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
          details: 'The access token does not have permission to delete this review reply, or the location is not verified.'
        },
        { status: 403 }
      )
    }

    if (error.response?.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: 'Invalid or expired access token.'
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Unknown error',
        details: error.response?.data?.error?.details || 'An unexpected error occurred'
      },
      { status: error.response?.status || 500 }
    )
  }
}

// PATCH Method for partial updates (edit reply)
export async function PATCH(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { params, error } = await parseRequestParams(request, true)
    if (error) return error

    const { accountId, locationId, selectedId, selectedText, accessToken } = params

    // Make request to Google My Business API to update reply
    const apiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${selectedId}/reply`

    const response = await axios.put( // GMB API uses PUT for updates
      apiUrl,
      {
        comment: selectedText!.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Reply updated successfully',
        data: response.data
      },
      { status: 200 }
    )

  } catch (error) {
    return handleApiError(error)
  }
}