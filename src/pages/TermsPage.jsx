import { LegalPageLayout } from '@/features/marketing/LegalPageLayout';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { SITE_NAME, SITE_URL, WAITLIST_EMAIL } from '@/lib/siteConfig';

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" description={PAGE_DESCRIPTIONS.terms}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of {SITE_NAME} at {SITE_URL}.
        By accessing or using the service, you agree to these Terms.
      </p>

      <h2>Service description</h2>
      <p>
        {SITE_NAME} is a social media scheduling and approval platform for agencies and marketing teams.
        Access is currently invite-only. Features vary by subscription plan (Starter or Pro).
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must provide accurate account information and keep credentials secure.</li>
        <li>You are responsible for activity under your account and workspace.</li>
        <li>We may suspend accounts that violate these Terms or our Acceptable Use Policy.</li>
      </ul>

      <h2>Subscriptions and payments</h2>
      <ul>
        <li>Paid plans are billed monthly through Creem, which acts as merchant of record for payments, taxes, and invoicing.</li>
        <li>Prices shown on our pricing page are exclusive of applicable taxes unless stated otherwise; Creem may collect VAT or sales tax as required.</li>
        <li>Subscriptions renew automatically until canceled. Contact{' '}
          <a href={`mailto:${WAITLIST_EMAIL}`} className="font-medium text-honey-dark hover:underline">
            {WAITLIST_EMAIL}
          </a>{' '}
          for billing support or cancellation requests.
        </li>
        <li>Plan features are enforced in the application. Downgrading may limit access to team, client member, or Canva features.</li>
      </ul>

      <h2>Third-party platforms</h2>
      <p>
        Publishing to Facebook and Instagram requires compliance with Meta&apos;s Platform Terms and Community Standards.
        Canva integration requires compliance with Canva&apos;s terms. You are responsible for content you publish.
      </p>

      <h2>Intellectual property</h2>
      <p>
        You retain ownership of content you upload. You grant us a limited license to host, process, and transmit
        your content solely to provide the service.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties of uninterrupted availability.
        We are not liable for platform API changes, publishing failures, or third-party outages beyond reasonable control.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms. Continued use after changes constitutes acceptance.
        Material changes will be communicated via email or in-app notice where practicable.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms:{' '}
        <a href={`mailto:${WAITLIST_EMAIL}`} className="font-medium text-honey-dark hover:underline">
          {WAITLIST_EMAIL}
        </a>
      </p>
    </LegalPageLayout>
  );
}
