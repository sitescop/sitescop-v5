import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-sm', className)}>
      <Link
        to="/dashboard"
        className="flex items-center text-text-light transition-colors hover:text-primary"
        aria-label="Dashboard home"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center">
          <ChevronRight className="mx-2 h-4 w-4 text-text-muted" aria-hidden />
          {item.href ? (
            <Link to={item.href} className="text-text-light transition-colors hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-text" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
