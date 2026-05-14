import { RouterProvider } from 'react-router'
import { Toaster } from './components/ui/sonner'
import { router } from './routes'
import { AppProvider } from './context/AppContext'

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AppProvider>
  )
}