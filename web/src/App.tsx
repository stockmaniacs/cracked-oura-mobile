import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Layout } from '@/components/Layout'
import Today from '@/pages/Today'
import Sleep from '@/pages/Sleep'
import Activity from '@/pages/Activity'
import Readiness from '@/pages/Readiness'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="oura-theme">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"           element={<Navigate to="/today" replace />} />
            <Route path="/today"      element={<Today />} />
            <Route path="/sleep"      element={<Sleep />} />
            <Route path="/readiness"  element={<Readiness />} />
            <Route path="/activity"   element={<Activity />} />
            <Route path="/settings"   element={<Settings />} />
            <Route path="*"           element={<Navigate to="/today" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  )
}
