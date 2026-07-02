import MainLayout from '@/app/layouts/MainLayout';
import { createMetadata } from '../../../../lib/metadata';

export const metadata = createMetadata({
  title: 'Cookie Policy',
  description:
    'Learn how Rankerly uses cookies and similar tracking technologies, and how to manage your preferences.',
  slug: '/cookies',
});

const LAST_UPDATED = 'June 30, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">{children}</div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

const cookieTable = [
  {
    category: 'Strictly Necessary',
    purpose: 'Required for the Service to function — login sessions, security, bot protection. Cannot be disabled.',
    examples: 'Session/auth cookies, Cloudflare Turnstile',
  },
  {
    category: 'Analytics & Performance',
    purpose: 'Help us understand how visitors use the Service so we can improve it.',
    examples: 'Google Analytics, Microsoft Clarity',
  },
  {
    category: 'Error Monitoring',
    purpose: 'Help us detect and diagnose bugs or crashes in real time.',
    examples: 'Sentry',
  },
  {
    category: 'Functional',
    purpose: 'Remember your preferences such as theme or dashboard layout settings.',
    examples: 'Theme/UI preference cookies',
  },
  {
    category: 'Marketing',
    purpose: 'Used to measure marketing campaign performance where enabled.',
    examples: 'Ad/conversion tracking pixels (if enabled)',
  },
];

export default function CookiesPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Legal
          </span>
          <h1 className="text-3xl font-bold text-foreground mt-4 mb-2">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            This Cookie Policy explains how Rankerly ("Rankerly," "we," "us," or "our"), operated
            under Xeventure IT Solutions, uses cookies and similar tracking technologies on{' '}
            <a href="https://rankerly.app" className="text-primary underline underline-offset-4">
              rankerly.app
            </a>{' '}
            and your available choices.
          </p>
        </div>

        <Section title="1. What Are Cookies?">
          <p>
            Cookies are small text files placed on your device when you visit a website. They help
            the website function correctly, remember your preferences, and provide analytics about
            usage. Similar technologies include local storage, pixels, and tracking scripts.
          </p>
        </Section>

        <Section title="2. Cookies We Use">
          <div className="overflow-x-auto rounded-xl border border-border mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-foreground font-semibold w-[28%]">Category</th>
                  <th className="text-left px-4 py-3 text-foreground font-semibold">Purpose</th>
                  <th className="text-left px-4 py-3 text-foreground font-semibold w-[28%]">Examples</th>
                </tr>
              </thead>
              <tbody>
                {cookieTable.map((row, i) => (
                  <tr
                    key={row.category}
                    className={i < cookieTable.length - 1 ? 'border-b border-border' : ''}
                  >
                    <td className="px-4 py-3 font-medium text-foreground align-top">{row.category}</td>
                    <td className="px-4 py-3 text-muted-foreground align-top">{row.purpose}</td>
                    <td className="px-4 py-3 text-muted-foreground align-top">{row.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Consent">
          <div className="rounded-xl border border-border divide-y divide-border">
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-2">
                EEA, UK, and opt-in regions
              </p>
              <p>
                On your first visit, you'll see a cookie consent banner allowing you to accept,
                reject, or customize non-essential cookies. Strictly Necessary cookies are always
                active since the Service cannot function without them. You can update your
                preferences at any time via the cookie settings link in the site footer. We will
                not load Analytics, Functional, or Marketing cookies until consent is given.
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-2">
                United States and opt-out regions
              </p>
              <p>
                We disclose our use of cookies here and provide an opt-out option via your browser
                settings or the cookie preferences link in the site footer. By continuing to use
                the Service, you acknowledge this Cookie Policy.
              </p>
            </div>
          </div>
        </Section>

        <Section title="4. Third-Party Cookies">
          <p>Some cookies are set by third-party services we use:</p>
          <ul className="space-y-2 mt-3">
            <Li>
              <strong className="text-foreground">Google Analytics</strong> — usage analytics.{' '}
              <a
                href="https://policies.google.com/privacy"
                className="text-primary underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Privacy Policy
              </a>
            </Li>
            <Li>
              <strong className="text-foreground">Microsoft Clarity</strong> — session analytics
              and heatmaps.{' '}
              <a
                href="https://privacy.microsoft.com/privacystatement"
                className="text-primary underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Microsoft Privacy Statement
              </a>
            </Li>
            <Li>
              <strong className="text-foreground">Stripe</strong> — secure payment processing.{' '}
              <a
                href="https://stripe.com/privacy"
                className="text-primary underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Stripe Privacy Policy
              </a>
            </Li>
            <Li>
              <strong className="text-foreground">Sentry</strong> — error and performance
              monitoring.{' '}
              <a
                href="https://sentry.io/privacy/"
                className="text-primary underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sentry Privacy Policy
              </a>
            </Li>
            <Li>
              <strong className="text-foreground">Cloudflare Turnstile</strong> — bot protection
              during sign-up.{' '}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                className="text-primary underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare Privacy Policy
              </a>
            </Li>
            
          </ul>
          <p className="mt-3">
            We do not control third-party cookies directly. Please review their respective policies
            for details on their data practices.
          </p>
        </Section>

        <Section title="5. How to Manage Cookies">
          <ul className="space-y-2">
            <Li>
              Use the cookie preference center available via the link in our site footer to update
              your choices at any time.
            </Li>
            <Li>
              Adjust your browser settings to block or delete cookies — note this may affect
              certain Service functionality such as staying logged in.
            </Li>
            <Li>
              Use the{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                className="text-primary underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Analytics Opt-out Browser Add-on
              </a>{' '}
              to opt out of Google Analytics specifically.
            </Li>
          </ul>
        </Section>

        <Section title="6. Changes to This Policy">
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices
            or for legal reasons. Updates will be posted here with a new "Last updated" date.
          </p>
        </Section>

        <Section title="7. Contact Us">
          <p>
            Rankerly (Xeventure IT Solutions)
            <br />
            Email:{' '}
            <a
              href="mailto:info@rankerly.app"
              className="text-primary underline underline-offset-4"
            >
              info@rankerly.app
            </a>
          </p>
        </Section>

        <div className="mt-12 rounded-xl border border-border bg-muted/40 px-6 py-5 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Disclaimer:</strong> This document is provided for
          general informational purposes and does not constitute legal advice. Note that this policy
          describes a consent banner that should be implemented as a real functioning component —
          disclosure text alone does not satisfy GDPR/UK GDPR requirements. We recommend having
          this reviewed by a qualified legal professional before publishing.
        </div>
      </div>
    </MainLayout>
  );
}