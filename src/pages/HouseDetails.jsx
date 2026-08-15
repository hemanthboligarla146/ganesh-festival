import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Users, Home, Camera } from 'lucide-react'
import { useFestival } from '../contexts/FestivalContext'

export default function HouseDetails() {
  const { houseId } = useParams()
  const navigate = useNavigate()
  const { activeFestival } = useFestival()
  
  const [house, setHouse] = useState(null)
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHouseDetails()
  }, [houseId, activeFestival])

  const fetchHouseDetails = async () => {
    setLoading(true)
    const { data: houseData } = await supabase
      .from('houses')
      .select('*, streets(name)')
      .eq('id', houseId)
      .single()
      
    if (houseData) setHouse(houseData)

    const { data: familyData } = await supabase
      .from('families')
      .select('*')
      .eq('house_id', houseId)
      .is('deleted_at', null)

    setFamilies(familyData || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-3 sticky top-14 z-10 border-b border-gray-200 flex items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 mr-3 text-gray-500 hover:text-gray-900 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-gray-900">House Details</h2>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-500">Loading details...</p>
      ) : house && (
        <div className="p-4 space-y-6">
          {/* House Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {house.photo_path ? (
              <img 
                src={supabase.storage.from('house-photos').getPublicUrl(house.photo_path).data.publicUrl} 
                alt="House" 
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-32 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                <Camera size={32} className="mb-2 opacity-50" />
                <span className="text-sm">No photo available</span>
              </div>
            )}
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-xs font-bold text-primary tracking-wider uppercase mb-1">
                    {house.streets?.name} • {house.side} SIDE
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{house.sequence_number}</h3>
                </div>
                {house.door_number && (
                  <div className="bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600 border border-gray-200">
                    Door: {house.door_number}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Families List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-primary"/> Family Units
              </h3>
              <button className="text-sm text-primary font-medium hover:underline">
                + Add Family
              </button>
            </div>
            
            <div className="space-y-3">
              {families.map(family => (
                <div 
                  key={family.id}
                  onClick={() => navigate(`/families/${family.id}/visit`)}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-primary transition flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{family.name}</h4>
                    {family.floor_info && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Home size={12} /> {family.floor_info}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-semibold">
                    Record Visit →
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
