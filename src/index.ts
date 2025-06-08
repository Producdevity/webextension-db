import { DataProvider } from './core/DataProvider'

export enum ProviderKind {
  JSON = 'json',
  SQL = 'sql',
}

export interface BaseOptions {
  name: string // logical db name
  persistent?: boolean // default true ⇒ call navigator.storage.persist()
}

export type FactoryOptions =
  | ({ kind: ProviderKind.JSON } & BaseOptions)
  | ({ kind: ProviderKind.SQL; wasmUrl?: string } & BaseOptions)

export async function openDB(opts: FactoryOptions): Promise<DataProvider>
