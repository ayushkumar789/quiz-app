



# 🧠 Real-Time Multiplayer Quiz Game

A full-stack web application where users can create quiz rooms, join with a unique Room ID, and compete live in a real-time quiz game. Built using **Node.js**, **Socket.IO**, **MongoDB**, and a dynamic **HTML/CSS frontend** with JWT-based authentication.

---

## 🚀 Features

- 👥 **User Authentication** (JWT-based: Register / Login)
- 🏠 **Dashboard with Quiz History**
- 📋 **Quiz Creation** (Admin / Instructor only)
- 🔑 **Room Join via Room ID**
- ⚡ **Real-time Questions + Answer Sync via Socket.IO**
- 🏆 **Live Leaderboard**
- ✅ **Final Score Submission**
- 🛡️ **Token-based Access Control**
- 📁 **MongoDB-backed Quiz and Attempt Storage**

---

## 📂 Folder Structure



project-root/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   └── authRoutes.js, adminRoutes.js, quizRoutes.js
│   ├── models/
│   │   └── User.js, Quiz.js, Question.js, QuizAttempt.js
│   └── middlewares/
│       └── authMiddleware.js
├── public/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── create-quiz.html
│   ├── room.html
│   └── question.html



---

## 🛠️ Setup Instructions

### 🔧 Backend Setup


cd backend
npm install


Create a `.env` file:


PORT=5000
MONGO_URI=mongodb://localhost:27017/quiz-game
JWT_SECRET=yourSuperSecretKey


Run the server:


node server.js


---

### 🌐 Frontend Setup

Open `public/` folder with Live Server or any static server (e.g., `http-server`):


npm install -g http-server
cd public
http-server -p 5500


---

## 👤 User Flow

### 1️⃣ Register / Login

* Visit `http://localhost:5500/login.html` or `register.html`
* On login, token is stored in `localStorage`.

---

### 2️⃣ Dashboard

* After login, you’ll be redirected to `dashboard.html`
* Displays previous quiz attempts (fetched using the token)

---

### 3️⃣ Create Quiz (Instructor/Admin only)

* Go to `create-quiz.html`
* Enter:

  * **Room ID** (e.g., `BASIC`, `BGMI`)
  * **Questions** (with 4 options and correct answer as exact text)
* Submit — quiz gets stored in MongoDB

---

### 4️⃣ Join Quiz Room

* Open `room.html`
* Enter Room ID (same as Quiz Title)
* Click “Join Room” to wait for other players

---

### 5️⃣ Quiz Time! 🚀

* Quiz starts when the room is full or admin triggers it
* Questions are shown one-by-one
* Players answer and proceed to next using **Next Question** button
* Final question shows **Submit Quiz**

---

### 6️⃣ Results & Leaderboard

* On submission:

  * Scores are stored
  * You’re redirected to `room.html`
  * Live leaderboard is updated in real-time

---

## 🔐 Authentication & Token Flow

* Token is stored in `localStorage`
* Sent in `Authorization: Bearer <token>` header to all protected routes
* Rooms, quiz creation, and dashboard all require a valid token

---

## 🧪 Sample Test Room

* Room ID: `BASIC`
* 3 Sample Questions included

---

## 📦 Tech Stack

* **Backend**: Node.js, Express, Socket.IO
* **Frontend**: HTML5, TailwindCSS, Vanilla JS
* **Database**: MongoDB (via Mongoose)
* **Auth**: JWT Tokens

---

## 🧠 Future Improvements

* Admin Panel UI
* Timer-based questions
* Image-based questions
* Question categories
* Score analytics & charts

---

## 👨‍💻 Developed By

* Ayush Kumar Panigrahi
* L Sai Anirudh
* Harshith Reddy

---

## 📜 License

MIT

---

Let me know if you want the project to support **deployment instructions**, **API docs**, or **Firebase integration** for hosting.

