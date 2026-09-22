import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Accessible dialog: Esc and scrim click close it, focus moves in on open and returns on close. */
const Modal = ({ title, description, onClose, busy = false, size, children, actions }) => {
  const ref = useRef(null);
  const latest = useRef({ onClose, busy });

  useEffect(() => {
    latest.current = { onClose, busy };
  });

  // Runs once: move focus in (unless a field already autofocused) and restore it on close.
  useEffect(() => {
    const previous = document.activeElement;
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !latest.current.busy) latest.current.onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal${size === 'lg' ? ' modal-lg' : ''}`}
        style={{ outline: 'none' }}
      >
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="icon-btn" style={{ width: 32, height: 32, marginTop: -4 }} onClick={onClose} disabled={busy} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {description && <p className="modal-desc">{description}</p>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
};

export default Modal;
