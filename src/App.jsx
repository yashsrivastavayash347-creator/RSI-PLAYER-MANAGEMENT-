import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'rsi-playsync-default';

export default function App() {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [modalMessage, setModalMessage] = useState(null);
  const [newPlayer, setNewPlayer] = useState({ name: '', role: 'Rifleman', rsiId: '', rank: 'Recruit' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'players');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(list);
    }, (error) => {
      console.error("Firestore sync error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name.trim() || !newPlayer.rsiId.trim()) {
      setModalMessage("Please fill out both Name and RSI Handle.");
      return;
    }
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'players');
      await addDoc(colRef, {
        name: newPlayer.name,
        role: newPlayer.role,
        rsiId: newPlayer.rsiId,
        rank: newPlayer.rank,
        attendance: 'Absent',
        createdAt: new Date().toISOString()
      });
      setNewPlayer({ name: '', role: 'Rifleman', rsiId: '', rank: 'Recruit' });
      setModalMessage("Player successfully added!");
    } catch (err) {
      console.error("Error adding player:", err);
      setModalMessage("Failed to add player.");
    }
  };

  const toggleAttendance = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'players', id);
      await updateDoc(docRef, { attendance: nextStatus });
    } catch (err) {
      console.error("Error updating attendance:", err);
    }
  };

  const deletePlayer = async (id) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'players', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Error deleting player:", err);
    }
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.rsiId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = players.filter(p => p.attendance === 'Present').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-mono text-lg animate-pulse">
        Initializing RSI PlaySync Secure Node...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {modalMessage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <h3 className="text-lg font-bold text-cyan-400 mb-2">RSI PlaySync Notification</h3>
            <p className="text-slate-300 text-sm mb-6">{modalMessage}</p>
            <button 
              onClick={() => setModalMessage(null)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-cyan-500/30">
            RSI
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              PLAYSYNC
            </h1>
            <p className="text-xs text-slate-400">Roster & Attendance Management</p>
          </div>
        </div>

        <nav className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'roster' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'}`}
          >
            Manage Roster
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Personnel</p>
                <h3 className="text-3xl font-black text-white mt-1">{players.length}</h3>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Marked Present</p>
                <h3 className="text-3xl font-black text-cyan-400 mt-1">{presentCount}</h3>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Attendance Rate</p>
                <h3 className="text-3xl font-black text-blue-400 mt-1">
                  {players.length > 0 ? Math.round((presentCount / players.length) * 100) : 0}%
                </h3>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-white">Live Attendance Tracker</h2>
                <input 
                  type="text" 
                  placeholder="Search by name or handle..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-72 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No personnel records found. Add members via the Roster tab.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400">
                          {player.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200">{player.name}</h4>
                          <p className="text-xs text-slate-400 font-mono">{player.rsiId} • <span className="text-cyan-400">{player.role}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${player.rank === 'Commander' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-300'}`}>
                          {player.rank}
                        </span>
                        <button
                          onClick={() => toggleAttendance(player.id, player.attendance)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${player.attendance === 'Present' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}
                        >
                          {player.attendance || 'Absent'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
              <h2 className="text-lg font-bold text-white mb-4">Add New Personnel</h2>
              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Citizen Name</label>
                  <input 
                    type="text" 
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                    placeholder="e.g., John Doe"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">RSI Handle</label>
                  <input 
                    type="text" 
                    value={newPlayer.rsiId}
                    onChange={(e) => setNewPlayer({...newPlayer, rsiId: e.target.value})}
                    placeholder="e.g., Handle_347"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Combat Role</label>
                  <select 
                    value={newPlayer.role}
                    onChange={(e) => setNewPlayer({...newPlayer, role: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Rifleman">Rifleman</option>
                    <option value="Pilot">Pilot</option>
                    <option value="Medic">Medic</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Marine">Marine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rank</label>
                  <select 
                    value={newPlayer.rank}
                    onChange={(e) => setNewPlayer({...newPlayer, rank: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Recruit">Recruit</option>
                    <option value="Member">Member</option>
                    <option value="Officer">Officer</option>
                    <option value="Commander">Commander</option>
                  </select>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20 mt-2"
                >
                  Register Personnel
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">Personnel Directory ({players.length})</h2>
              {players.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No personnel registered yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {players.map((player) => (
                    <div key={player.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-200">{player.name}</h4>
                        <p className="text-xs text-slate-400 font-mono">{player.rsiId} • <span className="text-cyan-400">{player.role}</span></p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                          {player.rank}
                        </span>
                        <button 
                          onClick={() => deletePlayer(player.id)}
                          className="text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
