import MainLayout from '@/app/layouts/MainLayout';
import { createMetadata } from '../../../../lib/metadata';

export const metadata = createMetadata({
  title: 'Terms of Service',
  description:
    'Read the terms and conditions governing your use of Rankerly, the local SEO and Google Business Profile management platform.',
  slug: '/terms',
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

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-16 max-w-3xl">
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Legal
          </span>
          <h1 className="text-3xl font-bold text-foreground mt-4 mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            These Terms of Service ("Terms") govern your access to and use of Rankerly, operated
            under Xeventure IT Solutions ("Rankerly," "we," "us," or "our"), available at{' '}
            <a href="https://rankerly.app" className="text-primary underline underline-offset-4">
              rankerly.app
            </a>
            . By accessing or using the Service, you agree to be bound by these Terms. If you do
            not agree, do not use the Service.
          </p>
        </div>

        <Section title="1. Eligibility">
          <p>
            You must be at least 18 years old and capable of forming a binding contract to use the
            Service. By using Rankerly, you represent that you meet these requirements and that any
            information you provide is accurate and complete.
          </p>
        </Section>

        <Section title="2. Account Registration">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activity that occurs under your account. Notify us immediately of any
            unauthorized use. We are not liable for any loss resulting from your failure to
            safeguard your credentials.
          </p>
        </Section>

        <Section title="3. Description of Service">
          <p>
            Rankerly provides tools for managing local business presence, including location
            management, Google Business Profile posting, review monitoring and response, keyword
            and competitor tracking, geo-grid scanning, location websites, and related features
            (collectively, the "Features"). Features may be added, modified, or discontinued at
            our discretion with reasonable notice where feasible.
          </p>
        </Section>

        <Section title="4. Third-Party Integrations">
          <p>
            Rankerly integrates with third-party services and APIs, including Google OAuth,
            Google Business Profile, Stripe, artificial intelligence providers, and other
            infrastructure services required to operate the Service. By using Google Business Profile features through Rankerly, you also agree to comply with Google's applicable terms, policies, and API requirements. Your use of these integrations is subject to the respective third party's own
            terms and policies. We are not responsible for the availability, accuracy, security, or performance
            of third-party services, including changes to their APIs, platforms, or policies
            that may affect the functionality of the Service.
          </p>
        </Section>

        <Section title="5. Subscriptions and Billing">
          <ul className="space-y-2">
            <Li>Certain features require a paid subscription. Pricing is shown at checkout.</Li>
            <Li>
              Payments are processed securely by Stripe. We do not store full payment card details.
            </Li>
            <Li>Subscriptions renew automatically unless canceled before the renewal date.</Li>
            <Li>Fees are non-refundable except as required by law or expressly stated otherwise.</Li>
            <Li>
              We may change pricing with reasonable advance notice. Continued use after a price
              change constitutes acceptance.
            </Li>
          </ul>
        </Section>

        <Section title="6. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="space-y-2 mt-3">
            <Li>Use the Service for any unlawful purpose or in violation of applicable law.</Li>
            <Li>
              Attempt to gain unauthorized access to the Service, other accounts, or related
              systems.
            </Li>
            <Li>
              Post or distribute reviews, content, or posts that are false, defamatory, or
              fraudulent — including fake or incentivized reviews.
            </Li>
            <Li>Reverse engineer, scrape, or resell the Service without our written consent.</Li>

            <Li>
              Use automated tools, bots, or scripts in a manner that places an unreasonable
              load on the Service or attempts to bypass rate limits or security measures.
            </Li>

            <Li>Interfere with or disrupt the integrity or performance of the Service.</Li>
          </ul>
          <p className="mt-3">
            We reserve the right to suspend or terminate accounts that violate these Terms without
            prior notice.
          </p>
        </Section>

        <Section title="7. Your Content and Data">
          <p>
            You retain ownership of the business data, location information, and review content you
            submit or connect to the Service ("Your Content"). By using the Service, you grant
            Rankerly a limited, non-exclusive license to access, store, and process Your Content
            solely to provide, maintain, secure, and improve the Service. You are responsible for ensuring you have
            the rights necessary to connect and manage Your Content through Rankerly.
          </p>
        </Section>

        <Section title="8. AI-Powered Features">
          <p>
            Certain features of the Service use artificial intelligence provided by
            third-party providers. AI-generated content is intended to assist you and
            may not always be accurate, complete, or suitable for your intended use.
            You are responsible for reviewing and verifying AI-generated outputs before
            publishing or relying on them.
          </p>
        </Section>

        <Section title="9. Intellectual Property">
          <p>
            The Service, including its software, design, branding, and underlying technology, is
            owned by Rankerly / Xeventure IT Solutions and protected by applicable intellectual
            property laws. These Terms do not grant you any rights to our trademarks, logos, or
            branding beyond what is necessary to use the Service as intended.
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p>
            The Service is provided "as is" and "as available," without warranties of any
            kind, express or implied, including but not limited to merchantability,
            fitness for a particular purpose, and non-infringement. We do not guarantee
            specific ranking outcomes, review results, or business growth. Local search
            rankings are influenced by factors outside our control, including changes by
            Google and other third parties. We do not guarantee uninterrupted
            availability of the Service or compatibility with third-party platforms,
            APIs, or services.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, Rankerly and Xeventure IT Solutions shall not
            be liable for any indirect, incidental, special, consequential, or punitive damages, or
            any loss of profits, revenue, data, or business opportunities, arising from your use of
            or inability to use the Service, even if advised of the possibility of such damages.
            Our total liability for any claim arising from these Terms shall not exceed the amount
            you paid us in the twelve (12) months preceding the claim.
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to indemnify and hold harmless Rankerly, Xeventure IT Solutions, and their
            respective officers and employees from any claims, damages, or expenses (including
            reasonable legal fees) arising from your use of the Service, Your Content, or your
            violation of these Terms.
          </p>
        </Section>

        <Section title="13. Termination">
          <p>
            You may cancel your account at any time. We may suspend or terminate your access if you violate these Terms, engage in fraudulent or abusive activity, fail to pay applicable subscription fees, or if continued access poses a security or legal risk. Where practical, we will provide notice before termination.
          </p>
        </Section>

        <Section title="14. Governing Law">
          <p>
            These Terms are governed by the laws of India, without regard to conflict-of-law
            principles. Any disputes arising from these Terms or the Service shall be subject to
            the exclusive jurisdiction of the competent courts in India, unless otherwise required
            by applicable mandatory consumer protection law in your jurisdiction.
          </p>
        </Section>

        <Section title="15. Changes to These Terms">
          <p>
            We may update these Terms from time to time. Material changes will be communicated
            where reasonably possible. The updated version will be posted here with a new "Last
            updated" date. Continued use of the Service after changes constitutes acceptance of the
            revised Terms.
          </p>
        </Section>

        <Section title="16. Contact Us">
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
          <strong className="text-foreground">Disclaimer:</strong> This document is
          provided for general informational purposes and does not constitute legal
          advice. We recommend having it reviewed by a qualified legal professional
          familiar with the jurisdictions you operate in before publishing.
        </div>
      </div>
    </MainLayout>
  );
}