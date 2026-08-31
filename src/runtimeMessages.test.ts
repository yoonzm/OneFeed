import { describe, expect, it, vi } from 'vitest';
import {
  handleOpenOptionsMessage,
  isOpenOptionsMessage,
  OPEN_OPTIONS_MESSAGE_TYPE,
} from './runtimeMessages';

describe('runtime messages', () => {
  it('accepts only the dedicated options-page command', () => {
    expect(isOpenOptionsMessage({ type: OPEN_OPTIONS_MESSAGE_TYPE })).toBe(true);
    expect(isOpenOptionsMessage({ type: 'onefeed:unknown' })).toBe(false);
    expect(isOpenOptionsMessage(undefined)).toBe(false);
  });

  it('delegates the options command to the background opener', () => {
    const openOptions = vi.fn();

    expect(handleOpenOptionsMessage(
      { type: OPEN_OPTIONS_MESSAGE_TYPE },
      openOptions,
    )).toBe(true);
    expect(openOptions).toHaveBeenCalledOnce();
    expect(handleOpenOptionsMessage({ type: 'onefeed:unknown' }, openOptions)).toBe(false);
    expect(openOptions).toHaveBeenCalledOnce();
  });
});
