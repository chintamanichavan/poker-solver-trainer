import '@fontsource-variable/geist'
import '@fontsource-variable/newsreader'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { loadTable } from './engine/engine'
import solution from './engine/wasm/kuhn.json'
import './styles/tokens.css'
import './styles/base.css'

// A different deal every visit. A JavaScript number holds 53 bits exactly.
const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)

const table = await loadTable(solution, seed)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App table={table} solution={solution} />
  </StrictMode>,
)
