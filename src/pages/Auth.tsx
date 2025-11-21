import { useState } from 'react';
import { auth, db } from '../firebase';
import { signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, query, collection, where, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const defaultUser = {
  displayName: "User",
  photoURL: null,
  theme: "white",
  joinedRooms: [],
  createdAt: serverTimestamp(),
};

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'guest'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return toast.error("Username required");
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
      if (!snap.empty) throw new Error("Username taken");
      
      const { user } = await signInAnonymously(auth);
      await setDoc(doc(db, "users", user.uid), { username, isGuest: true, ...defaultUser });
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return toast.error("Fields required");
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
      if (!snap.empty) throw new Error("Username taken");

      const email = `${username}@corddisc.local`;
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", user.uid), { username, isGuest: false, ...defaultUser });
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return toast.error("Fields required");
    setLoading(true);
    try {
      const email = `${username}@corddisc.local`;
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700"
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-indigo-400">Cord Disc</h1>
        
        <div className="flex mb-6 bg-gray-900 p-1 rounded-lg">
          {['login', 'register', 'guest'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as any)}
              className={`flex-1 py-2 rounded-md capitalize text-sm font-medium transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={mode === 'guest' ? handleGuest : mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-indigo-500 outline-none"
              placeholder="Enter username"
              maxLength={20}
            />
          </div>

          {mode !== 'guest' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-indigo-500 outline-none"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded font-bold transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : mode === 'guest' ? "Enter as Guest" : mode === 'register' ? "Create Account" : "Login"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}