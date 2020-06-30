// Originally from: https://github.com/eightysteele/thread-shell/blob/master/src/database.js

import { Client, ThreadID } from "@textile/hub";
import {
  QueryJSON,
  ReadTransaction,
  WriteTransaction,
} from "@textile/threads-client";

/**
 * Represents a single collection and has a reference to its database.
 */
class Collection {
  /**
   * @param db — The DB this collection belongs to.
   * @param name — The collection name.
   * @param schema — The collection schema.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  constructor(private db: DB, readonly name: string, readonly schema: any) {}

  create(...entities: any[]): Promise<string[]> {
    return this.db.client.create(this.db.id, this.name, entities);
  }

  save(...entities: any[]): Promise<void> {
    return this.db.client.save(this.db.id, this.name, entities);
  }

  delete(...ids: string[]): Promise<void> {
    return this.db.client.delete(this.db.id, this.name, ids);
  }

  has(...ids: string[]): Promise<boolean> {
    return this.db.client.has(this.db.id, this.name, ids);
  }

  find(query: QueryJSON): Promise<any> {
    return this.db.client.find(this.db.id, this.name, query);
  }

  get(id: string): Promise<any> {
    return this.db.client.findByID(this.db.id, this.name, id);
  }

  readTransaction(): ReadTransaction {
    return this.db.client.readTransaction(this.db.id, this.name);
  }

  writeTransaction(): WriteTransaction {
    return this.db.client.writeTransaction(this.db.id, this.name);
  }

  listen(callback: (reply?: any, err?: Error) => void, ...ids: string[]): void {
    const filters = ids.map((id) => ({
      collectionName: this.name,
      instanceID: id,
    }));
    this.db.client.listen(this.db.id, filters, callback);
  }
}

/**
 * Represents a single database and has a reference to the Textile client.
 */
class DB {
  constructor(
    readonly client: Client,
    readonly name: string,
    readonly id: ThreadID,
    readonly collections: Map<string, Collection> = new Map()
  ) {}

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async createCollection(name: string, schema: any): Promise<Collection> {
    await this.client.newCollection(this.id, name, schema);
    const collection = new Collection(this, name, schema);
    this.collections.set(name, schema);
    Object.assign(this, { [name]: collection });
    return collection;
  }

  getDBInfo(): Promise<any> {
    return this.client.getDBInfo(this.id);
  }
}

/**
 * Represents a pool of databases identified by name and has a reference to a
 * Textile client.
 */
class Pool {
  constructor(
    private client: Client,
    readonly dbs: Map<string, DB> = new Map()
  ) {}

  private async getRemoteDBs() {
    const { listList } = await this.client.listThreads();
    for (const { id, name, isdb } of listList) {
      if (!isdb) continue;
      if (this.dbs.has(name)) continue;
      this.dbs.set(name, new DB(this.client, name, ThreadID.fromString(id)));
    }
  }

  /**
   * Use a database, creating one if it doesn't exist, and starting it.
   * @param name — The name of the database.
   */
  async use(name: string): Promise<DB> {
    await this.getRemoteDBs();
    const db = this.dbs.get(name);
    if (db) {
      this.dbs.set("active", db);
      return db;
    } else {
      const id = await this.client.newDB(undefined, name);
      const db = new DB(this.client, name, id);
      this.dbs.set(name, db);
      this.dbs.set("active", db);
      return db;
    }
  }

  active(): DB | undefined {
    return this.dbs.get("active");
  }

  async getDbs(): Promise<Map<string, DB>> {
    await this.getRemoteDBs();
    return this.dbs;
  }
}

export { Pool, DB, Collection };
