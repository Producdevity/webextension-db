// TODO: abstract base + shared helpers

import { ProviderKind } from '../index'

// example factory options
export interface DataProvider {
  readonly kind: ProviderKind
  migrate?(targetVersion: number): Promise<void>
  close(): Promise<void>
}
