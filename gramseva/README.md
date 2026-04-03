# 🏡 GramSeva — Village Family Portal
### Full MERN Stack Application

A complete digital governance platform for rural village panchayats with family-based authentication, complaint management, certificate applications, tax payments, and emergency SOS.

---

## 📁 Project Structure

```
gramseva/
├── server/                  # Express + MongoDB Backend
│   ├── models/
│   │   ├── User.js          # Family Head + Members model
│   │   ├── Complaint.js     # Complaint model
│   │   ├── Certificate.js   # Certificate application model
│   │   ├── Tax.js           # Tax records model
│   │   └── SOSNotification.js # SOS + Notifications
│   ├── routes/
│   │   ├── auth.js          # Login, Register, Forgot Password
│   │   ├── families.js      # Family management
│   │   ├── complaints.js    # Complaint CRUD
│   │   ├── certificates.js  # Certificate applications
│   │   ├── taxes.js         # Tax payments
│   │   ├── sos.js           # SOS alerts
│   │   ├── notifications.js # Notifications
│   │   ├── admin.js         # Admin stats & user management
│   │   └── documents.js     # File uploads
│   ├── middleware/
│   │   ├── auth.js          # JWT middleware
│   │   └── upload.js        # Multer file uploads
│   ├── uploads/             # Uploaded files (auto-created)
│   ├── index.js             # Main entry
│   ├── package.json
│   └── .env.example         # Copy to .env
│
├── client/                  # React + Vite Frontend
│   ├── src/
│   │   ├── api/axios.js     # Axios instance with JWT interceptor
│   │   ├── context/AuthContext.jsx  # Auth state management
│   │   ├── components/
│   │   │   ├── Toast.jsx    # Toast notification
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Login + 3-step Signup
│   │   │   ├── VillagerDashboard.jsx # Villager portal
│   │   │   └── AdminDashboard.jsx   # Admin control panel
│   │   ├── styles/global.css
│   │   ├── App.jsx          # Routes
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json             # Root scripts
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)

### 1. Clone & Install
```bash
# Install all dependencies
cd gramseva
npm run install:all
```

### 2. Configure Environment
```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/gramseva
JWT_SECRET=your_very_secret_key_here
JWT_EXPIRE=7d
```

### 3. Seed Admin Account
```bash
# Start server first, then call seed endpoint once:
curl -X POST http://localhost:5000/api/admin/seed
```

This creates:
- **Mobile:** `9999999999`
- **Password:** `Admin@123`
- **Role:** Admin

### 4. Run Development
```bash
# Terminal 1 — Backend
npm run dev:server

# Terminal 2 — Frontend
npm run dev:client
```

Or run both together:
```bash
npm install concurrently   # root
npm run dev
```

### 5. Open Browser
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api

---

## 🔐 Authentication Flow

### Villager Registration (3-Step Signup)
1. **Step 1** — Head of family info + document upload
2. **Step 2** — Add family members + access controls
3. **Step 3** — 4-digit PIN + security question + password + OTP

### Login Options
| Role | Credentials |
|------|-------------|
| Villager | Mobile + Password + Village + Pincode |
| Admin | Mobile/LoginID + Password |
| Family Member | Head's Mobile + Aadhaar Last 4 + Family PIN |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register family (multipart/form-data) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/login/member` | Family member login |
| GET  | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Send OTP |
| POST | `/api/auth/reset-password` | Reset password |

### Villager APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/complaints/my` | My complaints |
| POST | `/api/complaints` | File complaint (with photo upload) |
| GET | `/api/certificates/my` | My certificate applications |
| POST | `/api/certificates` | Apply for certificate |
| GET | `/api/taxes/my` | My tax records |
| POST | `/api/taxes/pay/:id` | Pay a tax |
| POST | `/api/sos` | Send SOS alert |
| GET | `/api/notifications` | Get notifications |
| GET | `/api/families/my` | Get family profile |
| POST | `/api/families/members` | Add family member |
| DELETE | `/api/families/members/:id` | Remove member |
| PATCH | `/api/families/access-controls` | Update head controls |

### Admin APIs (requires admin JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/users` | All families |
| PATCH | `/api/admin/users/:id/status` | Activate/deactivate |
| GET | `/api/complaints` | All complaints |
| PATCH | `/api/complaints/:id/status` | Update complaint status |
| GET | `/api/certificates` | All certificate applications |
| PATCH | `/api/certificates/:id/status` | Approve/reject certificate |
| GET | `/api/sos` | Active SOS alerts |
| PATCH | `/api/sos/:id/resolve` | Resolve SOS |
| POST | `/api/notifications` | Send notification |
| POST | `/api/admin/seed` | Create initial admin |

---

## 🎨 UI Features

### Login Page (Dark Theme)
- Animated background with floating particles
- Role selector (Villager / Admin)
- 3-step family registration wizard
- PIN boxes with auto-focus navigation
- OTP verification boxes
- Family member management with add/remove
- Head access controls with live toggles
- Forgot password modal with OTP flow

### Villager Dashboard (Forest Green Theme)
- Sidebar navigation with 9 sections
- Overview with stats cards + quick actions
- Certificates — apply & track
- Complaints — file with category + GPS + photo
- Payments — pay taxes online with UPI
- Government Schemes — eligibility checker
- Gram Sabha — attendance with photo/GPS
- SOS Emergency — 4-type emergency alerts
- Family Members — view all members
- Settings — toggles for preferences

### Admin Dashboard (Blue Professional Theme)
- Analytics with bar charts + progress charts
- User Management — search, activate/deactivate
- Certificate Management — approve/reject pipeline
- Complaint Management — status workflow
- Tax Management — records & tracking
- Emergency Control Panel — live SOS with pulse indicators
- Notification Management — send to all/ward/family
- Document Verification — approve/reject uploads

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose ODM |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File Upload | Multer |
| HTTP Client | Axios |
| Fonts | Cormorant Garamond, Syne, DM Sans, Playfair Display |

---

## 📝 Environment Variables

```env
# server/.env
PORT=5000
MONGO_URI=mongodb://localhost:27017/gramseva
JWT_SECRET=change_this_in_production_very_long_random_string
JWT_EXPIRE=7d
NODE_ENV=development
```

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- Family PIN is hashed before storage
- Security answers are lowercased and hashed
- JWT tokens expire in 7 days
- Admin routes protected with `adminOnly` middleware
- File uploads restricted to JPG/PNG/PDF, max 5MB
- In production: use HTTPS, rate limiting, and a real SMS OTP gateway

---

## 🏗 Production Deployment

```bash
# Build frontend
cd client && npm run build

# Serve frontend from Express (add to server/index.js)
app.use(express.static('../client/dist'))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')))

# Deploy on Railway, Render, or VPS with PM2
pm2 start server/index.js --name gramseva
```

---

*Built with ❤️ for Rural India — GramSeva Village Portal*
