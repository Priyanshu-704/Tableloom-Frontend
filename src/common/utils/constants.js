export const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY: "ready",
  SERVED: "served",
  CANCELLED: "cancelled"
};
export const SAMPLE_MENU_ITEMS = [{
  id: 1,
  name: "Garlic Bread",
  description: "Toasted bread with garlic butter and herbs",
  price: 5.99,
  image: "https://littlesunnykitchen.com/wp-content/uploads/2021/10/Garlic-Bread-1.jpg",
  category: "Appetizers",
  isAvailable: true
}, {
  id: 2,
  name: "Caesar Salad",
  description: "Fresh romaine lettuce with Caesar dressing and croutons",
  price: 8.99,
  image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop",
  category: "Appetizers",
  isAvailable: true
}, {
  id: 3,
  name: "Mozzarella Sticks",
  description: "Breaded mozzarella served with marinara sauce",
  price: 7.99,
  image: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop",
  category: "Appetizers",
  isAvailable: true
}, {
  id: 4,
  name: "Margherita Pizza",
  description: "Classic pizza with tomato sauce and mozzarella",
  price: 12.99,
  image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=300&fit=crop",
  category: "Main Course",
  isAvailable: true
}, {
  id: 5,
  name: "Grilled Salmon",
  description: "Fresh salmon with lemon butter sauce and vegetables",
  price: 18.99,
  image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
  category: "Main Course",
  isAvailable: true
}, {
  id: 6,
  name: "Beef Burger",
  description: "Angus beef patty with cheese, lettuce, and special sauce",
  price: 14.99,
  image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
  category: "Main Course",
  isAvailable: true
}, {
  id: 7,
  name: "Chocolate Brownie",
  description: "Warm chocolate brownie with vanilla ice cream",
  price: 6.99,
  image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop",
  category: "Desserts",
  isAvailable: true
}, {
  id: 8,
  name: "Cheesecake",
  description: "New York style cheesecake with berry compote",
  price: 7.99,
  image: "https://images.unsplash.com/photo-1567306301408-9b74779a11af?w=400&h=300&fit=crop",
  category: "Desserts",
  isAvailable: true
}, {
  id: 9,
  name: "Iced Tea",
  description: "Refreshing iced tea with lemon",
  price: 3.99,
  image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
  category: "Beverages",
  isAvailable: true
}, {
  id: 10,
  name: "Fresh Lemonade",
  description: "Homemade lemonade with mint",
  price: 4.99,
  image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop",
  category: "Beverages",
  isAvailable: true
}];
