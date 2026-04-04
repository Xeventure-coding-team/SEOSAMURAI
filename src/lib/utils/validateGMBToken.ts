// utils/validateGMBToken.ts  (or wherever you keep it)

import axios from 'axios';

interface TokenValidationResult {
  isValid: boolean;
  accessToken?: string;     // fresh access token if we refreshed
  error?: string;
}

/**
 * Validates or refreshes the token.
 * If you pass a refresh_token → it will get a new access_token.
 * If you pass an access_token → it validates it.
 */
async function validateOrRefreshGMBToken(
  token: string,
  isRefreshToken: boolean = false   // tell the function what type it is
): Promise<TokenValidationResult> {
  try {
    if (isRefreshToken) {
      // === REFRESH TOKEN PATH ===
      const response = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: token,
          grant_type: "refresh_token",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000,
        }
      );

      const { access_token, expires_in } = response.data;

      return {
        isValid: true,
        accessToken: access_token,
        // You can also return expires_in if you want to store expiry
      };
    } else {
      // === ACCESS TOKEN PATH (your original logic) ===
      const response = await axios.get(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      return { isValid: response.status === 200 };
    }
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        console.error("Token invalid or expired");
        return { isValid: false, error: "invalid_or_expired" };
      } else if (status === 403) {
        return { isValid: false, error: "insufficient_permissions" };
      } else if (error.code === 'ECONNABORTED') {
        return { isValid: false, error: "timeout" };
      }
    }

    console.error("Token validation error:", error);
    return { isValid: false, error: "unknown_error" };
  }
}

export default validateOrRefreshGMBToken;