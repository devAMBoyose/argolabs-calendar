import React from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import api from '../api';
const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('argo_user')||'null'));
  const login=async(email,password)=>{const {data}=await api.post('/auth/login',{email,password});localStorage.setItem('argo_token',data.token);localStorage.setItem('argo_user',JSON.stringify(data.user));setUser(data.user);return data;};
  const logout=()=>{localStorage.removeItem('argo_token');localStorage.removeItem('argo_user');setUser(null);};
  const value=useMemo(()=>({user,login,logout,isOwner:user?.role==='OWNER',canEdit:['OWNER','EDITOR'].includes(user?.role)}),[user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
