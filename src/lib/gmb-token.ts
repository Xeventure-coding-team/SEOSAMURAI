import axios from "axios";
import { prisma } from "../../lib/prisma";
/**
 * Refresh the access token using refresh token
 * Better error handling and returns complete token data
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}> {
  try {
    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      },
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      }
    );
    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in || 3600, // Default 1 hour
      tokenType: response.data.token_type || "Bearer",
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Token refresh failed:", {
        status: error.response?.status,
        error: error.response?.data?.error,
        description: error.response?.data?.error_description,
      });

      throw new Error(
        `Failed to refresh token: ${error.response?.data?.error_description || error.message}`
      );
    }

    throw error;
  }
}

/**
 * Check if token is expired (with buffer time)
 * @param tokenExpiry - Expiration datetime from database
 * @param bufferMinutes - Minutes before actual expiry to consider it "expired" (default 5)
 */
function isTokenExpired(tokenExpiry: Date, bufferMinutes: number = 5): boolean {
  const now = new Date();
  const expiryWithBuffer = new Date(tokenExpiry.getTime() - bufferMinutes * 60000);
  return now >= expiryWithBuffer;
}

/**
 * Validate GMB token by making an API call
 * Only used to verify token is working (after refresh)
 */
async function validateGMBToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }
    );

    return response.status === 200;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error("❌ Token invalid or expired");
      } else if (error.response?.status === 403) {
        console.error("❌ Token lacks required permissions");
      } else if (error.code === "ECONNABORTED") {
        console.error("⏱️ Request timeout - API may be slow");
      } else {
        console.error(
          `❌ API error: ${error.response?.status}`,
          error.response?.data
        );
      }
    } else {
      console.error("❌ Unexpected error:", error);
    }
    return false;
  }
}

/**
 * Get valid GMB token - automatically refresh if expired
 * This is the main function to use in your code
 */
async function getValidGMBToken(userId: string): Promise<string> {
  try {
    // Step 1: Get user's GMB integration from database
    const integration = await prisma.gmbIntegration.findUnique({
      where: { userId },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiry: true,
        isActive: true,
      },
    });

    // Step 2: Validate integration exists
    if (!integration) {
      console.error("❌ GMB integration not found for user:", userId);
      throw new Error("GMB_INTEGRATION_NOT_FOUND");
    }

    if (!integration.isActive) {
      console.error("❌ GMB integration is inactive for user:", userId);
      throw new Error("GMB_INTEGRATION_INACTIVE");
    }

    // Step 3: Check if token is expired (5 minute buffer before actual expiry)
    if (isTokenExpired(integration.tokenExpiry, 5)) {
      // Step 4: Try to refresh the token
      if (!integration.refreshToken) {
        console.error("❌ No refresh token available for user:", userId);
        throw new Error("NO_REFRESH_TOKEN_AVAILABLE");
      }

      try {
        const { accessToken, expiresIn } = await refreshAccessToken(
          integration.refreshToken
        );

        // Step 5: Calculate new expiry time
        const expiresInSafe = expiresIn || 3600; // fallback 1 hour
        const newExpiry = new Date(Date.now() + expiresInSafe * 1000);

        // Step 6: Update database with new token
        await prisma.gmbIntegration.update({
          where: { id: integration.id },
          data: {
            accessToken,
            tokenExpiry: newExpiry,
            updatedAt: new Date(),
          },
        });
        return accessToken;
      } catch (refreshError) {
        console.error(`❌ Failed to refresh token for user ${userId}:`, refreshError);

        if (axios.isAxiosError(refreshError)) {
          const status = refreshError.response?.status;

          if (status === 400) {
            // invalid_grant → real failure
            await prisma.gmbIntegration.update({
              where: { id: integration.id },
              data: { isActive: false },
            });
          }
        }

        throw new Error("TOKEN_REFRESH_FAILED");
      }
    }

    return integration.accessToken;
  } catch (error) {
    console.error("❌ Error in getValidGMBToken:", error);
    throw error;
  }
}

/**
 * Make a GMB API request with automatic token refresh
 * Use this instead of making axios calls directly
 */
async function makeGMBRequest<T>(
  userId: string,
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    data?: Record<string, any>;
    params?: Record<string, any>;
    timeout?: number;
  } = {}
): Promise<T> {
  const {
    method = "GET",
    data = null,
    params = null,
    timeout = 10000,
  } = options;

  try {
    // Step 1: Get valid token (automatically refreshes if needed)
    const token = await getValidGMBToken(userId);

    // Step 2: Make the API request
    const response = await axios({
      method,
      url: endpoint,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data,
      params,
      timeout,
    });
    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (status === 401) {
        console.error("🔐 Unauthorized - token may be invalid");
        throw new Error("GMB_UNAUTHORIZED");
      } else if (status === 403) {
        console.error("🚫 Forbidden - insufficient permissions");
        throw new Error("GMB_FORBIDDEN");
      } else if (status === 404) {
        console.error("📍 Resource not found");
        throw new Error("GMB_RESOURCE_NOT_FOUND");
      } else if (error.code === "ECONNABORTED") {
        console.error("⏱️ Request timeout");
        throw new Error("GMB_REQUEST_TIMEOUT");
      } else {
        console.error(`❌ API error ${status}:`, errorData);
        throw new Error(`GMB_API_ERROR_${status}`);
      }
    }

    console.error("❌ Unexpected error:", error);
    throw error;
  }
}

export {
  getValidGMBToken,
  validateGMBToken,
  refreshAccessToken,
  isTokenExpired,
  makeGMBRequest,
};