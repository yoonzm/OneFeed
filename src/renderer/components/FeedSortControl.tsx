import { ArrowsDownUp, CaretDown, Check } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '../../i18n';
import type {
  FeedSort,
  FeedSortDirection,
  FeedSortField,
} from '../feedSorting';

interface FeedSortControlProps {
  availableFields: readonly FeedSortField[];
  value: FeedSort;
  onChange: (value: FeedSort) => void;
}

interface FeedSortOption {
  id: string;
  label: string;
  fieldLabel?: string;
  value: FeedSort;
}

function fieldLabel(field: FeedSortField): string {
  if (field === 'publishedAt') return i18n.t('reader.sortPublishedAt');
  if (field === 'reactions') return i18n.t('reader.sortReactions');
  if (field === 'replies') return i18n.t('reader.sortReplies');
  return i18n.t('reader.sortBookmarks');
}

function directionLabel(field: FeedSortField, direction: FeedSortDirection): string {
  if (field === 'publishedAt') {
    return direction === 'descending'
      ? i18n.t('reader.sortNewest')
      : i18n.t('reader.sortOldest');
  }

  return direction === 'descending'
    ? i18n.t('reader.sortHighest')
    : i18n.t('reader.sortLowest');
}

function sortId(sort: FeedSort): string {
  return sort.field === 'original' ? sort.field : `${sort.field}-${sort.direction}`;
}

function createOptions(availableFields: readonly FeedSortField[]): FeedSortOption[] {
  return [
    {
      id: 'original',
      label: i18n.t('reader.sortOriginal'),
      value: { field: 'original' },
    },
    ...availableFields.flatMap((field) => (
      (['descending', 'ascending'] as const).map((direction) => ({
        id: `${field}-${direction}`,
        fieldLabel: fieldLabel(field),
        label: directionLabel(field, direction),
        value: { field, direction },
      }))
    )),
  ];
}

export function FeedSortControl({
  availableFields,
  value,
  onChange,
}: FeedSortControlProps) {
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => createOptions(availableFields), [availableFields]);
  const currentId = sortId(value);
  const currentOption = options.find((option) => option.id === currentId) || options[0]!;
  const currentLabel = currentOption.fieldLabel
    ? `${currentOption.fieldLabel} · ${currentOption.label}`
    : currentOption.label;

  useEffect(() => {
    if (!open) return undefined;

    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')
      ?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (controlRef.current && event.composedPath().includes(controlRef.current)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectSort = (option: FeedSortOption) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={controlRef} className="relative flex justify-end">
      <button
        ref={triggerRef}
        className="group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-onefeed-paper/95 px-2 text-[11px] text-onefeed-muted backdrop-blur-sm transition-colors hover:text-onefeed-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus"
        type="button"
        aria-label={i18n.t('reader.sortCurrent', [currentLabel])}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="onefeed-feed-sort-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <ArrowsDownUp size={13} aria-hidden="true" />
        <span>{i18n.t('reader.sortLabel')}</span>
        <strong className="font-onefeed-emphasis text-onefeed-ink transition-colors group-hover:text-onefeed-blue">
          {currentLabel}
        </strong>
        <CaretDown
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          size={10}
          weight="bold"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id="onefeed-feed-sort-menu"
          className="absolute top-full right-0 z-10 grid w-[232px] overflow-hidden rounded-md border border-onefeed-line bg-onefeed-surface p-1 shadow-[0_14px_36px_rgb(15_22_34_/_16%)]"
          role="menu"
          aria-label={i18n.t('reader.sortLoaded')}
        >
          <span
            className="px-2.5 pt-1.5 pb-2 font-onefeed-brand text-[9px] tracking-[.08em] text-onefeed-faint"
            role="presentation"
          >
            {i18n.t('reader.sortLoaded')}
          </span>
          {options.map((option, index) => {
            const selected = option.id === currentId;
            return (
              <button
                className={`flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-[3px] border-0 px-2.5 text-left text-[11px] focus-visible:outline-3 focus-visible:outline-offset-[-2px] focus-visible:outline-onefeed-focus ${
                  selected
                    ? 'bg-onefeed-blue-soft text-onefeed-blue'
                    : 'bg-transparent text-onefeed-muted hover:bg-onefeed-paper hover:text-onefeed-ink'
                } ${index === 1 ? 'mt-1' : ''}`}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                key={option.id}
                onClick={() => selectSort(option)}
              >
                <span className="min-w-0">
                  {option.fieldLabel && (
                    <span className="mr-1.5 text-onefeed-ink">{option.fieldLabel}</span>
                  )}
                  <span>{option.label}</span>
                </span>
                {selected && <Check className="shrink-0" size={12} weight="bold" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
