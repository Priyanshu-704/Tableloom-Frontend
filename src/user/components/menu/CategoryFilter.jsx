import React from 'react';
import { Filter } from 'lucide-react';
export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange
}) {
  const SORT_OPTIONS = [{
    value: 'name',
    label: 'Name A-Z'
  }, {
    value: 'price_low',
    label: 'Price: Low to High'
  }, {
    value: 'price_high',
    label: 'Price: High to Low'
  }, {
    value: 'popular',
    label: 'Most Popular'
  }];
  return <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4">
        
        <div className="flex space-x-2 py-4 overflow-x-auto">
          {categories.map(category => <button key={category} onClick={() => onCategoryChange(category)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {category === 'all' ? 'All Items' : category}
            </button>)}
        </div>

        
        <div className="flex items-center justify-between py-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Sort by:</span>
          </div>
          
          <select value={sortBy} onChange={e => onSortChange(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>
        </div>
      </div>
    </div>;
}
