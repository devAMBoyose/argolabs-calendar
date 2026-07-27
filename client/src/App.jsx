import React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import EventEditor from "./pages/EventEditor";
import Login from "./pages/Login";
import PublicCalendar from "./pages/PublicCalendar";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

import { useAuth } from "./context/AuthContext";

function LoadingScreen() {
  return <div className="empty">Loading application…</div>;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function OwnerRoute({ children }) {
  const { user, isOwner, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicCalendar />} />
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            path="/events/new"
            element={
              <OwnerRoute>
                <EventEditor />
              </OwnerRoute>
            }
          />

          <Route
            path="/events/:id"
            element={<EventEditor />}
          />

          <Route
            path="/users"
            element={
              <OwnerRoute>
                <Users />
              </OwnerRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <OwnerRoute>
                <Settings />
              </OwnerRoute>
            }
          />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}