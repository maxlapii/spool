import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initTheme } from './hooks/useTheme'
import { migrateStorage } from './utils/storage'
import { startFaviconEyes } from './utils/faviconEyes'
import { useEditor } from './store/editorStore'
import { executeTool } from './engine/toolExecutor'

migrateStorage()
initTheme()
startFaviconEyes()

// Dev-only handle for debugging and automated checks.
if (import.meta.env.DEV) (window as unknown as { __spool: unknown }).__spool = { useEditor, executeTool }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
