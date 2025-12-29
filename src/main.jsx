import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { NotificationProvider } from './context/NotificationContext'
import { SupabaseAuthProvider } from './context/SupabaseAuthContext'

import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SupabaseAuthProvider>
        <NotificationProvider>
          <MantineProvider defaultColorScheme="auto">
            <App />
          </MantineProvider>
        </NotificationProvider>
      </SupabaseAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
