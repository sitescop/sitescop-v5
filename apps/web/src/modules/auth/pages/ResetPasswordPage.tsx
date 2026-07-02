import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Card, CardDescription, CardHeader, CardTitle } from '@/design-system/components/Card';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (!token) {
      setError('Reset token is missing. Request a new password reset link.');
      return;
    }

    setSubmitting(true);

    try {
      await authApi.resetPassword({ token, password });
      navigate('/login', { replace: true, state: { message: 'Password updated. Please sign in.' } });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details) {
          const mapped: Record<string, string> = {};
          for (const [key, messages] of Object.entries(err.details)) {
            mapped[key] = messages[0];
          }
          setFieldErrors(mapped);
        }
      } else {
        setError('Unable to reset password. Please try again.');
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
            <CardTitle>Set new password</CardTitle>
            <CardDescription>
              Choose a strong password with at least 8 characters, including uppercase, lowercase, and a number.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-sm border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            )}

            <Input
              label="New password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />

            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
            />

            <Button type="submit" className="w-full" isLoading={submitting}>
              Update password
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
