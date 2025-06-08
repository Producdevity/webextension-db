// TODO: IndexedDB wrapper (idb + migrations)

// Example JSON data provider interface
export interface JsonProvider extends DataProvider {
  get<T = any>(key: string): Promise<T | undefined>
  set<T = any>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
  /* ...batch helpers omitted for brevity... */
}
