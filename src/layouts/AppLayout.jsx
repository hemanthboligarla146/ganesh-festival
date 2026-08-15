import { Outlet, NavLink, useNavigate } from 'react-router'
import { LayoutDashboard, Map, Calendar, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AppLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-semibold text-lg text-gray-900">Ganesh Utsav</h1>
          <button 
            onClick={handleSignOut}
            className="p-2 text-gray-500 hover:text-gray-900 rounded-full transition"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto relative">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-10 pb-safe">
        <div className="max-w-md mx-auto flex justify-around">
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => 
              `flex flex-col items-center py-3 px-6 transition ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`
            }
          >
            <LayoutDashboard size={24} className="mb-1" />
            <span className="text-xs font-medium">Dashboard</span>
          </NavLink>
          
          <NavLink 
            to="/streets" 
            className={({ isActive }) => 
              `flex flex-col items-center py-3 px-6 transition ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`
            }
          >
            <Map size={24} className="mb-1" />
            <span className="text-xs font-medium">Streets</span>
          </NavLink>

          <NavLink 
            to="/festivals" 
            className={({ isActive }) => 
              `flex flex-col items-center py-3 px-6 transition ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`
            }
          >
            <Calendar size={24} className="mb-1" />
            <span className="text-xs font-medium">Festivals</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
