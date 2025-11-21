import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function MemberSidebar({ code }: { code: string }) {
  const [members, setMembers] = useState<any[]>([]);
  
  useEffect(() => {
    if (!code) return;
    const q = query(collection(db, `rooms/${code}/members`), orderBy("lastSeen", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => d.data()));
    });
    return unsub;
  }, [code]);

  return (
    <div className="w-60 bg-black/20 border-l border-white/10 hidden lg:flex flex-col">
      <div className="p-4 border-b border-white/10 font-bold text-sm uppercase tracking-wider opacity-70">
        Members — {members.length}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {members.map(m => {
            const isOnline = m.lastSeen > Date.now() - 30000;
            return (
                <div key={m.uid} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-default opacity-90 hover:opacity-100">
                    <div className="relative">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {m.username?.[0]?.toUpperCase()}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <span className="truncate font-medium text-sm">{m.username}</span>
                </div>
            )
        })}
      </div>
    </div>
  );
}