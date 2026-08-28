export const OPEN_OPTIONS_MESSAGE_TYPE = 'onefeed:open-options';

export interface OpenOptionsMessage {
  type: typeof OPEN_OPTIONS_MESSAGE_TYPE;
}

export function isOpenOptionsMessage(value: unknown): value is OpenOptionsMessage {
  return typeof value === 'object' && value !== null &&
    'type' in value && value.type === OPEN_OPTIONS_MESSAGE_TYPE;
}

export function handleOpenOptionsMessage(
  value: unknown,
  openOptions: () => void,
): boolean {
  if (!isOpenOptionsMessage(value)) return false;
  openOptions();
  return true;
}
