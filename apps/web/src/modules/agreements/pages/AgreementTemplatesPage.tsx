import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { JOB_TYPE_LABELS, JobType } from '@sitescop/shared-types';
import { agreementsApi } from '@/lib/api/agreements';
import { Button, Card, LoadingOverlay, PageHeader, Select, Textarea } from '@/design-system/components';
import type { AgreementLegalContent } from '@sitescop/shared-types';

export function AgreementTemplatesPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<JobType>(JobType.BUILDING);
  const [sections, setSections] = useState<AgreementLegalContent['sections']>([]);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['agreement-template', type],
    queryFn: () => agreementsApi.getTemplate(type),
  });

  useEffect(() => {
    if (data?.template) {
      setSections(data.template.sections);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => agreementsApi.updateTemplate(type, { sections }),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ['agreement-template', type] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const typeOptions = [JobType.BUILDING, JobType.PEST, JobType.COMBINED].map((value) => ({
    value,
    label: JOB_TYPE_LABELS[value],
  }));

  if (isLoading) return <LoadingOverlay message="Loading template..." fullScreen={false} />;

  return (
    <div>
      <PageHeader
        title="Agreement Templates"
        description="Customise legal document sections per inspection type"
        breadcrumbs={[
          { label: 'Agreements', href: '/agreements' },
          { label: 'Templates' },
        ]}
      />

      <Card className="max-w-3xl space-y-4 p-6">
        <Select
          label="Inspection Type"
          value={type}
          onChange={(e) => setType(e.target.value as JobType)}
          options={typeOptions}
        />

        {sections.map((section, index) => (
          <div key={section.id} className="space-y-2 rounded-lg border border-border p-4">
            <InputLike label="Section Title" value={section.title} onChange={(v) => {
              const next = [...sections];
              next[index] = { ...section, title: v };
              setSections(next);
            }} />
            <Textarea
              label="Content"
              value={section.content}
              onChange={(e) => {
                const next = [...sections];
                next[index] = { ...section, content: e.target.value };
                setSections(next);
              }}
              className="min-h-[120px]"
            />
          </div>
        ))}

        <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
          {saved ? 'Saved' : 'Save Template'}
        </Button>
      </Card>
    </div>
  );
}

function InputLike({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input className="form-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
