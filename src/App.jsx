import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import { FestivalProvider } from './contexts/FestivalContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Streets from './pages/Streets'
import StreetView from './pages/StreetView'
import Festivals from './pages/Festivals'
import HouseForm from './pages/HouseForm'
import HouseDetails from './pages/HouseDetails'
import VisitForm from './pages/VisitForm'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FestivalProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/streets" element={<Streets />} />
                <Route path="/streets/:streetId" element={<StreetView />} />
                <Route path="/festivals" element={<Festivals />} />
              </Route>
              
              {/* Full screen routes outside of bottom navigation layout */}
              <Route path="/houses/new" element={<HouseForm />} />
              <Route path="/houses/:houseId" element={<HouseDetails />} />
              <Route path="/families/:familyId/visit" element={<VisitForm />} />
            </Route>
          </Routes>
        </FestivalProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
