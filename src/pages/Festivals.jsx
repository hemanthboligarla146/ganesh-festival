import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFestival } from '../contexts/FestivalContext'
import { CalendarPlus, Check, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'

export default function Festivals() {
  const { activeFestival, setFestival } = useFestival()
  const [festivals, setFestivals] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => {
    fetchFestivals()
  }, [])

  const fetchFestivals = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('festivals')
      .select('*')
      .is('deleted_at', null)
      .order('year', { ascending: false })
      
    if (error) console.error(error)
    else setFestivals(data || [])
    setLoading(false)
  }

  const onSubmit = async (data) => {
    setError('')
    const yearNum = parseInt(data.year, 10)
    
    // Check if year already exists
    if (festivals.some(f => f.year === yearNum)) {
      setError('This festival year already exists.')
      return
    }

    const { data: newFestival, error } = await supabase
      .from('festivals')
      .insert([{ year: yearNum, name: data.name }])
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setFestivals([newFestival, ...festivals])
      setIsAdding(false)
      reset()
      if (!activeFestival) {
        setFestival(newFestival)
      }
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Festivals</h2>
          <p className="text-sm text-gray-500">Manage collection years</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-primary text-white rounded-full hover:bg-primary-hover transition"
        >
          <CalendarPlus size={24} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900">Add New Festival</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              {...register('year', { required: true, min: 2000, max: 2100 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g. 2026"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              {...register('name', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g. Ganesh Chaturthi 2026"
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
          <p className="text-gray-500 text-center py-8">Loading festivals...</p>
        ) : festivals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-500">No festivals created yet.</p>
            <button onClick={() => setIsAdding(true)} className="text-primary font-medium mt-2">Create one now</button>
          </div>
        ) : (
          festivals.map(fest => (
            <div 
              key={fest.id}
              onClick={() => setFestival(fest)}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                activeFestival?.id === fest.id 
                  ? 'bg-accent-bg border-accent-border shadow-sm' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activeFestival?.id === fest.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {activeFestival?.id === fest.id ? <Check size={20} /> : <CalendarPlus size={20} />}
                </div>
                <div>
                  <h3 className={`font-semibold ${activeFestival?.id === fest.id ? 'text-primary' : 'text-gray-900'}`}>
                    {fest.name}
                  </h3>
                  <p className="text-xs text-gray-500">Year: {fest.year}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
