import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'What We Collect',
    content: (
      <>
        <p>We may collect the following types of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Your name and email address (if you subscribe to our newsletter)
          </li>
          <li>Shipping and billing address (if you place an order)</li>
          <li>Technical data (IP address, browser type, device info)</li>
          <li>Your interaction with our site (pages visited, time on site)</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Why We Collect It',
    content: (
      <>
        <p>We collect this data in order to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Process and deliver your orders</li>
          <li>
            Send occasional updates, product news, or promotions (only with your
            consent)
          </li>
          <li>Improve your experience on our site</li>
          <li>Ensure website performance and security</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Cookies',
    content: (
      <>
        <p>Our site uses cookies to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Remember your preferences</li>
          <li>Analyze site traffic and usage patterns</li>
          <li>
            Support marketing tools like Instagram &amp; TikTok pixels (only if
            accepted)
          </li>
        </ul>
        <p>
          You can manage or disable cookies anytime through your browser
          settings.
        </p>
      </>
    ),
  },
];

export const PrivacyPolicyPage = () => (
  <main className="min-h-dvh bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
    <article className="mx-auto max-w-3xl rounded-3xl border bg-background px-6 py-8 shadow-sm sm:px-10 sm:py-12">
      <header className="border-b pb-8">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          to="/onboarding"
        >
          <ArrowLeft className="size-4" />
          Volver al registro
        </Link>
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Privacy Policy &amp; Cookies &ndash; LunaSol
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This policy explains how we collect, use, and protect your
              personal data.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-9 pt-8 text-sm leading-7 text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            Introduction
          </h2>
          <p>
            At LunaSol, we care about your privacy. This Privacy Policy explains
            how we collect, use, and protect your personal data when you visit
            our website or interact with our services.
          </p>
        </section>

        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {section.title}
            </h2>
            {section.content}
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            Data Protection
          </h2>
          <p>
            Your data is stored securely and never shared with third parties,
            except where necessary for order fulfillment (e.g., shipping
            partners, payment processors).
          </p>
          <p className="font-semibold text-foreground">
            We never sell your data. Ever.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Your Rights</h2>
          <p>Under GDPR, you have the right to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Access the personal data we hold about you</li>
            <li>Request correction or deletion</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p>For any requests, just email us at: ________________</p>
        </section>

        <section className="space-y-3 border-t pt-8">
          <h2 className="text-xl font-semibold text-foreground">Updates</h2>
          <p>
            We may update this policy from time to time. All updates will be
            posted on this page.
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last updated: 09/07/2025
          </p>
        </section>
      </div>
    </article>
  </main>
);
