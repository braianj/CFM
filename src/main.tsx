import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AdminApp } from './admin/AdminApp'
import { initAnalytics } from './analytics'

import './styles/global.css'

// Loaded on demand: the style guide never reaches a normal visitor's bundle.
const DesignSystem = lazy(() => import('./design/DesignSystem').then((m) => ({ default: m.DesignSystem })))

const path = window.location.pathname.replace(/\/+$/, '')
const params = new URLSearchParams(window.location.search)
const isAdmin = path.endsWith('/admin') || params.get('admin') === '1'
const isDesign = path.endsWith('/design') || params.get('design') === '1'

void initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDesign ? <Suspense fallback={null}><DesignSystem /></Suspense> : isAdmin ? <AdminApp /> : <App />}
  </StrictMode>,
)
