import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { WAITLIST_EMAIL } from '@/lib/siteConfig';
import { HexMark } from '@/components/brand/HexMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketingHeader, MarketingPage } from '@/features/marketing/MarketingNav';

function buildWaitlistMailto({ name, email, message }) {
  const subject = encodeURIComponent('socialHyve waitlist request');
  const body = encodeURIComponent(
    [
      'Hi socialHyve team,',
      '',
      "I'd like to join the waitlist for early access.",
      '',
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      message.trim() ? '' : null,
      message.trim() ? `Message: ${message.trim()}` : null,
      '',
      'Thanks!',
    ].filter(Boolean).join('\n'),
  );
  return `mailto:${WAITLIST_EMAIL}?subject=${subject}&body=${body}`;
}

export default function WaitlistPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const canSubmit = name.trim() && email.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    window.location.href = buildWaitlistMailto({ name, email, message });
  };

  return (
    <MarketingPage>
      <DocumentMeta title="Join the waitlist" description={PAGE_DESCRIPTIONS.waitlist} />
      <MarketingHeader backToHome />

      <main
        className="px-4 py-12 sm:px-6 sm:py-16"
        style={{
          background: `
            radial-gradient(circle at 15% 18%, rgba(246,166,0,.18), transparent 55%),
            radial-gradient(circle at 85% 0%, rgba(255,199,44,.2), transparent 45%),
            var(--paper)
          `,
        }}
      >
        <div className="mx-auto max-w-lg">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-600">
            <HexMark size={16} />
            Invite-only early access
          </span>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Join the waitlist
          </h1>
          <p className="mt-3 text-neutral-600">
            socialHyve is invite-only while we onboard teams carefully. Tell us a bit about yourself
            and we&apos;ll email you at{' '}
            <a href={`mailto:${WAITLIST_EMAIL}`} className="font-medium text-honey-dark hover:underline">
              {WAITLIST_EMAIL}
            </a>{' '}
            when we have a spot.
          </p>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="font-display text-xl">Request access</CardTitle>
              <CardDescription>
                Submitting opens your email app with a pre-filled message to our team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="waitlist-name" className="block text-xs font-medium">
                    Name
                  </label>
                  <Input
                    id="waitlist-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="waitlist-email" className="block text-xs font-medium">
                    Email
                  </label>
                  <Input
                    id="waitlist-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@agency.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="waitlist-message" className="block text-xs font-medium">
                    About you <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    id="waitlist-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Agency name, number of clients, what you're looking for…"
                    rows={4}
                    className="flex w-full rounded-hyve-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey"
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={!canSubmit}>
                  <Mail className="h-4 w-4" />
                  Email {WAITLIST_EMAIL}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Already have an invite?{' '}
                <Link to="/app/login" className="font-medium text-honey-dark hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-paper-alt px-4 py-8 text-center text-sm text-neutral-500 sm:px-6">
        <Link to="/" className="font-medium text-honey-dark hover:underline">
          ← socialHyve home
        </Link>
      </footer>
    </MarketingPage>
  );
}
