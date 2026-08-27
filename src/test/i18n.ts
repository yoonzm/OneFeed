import zhCnMessages from '../locales/zh_CN.json';

interface MessageObject {
  [key: string]: string | MessageObject;
}

type MessageTree = string | MessageObject;

export function flattenMessages(
  tree: Record<string, MessageTree>,
  prefix = '',
  messages: Record<string, string> = {},
): Record<string, string> {
  Object.entries(tree).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      messages[path] = value;
      return;
    }
    if ('n' in value) {
      messages[path] = [value['0'], value['1'], value.n].filter(Boolean).join(' | ') as string;
      return;
    }
    flattenMessages(value, path, messages);
  });
  return messages;
}

export function createTestI18n(tree: Record<string, MessageTree>) {
  const messages = flattenMessages(tree);
  const translate = (
    key: string,
    ...args: Array<number | string[] | Record<string, string | number>>
  ): string => {
    let message = messages[key] || key;
    const count = args.find((argument): argument is number => typeof argument === 'number');
    const positional = args.find((argument): argument is string[] => Array.isArray(argument)) ||
      (count === undefined ? [] : [String(count)]);
    const named = args.find((argument): argument is Record<string, string | number> => (
      typeof argument === 'object' && !Array.isArray(argument)
    ));

    if (count !== undefined) {
      const forms = message.split(' | ');
      message = forms.length === 3
        ? forms[count === 0 ? 0 : count === 1 ? 1 : 2]!
        : forms[count === 1 ? 0 : 1]!;
    }
    positional.forEach((value, index) => {
      message = message.replaceAll(`$${index + 1}`, String(value));
    });
    if (named) {
      Object.entries(named).forEach(([name, value]) => {
        message = message.replaceAll(`{${name}}`, String(value));
      });
    }
    return message;
  };

  return { t: translate };
}

export const i18n = createTestI18n(zhCnMessages as Record<string, MessageTree>);
