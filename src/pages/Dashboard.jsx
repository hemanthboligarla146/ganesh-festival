import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFestival } from '../contexts/FestivalContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { Wallet, CreditCard, Banknote, MapPin, Users } from 'lucide-react'

export default function Dashboard() {
  const { activeFestival } = useFestival()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCash: 0,
    totalUpi: 0,
    totalPromised: 0,
    totalHouses: 0,
    visitedFamilies: 0,
    totalFamilies: 0
  })

  useEffect(() => {
    if (activeFestival) {
      fetchDashboardStats()
    }
  }, [activeFestival])

  const fetchDashboardStats = async () => {
    setLoading(true)
    
    // Fetch all payments for active festival
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_method')
      .eq('festival_id', activeFestival.id)

    // Fetch all commitments for active festival
    const { data: commitments } = await supabase
      .from('commitments')
      .select('amount')
      .eq('festival_id', activeFestival.id)

    // Fetch all houses and families
    const { count: totalHouses } = await supabase
      .from('houses')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    const { data: families } = await supabase
      .from('families')
      .select('id')
      .is('deleted_at', null)

    const totalFamilies = families?.length || 0

    // Fetch unique families visited in this festival
    const { data: visits } = await supabase
      .from('visits')
      .select('family_id')
      .eq('festival_id', activeFestival.id)

    const visitedFamilies = new Set(visits?.map(v => v.family_id)).size

    // Calculate totals
    let cash = 0
    let upi = 0
    payments?.forEach(p => {
      if (p.payment_method === 'Cash') cash += Number(p.amount)
      else if (p.payment_method === 'UPI') upi += Number(p.amount)
    })

    let promised = 0
    commitments?.forEach(c => promised += Number(c.amount))

    setStats({
      totalCash: cash,
      totalUpi: upi,
      totalCollected: cash + upi,
      totalPromised: promised,
      totalHouses: totalHouses || 0,
      visitedFamilies,
      totalFamilies
    })
    
    setLoading(false)
  }

  if (!activeFestival) {
    return (
      <div className="p-8 text-center mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h2>
        <p className="text-gray-500">Please select an active festival from the Festivals tab to see statistics.</p>
      </div>
    )
  }

  const chartData = [
    { name: 'Cash', value: stats.totalCash, color: '#10B981' }, // emerald-500
    { name: 'UPI', value: stats.totalUpi, color: '#3B82F6' }, // blue-500
  ]

  const progressPercentage = stats.totalFamilies > 0 
    ? Math.round((stats.visitedFamilies / stats.totalFamilies) * 100) 
    : 0

  return (
    <div className="p-4 space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">{activeFestival.name} Statistics</p>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-500">Loading statistics...</p>
      ) : (
        <>
          {/* Main Collection Stat */}
          <div className="bg-gradient-to-br from-primary to-primary-hover p-6 rounded-2xl shadow-md text-white">
            <p className="text-primary-50 text-sm font-medium mb-1">Total Collected</p>
            <h3 className="text-4xl font-bold tracking-tight">₹{stats.totalCollected.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-4 text-sm font-medium bg-black/10 p-3 rounded-xl">
              <div className="flex items-center gap-1.5">
                <Banknote size={16} /> Cash: ₹{stats.totalCash.toLocaleString()}
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-1.5">
                <CreditCard size={16} /> UPI: ₹{stats.totalUpi.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Wallet size={20} />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Promised</p>
              <h4 className="text-xl font-bold text-gray-900 mt-1">₹{stats.totalPromised.toLocaleString()}</h4>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                <Users size={20} />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Families Visited</p>
              <h4 className="text-xl font-bold text-gray-900 mt-1">{stats.visitedFamilies} / {stats.totalFamilies}</h4>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-semibold text-gray-900">Collection Progress</h3>
              <span className="text-sm font-bold text-primary">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1 justify-center">
              <MapPin size={12} /> {stats.totalHouses} total houses registered
            </p>
          </div>

          {/* Chart */}
          {stats.totalCollected > 0 && (
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm h-64">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">Payment Breakdown</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
