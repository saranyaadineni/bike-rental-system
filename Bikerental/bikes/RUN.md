# How to Run the Application

## Quick Start

### 1. Install Dependencies

From the root directory:
```bash
npm run install:all
```

Or install separately:
```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Setup Environment

Create `backend/.env` file:
```env
PORT=3000
FRONTEND_URL=http://localhost:8080
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### 3. Run Both Backend and Frontend

```bash
npm run dev
```

This will start:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:8080

## Running Separately

### Run Backend Only

```bash
cd backend
npm run dev
```

Or from root:
```bash
npm run dev:backend
```

### Run Frontend Only

```bash
npm run dev:frontend
```

Or:
```bash
npm run frontend
```

## Project Structure

- **`backend/`** - Backend server code
  - `index.js` - Server entry point
  - `routes/` - API route handlers
  - `data/` - JSON data storage
  - `package.json` - Backend dependencies

- **`frontend/`** - Frontend React application
  - `src/` - React source code
    - `pages/` - Page components
    - `components/` - Reusable components
    - `lib/` - Utilities and API client
  - `public/` - Static assets
  - `package.json` - Frontend dependencies

## Access the Application

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000/api

## Troubleshooting

1. **Port already in use**: Change the PORT in `backend/.env` or frontend port in `vite.config.ts`
2. **Module not found**: Run `npm install` in both root and `backend/` directories
3. **CORS errors**: Make sure `FRONTEND_URL` in `backend/.env` matches your frontend URL

