import { ArrowDown, ArrowsDownUp, ArrowUp, Check } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { i18n } from '../../i18n';
import type {
  FeedSort,
  FeedSortDirection,
  FeedSortField,
} from '../feedSorting';

export interface FeedSortControlProps {
  availableFields: readonly FeedSortField[];
  value: FeedSort;
  onChange: (value: FeedSort) => void;
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

export function FeedSortControl({
  availableFields,
  value,
  onChange,
}: FeedSortControlProps) {
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentLabel = value.field === 'original'
    ? i18n.t('reader.sortOriginal')
    : `${fieldLabel(value.field)} · ${directionLabel(value.field, value.direction)}`;

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

  const selectSort = (sort: FeedSort) => {
    onChange(sort);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={controlRef} className="relative flex">
      <button
        ref={triggerRef}
        className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 transition-colors duration-150 hover:bg-onefeed-blue-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-onefeed-focus ${
          open || value.field !== 'original' ? 'text-onefeed-blue' : 'text-onefeed-ink'
        }`}
        type="button"
        aria-label={i18n.t('reader.sortCurrent', [currentLabel])}
        title={i18n.t('reader.sortCurrent', [currentLabel])}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="onefeed-feed-sort-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <ArrowsDownUp size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id="onefeed-feed-sort-menu"
          className="absolute top-[42px] right-0 z-30 grid w-[200px] overflow-hidden rounded-md border border-onefeed-line bg-onefeed-surface p-1 shadow-[0_14px_36px_rgb(15_22_34_/_16%)] max-[720px]:top-11"
          role="menu"
          aria-label={i18n.t('reader.sortLoaded')}
        >
          <button
            className={`flex min-h-9 w-full cursor-pointer items-center justify-between rounded-[3px] border-0 px-2.5 text-left text-[11px] focus-visible:outline-3 focus-visible:outline-offset-[-2px] focus-visible:outline-onefeed-focus ${
              value.field === 'original'
                ? 'bg-onefeed-blue-soft text-onefeed-blue'
                : 'bg-transparent text-onefeed-muted hover:bg-onefeed-paper hover:text-onefeed-ink'
            }`}
            type="button"
            role="menuitemradio"
            aria-checked={value.field === 'original'}
            onClick={() => selectSort({ field: 'original' })}
          >
            <span>{i18n.t('reader.sortOriginal')}</span>
            {value.field === 'original' && (
              <Check className="shrink-0" size={12} weight="bold" aria-hidden="true" />
            )}
          </button>

          {availableFields.map((field) => (
            <div
              className="flex min-h-10 items-center justify-between gap-3 border-t border-onefeed-line px-2.5 text-[11px]"
              role="group"
              aria-label={fieldLabel(field)}
              key={field}
            >
              <span className="text-onefeed-ink">{fieldLabel(field)}</span>
              <span className="flex gap-1">
                {(['descending', 'ascending'] as const).map((direction) => {
                  const selected = value.field === field && value.direction === direction;
                  const optionLabel = `${fieldLabel(field)} · ${directionLabel(field, direction)}`;
                  const DirectionIcon = direction === 'descending' ? ArrowDown : ArrowUp;
                  return (
                    <button
                      className={`grid size-8 cursor-pointer place-items-center rounded-[3px] border-0 p-0 focus-visible:outline-3 focus-visible:outline-offset-[-2px] focus-visible:outline-onefeed-focus ${
                        selected
                          ? 'bg-onefeed-blue-soft text-onefeed-blue'
                          : 'bg-transparent text-onefeed-muted hover:bg-onefeed-paper hover:text-onefeed-ink'
                      }`}
                      type="button"
                      role="menuitemradio"
                      aria-label={optionLabel}
                      aria-checked={selected}
                      title={optionLabel}
                      key={direction}
                      onClick={() => selectSort({ field, direction })}
                    >
                      <DirectionIcon size={14} weight="bold" aria-hidden="true" />
                    </button>
                  );
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
