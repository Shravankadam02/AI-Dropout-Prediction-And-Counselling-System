# SIH Dropout Prediction v2.0 Architecture

The architecture of this project is a **microservices-based system** consisting of three distinct backend services and one frontend client, all coordinated by `concurrently` during development. 

## High-Level Diagram

- **Client:** React/Vite Frontend (Port 5173)
- **Server:** Main Node.js Server (Port 5000)
- **ML:** Python FastAPI ML Engine (Port 8000)
- **AI:** AI Chat/RAG Service (Port 8001)
- **DB:** MongoDB Atlas Cloud Database
- **Ollama:** Local Llama Model Server

---

## 1. Frontend Client (`client/`)
- **Tech Stack:** React, Vite, TailwindCSS, Axios, Chart.js
- **Port:** 5173
- **Role:** Provides the user interface for Admins, Mentors, and Students.
- **Key Features:**
  - **Admin Dashboard:** Visualizes institution-wide risk (High/Medium/Low charts), attendance distributions, and test performance trends.
  - **Mentor Dashboard:** Shows assigned students sorted by risk score, allowing mentors to review risk factors and log notes.
  - **Data Upload:** Parses CSV files, formatting data to match backend schemas, and uploading it for batch processing.

## 2. Main Node.js Server (`server/`)
- **Tech Stack:** Node.js, Express, Mongoose, JWT
- **Port:** 5000
- **Role:** The primary operational backend. It manages authentication, user roles, business logic, and database interactions.
- **Key Features:**
  - **Data Orchestration:** When students are uploaded, it requests risk predictions from the ML Engine and caches the scores in MongoDB.
  - **Endpoints:** Provides CRUD operations for Students, Users, Escalations, and Intervention Notes.
  - **Risk Calculator Gateway (`services/riskCalculator.js`):** Acts as the bridge that formats student data into ML-ready features (e.g., `attendance_percentage`, `backlogs`) and sends HTTP POST requests to the Python ML API.

## 3. Machine Learning Engine (`ml-service/`)
- **Tech Stack:** Python, FastAPI, Scikit-Learn, SHAP, Pandas
- **Port:** 8000
- **Role:** The predictive brain of the system.
- **Key Features:**
  - **Model:** A Random Forest Classifier trained on real student dataset features (`age`, `gpa`, `backlogs`, `family_income`, etc.).
  - **Explainability:** Uses SHAP to calculate exactly *why* a student was flagged as high-risk, returning the top contributing factors and their impact severity to the Node.js server.
  - **Endpoints:** `/predict` (single student) and `/predict_batch` (array of students for fast dashboard updates).

## 4. AI Service (`ai-service/`)
- **Tech Stack:** Node.js, Express, LangChain.js, local Ollama
- **Port:** 8001
- **Role:** Powers the student-facing chatbot and smart counselor escalation summaries.
- **Key Features:**
  - **Local Privacy:** Completely offline execution using Ollama.
  - **RAG System:** Embeds institutional policies and study materials so the chatbot can provide grounded advice to students based on real documents.
  - **Escalation Summaries:** If a student asks for human help or mentions critical keywords, it summarizes the chat log and alerts the assigned human Mentor on the dashboard.

## 5. Database Layer
- **MongoDB Atlas:** The centralized cloud database holding all schemas (`User`, `Student`, `Note`, `Escalation`). Both the Main Node Server and the AI Service connect directly to it using Mongoose.

## Deployment & Startup
The entire stack is glued together using `concurrently` in the root `package.json`. Running `npm start` instantly spins up all four microservices in parallel, abstracting the complexity of managing multiple servers during local development.
