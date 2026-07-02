import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { Button, Card, DataTable, Input, LoadingOverlay, Modal } from '@/design-system/components';
import { useSettingsForm } from './CompanySettingsPage';

export function ApiKeysSettingsPage() {
  const { canManage } = useSettingsForm();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: settingsApi.listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: () => settingsApi.createApiKey({ name }),
    onSuccess: (result) => {
      setSecret(result.secret);
      setName('');
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteApiKey(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  if (isLoading) return <LoadingOverlay message="Loading API keys..." fullScreen={false} />;

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">API Keys</h2>
          <p className="text-sm text-text-light">Manage programmatic access to your company data</p>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)}>Create API Key</Button>
        )}
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'prefix', header: 'Prefix', render: (row) => row.keyPrefix },
          {
            key: 'created',
            header: 'Created',
            hideOnMobile: true,
            render: (row) => new Date(row.createdAt).toLocaleDateString('en-AU'),
          },
          {
            key: 'actions',
            header: '',
            render: (row) =>
              canManage ? (
                <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(row.id)}>
                  Revoke
                </Button>
              ) : null,
          },
        ]}
        data={data?.apiKeys ?? []}
        keyExtractor={(row) => row.id}
        emptyMessage="No API keys created yet"
      />

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSecret(null);
        }}
        title={secret ? 'API Key Created' : 'Create API Key'}
        footer={
          secret ? (
            <Button onClick={() => { setOpen(false); setSecret(null); }}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!name} isLoading={createMutation.isPending}>Create</Button>
            </>
          )
        }
      >
        {secret ? (
          <div className="space-y-2">
            <p className="text-sm text-text-light">Copy this key now. It will not be shown again.</p>
            <code className="block break-all rounded bg-background p-3 text-sm">{secret}</code>
          </div>
        ) : (
          <Input label="Key Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Integration Server" />
        )}
      </Modal>
    </Card>
  );
}
