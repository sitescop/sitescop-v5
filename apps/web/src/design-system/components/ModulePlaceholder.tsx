import { PageHeader } from '@/design-system/components/PageHeader';
import { Card } from '@/design-system/components/Card';
import { EmptyState } from '@/design-system/components/EmptyState';
import { Construction } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  phase: string;
}

export function ModulePlaceholder({ title, description, phase }: ModulePlaceholderProps) {
  return (
    <div>
      <PageHeader title={title} description={description} breadcrumbs={[{ label: title }]} />
      <Card>
        <EmptyState
          icon={<Construction className="h-12 w-12" />}
          title={`${title} — ${phase}`}
          description={`This module is scheduled for ${phase}. Phase 0 provides authentication, navigation, and role-based dashboards.`}
        />
      </Card>
    </div>
  );
}
