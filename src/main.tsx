import '@fontsource-variable/inter'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './index.css'

import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import { OrderProvider } from './state/order'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <OrderProvider>
        <App />
        <Toaster
          position="top-center"
          offset={16}
          toastOptions={{
            style: {
              background: 'var(--color-ink)',
              color: 'var(--color-bg)',
              border: 'none',
              borderRadius: '9999px',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              padding: '12px 18px',
            },
          }}
        />
      </OrderProvider>
    </MotionConfig>
  </StrictMode>,
)
