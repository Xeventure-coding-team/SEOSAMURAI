'use client';

import { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Props = {
  title: string;
  url?: string;
  className?: string;
};

export default function ShareButtons({ title, url, className = '' }: Props) {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(url || (typeof window !== 'undefined' ? window.location.href : ''));
  }, [url]);

  const shareUrl = currentUrl;

  const shareLinks = {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this article: ${shareUrl}`)}`,
  };

  const handleShare = (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
    e.preventDefault();
    window.open(link, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span className="text-xs font-medium text-muted-foreground mr-1 hidden sm:inline">
          Share
        </span>

        {/* X (Twitter) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={shareLinks.x}
              onClick={(e) => handleShare(e, shareLinks.x)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on X (Twitter)"
              className="group w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:scale-110 transition-transform">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Share on X
          </TooltipContent>
        </Tooltip>

        {/* LinkedIn */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={shareLinks.linkedin}
              onClick={(e) => handleShare(e, shareLinks.linkedin)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on LinkedIn"
              className="group w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:scale-110 transition-transform">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56z" />
              </svg>
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Share on LinkedIn
          </TooltipContent>
        </Tooltip>

        {/* Facebook */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={shareLinks.facebook}
              onClick={(e) => handleShare(e, shareLinks.facebook)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on Facebook"
              className="group w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:scale-110 transition-transform">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Share on Facebook
          </TooltipContent>
        </Tooltip>

        {/* Email */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={shareLinks.email}
              onClick={(e) => handleShare(e, shareLinks.email)}
              aria-label="Share via Email"
              className="group w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 group-hover:scale-110 transition-transform">
                <path d="M22 6L12 13L2 6M2 6L2 18L22 18L22 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Share via Email
          </TooltipContent>
        </Tooltip>

        {/* Copy Link */}
        <Tooltip open={copied ? false : undefined}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label={copied ? 'Link copied!' : 'Copy link'}
              className={`group w-9 h-9 rounded-full border border-border flex items-center justify-center transition-all duration-200 ${
                copied 
                  ? 'text-green-600 border-green-300 bg-green-50' 
                  : 'text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted'
              }`}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2.5]">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 group-hover:scale-110 transition-transform">
                  <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5" strokeLinecap="round" />
                  <path d="M14 11a5 5 0 0 0-7.07 0l-2.83 2.83a5 5 0 0 0 7.07 7.07l1.5-1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </TooltipTrigger>
          {!copied && (
            <TooltipContent side="bottom" className="text-xs">
              Copy link
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}