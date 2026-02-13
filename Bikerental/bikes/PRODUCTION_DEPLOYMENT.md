# Production Deployment Guide

## Overview

This guide covers deploying RideFlow to production with all error handling and optimizations in place.

## Pre-Deployment Checklist

- [x] All console errors fixed
- [x] Error boundaries implemented
- [x] API error handling improved
- [x] Production build configuration
- [x] Environment variables configured

## Environment Variables

### Frontend (.env.production)

Create `frontend/.env.production`:

```env
# Production API URL
VITE_API_BASE=https://api.yourdomain.com/api
```

### Backend

Ensure backend environment variables are set:
- Database connection string
- JWT secret
- Payment gateway keys
- CORS origins

## Building for Production

### Frontend

```bash
cd frontend
npm run build
```

This creates an optimized production build in `frontend/dist/`.

### Backend

The backend runs directly with Node.js:

```bash
cd backend
node index.js
```

Or use PM2 for process management:

```bash
pm2 start backend/index.js --name bikerental-api
```

## Deployment Options

### Option 1: Traditional Server (VPS/Dedicated)

1. **Frontend**: Serve static files with Nginx
2. **Backend**: Run with PM2 or systemd
3. **Database**: MongoDB on same server or managed service

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/bikerental/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE=/api
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/bikerental
      - JWT_SECRET=your-secret-key
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo-data:
```

### Option 3: Cloud Platforms

#### Vercel/Netlify (Frontend) + Railway/Render (Backend)

1. **Frontend**: Deploy to Vercel/Netlify
   - Set `VITE_API_BASE` to your backend URL
   - Build command: `npm run build`
   - Output directory: `dist`

2. **Backend**: Deploy to Railway/Render
   - Set environment variables
   - Start command: `node index.js`

## Production Optimizations

### Frontend

- ✅ Error boundaries for graceful error handling
- ✅ Silent error logging (only in development)
- ✅ Optimized build with code splitting
- ✅ Production sourcemaps disabled
- ✅ Minified assets

### Backend

- Use environment variables for all secrets
- Enable CORS for production domain only
- Use HTTPS in production
- Set up proper logging
- Implement rate limiting
- Use connection pooling for database

## Monitoring & Error Tracking

### Recommended Services

1. **Error Tracking**: Sentry, LogRocket, or Rollbar
2. **Analytics**: Google Analytics, Plausible
3. **Uptime Monitoring**: UptimeRobot, Pingdom
4. **Logs**: Logtail, Papertrail

### Integration Example (Sentry)

```typescript
// frontend/src/lib/errorHandler.ts
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "YOUR_SENTRY_DSN",
    environment: "production",
  });
}

export function logError(error: unknown, context?: string) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      tags: { context },
    });
  }
}
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] CORS configured for production domain only
- [ ] Environment variables secured (not in git)
- [ ] JWT secret is strong and unique
- [ ] Database credentials secured
- [ ] API rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] File upload size limits
- [ ] SQL injection prevention (if using SQL)
- [ ] XSS protection

## Performance

### Frontend

- Code splitting enabled
- Lazy loading for routes
- Image optimization
- CDN for static assets
- Browser caching headers

### Backend

- Database indexing
- Query optimization
- Response caching where appropriate
- Connection pooling
- Gzip compression

## Testing Production Build Locally

```bash
# Build frontend
cd frontend
npm run build

# Preview production build
npm run preview

# Test with production API
VITE_API_BASE=http://localhost:3000/api npm run preview
```

## Troubleshooting

### Common Issues

1. **API Errors (403/401)**
   - Check CORS configuration
   - Verify JWT token handling
   - Check API base URL in environment variables

2. **Build Failures**
   - Check Node.js version (should be 18+)
   - Clear node_modules and reinstall
   - Check for TypeScript errors

3. **Runtime Errors**
   - Check browser console (errors are logged in dev mode)
   - Verify error boundaries are working
   - Check network tab for API calls

## Post-Deployment

1. Test all major features
2. Monitor error logs
3. Check performance metrics
4. Verify SSL certificate
5. Test on multiple devices/browsers
6. Set up automated backups

## Support

For issues or questions, check:
- Error logs in your monitoring service
- Browser console (in development mode)
- Server logs
- Network requests in DevTools



