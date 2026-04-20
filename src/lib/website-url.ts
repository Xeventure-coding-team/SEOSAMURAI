export function getWebsiteUrl(subdomain: string): string {
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Local development with localhost
    return `http://${subdomain}.localhost:3000`;
  } else {
    // Production with your actual domain
    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'rankerly.app';
    return `https://${subdomain}.${domain}`;
  }
}