import React from 'react';
import { Heart, Clock } from 'lucide-react';
import { MenuItem } from './MenuItem';
export function FavoritesSection({
  favoriteItems,
  recentItems,
  onAddToCart
}) {
  if (favoriteItems.length === 0 && recentItems.length === 0) {
    return null;
  }
  return <div className="space-y-6 mb-8">
      
      {favoriteItems.length > 0 && <div>
          <div className="flex items-center space-x-2 mb-4">
            <Heart className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">Your Favorites</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoriteItems.map(item => <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} />)}
          </div>
        </div>}

      
      {recentItems.length > 0 && <div>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Recently Ordered</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentItems.map(item => <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} />)}
          </div>
        </div>}
    </div>;
}
