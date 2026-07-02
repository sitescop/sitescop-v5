import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { USER_ROLE_LABELS, UserRole } from '@sitescop/shared-types';
import { adminApi } from '@/lib/api/admin';
import { useFormErrors } from '@/lib/hooks/useFormErrors';
import { Button, Card, Input, PageHeader, Select } from '@/design-system/components';

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { clearErrors, handleError, fieldError } = useFormErrors();
  const [formError, setFormError] = useState('');

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.OFFICE_STAFF);
  const [password, setPassword] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers(),
  });

  useEffect(() => {
    if (!isEdit || !data) return;
    const user = data.users.find((u) => u.id === id);
    if (!user) return;
    setEmail(user.email);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setRole(user.role);
  }, [data, id, isEdit]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return adminApi.updateUser(id!, {
          firstName,
          lastName,
          role,
          password: password || undefined,
        });
      }
      return adminApi.createUser({
        email,
        firstName,
        lastName,
        role,
        password: password || undefined,
      });
    },
    onSuccess: () => navigate('/admin/users'),
    onError: (e) => setFormError(handleError(e)),
  });

  const roleOptions = Object.entries(USER_ROLE_LABELS)
    .filter(([value]) => value !== UserRole.SUPER_ADMIN)
    .map(([value, label]) => ({ value, label }));

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit User' : 'Add User'}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      <Card className="max-w-xl p-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            clearErrors();
            setFormError('');
            mutation.mutate();
          }}
        >
          {formError && <p className="text-sm text-danger">{formError}</p>}
          {!isEdit && (
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError('email')} required />
          )}
          <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={fieldError('firstName')} required />
          <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} error={fieldError('lastName')} required />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} options={roleOptions} />
          <Input
            label={isEdit ? 'New Password (optional)' : 'Password (optional — default SiteScop2026!)'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldError('password')}
          />
          <div className="flex gap-3">
            <Button type="submit" isLoading={mutation.isPending}>{isEdit ? 'Save' : 'Create User'}</Button>
            <Button variant="secondary" asChild>
              <Link to="/admin/users">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
