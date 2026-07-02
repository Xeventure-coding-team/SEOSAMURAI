import MainLayout from '@/app/layouts/MainLayout';
import { createMetadata } from '../../../../lib/metadata';

export const metadata = createMetadata({
  title: 'Privacy Policy',
  description:
    'Learn how Rankerly collects, uses, and protects your personal data when you use our platform.',
  slug: '/privacy',
});

const LAST_UPDATED = 'July 2, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
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

export default function PrivacyPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Legal
          </span>
          <h1 className="text-3xl font-bold text-foreground mt-4 mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            This Privacy Policy explains how Rankerly ("Rankerly," "we," "us," or "our"), operated
            under Xeventure IT Solutions, collects, uses, and protects information when you use our
            platform at{' '}
            <a href="https://rankerly.app" className="text-primary underline underline-offset-4">
              rankerly.app
            </a>
            . By using the Service, you agree to this policy. If you do not agree, please do not use
            the Service.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>
            Rankerly is a local SEO and Google Business Profile management platform operated by
            Xeventure IT Solutions. For privacy-related questions, contact us using the details at
            the end of this document.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <Sub title="2.1 Information You Provide">
            <ul className="space-y-2">
              <Li>
                <strong className="text-foreground">Account information</strong> — name, email
                address, and hashed password.
              </Li>
              <Li>
                <strong className="text-foreground">Billing information</strong> — we do not store
                full card details. Payments are handled by Stripe under their own{' '}
                <a
                  href="https://stripe.com/privacy"
                  className="text-primary underline underline-offset-4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  privacy policy
                </a>
                .
              </Li>
              <Li>
                <strong className="text-foreground">Location data</strong> — business addresses and
                geographic details for each Google Business Profile you connect.
              </Li>
              <Li>
                <strong className="text-foreground">Review content</strong> — customer reviews and
                metadata imported for monitoring, response management, and reputation tracking.
              </Li>
              <Li>
                <strong className="text-foreground">Communications</strong> — messages sent to
                support or via newsletter opt-in.
              </Li>
            </ul>
          </Sub>

          <Sub title="2.2 Information Collected Automatically">
            <ul className="space-y-2">
              <Li>Usage data — pages visited, features used, and in-app actions.</Li>
              <Li>Device and log data — IP address, browser type, OS, and timestamps.</Li>
              <Li>Analytics — Google Analytics and Microsoft Clarity for understanding usage.</Li>
              <Li> Error monitoring — Sentry helps us detect, diagnose, and resolve application
                errors and performance issues.</Li>
              <Li>
                Cookies and similar technologies — see our{' '}
                <a href="/cookies" className="text-primary underline underline-offset-4">
                  Cookie Policy
                </a>{' '}
                for details.
              </Li>

              <Li>
                Security data — IP addresses and request metadata may be processed through
                Cloudflare and Upstash to protect the Service from abuse, spam, automated
                attacks, and excessive requests.
              </Li>

            </ul>
          </Sub>

          <Sub title="2.3 Information from Third Parties">
            <p>
              When you connect your Google account or Google Business Profile, we receive
              the information you authorize us to access, such as business locations,
              profile details, posts, reviews, media, and related metadata. We use this
              information solely to provide and improve the features of the Service in
              accordance with the permissions you grant.
            </p>
          </Sub>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="space-y-2">
            <Li>Provide, operate, and maintain the Service and its features.</Li>
            <Li>Process billing and manage subscriptions via Stripe.</Li>
            <Li>Monitor and improve performance, reliability, and security.</Li>
            <Li>Send transactional emails and, where opted in, marketing communications.</Li>
            <Li>Detect, investigate, and prevent fraudulent or unauthorized activity.</Li>
            <Li>Comply with applicable legal obligations.</Li>
            <Li>
              Protect the Service from abuse, spam, and excessive requests through rate
              limiting and security monitoring.
            </Li>
          </ul>
        </Section>

        <Section title="4. Legal Basis for Processing (EEA / UK Users)">
          <p>
            Where GDPR applies, we process your data on the basis of: performance of a contract
            (delivering the Service you signed up for), legitimate interests (improving and securing
            the Service), consent (for marketing and non-essential cookies), and legal obligation
            where applicable. You may withdraw consent at any time without affecting prior lawful
            processing.
          </p>
        </Section>

        <Section title="5. How We Share Information">
          <p>We do not sell your personal information. We may share data with:</p>
          <ul className="space-y-2 mt-3">

            <Li>
              <strong className="text-foreground">Service providers</strong> — We use
              trusted third-party providers to operate and improve the Service, including
              Stripe (payments), Google OAuth and Google Business Profile APIs
              (authentication and connected business data), Google Analytics and Microsoft
              Clarity (analytics), Sentry (error monitoring), Cloudflare (security),
              Upstash (Redis and rate limiting), ImgKit (image optimization and delivery),
              Mailtrap (email delivery and testing), and AI providers such as OpenAI and
              Google Gemini to power AI-assisted features. These providers process data
              only as necessary to provide their services on our behalf.
            </Li>

            <Li>
              <strong className="text-foreground">Legal compliance</strong> — where required by law,
              regulation, or valid legal process.
            </Li>
            <Li>
              <strong className="text-foreground">Business transfers</strong> — in connection with a
              merger or acquisition, with notice where required.
            </Li>
          </ul>
        </Section>

        <Section title="6. AI-Powered Features">
          <p>
            Some features of the Service use artificial intelligence provided by
            third-party providers, including OpenAI and Google Gemini. Information you
            submit to AI-powered features may be processed by these providers solely to
            generate responses or perform the requested functionality. The handling of
            such information is subject to the applicable privacy policies and terms of
            the respective AI providers.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <p>
            We retain account, location, and review data for as long as your account is active or as
            needed to provide the Service. You may request deletion at any time, subject to legal
            retention requirements (e.g. billing records).
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p>Depending on your location, you may have the right to:</p>
          <ul className="space-y-2 mt-3">
            <Li>Access, correct, or delete your personal data.</Li>
            <Li>Object to or restrict certain processing.</Li>
            <Li>Request portability of your data.</Li>
            <Li>Withdraw consent at any time.</Li>
            <Li>
              Lodge a complaint with your local data protection authority (EEA/UK users) or
              applicable regulator.
            </Li>
          </ul>
          <p className="mt-3">To exercise these rights, contact us at the details below.</p>
        </Section>

        <Section title="9. Data Security">
          <p>
            We implement reasonable technical and organizational measures to protect your data. No
            transmission or storage method is 100% secure and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>
            The Service is not directed to individuals under 18. We do not knowingly collect
            personal information from children. Contact us if you believe a child has submitted data
            so we can remove it.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this policy from time to time. Updates will be posted here with a new
            "Last updated" date. Continued use of the Service after changes constitutes acceptance.
          </p>
        </Section>

        <Section title="12. Contact Us">
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
          general informational purposes and does not constitute legal advice. We recommend having it
          reviewed by a qualified legal professional familiar with the jurisdictions you operate in
          before publishing.
        </div>
      </div>
    </MainLayout>
  );
}