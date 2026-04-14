import { isTauri } from '@tauri-apps/api/core';
import { basename } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';

const EPUB_FILTER = [{ name: 'EPUB', extensions: ['epub'] }];

export const nativeDesktopService = {
  isNativeDesktop(): boolean {
    return isTauri();
  },

  async pickEpubFile(): Promise<File | null> {
    if (!isTauri()) {
      return null;
    }

    const selected = await open({
      title: 'Open EPUB',
      multiple: false,
      directory: false,
      fileAccessMode: 'scoped',
      filters: EPUB_FILTER,
    });

    if (!selected || Array.isArray(selected)) {
      return null;
    }

    const bytes = await readFile(selected);
    const filename = await basename(selected).catch(() => 'book.epub');

    return new File([bytes], filename, { type: 'application/epub+zip' });
  },
};
