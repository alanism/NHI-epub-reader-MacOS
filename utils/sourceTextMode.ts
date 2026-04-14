import { SourceTextMode } from '../types';

export const compressSourceText = (content: string): string => {
  const tokens = content.split(/\s+/).filter(Boolean);
  if (tokens.length <= 14) {
    return content;
  }

  const first = tokens.slice(0, 7).join(' ');
  const last = tokens.slice(-7).join(' ');
  return `${first} ... ${last}`;
};

export const applySourceTextMode = (content: string, mode: SourceTextMode): string => {
  if (mode === 'none') {
    return '';
  }

  if (mode === 'partial') {
    return compressSourceText(content);
  }

  return content;
};
