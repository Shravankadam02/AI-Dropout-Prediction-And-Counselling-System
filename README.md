# 🎓 EduSaarthi — AI Dropout Prediction & Counselling System v2.0

> An intelligent, multi-role platform designed to identify at-risk students, predict dropout probabilities, and facilitate timely interventions using AI and Human-in-the-Loop systems. Developed for the **Smart India Hackathon (SIH)**.

---

## 🌟 The Problem
Educational institutions struggle to identify students who are quietly falling behind due to academic pressure, financial issues, or personal stress. By the time a student formally drops out or fails, it is often too late for intervention.

## 🚀 The Solution
This platform uses data analytics and an AI-powered RAG (Retrieval-Augmented Generation) chat system to monitor student health metrics (attendance, fee payments, test scores) in real-time. It seamlessly connects students with Mentors and Counsellors before critical thresholds are breached.

---

## ✨ Key Features

- **🛡️ Multi-Role Architecture:** Dedicated, secure dashboards for Students, Mentors, Counsellors, and Administrators.
- **🤖 AI "Human-in-the-Loop" Chat:** A 24/7 AI Mentor that provides study and mental health support. If the AI detects high distress or cannot confidently help, it autonomously escalates the chat to a human mentor.
- **📊 Predictive Analytics:** Calculates dynamic Risk Scores (Low, Medium, High) based on recent test averages, long-term trends, attendance, and fee status.
- **🔔 Real-Time Notification System:** Mentors and admins receive instant alerts when a student escalates an issue or is newly assigned to their caseload.
- **📈 Comprehensive Admin Overview:** Institution-wide dashboards showing risk distributions, attendance trends, and stale intervention alerts using sleek `Chart.js` visualizations.
- **📂 Bulk Data Ingestion:** Admins and Mentors can rapidly onboard hundreds of students and counsellors via CSV uploads.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS, Chart.js, React-Router
- **Backend (Core):** Node.js, Express.js, MongoDB (Mongoose)
- **Backend (AI Service):** Node.js, LangChain, Google Gemini API, Cheerio (for RAG data ingestion)
- **Authentication:** JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `mongodb://localhost:27017` or via MongoDB Atlas)
- Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/Shravankadam02/sih-dropout-prediction-v2.git
cd sih-dropout-prediction-v2
```

### 2. Setup the Core Backend (`/server`)
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/sih-dropout
JWT_SECRET=your_super_secret_jwt_key
AI_SERVICE_URL=http://localhost:8001
```
Start the server:
```bash
npm run dev
```

### 3. Setup the AI Service (`/ai-service`)
Open a new terminal window:
```bash
cd ai-service
npm install
```
Create a `.env` file in the `ai-service` directory:
```env
PORT=8001
GOOGLE_API_KEY=your_gemini_api_key_here
```
Start the AI service:
```bash
npm run dev
```

### 4. Setup the Frontend (`/client`)
Open a third terminal window:
```bash
cd client
npm install
```
Start the frontend app:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

---

## 👥 Demo Credentials
You can use the **Quick Login (Demo)** dropdown on the sign-in page, or use the following credentials manually (Password for all is `demo1234`):

- **Admin:** `admin@demo.com`
- **Mentor:** `priya.mentor@met.edu`
- **Counsellor:** `aditi.sharma@example.com`
- **Student:** `ramesh.student@met.edu`

---

## 🤝 Built For
**Smart India Hackathon (SIH)** 

*Transforming education through predictive analytics and empathetic AI.*
