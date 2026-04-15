# 🔄 SkillSwap — Hyperlocal Skill Exchange Platform

A production-ready web application that allows users to **exchange skills locally without money**. Find people nearby who offer what you want to learn, and teach them what you know in return.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io |

---

## 🌟 Features

- **JWT Authentication** — Register, login, secure session management
- **Profile Setup** — Bio, skills offered, skills wanted
- **Hyperlocal Discovery** — Find users within configurable radius using MongoDB `$geoNear`
- **Smart Matching Algorithm** — Ranks nearby users by reciprocal skill overlap score
- **Request Exchange** — Send requests with a custom message, accept or reject incoming requests
- **Requests Dashboard** — Separate tabs for Received Requests & Sent Requests
- **Real-time Foundation** — Socket.io infrastructure for live messaging

---

## 📁 Project Structure

```
skillswap/
├── client/          # React frontend (Vite + Tailwind)
│   └── src/
│       ├── pages/   # Login, Register, Home, Profile, Requests
│       ├── components/  # RequestModal
│       └── context/     # AuthContext
└── server/          # Node.js Express API
    ├── server.js
    ├── seed.js      # Sample data seeder
    └── src/
        ├── config/      # MongoDB connection
        ├── controllers/ # Auth, Users, Matches
        ├── models/      # User, Match, Message, Review
        ├── routes/
        ├── middleware/
        ├── sockets/     # Socket.io handler
        └── utils/
```

---

## ⚙️ Setup & Run

### 1. Backend

```bash
cd server
cp .env.example .env   # Fill in your MongoDB URI and JWT secret
npm install
node seed.js           # (Optional) Seed 10 demo users
npm run dev            # Starts on port 5050
```

### 2. Frontend

```bash
cd client
npm install
npm run dev            # Opens at http://localhost:5173
```

---

## 🔒 Environment Variables (`server/.env`)

```
PORT=5050
MONGODB_URI=mongodb://localhost:27017/skillswap
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

---

## 🌍 Deployment

- **Frontend** → Vercel (`cd client && npx vercel`)
- **Backend** → Render (supports WebSockets for Socket.io)
- **Database** → MongoDB Atlas (replace `MONGODB_URI` in production env)
