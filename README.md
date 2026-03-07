# 🍽️ Maison Élara — Restaurant Website (MongoDB Edition)

A complete, production-ready restaurant web application built with vanilla HTML/CSS/JS, Node.js + Express, and **MongoDB Atlas** as the permanent database.

---

## 📁 File Structure

```
restaurant/
├── index.html      # Customer-facing homepage
├── admin.html      # Admin dashboard
├── styles.css      # Complete stylesheet
├── script.js       # Customer frontend logic
├── admin.js        # Admin dashboard logic
├── server.js       # Node.js/Express + Mongoose REST API
├── package.json    # Dependencies
├── .env.example    # Environment variable template
└── README.md       # This file
```

---

## 🚀 Local Setup (Step by Step)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up MongoDB Atlas (free)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → Sign up free
2. Create a free **M0 cluster** (takes ~2 min)
3. Go to **Database Access** → Add a database user with a username and password
4. Go to **Network Access** → Add IP Address → Allow access from anywhere (`0.0.0.0/0`)
5. Go to your cluster → Click **Connect** → **Drivers** → Copy the connection string

### 3. Configure your .env file
```bash
cp .env.example .env
```

Open `.env` and paste your connection string:
```
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/maison-elara?retryWrites=true&w=majority
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

### 4. Run the server
```bash
node server.js
```

Visit:
- **Customer site →** http://localhost:3000
- **Admin panel →** http://localhost:3000/admin

The database seeds itself with 12 menu items automatically on first run.

---

## ☁️ Deploy to Render (Step by Step)

### 1. Add a .gitignore first
Create a `.gitignore` file in the project root:
```
node_modules/
.env
```

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Maison Elara with MongoDB"
```
Create a new repo on [github.com](https://github.com), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/maison-elara.git
git branch -M main
git push -u origin main
```

### 3. Create Web Service on Render
1. Go to [render.com](https://render.com) → Sign up
2. Click **New +** → **Web Service**
3. Connect GitHub → Select your repo
4. Fill in settings:

| Field | Value |
|-------|-------|
| Name | maison-elara |
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

### 4. Add Environment Variables on Render
In your Render service → **Environment** tab → Add:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your full Atlas connection string |
| `ADMIN_USERNAME` | admin |
| `ADMIN_PASSWORD` | your_secure_password |

Click **Save Changes** — Render redeploys automatically.

### 5. Allow Render in MongoDB Atlas
Atlas → **Network Access** → Add IP → `0.0.0.0/0` (allow all IPs)

### 6. Live 🎉
```
https://maison-elara.onrender.com
https://maison-elara.onrender.com/admin
```

---

## 🔌 REST API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | — | Admin login |
| POST | `/api/admin/logout` | ✓ | Admin logout |
| GET | `/api/menu` | — | Get all menu items |
| POST | `/api/menu` | ✓ | Add menu item |
| PUT | `/api/menu/:id` | ✓ | Update menu item |
| DELETE | `/api/menu/:id` | ✓ | Delete menu item |
| GET | `/api/orders` | ✓ | Get all orders |
| POST | `/api/orders` | — | Place an order |
| PUT | `/api/orders/:id` | ✓ | Update order status |
| GET | `/api/reservations` | ✓ | Get reservations |
| POST | `/api/reservations` | — | Make a reservation |
| PUT | `/api/reservations/:id` | ✓ | Update reservation |
| GET | `/api/reviews` | — | Get all reviews |
| POST | `/api/reviews` | — | Submit a review |
| GET | `/api/stats` | ✓ | Dashboard statistics |

---

## ⚠️ Free Tier Notes

**Render free:** Server sleeps after 15 min inactivity — first visit takes ~30s to wake. Paid plan stays always on.

**MongoDB Atlas M0 free:** 512MB storage, more than enough for a restaurant app.
