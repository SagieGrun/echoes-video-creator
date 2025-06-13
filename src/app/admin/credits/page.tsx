'use client'

import { useState, useEffect } from 'react'

interface CreditPack {
  id: string
  name: string
  credits: number
  price_cents: number
  is_active: boolean
  stripe_price_id?: string
  created_at: string
}

const DEFAULT_PACKS: CreditPack[] = [
  {
    id: '1',
    name: 'Starter Pack',
    credits: 5,
    price_cents: 1500, // $15.00
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Standard Pack',
    credits: 20,
    price_cents: 4500, // $45.00
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Premium Pack',
    credits: 40,
    price_cents: 8000, // $80.00
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

export default function CreditsPage() {
  const [packs, setPacks] = useState<CreditPack[]>(DEFAULT_PACKS)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingPack, setEditingPack] = useState<Partial<CreditPack>>({})

  useEffect(() => {
    fetchCreditPacks()
  }, [])

  const fetchCreditPacks = async () => {
    try {
      const response = await fetch('/api/admin/credits')
      const data = await response.json()
      if (data.packs) {
        setPacks(data.packs)
      }
    } catch (error) {
      console.error('Failed to fetch credit packs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePack = async () => {
    try {
      const method = editingPack.id ? 'PUT' : 'POST'
      const url = editingPack.id 
        ? `/api/admin/credits/${editingPack.id}` 
        : '/api/admin/credits'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingPack),
      })

      if (response.ok) {
        await fetchCreditPacks()
        setIsEditing(false)
        setEditingPack({})
      }
    } catch (error) {
      console.error('Failed to save credit pack:', error)
    }
  }

  const handleDeletePack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit pack?')) return

    try {
      const response = await fetch(`/api/admin/credits/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCreditPacks()
      }
    } catch (error) {
      console.error('Failed to delete credit pack:', error)
    }
  }

  const togglePackStatus = async (id: string, is_active: boolean) => {
    try {
      const response = await fetch(`/api/admin/credits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active }),
      })

      if (response.ok) {
        await fetchCreditPacks()
      }
    } catch (error) {
      console.error('Failed to update pack status:', error)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const calculatePricePerCredit = (price_cents: number, credits: number) => {
    return `$${(price_cents / 100 / credits).toFixed(2)}`
  }

  if (isLoading) {
    return <div className="text-center">Loading credit packs...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credit Packs</h1>
          <p className="text-gray-600 mt-2">Manage pricing and credit packages</p>
        </div>
        <button
          onClick={() => {
            setEditingPack({})
            setIsEditing(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add New Pack
        </button>
      </div>

      {/* Credit Packs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packs.map((pack) => (
          <div key={pack.id} className="bg-white rounded-lg shadow border relative">
            {!pack.is_active && (
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Inactive
                </span>
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {pack.name}
              </h3>
              
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {formatPrice(pack.price_cents)}
                </div>
                <div className="text-lg text-gray-600">
                  {pack.credits} credits
                </div>
                <div className="text-sm text-gray-500">
                  {calculatePricePerCredit(pack.price_cents, pack.credits)} per credit
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Credits:</span>
                  <span className="font-medium">{pack.credits}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium">{formatPrice(pack.price_cents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Per Credit:</span>
                  <span className="font-medium">
                    {calculatePricePerCredit(pack.price_cents, pack.credits)}
                  </span>
                </div>
                {pack.stripe_price_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Stripe ID:</span>
                    <span className="font-mono text-xs text-gray-500">
                      {pack.stripe_price_id.substring(0, 12)}...
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPack(pack)
                    setIsEditing(true)
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => togglePackStatus(pack.id, !pack.is_active)}
                  className={`flex-1 px-3 py-2 text-sm rounded ${
                    pack.is_active
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {pack.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDeletePack(pack.id)}
                  className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingPack.id ? 'Edit Credit Pack' : 'Add New Credit Pack'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pack Name
                </label>
                <input
                  type="text"
                  value={editingPack.name || ''}
                  onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Starter Pack"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Credits
                </label>
                <input
                  type="number"
                  value={editingPack.credits || ''}
                  onChange={(e) => setEditingPack({ ...editingPack, credits: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPack.price_cents ? (editingPack.price_cents / 100).toFixed(2) : ''}
                    onChange={(e) => setEditingPack({ ...editingPack, price_cents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15.00"
                    min="0.01"
                  />
                </div>
                {editingPack.credits && editingPack.price_cents && (
                  <p className="text-xs text-gray-500 mt-1">
                    {calculatePricePerCredit(editingPack.price_cents, editingPack.credits)} per credit
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stripe Price ID (optional)
                </label>
                <input
                  type="text"
                  value={editingPack.stripe_price_id || ''}
                  onChange={(e) => setEditingPack({ ...editingPack, stripe_price_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="price_1234567890abcdef"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingPack.is_active !== false}
                  onChange={(e) => setEditingPack({ ...editingPack, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active (available for purchase)
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditingPack({})
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Pack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 