import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, startAfter, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useStore } from '../store';
import { Paperclip, Send, ArrowDown } from 'lucide-react';
import MemberSidebar from './MemberSidebar';
import toast from 'react-hot-toast';

export default function ChatRoom() {
  const { code } = useParams();
  const user = useStore(s => s.userData);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);

  // Update Presence
  useEffect(() => {
    if (!user || !code) return;
    const interval = setInterval(() => {
        setDoc(doc(db, `rooms/${code}/members`, user.uid), {
            uid: user.uid,
            username: user.username,
            photoURL: user.photoURL,
            lastSeen: Date.now()
        }, { merge: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [code, user]);

  // Initial Load
  useEffect(() => {
    if (!code) return;
    setLoading(true);
    const q = query(collection(db, `rooms/${code}/messages`), orderBy("createdAt", "desc"), limit(40));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
    });
    return unsub;
  }, [code]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code) return;
    const trimmed = text.trim();
    if (trimmed) {
      const tempId = Math.random().toString();
      // Optimistic
      setMessages(prev => [...prev, { id: tempId, text: trimmed, uid: user.uid, createdAt: { seconds: Date.now()/1000 } }]);
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
      
      await addDoc(collection(db, `rooms/${code}/messages`), { 
        text: trimmed, 
        uid: user.uid, 
        createdAt: serverTimestamp(),
        username: user.username // Store username for fast render
      });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !code) return;
    
    const fileRef = ref(storage, `files/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(fileRef, file);
    
    task.on('state_changed', 
      (snap) => {
        const p = (snap.bytesTransferred / snap.totalBytes) * 100;
        setProgress(p);
        if(p === 100) setTimeout(() => setProgress(0), 1000);
      },
      (err) => toast.error("Upload failed"),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, `rooms/${code}/messages`), { 
          fileUrl: url, 
          uid: user.uid, 
          createdAt: serverTimestamp(),
          username: user.username
        });
      }
    );
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="flex flex-1 h-full overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center px-4 justify-between bg-black/10">
            <h3 className="font-bold flex items-center gap-2 text-lg"># {code}</h3>
            <span className="text-xs opacity-50">ID: {code}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => {
                const isMe = msg.uid === user?.uid;
                return (
                    <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${isMe ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                                {msg.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className={`p-3 rounded-lg break-words ${isMe ? 'bg-indigo-600 text-white' : 'bg-white/10'}`}>
                                {msg.fileUrl ? (
                                    <img src={msg.fileUrl} alt="attachment" className="max-w-xs max-h-60 rounded border border-white/20" />
                                ) : (
                                    <p>{msg.text}</p>
                                )}
                            </div>
                        </div>
                        <span className="text-[10px] opacity-40 mt-1 mx-10">
                             {msg.username} • {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sending...'}
                        </span>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-black/20 border-t border-white/10">
            {progress > 0 && <div className="h-1 bg-indigo-900 mb-2 rounded overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{width: `${progress}%`}}/></div>}
            <form onSubmit={handleSend} className="flex gap-2 items-center">
                <input type="file" ref={fileInputRef} hidden onChange={handleFile} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">
                    <Paperclip size={20} />
                </button>
                <input 
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`Message #${code}`}
                    className="flex-1 bg-white/5 border-none rounded-full px-4 py-3 outline-none focus:ring-1 ring-indigo-500 transition-all"
                />
                <button type="submit" disabled={!text.trim()} className="p-3 bg-indigo-600 rounded-full hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                    <Send size={18} />
                </button>
            </form>
        </div>
      </div>
      
      <MemberSidebar code={code || ''} />
    </div>
  );
}