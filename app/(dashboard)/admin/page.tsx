'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import { translate } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { formatPrice } from '@/utils/helpers'
import Link from 'next/link'

type TabType = 'menu' | 'modifiers' | 'inventory' | 'purchases' | 'expenses' | 'waste' | 'reports'

export default function AdminPage() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabType>('menu')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUser(profile)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">{translate('common.loading', language)}</div>
      </div>
    )
  }

  // Role protection - owner only
  if (!currentUser || currentUser.role !== 'owner') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-600">This page is only accessible to restaurant owners.</p>
          <Link href="/pos" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Go to POS
          </Link>
        </div>
      </div>
    )
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'menu', label: translate('admin.menu', language) },
    { id: 'modifiers', label: translate('admin.modifiers', language) },
    { id: 'inventory', label: translate('admin.inventory', language) },
    { id: 'purchases', label: translate('admin.purchases', language) },
    { id: 'expenses', label: translate('admin.expenses', language) },
    { id: 'waste', label: translate('admin.waste', language) },
    { id: 'reports', label: translate('admin.reports', language) }
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {translate('admin.title', language)}
              </h1>
              <p className="text-sm text-gray-600">{currentUser?.full_name}</p>
            </div>
            <Link 
              href="/pos"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {translate('nav.pos', language)}
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'menu' && <MenuManagement language={language} />}
        {activeTab === 'modifiers' && <ModifierManagement language={language} />}
        {activeTab === 'inventory' && <InventoryManagement language={language} />}
        {activeTab === 'purchases' && <PurchaseManagement language={language} />}
        {activeTab === 'expenses' && <ExpenseManagement language={language} />}
        {activeTab === 'waste' && <WasteManagement language={language} />}
        {activeTab === 'reports' && <ReportsSection language={language} />}
      </div>
    </div>
  )
}

// Menu Management Component
function MenuManagement({ language }: { language: any }) {
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)

  useEffect(() => {
    loadCategories()
    loadItems()
  }, [])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('menu_categories')
      .select('*')
      .is('deleted_at', null)
      .order('display_order')
    setCategories(data || [])
  }

  const loadItems = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*, category:menu_categories(name)')
      .is('deleted_at', null)
      .order('name')
    setItems(data || [])
  }

  const saveCategory = async (formData: any) => {
    if (editingCategory) {
      await supabase
        .from('menu_categories')
        .update(formData)
        .eq('id', editingCategory.id)
    } else {
      await supabase
        .from('menu_categories')
        .insert(formData)
    }
    loadCategories()
    setShowCategoryForm(false)
    setEditingCategory(null)
  }

  const deleteCategory = async (id: string) => {
    if (confirm('Delete this category?')) {
      await supabase
        .from('menu_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      loadCategories()
    }
  }

  const saveItem = async (formData: any) => {
    if (editingItem) {
      await supabase
        .from('menu_items')
        .update(formData)
        .eq('id', editingItem.id)
    } else {
      await supabase
        .from('menu_items')
        .insert(formData)
    }
    loadItems()
    setShowItemForm(false)
    setEditingItem(null)
  }

  const deleteItem = async (id: string) => {
    if (confirm('Delete this item?')) {
      await supabase
        .from('menu_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      loadItems()
    }
  }

  const filteredItems = selectedCategory
    ? items.filter(item => item.category_id === selectedCategory)
    : items

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Categories Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{translate('admin.categories', language)}</h2>
          <button
            onClick={() => {
              setEditingCategory(null)
              setShowCategoryForm(true)
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            {translate('admin.addNew', language)}
          </button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`p-3 rounded border cursor-pointer ${
                selectedCategory === cat.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">{cat.name}</div>
                  <div className="text-sm text-gray-600">Order: {cat.display_order}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingCategory(cat)
                      setShowCategoryForm(true)
                    }}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    {translate('admin.edit', language)}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteCategory(cat.id)
                    }}
                    className="text-red-600 text-sm hover:underline"
                  >
                    {translate('admin.delete', language)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items Section */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{translate('admin.items', language)}</h2>
          <button
            onClick={() => {
              setEditingItem(null)
              setShowItemForm(true)
            }}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            {translate('admin.addNew', language)}
          </button>
        </div>
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 border rounded hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="font-medium">{formatPrice(item.price)}</span>
                    <span className="text-gray-600">{item.category?.name}</span>
                    <span className={item.is_available ? 'text-green-600' : 'text-red-600'}>
                      {item.is_available ? translate('admin.available', language) : translate('admin.unavailable', language)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingItem(item)
                      setShowItemForm(true)
                    }}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    {translate('admin.edit', language)}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    {translate('admin.delete', language)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          language={language}
          onSave={saveCategory}
          onClose={() => {
            setShowCategoryForm(false)
            setEditingCategory(null)
          }}
        />
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <ItemForm
          item={editingItem}
          categories={categories}
          language={language}
          onSave={saveItem}
          onClose={() => {
            setShowItemForm(false)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}

// Category Form
function CategoryForm({ category, language, onSave, onClose }: any) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    display_order: category?.display_order || 1,
    is_active: category?.is_active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">
          {category ? translate('admin.edit', language) : translate('admin.addNew', language)} {translate('admin.category', language)}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{translate('admin.name', language)}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{translate('admin.description', language)}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{translate('admin.displayOrder', language)}</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm">{translate('admin.active', language)}</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              {translate('admin.save', language)}
            </button>
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
              {translate('common.cancel', language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Item Form  
function ItemForm({ item, categories, language, onSave, onClose }: any) {
  const [formData, setFormData] = useState({
    category_id: item?.category_id || '',
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    prep_time_minutes: item?.prep_time_minutes || 15,
    is_available: item?.is_available ?? true,
    is_active: item?.is_active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      price: parseFloat(formData.price as any)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
        <h3 className="text-lg font-bold mb-4">
          {item ? translate('admin.edit', language) : translate('admin.addNew', language)} Item
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{translate('admin.category', language)}</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Select...</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{translate('admin.name', language)}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{translate('admin.description', language)}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{translate('admin.price', language)}</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm">{translate('admin.available', language)}</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm">{translate('admin.active', language)}</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              {translate('admin.save', language)}
            </button>
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
              {translate('common.cancel', language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Placeholder components for other tabs (to be implemented)
function ModifierManagement({ language }: { language: any }) {
  return <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">{translate('admin.modifiers', language)}</h2>
    <p className="text-gray-600">Modifier management interface coming next...</p>
  </div>
}

function InventoryManagement({ language }: { language: any }) {
  return <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">{translate('admin.inventory', language)}</h2>
    <p className="text-gray-600">Inventory management interface coming next...</p>
  </div>
}

function PurchaseManagement({ language }: { language: any }) {
  return <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">{translate('admin.purchases', language)}</h2>
    <p className="text-gray-600">Purchase management interface coming next...</p>
  </div>
}

function ExpenseManagement({ language }: { language: any }) {
  return <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">{translate('admin.expenses', language)}</h2>
    <p className="text-gray-600">Expense management interface coming next...</p>
  </div>
}

function WasteManagement({ language }: { language: any }) {
  return <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">{translate('admin.waste', language)}</h2>
    <p className="text-gray-600">Waste log interface coming next...</p>
  </div>
}

function ReportsSection({ language }: { language: any }) {
  return <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">{translate('admin.reports', language)}</h2>
    <p className="text-gray-600">Reports interface coming next...</p>
  </div>
}
