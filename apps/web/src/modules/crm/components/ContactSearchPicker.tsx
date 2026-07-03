import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import type { ContactType } from '@sitescop/shared-types';
import { crmApi } from '@/lib/api/crm';
import { cn } from '@/lib/utils';

const TITLE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Mr', label: 'Mr' },
  { value: 'Mrs', label: 'Mrs' },
  { value: 'Miss', label: 'Miss' },
  { value: 'Ms', label: 'Ms' },
  { value: 'Dr', label: 'Dr' },
  { value: 'Mx', label: 'Mx' },
];

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function formatContactLabel(displayName: string, email: string | null, phone: string | null): string {
  const parts = [displayName];
  if (email?.trim()) parts.push(email.trim());
  else if (phone?.trim()) parts.push(phone.trim());
  return parts.join(' · ');
}

interface ContactSearchPickerProps {
  label: string;
  contactType: ContactType;
  value: string;
  onChange: (contactId: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  required?: boolean;
  requireEmail?: boolean;
  error?: string;
  hint?: string;
  searchPlaceholder?: string;
}

export function ContactSearchPicker({
  label,
  contactType,
  value,
  onChange,
  title = '',
  onTitleChange,
  required,
  requireEmail,
  error,
  hint,
  searchPlaceholder = 'Search by name, email, or phone…',
}: ContactSearchPickerProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: selectedData } = useQuery({
    queryKey: ['crm-contact', value],
    queryFn: () => crmApi.get(value),
    enabled: Boolean(value),
  });

  const searchReady = debouncedSearch.trim().length >= 2;

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['crm-contacts-search', contactType, debouncedSearch, requireEmail],
    queryFn: () =>
      crmApi.list({
        type: contactType,
        search: debouncedSearch.trim(),
        pageSize: '25',
      }),
    enabled: open && searchReady,
  });

  const results = (searchData?.contacts ?? []).filter(
    (contact) => !requireEmail || Boolean(contact.email?.trim()),
  );

  const selectedContact = selectedData?.contact;
  const showTitle = onTitleChange != null;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const clearSelection = () => {
    onChange('');
    setSearch('');
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="w-full" ref={containerRef}>
      <label className="form-label" htmlFor={`${listId}-input`}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>

      <div className="flex gap-2">
        {showTitle && (
          <select
            className="form-input w-[5.5rem] shrink-0 px-2 text-sm"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            aria-label={`${label} title`}
          >
            {TITLE_OPTIONS.map((opt) => (
              <option key={opt.value || 'none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <div className="relative min-w-0 flex-1">
          {value && selectedContact ? (
            <div
              className={cn(
                'form-input flex items-center justify-between gap-2 py-2',
                error && 'border-danger',
              )}
            >
              <span className="truncate text-sm text-text">
                {formatContactLabel(
                  selectedContact.displayName,
                  selectedContact.email,
                  selectedContact.phone,
                )}
              </span>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-text-muted hover:bg-background hover:text-text"
                onClick={clearSelection}
                aria-label={`Clear ${label}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                ref={inputRef}
                id={`${listId}-input`}
                type="text"
                className={cn('form-input pl-9', error && 'border-danger focus:border-danger focus:ring-danger/20')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-invalid={Boolean(error)}
              />
            </>
          )}

          {open && !value && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-sm border border-border bg-surface py-1 shadow-card"
            >
              {!searchReady && (
                <li className="px-3 py-2 text-sm text-text-muted">Type at least 2 characters to search</li>
              )}

              {searchReady && isFetching && (
                <li className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </li>
              )}

              {searchReady && !isFetching && results.length === 0 && (
                <li className="px-3 py-2 text-sm text-text-muted">No contacts found</li>
              )}

              {searchReady &&
                !isFetching &&
                results.map((contact) => (
                  <li key={contact.id} role="option">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-background"
                      onClick={() => {
                        onChange(contact.id);
                        setSearch('');
                        setOpen(false);
                      }}
                    >
                      <span className="font-medium text-text">{contact.displayName}</span>
                      {(contact.email || contact.phone) && (
                        <span className="mt-0.5 block truncate text-xs text-text-muted">
                          {[contact.email, contact.phone].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}

              {searchReady && !isFetching && searchData && searchData.total > results.length && (
                <li className="border-t border-border px-3 py-2 text-xs text-text-muted">
                  Showing {results.length} of {searchData.total} — refine your search
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {hint && <p className="mt-1 text-xs text-text-light">{hint}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
