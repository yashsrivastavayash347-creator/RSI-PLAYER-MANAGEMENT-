import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, UserPlus, CheckCircle, XCircle, 
  BarChart2, Shield, Flame, Trophy, Edit3, Save, Trash2, Cloud, RefreshCw
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

// Initialize Firebase
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'rsi-app-default';

export default function App() {
  const [activeTab, setActiveTab] = useState('register');
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [isEditingStats, setIsEditingStats] = useState(false);

  // New Player Form State
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  const [newRole, setNewRole] = useState('Batsman');

  // Temporary Edit State for Stats
  const [editForm, setEditForm] = useState({});

  const [notification, setNotification] = useState('');
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // Auth & Data Sync
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error(err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'rsi_players');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const loadedPlayers = [];
      snapshot.forEach((docSnap) => {
        loadedPlayers.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPlayers(loadedPlayers);
      if (loadedPlayers.length > 0 && !selectedPlayerId) {
        setSelectedPlayerId(loadedPlayers[0].id);
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleRegisterPlayer = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newId.trim()) {
      showNotification('Please enter both Name and RSI ID.');
      return;
    }

    const docId = 'player_' + Date.now();
    const newPlayerObj = {
      name: newName.trim(),
      rsiId: newId.trim(),
      role: newRole,
      runs: 0,
      outs: 0,
      battingAverage: 0.00,
      strikeRate: 0.00,
      wickets: 0,
      economy: 0.00,
      catches: 0,
      runOuts: 0,
      attendance: 'Pending'
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rsi_players', docId), newPlayerObj);
      setNewName('');
      setNewId('');
      showNotification(`Player ${newPlayerObj.name} registered and saved to cloud!`);
      setSelectedPlayerId(docId);
      setActiveTab('stats');
    } catch (err) {
      showNotification('Error saving to cloud.');
    }
  };

  const handleAttendanceToggle = async (id, status) => {
    try {
      const playerDoc = players.find(p => p.id === id);
      if (!playerDoc) return;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rsi_players', id), {
        ...playerDoc,
        attendance: status
      });
      showNotification(`Attendance updated successfully.`);
    } catch (err) {
      showNotification('Failed to update attendance.');
    }
  };

  const startEditing = (player) => {
    setEditForm(player);
    setIsEditingStats(true);
  };

  const handleSaveStats = async (e) => {
    e.preventDefault();
    try {
      const { id, ...data } = editForm;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rsi_players', id), data);
      setIsEditingStats(false);
      showNotification(`Stats updated and saved to cloud for ${editForm.name}!`);
    } catch (err) {
      showNotification('Error updating stats.');
    }
  };

  const handleDeletePlayer = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rsi_players', id));
      if (selectedPlayerId === id) {
        setSelectedPlayerId(null);
        setActiveTab(players.length > 1 ? 'roster' : 'register');
      }
      showNotification('Player removed successfully.');
    } catch (err) {
      showNotification('Error deleting player.');
    }
  };

  const currentPlayer = players.find(p => p.id === selectedPlayerId) || players[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white pb-16">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-rose-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-rose-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
                RSI PLAYSYNC
              </h1>
              <p className="text-xs text-slate-400 flex items-center space-x-1">
                <Cloud className="w-3 h-3 text-emerald-400 inline" />
                <span>Cloud Persistent Storage Active</span>
              </p>
            </div>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-xs font-semibold text-rose-400">
            {players.length} Players Synced
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('register')} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${activeTab === 'register' ? 'bg-slate-800 text-rose-400 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Yourself</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('roster')} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${activeTab === 'roster' ? 'bg-slate-800 text-rose-400 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Users className="w-4 h-4" />
            <span>Squad Roster ({players.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('attendance')} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${activeTab === 'attendance' ? 'bg-slate-800 text-rose-400 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Calendar className="w-4 h-4" />
            <span>Digital Attendance</span>
          </button>

          <button 
            onClick={() => { if(players.length > 0) setActiveTab('stats'); else showNotification('Register a player first!'); }} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${activeTab === 'stats' ? 'bg-slate-800 text-rose-400 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Stats & Editor</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 flex flex-col items-center space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
            <p className="text-sm">Loading saved cloud records...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: Register Player */}
            {activeTab === 'register' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-md mx-auto shadow-xl animate-fadeIn">
                <div className="text-center mb-6">
                  <div className="inline-block p-3 bg-rose-500/10 rounded-2xl text-rose-500 mb-2">
                    <UserPlus className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold">RSI Player Registration</h3>
                  <p className="text-slate-400 text-sm mt-1">Enter your details to create your persistent cloud profile.</p>
                </div>

                <form onSubmit={handleRegisterPlayer} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Your Full Name</label>
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">RSI Membership ID</label>
                    <input 
                      type="text" 
                      value={newId}
                      onChange={(e) => setNewId(e.target.value)}
                      placeholder="e.g. RSI-1001"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Player Role</label>
                    <select 
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicket Keeper">Wicket Keeper</option>
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg transition-all text-sm mt-2"
                  >
                    Register & Save to Cloud
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Squad Roster */}
            {activeTab === 'roster' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Saved RSI Players</h3>
                  <button 
                    onClick={() => setActiveTab('register')}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold"
                  >
                    + Add Player
                  </button>
                </div>

                {players.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-rose-500" />
                    <p className="text-base font-semibold">No players saved in cloud yet.</p>
                    <p className="text-xs mt-1">Register using the "Register Yourself" tab to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {players.map(p => (
                      <div 
                        key={p.id} 
                        className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center shadow-md group"
                      >
                        <div 
                          onClick={() => { setSelectedPlayerId(p.id); setActiveTab('stats'); }}
                          className="flex items-center space-x-3 cursor-pointer flex-1"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{p.name}</h4>
                            <p className="text-[10px] text-slate-400">{p.role} • <span className="text-indigo-400 font-mono">{p.rsiId}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div 
                            onClick={() => { setSelectedPlayerId(p.id); setActiveTab('stats'); }}
                            className="text-right cursor-pointer"
                          >
                            <span className="text-xs font-bold font-mono text-rose-400">{p.runs} Runs</span>
                            <span className="block text-[10px] text-slate-400">{p.wickets} Wickets</span>
                          </div>
                          <button 
                            onClick={() => handleDeletePlayer(p.id)}
                            className="text-slate-500 hover:text-rose-500 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Digital Attendance */}
            {activeTab === 'attendance' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <h3 className="text-lg font-bold">Match Attendance Register</h3>
                  <p className="text-slate-400 text-xs mt-1">Mark players as Attending or Declined. Changes are saved automatically.</p>
                </div>

                {players.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                    <p className="text-sm">No players available for attendance.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {players.map(p => (
                      <div key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-rose-400">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{p.name}</h4>
                            <span className="text-[10px] text-slate-400">{p.role} • {p.rsiId}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                          <button 
                            onClick={() => handleAttendanceToggle(p.id, 'Attending')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${p.attendance === 'Attending' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Attending</span>
                          </button>
                          <button 
                            onClick={() => handleAttendanceToggle(p.id, 'Not Attending')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${p.attendance === 'Not Attending' ? 'bg-rose-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Declined</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Stats & Edit */}
            {activeTab === 'stats' && (
              <div className="space-y-4 animate-fadeIn">
                {players.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                    <p className="text-sm">No player profile selected.</p>
                  </div>
                ) : (
                  <>
                    {/* Player Selector Header */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg">
                          {currentPlayer?.name?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-base">{currentPlayer?.name}</h3>
                          <p className="text-xs text-slate-400">{currentPlayer?.role} • <span className="text-indigo-400 font-mono">{currentPlayer?.rsiId}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isEditingStats ? (
                          <>
                            <button
                              onClick={handleSaveStats}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setIsEditingStats(false)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditing(currentPlayer)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Stats</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditingStats ? (
                      <form onSubmit={handleSaveStats} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Runs</label>
                            <input
                              type="number"
                              value={editForm.runs ?? 0}
                              onChange={(e) => setEditForm({ ...editForm, runs: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Outs</label>
                            <input
                              type="number"
                              value={editForm.outs ?? 0}
                              onChange={(e) => setEditForm({ ...editForm, outs: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Batting Average</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.battingAverage ?? 0}
                              onChange={(e) => setEditForm({ ...editForm, battingAverage: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Strike Rate</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.strikeRate ?? 0}
                              onChange={(e) => setEditForm({ ...editForm, strikeRate: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Wickets</label>
                            <input
                              type="number"
                              value={editForm.wickets ?? 0}
                              onChange={(e) => setEditForm({ ...editForm, wickets: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Economy</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.economy ?? 0}
                              onChange={(e) => setEditForm({ ...editForm, economy: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Catches</label>
                            <input
                              type="number"
                              value={editForm.catches ?? 0}
                              onChange={(e) => setEditForm({ ...editForm, catches: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Run Outs</label>
                            <input
                              type="number"
                              value={editForm.runOuts ?? 0}
                              onChange={(e) => setEditForm({ ...editForm, runOuts: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                          <Flame className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                          <p className="text-xl font-black">{currentPlayer?.runs}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Runs</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                          <Shield className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                          <p className="text-xl font-black">{currentPlayer?.wickets}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Wickets</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                          <p className="text-xl font-black">{currentPlayer?.battingAverage}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Batting Avg</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                          <p className="text-xl font-black">{currentPlayer?.economy}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Economy</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

