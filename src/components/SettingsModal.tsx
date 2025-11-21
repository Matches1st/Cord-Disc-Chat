import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store';
import toast from 'react-hot-toast';

const themes = [
  'white', 'dark', 'navy', 'red', 'green', 'purple', 'orange', 'pink', 'teal', 'black'
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const user = useStore(s => s.userData);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(""); // Added locally, logic for extending user doc if needed

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (confirm("Are you sure?")) {
      try {
        await updateDoc(doc(db, "users", user.uid), { displayName });
        toast.success("Saved");
        onClose();
      } catch (e) {
        toast.error("Failed to save");
      }
    }
  };

  const changeTheme = async (t: string) => {
    if(!user) return;
    await updateDoc(doc(db, "users", user.uid), { theme: t });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-gray-800 text-white p-6 rounded-lg w-96 shadow-xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Name</label>
            <input 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Theme</label>
            <div className="grid grid-cols-5 gap-2">
              {themes.map(t => (
                <button 
                  key={t}
                  type="button"
                  onClick={() => changeTheme(t)}
                  className={`w-8 h-8 rounded-full border-2 ${user?.theme === t ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: t === 'white' ? '#fff' : t === 'black' ? '#000' : `var(--color-${t}-600)` }} // Simplified preview
                >
                  <div className={`w-full h-full rounded-full opacity-80 ${getThemeColor(t)}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded hover:bg-white/10">Close</button>
            <button type="submit" className="px-4 py-2 bg-green-600 rounded hover:bg-green-500">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getThemeColor(theme: string) {
    switch(theme) {
        case 'white': return 'bg-white';
        case 'dark': return 'bg-gray-800';
        case 'navy': return 'bg-slate-800';
        case 'red': return 'bg-red-600';
        case 'green': return 'bg-green-600';
        case 'purple': return 'bg-purple-600';
        case 'orange': return 'bg-orange-600';
        case 'pink': return 'bg-pink-600';
        case 'teal': return 'bg-teal-600';
        case 'black': return 'bg-black';
        default: return 'bg-gray-500';
    }
}
