# Aster Food Truck Management System

<div align="center">

![Team Aster](https://img.shields.io/badge/Team-Aster-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-In%20Development-blue?style=for-the-badge)

*A comprehensive food truck management platform for ordering, tracking, and analytics*

</div>

---

## 📋 Project Overview

The **Aster Food Truck Management System** is a full-stack application designed to streamline food truck operations. It enables customers to browse menus, place orders, and track their food, while providing owners and workers with powerful tools for managing their business.

### Key Features

- **User Management** - Multi-role authentication (customers, owners, workers)
- **Food Truck Operations** - Manage trucks, menus, and operating hours
- **Order Processing** - Full order lifecycle with status tracking
- **Time Slot Booking** - Capacity-managed pickup time slots
- **Favorites & Notifications** - Personalized customer experience
- **Analytics Dashboard** - Business insights and reporting

---

## 👥 Team Aster

| Member | Role |
|--------|------|
| **Salah** | Orders Module |
| **Yassin** | Menu & Time Slots Module |
| **Ahmed Hatem** | Users & Roles Module |
| **Yuseff** | Food Trucks Module |
| **Tawfik** | Favorites & Notifications Module |
| **Khaled** | Analytics Module |
| **Omar Haitham** | Team Member |
| **Omar Aboelnour** | Team Member |

---

## 🏗️ Project Structure

```
Aster-Foodtruck-System/
├── README.md                 # Project overview (this file)
└── food-truck-api/           # Backend API
    ├── src/                  # Source code
    │   ├── routes/           # API route handlers
    │   ├── middleware/       # Auth & validation
    │   └── config/           # Database configuration
    ├── sql/                  # Database migrations
    ├── README.md             # Backend documentation
    └── package.json          # Dependencies
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | PostgreSQL |
| **Authentication** | JWT (JSON Web Tokens) |
| **Security** | bcrypt, helmet, cors |

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd Aster-Foodtruck-System

# 2. Navigate to API directory
cd food-truck-api

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 5. Set up the database (see backend README for details)

# 6. Start the development server
npm run dev
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Backend README](./food-truck-api/README.md) | API documentation, endpoints, database schema |

---

## 📊 Module Distribution

| Module | Tables | Assigned To |
|--------|--------|-------------|
| **Orders** | orders, order_items, allergy_notes, order_status_history | Salah |
| **Menu & Time Slots** | menu_items, time_slots | Yassin |
| **Users & Roles** | users, customers, owners, workers | Ahmed Hatem |
| **Food Trucks** | food_trucks, operating_hours | Yuseff |
| **Favorites & Notifications** | favorites, notifications | Tawfik |
| **Analytics** | analytics, analytics_time_slots | Khaled |

---

## 📄 License

This project is developed for the Software Engineering CSEN303 course at the German International University.

---

<div align="center">

**Team Aster** · 2025

</div>