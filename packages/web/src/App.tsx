import { Navigate, BrowserRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import VocabPage from './pages/VocabPage'
import ReviewPage from './pages/ReviewPage'
import ProgressPage from './pages/ProgressPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><span className="text-gray-400 text-sm">Loading…</span></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><span className="text-gray-400 text-sm">Loading…</span></div>
  return <Navigate to={user ? '/vocab' : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/vocab" element={<ProtectedRoute><VocabPage /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
