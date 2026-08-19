import { LegalPageLayout } from '@/features/marketing/LegalPageLayout';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { SITE_NAME, SITE_URL, WAITLIST_EMAIL } from '@/lib/siteConfig';

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" description={PAGE_DESCRIPTIONS.privacy}>
      <p>
        This Privacy Policy describes how {SITE_NAME} (&quot;we&quot;, &quot;us&quot;) collects, uses, and
        shares information when you use {SITE_URL} and related services.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, name, and password (hashed) when you sign up or accept an invite.</li>
        <li><strong>Workspace data:</strong> organization name, client names, posts, captions, media, schedules, and approval history.</li>
        <li><strong>Connected accounts:</strong> Facebook/Meta and Canva OAuth tokens (encrypted at rest) to publish and import content on your behalf.</li>
        <li><strong>Usage data:</strong> basic logs needed to operate the service (errors, feature usage, IP address for security).</li>
        <li><strong>Billing data:</strong> subscription status and customer identifiers from Creem (our payment provider). We do not store full payment card numbers.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Provide scheduling, approval, publishing, and inbox features you request.</li>
        <li>Send transactional emails (invites, notifications) when enabled.</li>
        <li>Process subscriptions and comply with billing obligations.</li>
        <li>Improve reliability, security, and support.</li>
      </ul>

      <h2>Third-party processors</h2>
      <ul>
        <li><strong>Supabase</strong> — authentication, database, and file storage.</li>
        <li><strong>Meta (Facebook/Instagram)</strong> — publishing and engagement when you connect accounts.</li>
        <li><strong>Canva</strong> — design import when you connect Canva (Pro plan).</li>
        <li><strong>Creem</strong> — payment processing and tax compliance as merchant of record.</li>
        <li><strong>OpenAI</strong> — optional AI Caption text generation when you click &quot;AI Caption&quot;.</li>
        <li><strong>Resend</strong> — transactional email delivery when configured.</li>
      </ul>

      <h2>Data retention</h2>
      <p>
        We retain your data while your account is active. If you delete your workspace or request deletion,
        we remove or anonymize data within a reasonable period, except where law requires retention.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, or export your personal data.
        Contact us at{' '}
        <a href={`mailto:${WAITLIST_EMAIL}`} className="font-medium text-honey-dark hover:underline">
          {WAITLIST_EMAIL}
        </a>{' '}
        to exercise these rights.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions:{' '}
        <a href={`mailto:${WAITLIST_EMAIL}`} className="font-medium text-honey-dark hover:underline">
          {WAITLIST_EMAIL}
        </a>
      </p>
    </LegalPageLayout>
  );
}
