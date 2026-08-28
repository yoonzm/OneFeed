import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import { useMemo, type CSSProperties } from 'react';
import { PlatformIcon } from '../../components/PlatformIcon';
import {
  getPlatformDisplayName,
  getSupportedPlatforms,
  type PlatformDefinition,
  type PlatformId,
} from '../../config/platforms';
import { i18n } from '../../i18n';
import {
  DEFAULT_DISPLAY_PREFERENCES,
  type DisplayPreferences,
} from '../../preferences/displayPreferences';
import type { DisplayPreferencesUpdate } from '../../preferences/useDisplayPreferences';
import { SettingsPanelHeader } from './components/SettingsLayout';
import { Button } from './components/ui/Button';
import { Card, CardContent, CardHeader } from './components/ui/Card';
import { Switch } from './components/ui/Switch';

interface HeaderSettingsPanelProps {
  preferences: DisplayPreferences;
  ready: boolean;
  savePreferences: (update: DisplayPreferencesUpdate) => void;
}

interface SortablePlatformRowProps {
  index: number;
  platform: PlatformDefinition;
  ready: boolean;
  visible: boolean;
  onVisibleChange: (platformId: PlatformId, visible: boolean) => void;
}

export function reorderPlatformIds(
  platformIds: PlatformId[],
  activeId: PlatformId,
  overId: PlatformId,
): PlatformId[] {
  const activeIndex = platformIds.indexOf(activeId);
  const overIndex = platformIds.indexOf(overId);
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return platformIds;
  return arrayMove(platformIds, activeIndex, overIndex);
}

function SortablePlatformRow({
  index,
  platform,
  ready,
  visible,
  onVisibleChange,
}: SortablePlatformRowProps) {
  const platformId = platform.id as PlatformId;
  const displayName = getPlatformDisplayName(platformId);
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: platformId, disabled: !ready });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } satisfies CSSProperties;

  return (
    <li
      ref={setNodeRef}
      className={[
        'header-platform-row',
        visible ? '' : 'is-hidden',
        isDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      data-platform-id={platformId}
      style={style}
    >
      <button
        {...attributes}
        {...listeners}
        ref={setActivatorNodeRef}
        className="platform-drag-handle"
        type="button"
        disabled={!ready}
        title={i18n.t('display.dragPlatform', [displayName])}
        aria-label={i18n.t('display.dragPlatform', [displayName])}
      >
        <DotsSixVertical size={17} weight="bold" aria-hidden="true" />
      </button>
      <span className="platform-order-number" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="header-platform-icon" aria-hidden="true">
        <PlatformIcon platformId={platformId} />
      </span>
      <span className="header-platform-name">{displayName}</span>
      <Switch
        checked={visible}
        label={i18n.t('display.showPlatform', [displayName])}
        disabled={!ready}
        onCheckedChange={(checked) => onVisibleChange(platformId, checked)}
      />
    </li>
  );
}

export function HeaderSettingsPanel({
  preferences,
  ready,
  savePreferences,
}: HeaderSettingsPanelProps) {
  // A small distance threshold keeps ordinary row and switch clicks from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const orderedPlatforms = useMemo(() => {
    const supportedPlatforms = getSupportedPlatforms();
    const platformById = new Map(supportedPlatforms.map((platform) => [platform.id, platform]));
    return preferences.headerPlatformOrder
      .map((id) => platformById.get(id))
      .filter((platform) => platform !== undefined);
  }, [preferences.headerPlatformOrder]);

  const setPlatformVisible = (platformId: PlatformId, visible: boolean) => {
    savePreferences((current) => ({
      ...current,
      hiddenHeaderPlatformIds: visible
        ? current.hiddenHeaderPlatformIds.filter((id) => id !== platformId)
        : [...current.hiddenHeaderPlatformIds, platformId],
    }));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    savePreferences((current) => {
      const headerPlatformOrder = reorderPlatformIds(
        current.headerPlatformOrder,
        active.id as PlatformId,
        over.id as PlatformId,
      );
      return headerPlatformOrder === current.headerPlatformOrder
        ? current
        : { ...current, headerPlatformOrder };
    });
  };

  const getDragAnnouncement = (platformId: string, overId?: string) => {
    const displayName = getPlatformDisplayName(platformId as PlatformId);
    if (!overId) return i18n.t('display.dragCancelled', [displayName]);
    const position = orderedPlatforms.findIndex((platform) => platform.id === overId);
    return position < 0
      ? i18n.t('display.dragCancelled', [displayName])
      : i18n.t('display.dragMoved', [displayName, String(position + 1)]);
  };

  return (
    <>
      <SettingsPanelHeader
        title={i18n.t('settings.header')}
        description={i18n.t('settings.headerPanelDescription')}
      />

      <section className="display-section" aria-labelledby="header-settings-title">
        <div className="section-title">
          <div>
            <p>{i18n.t('display.headerEyebrow')}</p>
            <h2 id="header-settings-title">{i18n.t('display.headerTitle')}</h2>
          </div>
        </div>
        <Card as="article" className="platform-order-card">
          <CardHeader>
            <div>
              <h3>{i18n.t('display.headerPlatforms')}</h3>
              <p>{i18n.t('display.headerDescription')}</p>
            </div>
            <Button
              className="reset-order-button"
              type="button"
              variant="ghost"
              size="sm"
              disabled={!ready}
              onClick={() => savePreferences((current) => ({
                ...current,
                headerPlatformOrder: [...DEFAULT_DISPLAY_PREFERENCES.headerPlatformOrder],
              }))}
            >
              {i18n.t('display.resetOrder')}
            </Button>
          </CardHeader>
          <CardContent>
            <DndContext
              accessibility={{
                announcements: {
                  onDragStart: ({ active }) => i18n.t('display.dragStarted', [
                    getPlatformDisplayName(active.id as PlatformId),
                  ]),
                  onDragOver: ({ active, over }) => (
                    over ? getDragAnnouncement(String(active.id), String(over.id)) : undefined
                  ),
                  onDragEnd: ({ active, over }) => getDragAnnouncement(
                    String(active.id),
                    over ? String(over.id) : undefined,
                  ),
                  onDragCancel: ({ active }) => getDragAnnouncement(String(active.id)),
                },
                screenReaderInstructions: {
                  draggable: i18n.t('display.dragInstructions'),
                },
              }}
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedPlatforms.map((platform) => platform.id)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="header-platform-list">
                  {orderedPlatforms.map((platform, index) => {
                    const platformId = platform.id as PlatformId;
                    return (
                      <SortablePlatformRow
                        index={index}
                        key={platformId}
                        platform={platform}
                        ready={ready}
                        visible={!preferences.hiddenHeaderPlatformIds.includes(platformId)}
                        onVisibleChange={setPlatformVisible}
                      />
                    );
                  })}
                </ol>
              </SortableContext>
            </DndContext>
            <p className="active-platform-note">{i18n.t('display.activePlatformNote')}</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
