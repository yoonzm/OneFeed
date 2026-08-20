import type { ContentItemBase, FeedBlock } from '../../../types/feed';

const COMPACT_TEXT_LENGTH = 40;
const COMPACT_TITLE_LENGTH = 32;
const EXPANDABLE_TEXT_LENGTH = 260;

/** 列表密度只由内容结构决定，Feed 与 Thread 可以各自选择是否采用该样式。 */
export function getDensityClassName(
  item: Pick<ContentItemBase, 'title'>,
  blocks: readonly FeedBlock[],
): string {
  const titleLength = Array.from(item.title?.trim() || '').length;
  if (titleLength && titleLength <= COMPACT_TITLE_LENGTH && !blocks.length) {
    return 'item-card-compact';
  }

  if (item.title || blocks.length !== 1) return '';

  const block = blocks[0];
  if (!block || block.type !== 'richText') return '';

  const textLength = Array.from(block.plainText.trim()).length;
  if (!textLength || textLength > COMPACT_TEXT_LENGTH) return '';

  return 'item-card-compact';
}

/** 展开阈值只决定是否提供交互，不改变协议中保存的完整内容。 */
export function hasExpandableText(blocks: readonly FeedBlock[]): boolean {
  return blocks.some(
    (block) => block.type === 'richText' && block.plainText.length > EXPANDABLE_TEXT_LENGTH,
  );
}
