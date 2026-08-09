import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Nav() {
  const { user, signOut } = useAuth()
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#faf7f2]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          to="/browse"
          className=" font-semibold text-zinc-800 tracking-tight hover:text-violet-600 transition-colors"
        >
          Neuryn
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-500">
          <Link to="/browse" className="hover:text-zinc-700 transition-colors">browse</Link>
          {user ? (
            <>
              <Link to="/me" className="hover:text-zinc-700 transition-colors">my shelf</Link>
              <button
                onClick={() => void signOut()}
                className="hover:text-zinc-700 transition-colors"
              >
                sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="hover:text-zinc-700 transition-colors">sign in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
