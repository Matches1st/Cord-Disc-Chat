import { create } from 'zustand';

interface UserData {
  username: string;
  displayName: string;
  photoURL: string | null;
  theme: string;
  joinedRooms: string[];
  isGuest: boolean;
  uid: string;
}

interface AppState {
  userData: UserData | null;
  setUserData: (data: UserData | null) => void;
}

export const useStore = create<AppState>((set) => ({
  userData: null,
  setUserData: (data) => set({ userData: data }),
}));