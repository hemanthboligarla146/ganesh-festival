import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const FestivalContext = createContext()

export const FestivalProvider = ({ children }) => {
  const [activeFestival, setActiveFestival] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to load the saved festival from localStorage or fetch the default one
    const fetchInitialFestival = async () => {
      try {
        const savedFestivalStr = localStorage.getItem('activeFestival')
        if (savedFestivalStr) {
          const savedFestival = JSON.parse(savedFestivalStr)
          setActiveFestival(savedFestival)
        } else {
          // Fetch the most recent or active festival from DB
          const { data, error } = await supabase
            .from('festivals')
            .select('*')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle()
            
          if (data) {
            setActiveFestival(data)
            localStorage.setItem('activeFestival', JSON.stringify(data))
          }
        }
      } catch (err) {
        console.error('Error fetching initial festival:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialFestival()
  }, [])

  const setFestival = (festival) => {
    setActiveFestival(festival)
    if (festival) {
      localStorage.setItem('activeFestival', JSON.stringify(festival))
    } else {
      localStorage.removeItem('activeFestival')
    }
  }

  return (
    <FestivalContext.Provider value={{ activeFestival, setFestival, loading }}>
      {children}
    </FestivalContext.Provider>
  )
}

export const useFestival = () => {
  return useContext(FestivalContext)
}
