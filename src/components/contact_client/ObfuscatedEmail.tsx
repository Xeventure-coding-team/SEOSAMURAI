'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';

type Props = {
  user: string;
  domain: string;
};

// Renders the email only after mount, and assembles it from two separate
// parts at runtime so it never appears as a literal string or mailto: link
// in the server-rendered HTML — keeps it off basic scraper bots.
export default function ObfuscatedEmail({ user, domain }: Props) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(`${user}@${domain}`);
  }, [user, domain]);

  if (!email) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium bg-primary/50 text-primary-foreground px-5 py-2.5 rounded-full select-none">
        <Mail className="w-4 h-4" />
        Loading contact…
      </span>
    );
  }

  return (
     <a
      href={`mailto:${email}`}
      className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
      rel="nofollow noopener"
    >
      <Mail className="w-4 h-4" />
      {email}
    </a>
  );
}