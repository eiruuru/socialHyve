import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { acceptInvite, previewInvite } from '@/lib/organization';
import { savePendingInvite } from '@/lib/membershipContext';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgToken = searchParams.get('invite');
  const clientToken = searchParams.get('clientInvite');
  const inviteToken = orgToken || clientToken;
  const inviteType = orgToken ? 'organization' : clientToken ? 'client' : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === '1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);

  useEffect(() => {
    if (!inviteToken || !inviteType) return;

    previewInvite(inviteToken, inviteType)
      .then((preview) => {
        setInvitePreview(preview);
        setEmail(preview.email || '');
        if (preview.type === 'client') setIsSignUp(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setInviteLoading(false));
  }, [inviteToken, inviteType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (inviteToken && inviteType) {
        if (session) {
          const result = await acceptInvite(inviteToken, inviteType);
          navigate(result.redirectTo || '/app/calendar');
          return;
        }
        savePendingInvite(inviteType, inviteToken);
        setError('Check your email to confirm your account, then sign in again to complete the invite.');
        return;
      }

      navigate('/app/calendar');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then request a reset link.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/app/login`,
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background: `
          radial-gradient(circle at 15% 18%, rgba(246,166,0,.22), transparent 55%),
          radial-gradient(circle at 85% 0%, rgba(255,199,44,.28), transparent 45%),
          var(--paper)
        `,
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="font-display text-2xl">
            {invitePreview ? 'Accept invite' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {invitePreview
              ? `Join ${invitePreview.label} as ${invitePreview.role}`
              : 'Schedule posts to Facebook and Instagram'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteLoading ? (
            <p className="text-center text-sm text-muted-foreground">Loading invite…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {invitePreview && (
                <div className="rounded-hyve-sm border border-honey/30 bg-honey-light/30 px-3 py-2 text-sm">
                  You&apos;ve been invited to <strong>{invitePreview.label}</strong> as{' '}
                  <span className="capitalize">{invitePreview.role}</span>.
                </div>
              )}
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!invitePreview?.email}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              {resetSent && (
                <p className="text-sm text-status-published">Password reset link sent — check your email.</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : invitePreview ? 'Accept & continue' : isSignUp ? 'Sign up' : 'Sign in'}
              </Button>
              {!invitePreview && !isSignUp && (
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={handlePasswordReset}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              )}
              {!invitePreview && (
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
              )}
            </form>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-ink">← Back to home</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
