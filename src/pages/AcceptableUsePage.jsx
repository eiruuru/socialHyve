import { LegalPageLayout } from '@/features/marketing/LegalPageLayout';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { SITE_NAME, WAITLIST_EMAIL } from '@/lib/siteConfig';

export default function AcceptableUsePage() {
  return (
    <LegalPageLayout title="Acceptable Use Policy" description={PAGE_DESCRIPTIONS.acceptableUse}>
      <p>
        This Acceptable Use Policy applies to all users of {SITE_NAME}. By using the service, you agree not to:
      </p>

      <h2>Prohibited content</h2>
      <ul>
        <li>Publish or schedule illegal, fraudulent, or deceptive content.</li>
        <li>Share content that violates Meta (Facebook/Instagram) Community Standards or Platform Terms.</li>
        <li>Distribute spam, malware, phishing links, or unsolicited bulk messaging.</li>
        <li>Post hate speech, harassment, threats, or content that exploits or harms minors.</li>
        <li>Publish sexually explicit, violent, or otherwise harmful material through connected social accounts.</li>
      </ul>

      <h2>Prohibited conduct</h2>
      <ul>
        <li>Attempt to bypass authentication, rate limits, or plan restrictions.</li>
        <li>Scrape, reverse engineer, or overload the service or connected APIs.</li>
        <li>Use the service to impersonate others or misrepresent your affiliation.</li>
        <li>Share account credentials or resell access without authorization.</li>
        <li>Automate abusive engagement (fake likes, comment spam, bot-driven DMs).</li>
      </ul>

      <h2>AI Caption feature</h2>
      <p>
        The optional AI Caption assistant generates text suggestions only. You are responsible for reviewing
        and approving all captions before publishing. Do not use AI Caption to generate harmful, misleading,
        or policy-violating content.
      </p>

      <h2>Enforcement</h2>
      <p>
        We may warn, suspend, or terminate accounts that violate this policy. Serious violations may be reported
        to relevant platforms or authorities. Report abuse to{' '}
        <a href={`mailto:${WAITLIST_EMAIL}`} className="font-medium text-honey-dark hover:underline">
          {WAITLIST_EMAIL}
        </a>.
      </p>
    </LegalPageLayout>
  );
}
