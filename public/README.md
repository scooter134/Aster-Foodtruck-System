# 🎨 Frontend Documentation

## Overview
The frontend is built with **HTML**, **CSS**, **JavaScript (jQuery)**, and **Bootstrap 5**. It uses **HJS (Hogan.js)** templates rendered by Express.

---

## 📁 Directory Structure

```
public/
├── css/
│   └── style.css           # Custom styles
├── js/
│   ├── api.js              # API utility functions & auth
│   ├── cart.js             # Shopping cart functionality
│   ├── dashboard.js        # Owner dashboard logic
│   ├── menu-add.js         # Add menu item form
│   ├── menu-items.js       # Menu items management
│   └── ...                 # Other page-specific scripts
└── images/                 # Static images

views/
├── index.hjs               # Home page (food truck listings)
├── login.hjs               # Login page
├── register.hjs            # Registration page
├── cart.hjs                # Shopping cart & checkout
├── ownerDashboard.hjs      # Owner main dashboard
├── menuItems.hjs           # Menu management page
├── addMenuItem.hjs         # Add new menu item
├── truckOrders.hjs         # Order management
├── analytics.hjs           # Sales analytics
├── working-hours.hjs       # Operating hours management
├── workers.hjs             # Worker management
├── worker-dashboard.hjs    # Worker order dashboard
├── create-truck.hjs        # Create new food truck
└── ...                     # Other views
```

---

## 📄 Pages & Routes

### Public Pages
| Route | View | Description |
|-------|------|-------------|
| `/` | index.hjs | Home - Browse all food trucks |
| `/login` | login.hjs | User login |
| `/register` | register.hjs | User registration |
| `/menu/:id` | menu.hjs | View truck's menu |

### Customer Pages
| Route | View | Description |
|-------|------|-------------|
| `/cart` | cart.hjs | Shopping cart & checkout |
| `/orders` | orders.hjs | Order history |
| `/order/:id` | order-details.hjs | Single order details |

### Owner Pages
| Route | View | Description |
|-------|------|-------------|
| `/ownerDashboard` | ownerDashboard.hjs | Owner main dashboard |
| `/menuItems` | menuItems.hjs | Manage menu items |
| `/addMenuItem` | addMenuItem.hjs | Add new menu item |
| `/truckOrders` | truckOrders.hjs | View & manage orders |
| `/analytics` | analytics.hjs | Sales analytics |
| `/working-hours` | working-hours.hjs | Set operating hours |
| `/workers` | workers.hjs | Manage workers |
| `/create-truck` | create-truck.hjs | Create new food truck |

### Worker Pages
| Route | View | Description |
|-------|------|-------------|
| `/worker-dashboard` | worker-dashboard.hjs | Worker order management |

---

## 🔧 Key JavaScript Files

### `api.js` - Core API Utilities
```javascript
const API = {
    getUser()      // Get logged-in user from localStorage
    setUser(user)  // Store user in localStorage
    logout()       // Clear session and redirect to login
    isLoggedIn()   // Check if user is logged in
};
```

### `cart.js` - Shopping Cart
- Load cart items from API
- Add/remove/update quantities
- Select pickup date and time slot
- Place orders with validation
- Real-time price calculations

### `dashboard.js` - Owner Dashboard
- Load owner's food truck
- Display stats (orders, revenue, menu items)
- Toggle order availability
- Show recent orders

### `menu-items.js` - Menu Management
- List all menu items
- View/Edit/Delete modals
- Toggle availability
- Filter by category

---

## 🎨 Styling

### Bootstrap 5 Components Used
- **Navbar** - Navigation with user dropdown
- **Cards** - Food trucks, menu items, stats
- **Modals** - View/Edit/Delete dialogs
- **Tables** - Order lists, analytics data
- **Buttons** - Action buttons with icons
- **Badges** - Status indicators
- **Toasts** - Notifications
- **Forms** - Input validation

### Custom CSS (`style.css`)
- Custom color scheme
- Card hover effects
- Status badge colors
- Loading spinners
- Responsive adjustments

---

## 📱 Responsive Design

All pages are responsive using Bootstrap's grid system:
- **Desktop**: Full sidebar navigation
- **Tablet**: Collapsible navigation
- **Mobile**: Stacked cards, hamburger menu

---

## 🔔 User Feedback

### Toast Notifications
Used for success/error messages:
```javascript
showToast('Success', 'Order placed successfully!', 'success');
showToast('Error', 'Failed to update status', 'danger');
```

### Loading States
- Spinner overlays during API calls
- Disabled buttons while processing
- Skeleton loaders for content

### Form Validation
- Required field indicators
- Real-time validation feedback
- Error messages below inputs

---

## 🔐 Authentication Flow

1. User logs in via `/login`
2. API returns user object with `user_type`
3. User stored in `localStorage`
4. Role-based redirects:
   - `customer` → `/` (home)
   - `owner` → `/ownerDashboard`
   - `worker` → `/worker-dashboard`
5. Protected pages check `API.getUser()` on load

---

## 🛒 Order Flow (Customer)

1. Browse food trucks on home page
2. Click truck → View menu
3. Add items to cart
4. Go to cart → Review items
5. Select pickup date
6. Select available time slot
7. Click "Place Order"
8. View order confirmation
9. Track status in order history

---

## 📊 Analytics Dashboard

Displays real-time metrics:
- **Total Revenue** - Sum of all orders
- **Total Orders** - Order count
- **Unique Customers** - Distinct customers
- **Items Sold** - Total quantity
- **Peak Hour** - Busiest time
- **Top Selling Items** - Best sellers
- **Daily Breakdown** - Day-by-day stats

---

## 🎯 Best Practices Used

1. **Separation of Concerns** - Logic in JS files, structure in HJS
2. **Reusable Components** - Common navbar, toast system
3. **Error Handling** - Try-catch with user feedback
4. **Loading States** - Visual feedback during operations
5. **Responsive Design** - Mobile-first approach
6. **Accessibility** - Semantic HTML, ARIA labels
