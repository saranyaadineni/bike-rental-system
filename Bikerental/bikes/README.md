# Bike Rental Application

A full-stack bike rental application with React frontend and Node.js/Express backend with MongoDB.

## Project Structure

```
bikerental/
├── backend/          # Backend server (Node.js/Express + MongoDB)
│   ├── config/       # Database configuration
│   ├── models/       # Mongoose models
│   ├── routes/       # API routes
│   └── scripts/      # Utility scripts
├── frontend/         # Frontend React application
│   ├── src/          # React source code
│   ├── public/       # Static assets
│   └── package.json  # Frontend dependencies
└── package.json      # Root package.json (orchestration)
```

## Features

- **User Authentication**: Register, login, and JWT-based session management
- **Bike Management**: Browse and filter bikes by type and availability
- **Rental System**: Start, end, and cancel bike rentals
- **Wallet System**: Digital wallet with top-up functionality
- **Document Management**: Upload and manage verification documents
- **Admin Panel**: Admin access for managing bikes and users
- **Super Admin Panel**: Global platform management
- **MongoDB Database**: Persistent data storage with Mongoose
- **Production Ready**: Error handling, error boundaries, and optimized builds

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- React Router for navigation
- TanStack Query for data fetching
- Tailwind CSS for styling
- shadcn/ui components
- Radix UI primitives

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Installation

**Option 1: Install all at once (recommended)**
```bash
npm run install:all
```

**Option 2: Install separately**
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..
```

### Environment Setup

1. **Backend Environment** - Create `backend/.env`:
```env
PORT=3000
FRONTEND_URL=http://localhost:8080
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<db>?retryWrites=true&w=majority
MONGODB_DB_NAME=bikerental
```

2. **Seed Database** (optional - adds default bikes):
```bash
cd backend
npm run seed
```

### Running the Application

**Run both together:**
```bash
npm run dev
```

**Or run separately:**

Backend only:
```bash
cd backend
npm run dev
```

Frontend only:
```bash
cd frontend
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Bikes
- `GET /api/bikes` - Get all bikes
- `GET /api/bikes/:id` - Get bike by ID
- `POST /api/bikes` - Create bike (admin)
- `PUT /api/bikes/:id` - Update bike (admin)
- `DELETE /api/bikes/:id` - Delete bike (admin)

### Rentals
- `GET /api/rentals` - Get all rentals
- `GET /api/rentals/:id` - Get rental by ID
- `POST /api/rentals` - Create rental
- `POST /api/rentals/:id/end` - End rental
- `POST /api/rentals/:id/cancel` - Cancel rental

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/wallet/topup` - Top up wallet

### Documents
- `GET /api/documents` - Get user documents
- `POST /api/documents` - Upload document
- `PUT /api/documents/:id/status` - Update document status (admin)
- `DELETE /api/documents/:id` - Delete document

## Access the Application

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000/api

## Production Deployment

The application is production-ready with:
- ✅ Error boundaries for graceful error handling
- ✅ Silent error logging (development only)
- ✅ Optimized production builds
- ✅ Proper API error handling
- ✅ Authentication error handling

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Production Build

```bash
# Build frontend
cd frontend
npm run build

# The build output will be in frontend/dist/
```

### Environment Variables for Production

**Frontend** (`frontend/.env.production`):
```env
VITE_API_BASE=https://api.yourdomain.com/api
```

**Backend**: Set all environment variables in your hosting platform or `.env` file.

## License

MIT
