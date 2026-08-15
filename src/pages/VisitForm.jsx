import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useFestival } from '../contexts/FestivalContext'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'

export default function VisitForm() {
  const { familyId } = useParams()
  const navigate = useNavigate()
  const { activeFestival } = useFestival()
  const { user } = useAuth()
  
  const [family, setFamily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      status: 'Not at Home',
      amount: '',
      payment_method: 'Cash',
      follow_up_date: '',
      notes: ''
    }
  })

  const selectedStatus = watch('status')

  useEffect(() => {
    if (familyId && activeFestival) {
      fetchFamilyDetails()
    }
  }, [familyId, activeFestival])

  const fetchFamilyDetails = async () => {
    setLoading(true)
    const { data: familyData } = await supabase
      .from('families')
      .select('*, houses(sequence_number, side, streets(id, name))')
      .eq('id', familyId)
      .single()
      
    if (familyData) setFamily(familyData)
    setLoading(false)
  }

  const onSubmit = async (data) => {
    setError('')
    try {
      // 1. Create the Visit Record
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert([{
          festival_id: activeFestival.id,
          family_id: familyId,
          volunteer_id: user.id,
          status: data.status,
          follow_up_date: data.follow_up_date || null,
          notes: data.notes || null
        }])
        .select()
        .single()

      if (visitError) {
        if (visitError.code === '23505') {
          // Unique constraint violation (a visit already exists for this family and festival)
          // For V1, we will update it or we can just say "Already visited".
          // The database enforces UNIQUE(id, festival_id, family_id), wait, NO.
          // The schema: UNIQUE(id, festival_id, family_id).
          // Wait, the id is random UUID. So multiple visits CAN exist. 
          // The composite unique is just to enforce foreign keys on payments.
          // So multiple visits are allowed.
        } else {
          throw visitError
        }
      }

      // 2. Handle Commitments if "Promised"
      if (data.status === 'Promised') {
        const { error: commitError } = await supabase
          .from('commitments')
          .insert([{
            festival_id: activeFestival.id,
            family_id: familyId,
            amount: parseFloat(data.amount)
          }])
        if (commitError) throw commitError
      }

      // 3. Handle Payments if "Donated"
      if (data.status === 'Donated') {
        const { error: payError } = await supabase
          .from('payments')
          .insert([{
            festival_id: activeFestival.id,
            family_id: familyId,
            visit_id: visit.id,
            volunteer_id: user.id,
            amount: parseFloat(data.amount),
            payment_method: data.payment_method
          }])
        if (payError) throw payError
      }

      // 4. Navigate to Next House or back to Street View
      // "Next House" logic can be complex. For now, go back to Street View.
      navigate(`/streets/${family?.houses?.streets?.id}`)

    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred while saving the visit.')
    }
  }

  if (!activeFestival) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-3 sticky top-14 z-10 border-b border-gray-200 flex items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 mr-3 text-gray-500 hover:text-gray-900 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-gray-900">Record Visit</h2>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-500">Loading...</p>
      ) : family && (
        <div className="p-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="text-xs font-bold text-primary tracking-wider uppercase mb-1">
              {family.houses?.streets?.name} • {family.houses?.side} SIDE
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{family.name}</h3>
                <p className="text-sm text-gray-500 font-medium">House: {family.houses?.sequence_number}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Status Selection */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-gray-900 mb-3">Status of Visit *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'Donated', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
                  { value: 'Promised', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                  { value: 'Come Later', color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' },
                  { value: 'Not at Home', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
                  { value: 'Not Donating', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
                ].map((s) => (
                  <label 
                    key={s.value} 
                    className={`relative flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${
                      selectedStatus === s.value 
                        ? `border-${s.color.split('-')[1]}-500 ${s.bg}` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      value={s.value} 
                      {...register('status', { required: true })}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${s.color}`} />
                      <span className={`font-semibold text-sm ${selectedStatus === s.value ? s.text : 'text-gray-700'}`}>
                        {s.value}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Conditional Fields: Donated or Promised */}
            {(selectedStatus === 'Donated' || selectedStatus === 'Promised') && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    {selectedStatus === 'Donated' ? 'Amount Received (₹) *' : 'Amount Promised (₹) *'}
                  </label>
                  <input 
                    type="number" 
                    {...register('amount', { required: true, min: 1 })}
                    className="w-full px-4 py-3 text-lg font-bold border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                  />
                </div>

                {selectedStatus === 'Donated' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Payment Method *</label>
                    <div className="flex gap-3">
                      <label className="flex-1">
                        <input type="radio" value="Cash" {...register('payment_method')} className="peer hidden"/>
                        <div className="text-center p-3 rounded-lg border-2 border-gray-200 cursor-pointer peer-checked:border-primary peer-checked:bg-accent-bg peer-checked:text-primary font-medium transition">
                          Cash
                        </div>
                      </label>
                      <label className="flex-1">
                        <input type="radio" value="UPI" {...register('payment_method')} className="peer hidden"/>
                        <div className="text-center p-3 rounded-lg border-2 border-gray-200 cursor-pointer peer-checked:border-primary peer-checked:bg-accent-bg peer-checked:text-primary font-medium transition">
                          UPI
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conditional Fields: Follow up date */}
            {(selectedStatus === 'Promised' || selectedStatus === 'Come Later') && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-900 mb-1">Follow Up Date</label>
                <input 
                  type="date" 
                  {...register('follow_up_date')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {/* Notes */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-gray-900 mb-1">Notes (Optional)</label>
              <textarea 
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Any special instructions or details..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl transition shadow-md disabled:opacity-70"
            >
              <CheckCircle size={20} />
              {isSubmitting ? 'Saving...' : 'Save & Back to Street'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
