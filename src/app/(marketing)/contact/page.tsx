import MainLayout from '@/app/layouts/MainLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { createMetadata } from '../../../../lib/metadata';
import ObfuscatedEmail from '@/components/contact_client/ObfuscatedEmail';

export const metadata = createMetadata({
  title: 'Contact Rankerly',
  description: 'Get in touch with the Rankerly team or find answers to common questions.',
  slug: '/contact',
});

const faqs = [
  {
    q: 'How do I get support for my account?',
    a: 'If you already have an account, the fastest way to get help is through the support option inside your dashboard — our team can see your account context and respond faster. For anything else, email us directly.',
  },
  {
    q: 'What locations does Rankerly support?',
    a: 'Rankerly works for any business with multiple physical locations, regardless of region — from local franchises to multi-branch service businesses.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'No, Rankerly is a paid-only platform — there is no free trial. You can review our plans and pricing before subscribing, and our team is happy to answer questions beforehand.',
  },
  {
    q: 'How is AI visibility tracked?',
    a: 'We monitor how your business appears in AI-generated answers across major platforms, alongside traditional Google Maps and local search rankings.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, plans are month-to-month and you can cancel anytime from your billing settings — no long-term contracts.',
  },
];

export default function ContactPage() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="container mx-auto px-6 pt-24 pb-20 max-w-3xl">
        <p className="text-sm font-medium text-primary mb-4">Contact</p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-6 leading-[1.15]">
          Get in touch.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
          Have a question before subscribing, or feedback for the team? Reach
          us directly — we usually reply within 24 hours.
        </p>
        <ObfuscatedEmail user="support" domain="rankerly.app" />
      </section>

      <div className="border-t border-border">
        {/* FAQ */}
        <section className="container mx-auto px-6 py-16 max-w-3xl">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-6">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>

      <div className="border-t border-border">
        {/* Existing user note */}
        <section className="container mx-auto px-6 py-16 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="text-lg font-semibold text-foreground mb-1">
                Already a Rankerly customer?
              </div>
              <p className="text-sm text-muted-foreground">
                Log in and use the support option in your dashboard for
                faster, account-aware help.
              </p>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}