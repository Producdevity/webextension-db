// TODO: wa-sqlite bootstrap + VFS chooser

import { DataProvider } from '../../core/DataProvider'

// Example code for a SQL provider interface in TypeScript
export interface SqlProvider extends DataProvider {
  exec(sql: string, params?: unknown[]): Promise<void>
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>
  transaction<T>(fn: (db: SqlProvider) => Promise<T>): Promise<T>
  /* Raw accessors to wa-sqlite objects can be exposed under an opt-in flag */
}
