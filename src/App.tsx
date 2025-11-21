import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useStore } from './store';
import AuthPage from './pages/Auth';
import Layout from './pages/Layout';
import ChatRoom from './components/ChatRoom';
import { Toaster } from 'react-hot-toast';

const themes: Record<string, string> = {
  white: "bg-white text-gray-900",
  dark: "bg-gray-900 text-white",
  navy: "bg-slate-900 text-slate-100",
  red: "bg-red-900 text-red-100",
  green: "bg-green-900 text-green-100",
  purple: "bg-purple-900 text-purple-100",
  orange: "bg-orange-900 text-orange-100",
  pink: "bg-pink-900 text-pink-100",
  teal: "bg-teal-900 text-teal-100",
  black: "bg-black text-gray-200",
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUserData = useStore((state) => state.setUserData);
  const userData = useStore((state) => state.userData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        getDoc(userRef).then((snap) => {
          if (!snap.exists()) {
            // Fallback creation if triggered too fast or external auth
            const newUser = {
              username: user.isAnonymous ? 'guest_' + Math.random().toString(36).slice(2, 7) : (user.email?.split('@')[0] || 'User'),
              displayName: "User",
              photoURL: null,
              theme: "white",
              joinedRooms: [],
              createdAt: serverTimestamp(),
              isGuest: user.isAnonymous
            };
            setDoc(userRef, newUser);
            setUserData({ ...newUser, uid: user.uid } as any);
          } else {
            setUserData({ ...snap.data(), uid: user.uid } as any);
          }
          setLoading(false);
          if (location.pathname === '/login') {
            navigate("/");
          }
        });
      } else {
        setUserData(null);
        setLoading(false);
        navigate("/login");
      }
    });
    return unsub;
  }, [navigate, setUserData]); // Removed location.pathname to avoid loop, handled inside

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading Cord Disc...</div>;

  const themeClass = userData?.theme ? themes[userData.theme] : themes.white;

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${themeClass}`}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<div className="flex items-center justify-center h-full opacity-50">Select a room to chat</div>} />
          <Route path="room/:code" element={<ChatRoom />} />
        </Route>
      </Routes>
      <Toaster position="top-center" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}