import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';
import { WAITLIST_EMAIL } from '@/lib/siteConfig';
import { submitWaitlistRequest } from '@/lib/admin';
import { HexMark } from '@/components/brand/HexMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketingHeader, MarketingPage } from '@/features/marketing/MarketingNav';

export default function WaitlistPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = name.trim() && email.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await submitWaitlistRequest({ name, email, message });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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
            socialHyve is invite-only while we onboard teams carefully. Submit your details and
            we&apos;ll reach out from{' '}
            <a href={`mailto:${WAITLIST_EMAIL}`} className="font-medium text-honey-dark hover:underline">
              {WAITLIST_EMAIL}
            </a>{' '}
            when a spot opens.
          </p>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="font-display text-xl">Request access</CardTitle>
              <CardDescription>
                {submitted
                  ? 'Your request is in our queue. We will email you when approved.'
                  : 'We review every request manually during early access.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="space-y-4 text-sm text-neutral-700">
                  <p>
                    Thanks, {name.trim()}! Once approved, you&apos;ll receive sign-in credentials
                    and be prompted to set a new password on first login.
                  </p>
                  <Button variant="outline" asChild>
                    <Link to="/">Back to home</Link>
                  </Button>
                </div>
              ) : (
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
                  {error ? <p className="text-sm text-red-600">{error}</p> : null}
                  <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
                    {submitting ? 'Submitting…' : 'Submit request'}
                  </Button>
                </form>
              )}

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Already have access?{' '}
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
