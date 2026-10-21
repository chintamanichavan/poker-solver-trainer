// Types for the module that wasm/build.sh generates next to this file.
import type { Table } from '../engine'

interface EngineModule {
  Table: new (bet: number[], seed: number) => Table
}

export default function createEngine(): Promise<EngineModule>
