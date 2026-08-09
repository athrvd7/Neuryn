import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Article from './pages/Article'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import UserArticle from './pages/UserArticle'
import Nav from './components/Nav'
import { AuthProvider } from './lib/auth'

function WithNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2]">
      <Nav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 py-6 text-center text-stone-400 text-sm">
        <span className="text-zinc-600">Neuryn</span>
        <span className="mx-2 text-stone-300">·</span>
        <a
          href="https://github.com/athrvd7/Neuryn/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-600 transition-colors"
        >
          request content
        </a>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing — no nav, fullscreen */}
          <Route path="/" element={<Landing />} />

          {/* Main app — with nav + footer */}
          <Route path="/browse" element={<WithNav><Home /></WithNav>} />
          <Route path="/read/:slug" element={<WithNav><Article /></WithNav>} />

          {/* Accounts + per-user shelves */}
          <Route path="/login" element={<WithNav><Login /></WithNav>} />
          <Route path="/me" element={<WithNav><Dashboard /></WithNav>} />
          <Route path="/u/:username" element={<WithNav><Profile /></WithNav>} />
          <Route path="/a/:id" element={<WithNav><UserArticle /></WithNav>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
