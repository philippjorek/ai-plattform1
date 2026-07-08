// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen' // Wird von TanStack automatisch generiert

import { TanStackRouterDevtools } from '@tanstack/router-devtools'

//neu:
import { QueryClient } from "@tanstack/react-query";

// Router erstellen
//const router = createRouter({ routeTree })
//ersetze durch:

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
});





// In React-Typen registrieren (für Typsicherheit)
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Anwendung in den DOM einfügen
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
}
