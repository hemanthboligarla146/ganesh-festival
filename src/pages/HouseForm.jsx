import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Upload, MapPin, Home } from 'lucide-react'
import { useForm } from 'react-hook-form'

export default function HouseForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultStreetId = searchParams.get('streetId') || ''
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      street_id: defaultStreetId,
      side: 'LEFT',
      sequence_number: '',
      sequence_order: '',
      door_number: '',
      family_name: '',
      floor_info: ''
    }
  })

  // We should ideally fetch the streets list to allow the user to select one if they didn't come from a specific street
  // But for now, we assume they usually come from the street view
  // Let's implement a minimal streets dropdown just in case
  const [streets, setStreets] = useState([])
  
  useState(() => {
    supabase.from('streets').select('id, name').is('deleted_at', null).order('name').then(({data}) => {
      if (data) setStreets(data)
    })
  }, [])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')

    try {
      let photoPath = null

      // Upload photo if exists
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('house-photos')
          .upload(filePath, photoFile)

        if (uploadError) throw uploadError
        photoPath = filePath
      }

      // 1. Create the House
      const { data: house, error: houseError } = await supabase
        .from('houses')
        .insert([{
          street_id: data.street_id,
          side: data.side,
          sequence_number: data.sequence_number.toUpperCase(),
          sequence_order: parseInt(data.sequence_order, 10),
          door_number: data.door_number || null,
          photo_path: photoPath
        }])
        .select()
        .single()

      if (houseError) {
        if (houseError.code === '23505') {
          throw new Error('A house with this sequence number already exists on this side of the street.')
        }
        throw houseError
      }

      // 2. Create the initial Family Unit
      const { error: familyError } = await supabase
        .from('families')
        .insert([{
          house_id: house.id,
          name: data.family_name,
          floor_info: data.floor_info || null
        }])

      if (familyError) throw familyError

      // Redirect back to the street view
      navigate(`/streets/${data.street_id}`)

    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-3 sticky top-14 z-10 border-b border-gray-200 flex items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 mr-3 text-gray-500 hover:text-gray-900 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-gray-900">Add New House</h2>
      </div>

      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Street Selection */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin size={18} className="text-primary"/> Location</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Street *</label>
                <select 
                  {...register('street_id', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">Select a street...</option>
                  {streets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Side *</label>
                  <select 
                    {...register('side', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="LEFT">Left Side</option>
                    <option value="RIGHT">Right Side</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sequence (e.g. L12) *</label>
                  <input 
                    type="text" 
                    {...register('sequence_number', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order (e.g. 12) *</label>
                  <input 
                    type="number" 
                    {...register('sequence_order', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Door No. (Optional)</label>
                  <input 
                    type="text" 
                    {...register('door_number')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Family Details */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Home size={18} className="text-primary"/> Primary Family Unit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Owner / Family Name *</label>
                <input 
                  type="text" 
                  {...register('family_name', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Ramesh Family"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Floor Info (Optional)</label>
                <input 
                  type="text" 
                  {...register('floor_info')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Ground Floor"
                />
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Upload size={18} className="text-primary"/> House Photo (Optional)</h3>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to capture</span> or upload</p>
                  </div>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-70"
          >
            {loading ? 'Saving House...' : 'Save House'}
          </button>
        </form>
      </div>
    </div>
  )
}
