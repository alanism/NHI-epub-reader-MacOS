import { openDB, DBSchema } from 'idb';
import { LedgerEntry } from '../types';
import { DB_NAME, DB_VERSION, STORE_NAME } from '../constants';

interface ReaderDB extends DBSchema {
  ledger: {
    key: string;
    value: LedgerEntry;
    indexes: { 'by-book': string };
  };
}

const dbPromise = openDB<ReaderDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    store.createIndex('by-book', 'bookId');
  },
});

export const ledgerService = {
  async addEntry(entry: LedgerEntry): Promise<void> {
    const db = await dbPromise;
    await db.add(STORE_NAME, entry);
  },

  async deleteEntry(id: string): Promise<void> {
    const db = await dbPromise;
    await db.delete(STORE_NAME, id);
  },

  async getAllEntries(): Promise<LedgerEntry[]> {
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
  },

  async getEntriesByBook(bookId: string): Promise<LedgerEntry[]> {
    const db = await dbPromise;
    return db.getAllFromIndex(STORE_NAME, 'by-book', bookId);
  },
};