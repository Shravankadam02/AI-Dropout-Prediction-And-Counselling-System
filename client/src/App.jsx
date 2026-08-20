import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import MentorDashboard from "./pages/MentorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StudentProfile from "./pages/StudentProfile";
import StudentHome from "./pages/StudentHome";
import Unauthorized from "./pages/Unauthorized";
import UploadStudents from "./pages/UploadStudents";
import BatchOverview from "./pages/BatchOverview";
import AdminAssignments from "./pages/AdminAssignments";
import MentorEscalations from "./pages/MentorEscalations";
import CounsellorDashboard from "./pages/CounsellorDashboard";
import StudentCounsellors from "./pages/StudentCounsellors";
import MentorAnalytics from "./pages/MentorAnalytics";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route
              path="/mentor"
              element={
                <ProtectedRoute allowedRoles={["mentor"]}>
                  <MentorDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/mentor/analytics"
              element={
                <ProtectedRoute allowedRoles={["mentor"]}>
                  <MentorAnalytics />
                </ProtectedRoute>
              }
            />

            <Route
              path="/mentor/escalations"
              element={
                <ProtectedRoute allowedRoles={["mentor", "admin", "counsellor"]}>
                  <MentorEscalations />
                </ProtectedRoute>
              }
            />

            <Route
              path="/counsellor"
              element={
                <ProtectedRoute allowedRoles={["counsellor"]}>
                  <CounsellorDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/batch/:batchId"
              element={
                <ProtectedRoute allowedRoles={["admin", "mentor"]}>
                  <BatchOverview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/upload"
              element={
                <ProtectedRoute allowedRoles={["admin", "mentor"]}>
                  <UploadStudents />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/assignments"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminAssignments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/me"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentHome />
                </ProtectedRoute>
              }
            />

            <Route
              path="/counsellors"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentCounsellors />
                </ProtectedRoute>
              }
            />


            <Route
              path="/student/:studentId"
              element={
                <ProtectedRoute allowedRoles={["mentor", "admin", "counsellor"]}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;