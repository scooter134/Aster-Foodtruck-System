# 📄 Views Documentation

## Overview
Views are **HJS (Hogan.js)** templates rendered server-side by Express. Each view corresponds to a page in the application.

---

## 📁 View Files

### Authentication
| File | Route | Description |
|------|-------|-------------|
| `login.hjs` | `/login` | User login form |
| `register.hjs` | `/register` | User registration with role selection |

### Customer Views
| File | Route | Description |
|------|-------|-------------|
| `index.hjs` | `/` | Home page - food truck listings |
| `menu.hjs` | `/menu/:id` | Food truck menu with add to cart |
| `cart.hjs` | `/cart` | Shopping cart, time slot selection, checkout |
| `orders.hjs` | `/orders` | Customer order history |
| `order-details.hjs` | `/order/:id` | Single order details |

### Owner Views
| File | Route | Description |
|------|-------|-------------|
| `ownerDashboard.hjs` | `/ownerDashboard` | Main dashboard with stats |
| `menuItems.hjs` | `/menuItems` | Menu item management (list/edit/delete) |
| `addMenuItem.hjs` | `/addMenuItem` | Add new menu item form |
| `truckOrders.hjs` | `/truckOrders` | Order management with filters |
| `analytics.hjs` | `/analytics` | Sales analytics dashboard |
| `working-hours.hjs` | `/working-hours` | Set operating hours per day |
| `workers.hjs` | `/workers` | Worker management |
| `create-truck.hjs` | `/create-truck` | Create new food truck |

### Worker Views
| File | Route | Description |
|------|-------|-------------|
| `worker-dashboard.hjs` | `/worker-dashboard` | Order queue management |

---

## 🧩 Common Structure

Each view follows this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ title }} - Food Truck System</title>
    <!-- Bootstrap CSS -->
    <!-- Custom CSS -->
</head>
<body>
    <!-- Navigation Bar -->
    <nav class="navbar">...</nav>
    
    <!-- Main Content -->
    <div class="container">...</div>
    
    <!-- Modals (if needed) -->
    
    <!-- Toast Container -->
    
    <!-- Scripts -->
    <script src="jquery"></script>
    <script src="bootstrap"></script>
    <script src="/js/api.js"></script>
    <script src="/js/page-specific.js"></script>
</body>
</html>
```

---

## 🎨 Key Components

### Navigation Bar
- Logo with link to dashboard/home
- Navigation links based on user role
- User dropdown with logout

### Stat Cards
Used in dashboards:
```html
<div class="card stat-card">
    <div class="card-body">
        <h6 class="text-muted">Title</h6>
        <div class="stat-value">Value</div>
    </div>
</div>
```

### Data Tables
Used for lists:
```html
<table class="table table-hover">
    <thead>...</thead>
    <tbody id="tableBody">
        <!-- Populated by JavaScript -->
    </tbody>
</table>
```

### Modals
Used for view/edit/delete:
```html
<div class="modal fade" id="modalId">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">...</div>
            <div class="modal-body">...</div>
            <div class="modal-footer">...</div>
        </div>
    </div>
</div>
```

### Toast Notifications
```html
<div class="toast-container position-fixed bottom-0 end-0 p-3">
    <div id="notificationToast" class="toast">
        <div class="toast-header">
            <strong id="toastTitle">Title</strong>
        </div>
        <div class="toast-body" id="toastMessage">Message</div>
    </div>
</div>
```

---

## 🔗 View-Script Mapping

| View | JavaScript File |
|------|-----------------|
| `index.hjs` | Inline script |
| `cart.hjs` | `cart.js` |
| `ownerDashboard.hjs` | `dashboard.js` |
| `menuItems.hjs` | `menu-items.js` |
| `addMenuItem.hjs` | `menu-add.js` |
| `analytics.hjs` | Inline script |
| `working-hours.hjs` | Inline script |
| `worker-dashboard.hjs` | Inline script |

---

## 📱 Responsive Breakpoints

Views use Bootstrap's responsive classes:
- `col-12` - Mobile (< 576px)
- `col-sm-6` - Small tablets (≥ 576px)
- `col-md-4` - Tablets (≥ 768px)
- `col-lg-3` - Desktop (≥ 992px)
