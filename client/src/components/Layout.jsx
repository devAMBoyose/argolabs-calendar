import React from 'react';
import { CalendarDays, LogOut, Settings, Users, LayoutDashboard, Plus } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function Layout(){const {user,logout,isOwner}=useAuth();return <div className="app-shell">
<aside className="sidebar"><div className="brand"><div className="brand-mark">A</div><div><strong>Argo Labs</strong><span>Calendar Portal</span></div></div>
<nav><NavLink to="/dashboard"><LayoutDashboard/>Dashboard</NavLink>{isOwner&&<NavLink to="/events/new"><Plus/>Create event</NavLink>}{isOwner&&<NavLink to="/users"><Users/>Users</NavLink>}{isOwner&&<NavLink to="/settings"><Settings/>Settings</NavLink>}<NavLink to="/"><CalendarDays/>Public calendar</NavLink></nav>
<div className="sidebar-footer"><small>Signed in as</small><strong>{user?.name}</strong><span>{user?.role}</span><button className="link-button" onClick={logout}><LogOut/>Sign out</button></div></aside>
<main className="main"><Outlet/></main></div>}
