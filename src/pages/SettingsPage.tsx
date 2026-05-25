import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import UserAvatar from '../components/UserAvatar';
import { updateProfile, logoutUser } from '../features/auth/api/authApi';

const getUserFromStorage = () => {
  const raw = localStorage.getItem('vertex_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

// ── Avatar Editor Modal ──────────────────────────────────────────────────────

interface AvatarEditorProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ src, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const SIZE = 280;

  const draw = useCallback((img: HTMLImageElement, z: number, off: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const w = img.naturalWidth * z;
    const h = img.naturalHeight * z;
    const x = SIZE / 2 - w / 2 + off.x;
    const y = SIZE / 2 - h / 2 + off.y;
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, 2 * Math.PI, false);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, 2 * Math.PI, false);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const fitScale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      setZoom(fitScale);
      setOffset({ x: 0, y: 0 });
      draw(img, fitScale, { x: 0, y: 0 });
    };
    img.src = src;
  }, [src, draw]);

  useEffect(() => {
    if (imgRef.current) draw(imgRef.current, zoom, offset);
  }, [zoom, offset, draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setOffset({ x: dragRef.current.ox + e.clientX - dragRef.current.startX, y: dragRef.current.oy + e.clientY - dragRef.current.startY });
  };
  const handleMouseUp = () => { dragRef.current = null; };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    dragRef.current = { startX: t.clientX, startY: t.clientY, ox: offset.x, oy: offset.y };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current) return;
    const t = e.touches[0];
    setOffset({ x: dragRef.current.ox + t.clientX - dragRef.current.startX, y: dragRef.current.oy + t.clientY - dragRef.current.startY });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  const minZoom = imgRef.current
    ? Math.max(SIZE / imgRef.current.naturalWidth, SIZE / imgRef.current.naturalHeight) * 0.5
    : 0.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#EAEAEA] rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-5 w-[360px]">
        <h3 className="text-xl font-black text-[#333] self-start">Edit Profile Picture</h3>

        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-full cursor-grab active:cursor-grabbing border-2 border-gray-400 select-none"
          style={{ width: SIZE, height: SIZE }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        />

        <p className="text-xs text-gray-400 -mt-2">Drag to reposition · Scroll to zoom</p>

        <div className="w-full space-y-1">
          <div className="flex justify-between text-xs text-gray-500 font-medium">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min={minZoom}
            max="4"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>–</span>
            <span>+</span>
          </div>
        </div>

        <div className="flex space-x-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border-2 border-gray-400 text-gray-600 font-bold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// ── SettingsPage ─────────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('vertex_refresh_token');
    
    if (refreshToken) {
      try {
        await logoutUser(refreshToken);
      } catch (err) {
        console.error("Backend logout call failed:", err);
      }
    }

    // Always clear localStorage and redirect, even if API call fails
    localStorage.removeItem('vertex_access_token');
    localStorage.removeItem('vertex_refresh_token');
    localStorage.removeItem('vertex_user');
    
    navigate('/register', { replace: true });
  };

  useEffect(() => {
    const user = getUserFromStorage();
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAvatarUrl(user.avatarUrl || '');
    }
    setDarkMode(localStorage.getItem('vertex_dark_mode') === 'true');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('vertex_dark_mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setRawPreview(url);
      setShowEditor(true);
      return () => URL.revokeObjectURL(url);
    }
  }, [avatarFile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAvatarFile(e.target.files[0]);
  };

  const handleEditorSave = (dataUrl: string) => {
    setAvatarPreview(dataUrl);
    setShowEditor(false);
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setAvatarFile(null);
    setRawPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Dispatches values directly matching the backend UpdateProfileDTO
      const response = await updateProfile({
        firstName,
        lastName,
        avatarUrl: avatarPreview || avatarUrl
      });

      if (response && response.responseCode === '200') {
        const currentStoredUser = getUserFromStorage() || {};
        
        // Merge the backend updated entity metadata back into persistent cache context
        const updatedUser = {
          ...currentStoredUser,
          firstName: response.data.userSummary.firstName,
          lastName: response.data.userSummary.lastName,
          avatarUrl: response.data.userSummary.avatarUrl
        };

        localStorage.setItem('vertex_user', JSON.stringify(updatedUser));
        
        // Instantly force re-render across standard listening interfaces
        setAvatarUrl(updatedUser.avatarUrl);
        setAvatarPreview(null);
        
        alert('Profile saved successfully!');
      } else {
        alert(`Failed to save profile: ${response.message || 'Unknown server error'}`);
      }
    } catch (err: any) {
      console.error('Error modifying backend user configurations:', err);
      alert(err.response?.data?.message || 'Network exception encountered during execution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayAvatar = avatarPreview || avatarUrl;

  return (
    <div className="flex h-screen bg-[#A5C7E9]/30">

      {showEditor && rawPreview && (
        <AvatarEditor src={rawPreview} onSave={handleEditorSave} onCancel={handleEditorCancel} />
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-[#EAEAEA] flex flex-col border-r border-gray-300">
        <div className="p-8">
          <h1 className="text-5xl font-black text-[#333]">Vertex</h1>
        </div>
        <nav className="flex-1 mt-10">
          <ul className="space-y-2">
            <li
              className="px-8 py-4 text-4xl font-bold text-[#333] hover:bg-gray-300 cursor-pointer transition-colors"
              onClick={() => navigate('/dashboard')}
            >
              Projects
            </li>
            <li className="bg-gray-300/50 px-8 py-4 text-4xl font-bold text-[#333] cursor-pointer">
              Settings
            </li>
          </ul>
        </nav>
        <div className="p-8">
          <UserAvatar />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#EAEAEA] h-20 flex items-center px-12 border-b border-gray-300 shadow-sm">
          <h2 className="text-5xl font-bold text-[#333]">Settings</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-12 flex justify-center items-start">
          <div className="bg-[#EAEAEA] p-10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col space-y-8 h-fit">

            {/* Profile Section */}
            <section>
              <h3 className="text-xs font-bold text-[#444] mb-4 uppercase tracking-widest">Profile</h3>
              <form onSubmit={handleProfileSave} className="space-y-5">

                <div className="flex flex-col items-center space-y-2">
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-400 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change profile picture"
                  >
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#2d3e50] text-white text-xl font-bold">
                        <UserAvatar />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div className="flex items-center space-x-3">
                    <span
                      className="text-xs text-blue-600 cursor-pointer hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </span>
                    {rawPreview && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span
                          className="text-xs text-blue-600 cursor-pointer hover:underline"
                          onClick={() => setShowEditor(true)}
                        >
                          Re-edit
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                  <Input label="Username" value={username} disabled />
                  <Input label="Email" type="email" value={email} disabled />
                  <p className="text-xs text-gray-400 px-1 -mt-2">Username and account email parameters are immutable once registered.</p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2 rounded-lg shadow transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </section>

            <hr className="border-gray-300" />

            {/* Appearance Section */}
            <section>
              <h3 className="text-xs font-bold text-[#444] mb-4 uppercase tracking-widest">Appearance</h3>
              <div className="flex items-center space-x-4">
                <span className="text-base font-medium text-[#222]">Dark Mode</span>
                <button
                  type="button"
                  onClick={() => setDarkMode((d) => !d)}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${darkMode ? 'bg-blue-600' : 'bg-gray-400'}`}
                  aria-pressed={darkMode}
                >
                  <span className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-300 ${darkMode ? 'translate-x-6' : ''}`} />
                </button>
                <span className="text-gray-500 text-sm">{darkMode ? 'Dark' : 'Light'} mode</span>
              </div>
            </section>

            <hr className="border-gray-300" />

            {/* Session Section */}
            <section>
              <h3 className="text-xs font-bold text-[#444] mb-4 uppercase tracking-widest">Session</h3>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-2.5 rounded-lg shadow-md transition-all active:scale-95 flex items-center"
              >
                Logout
              </button>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;