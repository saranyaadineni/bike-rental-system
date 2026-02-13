# User Credentials

## Admin Account

**Email:** `admin@bikerental.com`  
**Password:** `admin123`  
**Role:** Admin  
**Wallet Balance:** ₹10000

### Admin Features:
- Access to Admin Panel (`/admin`)
- Manage all bikes (add, edit, delete)
- View all users and their details
- Approve/reject user documents
- View system statistics
- Full access to all admin functionalities

## Regular User Accounts

### User 1
**Email:** `john@example.com`  
**Password:** `user123`  
**Role:** User  
**Wallet Balance:** ₹500

### User 2
**Email:** `jane@example.com`  
**Password:** `user123`  
**Role:** User  
**Wallet Balance:** ₹750

### User 3
**Email:** `bob@example.com`  
**Password:** `user123`  
**Role:** User  
**Wallet Balance:** ₹250

## User Features:
- Access to Dashboard (`/dashboard`)
- View profile information
- Manage wallet (top up balance)
- View rental history
- Upload and manage documents
- Rent bikes from garage
- Logout functionality

## How to Use

1. **Login as Admin:**
   - Go to `/auth` or click "Login"
   - Enter admin credentials
   - You'll be redirected to `/admin` panel
   - Admin link appears in navbar

2. **Login as User:**
   - Go to `/auth` or click "Login"
   - Enter user credentials
   - You'll be redirected to `/dashboard`
   - View profile, wallet, rentals, and documents

3. **Seed Users (if needed):**
   ```bash
   cd backend
   npm run seed:users
   ```

## Notes

- All passwords are hashed using bcrypt
- Admin users see "Admin" link in navbar
- Regular users see their name and dashboard link
- Logout clears session and redirects to home
- Wallet balance is displayed in dashboard
- Rental history shows all past and active rentals





