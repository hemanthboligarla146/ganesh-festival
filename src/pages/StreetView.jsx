import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useFestival } from '../contexts/FestivalContext'
import { ArrowLeft, Plus, Filter } from 'lucide-react'

export default function StreetView() {
  const { streetId } = useParams()
  const navigate = useNavigate()
  const { activeFestival } = useFestival()
  
  const [street, setStreet] = useState(null)
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All') // 'All', 'Pending', 'Donated', 'Promised', 'Come Later', 'Not at Home', 'Not Donating'
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (streetId && activeFestival) {
      fetchStreetData()
    }
  }, [streetId, activeFestival])

  const fetchStreetData = async () => {
    setLoading(true)
    // Fetch street
    const { data: streetData } = await supabase
      .from('streets')
      .select('*')
      .eq('id', streetId)
      .single()
      
    if (streetData) setStreet(streetData)

    // Fetch houses and families
    const { data: housesData } = await supabase
      .from('houses')
      .select(`
        *,
        families (
          id,
          name
        )
      `)
      .eq('street_id', streetId)
      .is('deleted_at', null)
      .order('sequence_order', { ascending: true })

    if (housesData && housesData.length > 0) {
      // Get all family IDs
      const familyIds = housesData.flatMap(h => h.families.map(f => f.id))
      
      if (familyIds.length > 0) {
        // Fetch latest visits for these families in the current festival
        const { data: visitsData } = await supabase
          .from('visits')
          .select('family_id, status, created_at')
          .eq('festival_id', activeFestival.id)
          .in('family_id', familyIds)
          .order('created_at', { ascending: false })

        // Map latest visit status to families
        const visitMap = {}
        visitsData?.forEach(v => {
          if (!visitMap[v.family_id]) {
            visitMap[v.family_id] = v.status
          }
        })

        // Attach status to housesData
        housesData.forEach(h => {
          h.families.forEach(f => {
            f.current_status = visitMap[f.id] || null
          })
        })
      }
    }
    
    setHouses(housesData || [])
    setLoading(false)
  }

  // Filter houses based on selected filter
  // A house matches if ANY of its families match the filter
  const filteredHouses = houses.filter(h => {
    if (filter === 'All') return true
    if (filter === 'Pending') return h.families.some(f => !f.current_status)
    return h.families.some(f => f.current_status === filter)
  })

  const leftHouses = filteredHouses.filter(h => h.side === 'LEFT')
  const rightHouses = filteredHouses.filter(h => h.side === 'RIGHT')

  const getStatusColor = (status) => {
    switch (status) {
      case 'Donated': return 'bg-green-500'
      case 'Promised': return 'bg-blue-500'
      case 'Come Later': return 'bg-yellow-500'
      case 'Not at Home': return 'bg-purple-500'
      case 'Not Donating': return 'bg-red-500'
      default: return 'bg-gray-300' // Unvisited
    }
  }

  if (!activeFestival) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-3 sticky top-14 z-10 border-b border-gray-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/streets')} className="p-1 text-gray-500 hover:text-gray-900 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-gray-900 truncate max-w-[150px]">{street?.name || 'Loading...'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full transition ${showFilters || filter !== 'All' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Filter size={20} />
          </button>
          <button 
            onClick={() => navigate(`/houses/new?streetId=${streetId}`)}
            className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm"
          >
            <Plus size={16} /> House
          </button>
        </div>
      </div>

      {/* Filters Overlay */}
      {showFilters && (
        <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-[69px] z-10 shadow-sm flex gap-2 overflow-x-auto no-scrollbar">
          {['All', 'Pending', 'Donated', 'Promised', 'Come Later', 'Not at Home', 'Not Donating'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                filter === f 
                  ? 'bg-gray-800 text-white border-gray-800' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-center py-10 text-gray-500">Loading houses...</p>
      ) : (
        <div className="flex w-full divide-x divide-gray-200">
          {/* LEFT SIDE */}
          <div className="flex-1 p-2 space-y-2">
            <div className="text-center mb-4">
              <span className="text-xs font-bold text-gray-400 tracking-widest uppercase bg-gray-200 px-3 py-1 rounded-full">Left Side</span>
            </div>
            {leftHouses.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No houses</p>
            ) : (
              leftHouses.map(house => (
                <div 
                  key={house.id}
                  onClick={() => navigate(`/houses/${house.id}`)}
                  className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm cursor-pointer hover:border-primary transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{house.sequence_number}</span>
                    {/* Status Dot for the primary family */}
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(house.families?.[0]?.current_status)}`} />
                  </div>
                  <div className="text-xs text-gray-600 truncate font-medium">
                    {house.families?.[0]?.name || 'Unknown'}
                  </div>
                  {house.families?.[0]?.current_status && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {house.families?.[0]?.current_status === 'Donated' ? '₹ Collected' : house.families?.[0]?.current_status}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex-1 p-2 space-y-2">
            <div className="text-center mb-4">
              <span className="text-xs font-bold text-gray-400 tracking-widest uppercase bg-gray-200 px-3 py-1 rounded-full">Right Side</span>
            </div>
            {rightHouses.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No houses</p>
            ) : (
              rightHouses.map(house => (
                <div 
                  key={house.id}
                  onClick={() => navigate(`/houses/${house.id}`)}
                  className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm cursor-pointer hover:border-primary transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{house.sequence_number}</span>
                    {/* Status Dot for the primary family */}
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(house.families?.[0]?.current_status)}`} />
                  </div>
                  <div className="text-xs text-gray-600 truncate font-medium">
                    {house.families?.[0]?.name || 'Unknown'}
                  </div>
                  {house.families?.[0]?.current_status && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {house.families?.[0]?.current_status === 'Donated' ? '₹ Collected' : house.families?.[0]?.current_status}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
