'use client';

import { useState, useEffect } from 'react';
import { Song, Member } from '@/data/types';
import { SONGS as SEED_SONGS } from '@/data/songs';
import { MEMBERS as SEED_MEMBERS } from '@/data/members';

type AdminTab = 'dashboard' | 'songs' | 'members' | 'users' | 'seasons';

function loadData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`theheard_${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`theheard_${key}`, JSON.stringify(value));
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSongs(loadData('songs', SEED_SONGS));
    setMembers(loadData('members', SEED_MEMBERS));
    setMounted(true);
    // Check if already authed this session
    if (sessionStorage.getItem('theheard_admin') === 'true') {
      setAuthed(true);
    }
  }, []);

  const handleLogin = () => {
    // Simple password check - default "theheard" if no env var
    if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'theheard')) {
      setAuthed(true);
      sessionStorage.setItem('theheard_admin', 'true');
    } else {
      alert('Incorrect password');
    }
  };

  if (!mounted) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f5' }}>
        <div className="bg-white rounded-xl p-8 shadow-sm max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-1">Heard</h1>
          <p className="text-sm text-gray-500 mb-6">Admin Panel</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Enter password"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm mb-4 outline-none focus:border-gray-400"
          />
          <button onClick={handleLogin}
            className="w-full py-3 bg-black text-white rounded-lg text-sm font-medium cursor-pointer border-none">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    available: songs.filter(s => s.status === 'available').length,
    reserved: songs.filter(s => s.status === 'reserved').length,
    purchased: songs.filter(s => s.status === 'purchased').length,
    expiring: songs.filter(s => s.tier1_days_remaining <= 14 && s.status === 'available').length,
  };

  const updateSong = (updated: Song) => {
    const newSongs = songs.map(s => s.id === updated.id ? updated : s);
    setSongs(newSongs);
    saveData('songs', newSongs);
    setEditingSong(null);
  };

  const addSong = (newSong: Song) => {
    const withId = { ...newSong, id: Math.max(...songs.map(s => s.id)) + 1 };
    const newSongs = [...songs, withId];
    setSongs(newSongs);
    saveData('songs', newSongs);
    setEditingSong(null);
  };

  const deleteSong = (id: number) => {
    if (!confirm('Delete this song?')) return;
    const newSongs = songs.filter(s => s.id !== id);
    setSongs(newSongs);
    saveData('songs', newSongs);
  };

  const updateMember = (updated: Member) => {
    const newMembers = members.map(m => m.id === updated.id ? updated : m);
    setMembers(newMembers);
    saveData('members', newMembers);
    setEditingMember(null);
  };

  const TABS: { key: AdminTab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'songs', label: 'Songs' },
    { key: 'members', label: 'Members' },
    { key: 'users', label: 'Users' },
    { key: 'seasons', label: 'Seasons' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#f5f5f5' }}>
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 p-4 flex-shrink-0">
        <div className="text-lg font-bold mb-1">Heard</div>
        <div className="text-xs text-gray-400 mb-6">Admin Panel</div>
        {TABS.map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 cursor-pointer border-none ${
              activeTab === tab.key ? 'bg-black text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <>
            <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Available', val: stats.available, color: '#C8FF45' },
                { label: 'Reserved', val: stats.reserved, color: '#5AB4FF' },
                { label: 'Purchased', val: stats.purchased, color: '#B57BFF' },
                { label: 'Expiring (<14d)', val: stats.expiring, color: '#FF6848' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="text-sm font-medium mb-3">Members: {members.length}</div>
                <div className="text-xs text-gray-400">Total Collective members</div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="text-sm font-medium mb-3">Buyers: 1</div>
                <div className="text-xs text-gray-400">Tier 1: 1 · Tier 2: 0</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'songs' && !editingSong && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Songs ({songs.length})</h2>
              <button onClick={() => setEditingSong({
                id: 0, title: '', writers: [], writer_ids: [], genre: 'Pop', bpm: 120, key: 'C Major',
                mood: [], tier1_days_remaining: 180, days_in_bank: 0, audio_url: '', audio_duration_seconds: 60,
                color: '#FFB830', gradient: '', status: 'available', reserved_by: null, reserved_until: null,
                purchased_by: null, purchased_at: null, credit_type: 'fixed', is_new: true, season_id: 1,
                created_at: new Date().toISOString(), artistFlagged: false, artistFlagTime: null, artistReaction: null,
              })}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm cursor-pointer border-none">
                + Add Song
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Title', 'Writers', 'Genre', 'BPM', 'Status', 'Days Left', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {songs.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.title}</td>
                      <td className="px-4 py-3 text-gray-600">{s.writers.join(', ')}</td>
                      <td className="px-4 py-3">{s.genre}</td>
                      <td className="px-4 py-3">{s.bpm}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          s.status === 'available' ? 'bg-green-50 text-green-700' :
                          s.status === 'reserved' ? 'bg-blue-50 text-blue-700' :
                          'bg-purple-50 text-purple-700'
                        }`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3">{s.tier1_days_remaining}d</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditingSong(s)} className="text-blue-600 text-xs cursor-pointer bg-transparent border-none mr-3">Edit</button>
                        <button onClick={() => deleteSong(s.id)} className="text-red-500 text-xs cursor-pointer bg-transparent border-none">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'songs' && editingSong && (
          <SongForm song={editingSong} members={members} onSave={editingSong.id === 0 ? addSong : updateSong} onCancel={() => setEditingSong(null)} />
        )}

        {activeTab === 'members' && !editingMember && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Members ({members.length})</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Name', 'Role', 'Type', 'Streams', 'Songs in Bank', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-gray-600">{m.role}</td>
                      <td className="px-4 py-3">{m.member_type}</td>
                      <td className="px-4 py-3">{m.streams}</td>
                      <td className="px-4 py-3">{songs.filter(s => s.writer_ids.includes(m.id) && s.status !== 'purchased').length}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditingMember(m)} className="text-blue-600 text-xs cursor-pointer bg-transparent border-none">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'members' && editingMember && (
          <MemberForm member={editingMember} onSave={updateMember} onCancel={() => setEditingMember(null)} />
        )}

        {activeTab === 'users' && (
          <>
            <h2 className="text-2xl font-bold mb-6">Users (Read-Only)</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Name', 'Email', 'Role', 'Tier', 'Saved', 'Reserved', 'Purchased'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium">Marcus Johnson</td>
                    <td className="px-4 py-3">marcus@mgmt.co</td>
                    <td className="px-4 py-3">Artist Manager</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-green-50 text-green-700">Tier 1</span></td>
                    <td className="px-4 py-3">3</td>
                    <td className="px-4 py-3">{stats.reserved}</td>
                    <td className="px-4 py-3">{stats.purchased}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'seasons' && (
          <>
            <h2 className="text-2xl font-bold mb-6">Seasons</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Name', 'Type', 'Status', 'Songs', 'Platform Take', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium">Season 1C</td>
                    <td className="px-4 py-3">Contributed</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-green-50 text-green-700">Active</span></td>
                    <td className="px-4 py-3">{songs.length}</td>
                    <td className="px-4 py-3">18%</td>
                    <td className="px-4 py-3">
                      <button className="text-blue-600 text-xs cursor-pointer bg-transparent border-none">Edit</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SongForm({ song, members, onSave, onCancel }: { song: Song; members: Member[]; onSave: (s: Song) => void; onCancel: () => void }) {
  const [form, setForm] = useState(song);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);

  const update = (field: string, value: unknown) => setForm({ ...form, [field]: value });

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      let url: string;
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (isLocal) {
        // Dev mode: send file to our API route which writes to public/audio/
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Upload failed');
        }
        const data = await res.json();
        url = data.url;
      } else {
        // Production: upload directly to Vercel Blob from the browser
        const { upload } = await import('@vercel/blob/client');
        // Sanitize filename
        const rawName = file.name.replace(/\.[^.]+$/, '');
        const ext = file.name.split('.').pop()?.toLowerCase() || 'wav';
        const safeName = rawName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
        const filename = `audio/${safeName}.${ext}`;

        const blob = await upload(filename, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });
        url = blob.url;
      }

      setForm(prev => ({ ...prev, audio_url: url }));

      // Extract duration from audio file
      const audio = new Audio();
      audio.src = url;
      audio.onloadedmetadata = () => {
        setForm(prev => ({ ...prev, audio_duration_seconds: Math.round(audio.duration) }));
      };
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{song.id === 0 ? 'Add Song' : 'Edit Song'}</h2>
        <button onClick={onCancel} className="text-gray-500 cursor-pointer bg-transparent border-none">← Back</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Title</label>
            <input value={form.title} onChange={e => update('title', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Genre</label>
            <select value={form.genre} onChange={e => update('genre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
              {['Pop', 'R&B', 'Hip-Hop', 'Country', 'Dance / EDM'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">BPM</label>
            <input type="number" value={form.bpm} onChange={e => update('bpm', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Key</label>
            <input value={form.key} onChange={e => update('key', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mood (comma-separated)</label>
            <input value={form.mood.join(', ')} onChange={e => update('mood', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Color (hex)</label>
            <input type="color" value={form.color} onChange={e => update('color', e.target.value)}
              className="w-16 h-8 cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tier 1 Days Remaining</label>
            <input type="number" value={form.tier1_days_remaining} onChange={e => update('tier1_days_remaining', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Writers</label>
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.writer_ids.includes(m.id)}
                    onChange={e => {
                      const ids = e.target.checked ? [...form.writer_ids, m.id] : form.writer_ids.filter(id => id !== m.id);
                      const names = ids.map(id => members.find(mm => mm.id === id)?.name || '');
                      update('writer_ids', ids);
                      setForm(prev => ({ ...prev, writer_ids: ids, writers: names }));
                    }} />
                  {m.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={form.status} onChange={e => update('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="purchased">Purchased</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Credit Type</label>
            <select value={form.credit_type} onChange={e => update('credit_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
              <option value="fixed">Fixed</option>
              <option value="open">Open</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Audio File</label>

            {/* Current audio URL display */}
            {form.audio_url && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-700 text-xs">&#9834;</span>
                <span className="text-xs text-green-800 flex-1 truncate">{form.audio_url}</span>
                {form.audio_duration_seconds > 0 && (
                  <span className="text-xs text-green-600">{Math.floor(form.audio_duration_seconds / 60)}:{String(form.audio_duration_seconds % 60).padStart(2, '0')}</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const audio = new Audio(form.audio_url);
                    audio.play().catch(() => {});
                    setTimeout(() => audio.pause(), 5000);
                  }}
                  className="text-xs text-green-700 underline cursor-pointer bg-transparent border-none"
                >Preview</button>
              </div>
            )}

            {/* File upload */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              {uploading ? (
                <div className="text-sm text-blue-600">Uploading...</div>
              ) : (
                <>
                  <div className="text-sm text-gray-500 mb-2">
                    Drag &amp; drop a .wav or .mp3 file here, or click to browse
                  </div>
                  <input
                    type="file"
                    accept=".wav,.mp3"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </>
              )}
            </div>

            {uploadError && (
              <div className="text-xs text-red-500 mt-1">{uploadError}</div>
            )}

            {/* Manual URL fallback */}
            <button
              type="button"
              onClick={() => setShowManualUrl(!showManualUrl)}
              className="text-xs text-gray-400 mt-2 cursor-pointer bg-transparent border-none underline"
            >
              {showManualUrl ? 'Hide manual URL' : 'Or enter URL manually'}
            </button>
            {showManualUrl && (
              <input value={form.audio_url} onChange={e => update('audio_url', e.target.value)}
                placeholder="/audio/song-name.wav"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none mt-1" />
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSave(form)}
            className="px-6 py-2 bg-black text-white rounded-lg text-sm cursor-pointer border-none">Save</button>
          <button onClick={onCancel}
            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm cursor-pointer border-none">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function MemberForm({ member, onSave, onCancel }: { member: Member; onSave: (m: Member) => void; onCancel: () => void }) {
  const [form, setForm] = useState(member);

  const update = (field: string, value: unknown) => setForm({ ...form, [field]: value });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Edit Member</h2>
        <button onClick={onCancel} className="text-gray-500 cursor-pointer bg-transparent border-none">← Back</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input value={form.name} onChange={e => update('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Initials</label>
            <input value={form.initials} onChange={e => update('initials', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            <input value={form.role} onChange={e => update('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select value={form.member_type} onChange={e => update('member_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
              <option value="founding">Founding</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Color</label>
            <input type="color" value={form.color} onChange={e => update('color', e.target.value)}
              className="w-16 h-8 cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Streams</label>
            <input value={form.streams} onChange={e => update('streams', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Bio</label>
            <textarea value={form.bio} onChange={e => update('bio', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Awards (comma-separated)</label>
            <input value={form.awards.join(', ')} onChange={e => update('awards', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSave(form)}
            className="px-6 py-2 bg-black text-white rounded-lg text-sm cursor-pointer border-none">Save</button>
          <button onClick={onCancel}
            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm cursor-pointer border-none">Cancel</button>
        </div>
      </div>
    </div>
  );
}
