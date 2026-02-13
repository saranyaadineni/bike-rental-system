# Quick Start Guide

## ✅ Environment Files Created

Both `.env` files have been created:

- **`backend/.env`** - Contains MongoDB connection string and server config
- **`frontend/.env`** - Contains API URL configuration

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Seed Database (Optional)

```bash
cd backend
npm run seed
```

### 3. Start the Application

```bash
# From root directory - starts both backend and frontend
npm run dev
```

Or start separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## 🌐 Access

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000/api

## 📝 Environment Variables

### Backend (.env)
- `MONGODB_URI` - MongoDB Atlas connection string
- `MONGODB_DB_NAME` - Database name (bikerental)
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Backend server port (3000)
- `FRONTEND_URL` - Frontend URL for CORS

### Frontend (.env)
- `VITE_API_URL` - Backend API URL (http://localhost:3000/api)

## 🔧 Troubleshooting

If you see import errors in the frontend:

1. **Stop the dev server** (Ctrl+C)
2. **Clear Vite cache**:
   ```bash
   cd frontend
   Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
   ```
3. **Restart**:
   ```bash
   npm run dev
   ```

All required packages are installed:
- ✅ All Radix UI packages
- ✅ next-themes
- ✅ sonner
- ✅ react-hook-form
- ✅ All other dependencies





