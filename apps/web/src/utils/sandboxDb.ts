import Dexie, { Table } from 'dexie';

export interface SandboxDocument<T = Record<string, any>> {
  id: string;
  collection: string;
  payload: T;
  createdAt: string;
  updatedAt: string;
}

export class SandboxDatabase extends Dexie {
  documents!: Table<SandboxDocument, string>;

  constructor() {
    super('LRP_Sandbox_DB');
    this.version(1).stores({
      documents: 'id, collection, createdAt, updatedAt',
    });
  }
}

export const sandboxDb = new SandboxDatabase();
