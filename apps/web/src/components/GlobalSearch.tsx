import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import type { SearchResultItem, SearchResultType } from '@sitescop/shared-types';
import { searchApi } from '@/lib/api/search';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<SearchResultType, string> = {
  job: 'Jobs',
  contact: 'Contacts',
  agreement: 'Agreements',
  inspection: 'Inspections',
  invoice: 'Invoices',
};

function resultHref(item: SearchResultItem): string {
  switch (item.type) {
    case 'job':
      return `/jobs/${item.id}`;
    case 'contact':
      return `/crm/${item.id}`;
    case 'agreement':
      return `/agreements/${item.id}`;
    case 'inspection':
      return `/inspections/${item.id}`;
    case 'invoice':
      return `/accounts/${item.id}`;
    default:
      return '/dashboard';
  }
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

interface GlobalSearchProps {
  className?: string;
  inputClassName?: string;
  compact?: boolean;
}

export function GlobalSearch({ className, inputClassName, compact = false }: GlobalSearchProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => searchApi.global(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const results = data?.results ?? [];
  const showResults = open && debouncedQuery.trim().length >= 2;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const grouped = results.reduce<Record<string, SearchResultItem[]>>((acc, item) => {
    const key = TYPE_LABELS[item.type];
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  function selectResult(item: SearchResultItem) {
    setOpen(false);
    setQuery('');
    navigate(resultHref(item));
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
          }
          if (e.key === 'Enter' && results[0]) {
            e.preventDefault();
            selectResult(results[0]);
          }
        }}
        placeholder={compact ? 'Search…' : 'Search jobs, clients, agreements…'}
        className={cn('form-input pl-10 pr-16', inputClassName)}
        aria-label="Global search"
        aria-expanded={showResults}
        aria-controls={listId}
        autoComplete="off"
        role="combobox"
      />
      {!compact && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-text-muted sm:inline">
          Ctrl K
        </kbd>
      )}

      {showResults && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[min(24rem,70vh)] w-full overflow-y-auto rounded-sm border border-border bg-surface py-1 shadow-elevated"
        >
          {isFetching && (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </p>
          )}

          {!isFetching && results.length === 0 && (
            <p className="px-3 py-3 text-sm text-text-muted">No results for &ldquo;{debouncedQuery}&rdquo;</p>
          )}

          {!isFetching &&
            Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
                {items.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    role="option"
                    className="block w-full px-3 py-2 text-left hover:bg-background"
                    onClick={() => selectResult(item)}
                  >
                    <span className="block text-sm font-medium text-text">{item.title}</span>
                    {item.subtitle && (
                      <span className="mt-0.5 block truncate text-xs text-text-light">{item.subtitle}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}

          {!isFetching && results.length > 0 && (
            <div className="border-t border-border px-3 py-2 text-xs text-text-muted">
              Press Enter for first result
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GlobalSearchMobileTrigger() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="rounded-sm p-2 text-text-light hover:bg-background md:hidden"
        aria-label="Open search"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 md:hidden">
      <div className="mx-auto mt-2 max-w-lg rounded-sm border border-border bg-surface p-3 shadow-elevated">
        <GlobalSearch compact inputClassName="w-full" />
        <button type="button" className="mt-2 text-sm text-primary" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}
