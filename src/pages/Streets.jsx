import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router'
import { Plus, MapPin, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useFestival } from '../contexts/FestivalContext'

export default function Streets() {
  const [streets, setStreets] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { activeFestival } = useFestival()
  
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => {
    fetchStreets()
  }, [])

  const fetchStreets = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('streets')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })
      
    if (error) console.error(error)
    else setStreets(data || [])
    setLoading(false)
  }

  const onSubmit = async (data) => {
    setError('')
    
    // Check for duplicates
    if (streets.some(s => s.name.toLowerCase() === data.name.toLowerCase())) {
      setError('A street with this name already exists.')
      return
    }

    const { data: newStreet, error } = await supabase
      .from('streets')
      .insert([{ name: data.name }])
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      // Sort alphabetically after inserting
      const updatedStreets = [...streets, newStreet].sort((a, b) => a.name.localeCompare(b.name))
      setStreets(updatedStreets)
      setIsAdding(false)
      reset()
    }
  }

  if (!activeFestival) {
    return (
      <div className="p-8 text-center mt-10">
        <div className="bg-yellow-50 text-yellow-800 p-6 rounded-2xl">
          <p className="font-medium mb-2">No Active Festival Selected</p>
          <p className="text-sm opacity-80 mb-4">Please select or create a festival first to begin collection.</p>
          <button 
            onClick={() => navigate('/festivals')}
            className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition"
          >
            Go to Festivals
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Streets</h2>
          <p className="text-sm text-gray-500">Active: {activeFestival.name}</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-primary text-white rounded-full hover:bg-primary-hover transition shadow-sm"
        >
          <Plus size={24} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900">Add New Street</h3>
          <div>
            <input
              type="text"
              {...register('name', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g. Gandhi Street"
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setError(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading streets...</p>
        ) : streets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-500">No streets added yet.</p>
            <button onClick={() => setIsAdding(true)} className="text-primary font-medium mt-2">Add your first street</button>
          </div>
        ) : (
          streets.map(street => (
            <div 
              key={street.id}
              onClick={() => navigate(`/streets/${street.id}`)}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-primary hover:shadow-sm cursor-pointer transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">
                    {street.name}
                  </h3>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
