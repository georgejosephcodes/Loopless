import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Map as MapIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

const AuthMenu = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading) return null;

  if (!user) {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => navigate('/', { state: { from: location.pathname, resumeState: location.state } })}
      >
        <LogIn size={15} /> Log in
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        className="avatar"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        title={user.name}
      >
        {initials(user.name)}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <strong className="truncate">{user.name}</strong>
            <span className="truncate" style={{ display: 'block' }}>{user.email}</span>
          </div>
          <button type="button" className="menu-item" role="menuitem" onClick={() => { setOpen(false); navigate('/trips'); }}>
            <MapIcon size={16} /> My trips
          </button>
          <button
            type="button"
            className="menu-item"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              try { await logout(); toast.success('Logged out'); } catch { toast.error('Logout failed'); }
            }}
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthMenu;
