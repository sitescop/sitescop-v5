import { useState, useEffect, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { getPostLoginPath } from '@/modules/auth/components/HomeRedirect';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Card, CardDescription, CardHeader, CardTitle } from '@/design-system/components/Card';
import { LoadingOverlay } from '@/design-system/components/LoadingOverlay';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loadSession = useAuthStore((s) => s.loadSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (isLoading) {
    return <LoadingOverlay message="Checking session..." />;
  }

  if (isAuthenticated) {
    const destination = from ?? (user ? getPostLoginPath(user.role) : '/dashboard');
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      const user = useAuthStore.getState().user;
      navigate(from ?? (user ? getPostLoginPath(user.role) : '/dashboard'), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text">
            Site<span className="text-accent">Scop</span>
          </h1>
          <p className="mt-2 text-sm text-text-light">Professional Inspection Platform V5</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to access your workspace.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-sm border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-dark">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={submitting}>
              Sign in
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-text-muted">
          Demo: admin@sitescop-demo.com.au or client@sitescop-demo.com.au / SiteScop2026!
        </p>
      </div>
    </div>
  );
}
