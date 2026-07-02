import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Card, CardDescription, CardHeader, CardTitle } from '@/design-system/components/Card';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setDevResetUrl('');
    setSubmitting(true);

    try {
      const response = await authApi.forgotPassword({ email: email.trim() });
      setMessage(response.message);
      if (response.devResetUrl) {
        setDevResetUrl(response.devResetUrl);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to process request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>
              Enter your email address and we will send you instructions to reset your password.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-sm border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-sm border border-success/20 bg-success/5 px-4 py-3 text-sm text-success" role="status">
                {message}
                {devResetUrl && (
                  <p className="mt-2 break-all">
                    <a href={devResetUrl} className="font-medium underline">
                      Development reset link
                    </a>
                  </p>
                )}
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

            <Button type="submit" className="w-full" isLoading={submitting}>
              Send reset instructions
            </Button>

            <Link to="/login" className="block text-center text-sm font-medium text-primary hover:text-primary-dark">
              Back to sign in
            </Link>
          </form>
        </Card>
      </div>
    </div>
  );
}
