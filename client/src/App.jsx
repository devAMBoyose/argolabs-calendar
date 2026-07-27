import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PublicCalendar from './pages/PublicCalendar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventEditor from './pages/EventEditor';
import Users from './pages/Users';
import Settings from './pages/Settings';

function Protected({children,owner=false}){const {user,isOwner}=useAuth();if(!user)return <Navigate to="/login" replace/>;if(owner&&!isOwner)return <Navigate to="/dashboard" replace/>;return children;}
export default function App(){return <Routes>
  <Route path="/" element={<PublicCalendar/>}/>
  <Route path="/login" element={<Login/>}/>
  <Route element={<Protected><Layout/></Protected>}>
    <Route path="/dashboard" element={<Dashboard/>}/>
    <Route path="/events/new" element={<Protected owner><EventEditor/></Protected>}/>
    <Route path="/events/:id" element={<EventEditor/>}/>
    <Route path="/users" element={<Protected owner><Users/></Protected>}/>
    <Route path="/settings" element={<Protected owner><Settings/></Protected>}/>
  </Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}
