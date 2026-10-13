export type StoredRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
} & { [field: string]: string | boolean };

export type RecordValues = Record<string, string | boolean>;

function isStoredRecord(value: unknown): value is StoredRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

/**
 * Small browser-only (localStorage) store used by Leads and Customers.
 * Mirrors the error handling used by api/contacts.ts.
 */
export function createLocalStore(storageKey: string, label: string) {
  function read(): StoredRecord[] {
    let stored: string | null;
    try {
      stored = window.localStorage.getItem(storageKey);
    } catch (error) {
      throw new Error(`Unable to read ${label} from this browser.`, {
        cause: error,
      });
    }
    if (stored === null) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      throw new Error(
        `Saved local ${label} could not be read because the browser data is invalid.`,
      );
    }
    if (!Array.isArray(parsed) || !parsed.every(isStoredRecord)) {
      throw new Error(
        `Saved local ${label} have an unexpected format. They were left unchanged.`,
      );
    }
    return parsed;
  }

  function write(records: StoredRecord[]): void {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(records));
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        throw new Error(
          `Browser storage is full. Remove some local ${label} and try again.`,
          { cause: error },
        );
      }
      throw new Error(`Unable to save ${label} in this browser.`, {
        cause: error,
      });
    }
  }

  function list(): StoredRecord[] {
    return read();
  }

  function create(values: RecordValues): StoredRecord {
    const now = new Date().toISOString();
    const record: StoredRecord = {
      ...values,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    write([record, ...read()]);
    return record;
  }

  function update(id: string, values: RecordValues): StoredRecord {
    const records = read();
    const existing = records.find((record) => record.id === id);
    if (!existing) throw new Error("This record no longer exists.");
    const updated: StoredRecord = {
      ...existing,
      ...values,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    write(records.map((record) => (record.id === id ? updated : record)));
    return updated;
  }

  function remove(id: string): void {
    const records = read();
    if (!records.some((record) => record.id === id)) {
      throw new Error("This record no longer exists.");
    }
    write(records.filter((record) => record.id !== id));
  }

  /**
   * Creates the record for a contact, or refreshes it if that contact was
   * already converted before (so converting twice never duplicates a row).
   */
  function upsertBySource(
    sourceContactId: string,
    values: RecordValues,
    onCreate?: () => RecordValues,
  ): StoredRecord {
    const records = read();
    const existing = records.find(
      (record) => record.sourceContactId === sourceContactId,
    );
    const now = new Date().toISOString();
    if (existing) {
      const updated: StoredRecord = {
        ...existing,
        ...values,
        id: existing.id,
        createdAt: existing.createdAt,
        sourceContactId,
        updatedAt: now,
      };
      write(records.map((record) => (record.id === existing.id ? updated : record)));
      return updated;
    }
    const record: StoredRecord = {
      ...values,
      ...(onCreate ? onCreate() : {}),
      sourceContactId,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    write([record, ...records]);
    return record;
  }

  return { list, create, update, remove, upsertBySource };
}
