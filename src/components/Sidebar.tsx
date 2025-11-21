import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, runTransaction, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { useStore } from '../store';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut, Plus, Hash, Settings, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import SettingsModal from './SettingsModal';

const SkeletonRoomList = () => (
  <div className="animate-pulse space-y-2 p-2"> 
    {Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-white/10 rounded" />)} 
  </div>
);

export default function Sidebar() {
  const user = useStore(s => s.userData);
  const navigate = useNavigate();
  const { code: activeCode } = useParams();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Modal States
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inputVal, setInputVal] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "rooms"), 
      where("memberIds", "array-contains", user.uid), 
      orderBy("createdAt", "desc"), 
      limit(50)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !user) return;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const roomRef = doc(db, "rooms", code);
    try {
      await runTransaction(db, async (transaction) => {
        transaction.set(roomRef, { 
          name: inputVal, 
          ownerUid: user.uid, 
          createdAt: serverTimestamp(), 
          memberIds: [user.uid] 
        });
        transaction.update(doc(db, "users", user.uid), { joinedRooms: arrayUnion(code) });
      });
      setInputVal("");
      setShowCreate(false);
      navigate(`/room/${code}`);
    } catch (e) {
      toast.error("Failed to create room");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !user) return;
    const code = inputVal.toUpperCase();
    const roomRef = doc(db, "rooms", code);
    try {
      await runTransaction(db, async (transaction) => {
        const rDoc = await transaction.get(roomRef);
        if (!rDoc.exists()) throw new Error("Room not found");
        const uDoc = await transaction.get(doc(db, "users", user.uid));
        if (uDoc.data()?.joinedRooms?.includes(code)) throw new Error("Already joined");

        transaction.update(roomRef, { memberIds: arrayUnion(user.uid) });
        transaction.update(doc(db, "users", user.uid), { joinedRooms: arrayUnion(code) });
      });
      setInputVal("");
      setShowJoin(false);
      navigate(`/room/${code}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-64 flex flex-col bg-black/20 border-r border-white/10 h-full">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-bold text-lg tracking-tight">Cord Disc</h2>
        <button onClick={() => setShowSettings(true)} className="p-1 hover:bg-white/10 rounded"><Settings size={18}/></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? <SkeletonRoomList /> : (
          <div className="p-2 space-y-1">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className={`w-full text-left p-2 rounded flex items-center gap-2 transition-colors ${activeCode === room.id ? 'bg-white/20 font-semibold' : 'hover:bg-white/10 opacity-80 hover:opacity-100'}`}
              >
                <Hash size={16} />
                <span className="truncate">{room.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-white/10 space-y-2">
        <button onClick={() => setShowCreate(true)} className="w-full flex items-center justify-center gap-2 p-2 bg-white/10 hover:bg-white/20 rounded text-sm">
          <Plus size={16} /> Create Room
        </button>
        <button onClick={() => setShowJoin(true)} className="w-full flex items-center justify-center gap-2 p-2 bg-white/10 hover:bg-white/20 rounded text-sm">
          <ArrowRight size={16} /> Join Room
        </button>
        <div className="flex items-center justify-between p-2 mt-2 bg-black/20 rounded">
            <span className="truncate text-sm font-bold max-w-[120px]">{user?.username}</span>
            <button onClick={() => auth.signOut()} className="text-red-400 hover:text-red-300"><LogOut size={16}/></button>
        </div>
      </div>

      {(showCreate || showJoin) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={showCreate ? handleCreate : handleJoin} className="bg-gray-800 p-6 rounded w-80 text-white border border-gray-700">
            <h3 className="font-bold mb-4">{showCreate ? "Create Room" : "Join Room"}</h3>
            <input 
              autoFocus
              placeholder={showCreate ? "Room Name" : "6-Char Code"}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded p-2 mb-4 outline-none focus:border-indigo-500"
              maxLength={showCreate ? 20 : 6}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowCreate(false); setShowJoin(false); }} className="px-3 py-1 hover:bg-white/10 rounded">Cancel</button>
              <button type="submit" className="px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-500">Go</button>
            </div>
          </form>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}