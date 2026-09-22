import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import Modal from './Modal';
import api, { errorMessage } from '../lib/api';

/**
 * Save / Share controls for the trip pages.
 * `getSnapshot()` builds the payload lazily so the parent stays the owner of trip state.
 * `onSaved({ id, title })` lets the parent remember the trip id so later saves update it.
 */
const SaveShareButtons = ({ getSnapshot, tripId, defaultTitle, onSaved }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [modal, setModal] = useState(null); // null | 'save' | 'share'
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const requireLogin = () => {
    if (user) return true;
    toast('Log in to save and share trips');
    navigate('/', { state: { from: location.pathname, resumeState: location.state } });
    return false;
  };

  // Creates the trip, or updates it when it was already saved. Returns the trip id.
  const persist = async (newTitle) => {
    const snapshot = getSnapshot();
    const { data } = tripId
      ? await api.put(`/api/trips/${tripId}`, { snapshot })
      : await api.post('/api/trips', { title: newTitle, snapshot });
    onSaved({ id: data.id, title: data.title });
    return data.id;
  };

  const copyShareLink = async (id) => {
    const { data } = await api.post(`/api/trips/${id}/share`);
    const url = `${window.location.origin}/shared/${data.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied');
    } catch {
      toast(url, { duration: 8000 });
    }
  };

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
      setModal(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Request failed. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const onSaveClick = () => {
    if (!requireLogin()) return;
    if (!tripId) {
      setTitle(defaultTitle);
      setModal('save');
      return;
    }
    run(async () => {
      await persist();
      toast.success('Trip updated');
    });
  };

  const onShareClick = () => {
    if (!requireLogin()) return;
    if (!tripId) {
      setTitle(defaultTitle);
      setModal('share');
      return;
    }
    run(async () => copyShareLink(await persist()));
  };

  const onConfirm = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    run(async () => {
      const id = await persist(trimmed);
      if (modal === 'share') await copyShareLink(id);
      else toast.success('Trip saved');
    });
  };

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onSaveClick} disabled={busy} title="Save trip">
        <Bookmark size={15} /> <span className="hide-mobile">{tripId ? 'Update' : 'Save'}</span>
      </button>
      <button type="button" className="btn btn-primary btn-sm" onClick={onShareClick} disabled={busy} title="Copy a public link to this trip">
        <Share2 size={15} /> <span className="hide-mobile">Share</span>
      </button>

      {modal && (
        <Modal
          title={modal === 'share' ? 'Save trip to share it' : 'Save trip'}
          description={modal === 'share' ? 'Name your trip. We will copy a public link to your clipboard.' : 'Give your trip a name so you can find it later.'}
          onClose={() => setModal(null)}
          busy={busy}
          actions={(
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="submit" form="save-trip-form" className="btn btn-primary" disabled={busy || !title.trim()}>
                {busy && <span className="spinner" />}
                {busy ? 'Saving…' : modal === 'share' ? 'Save & copy link' : 'Save'}
              </button>
            </>
          )}
        >
          <form id="save-trip-form" onSubmit={onConfirm}>
            <label className="field">
              <span className="field-label">Trip name</span>
              <input className="input" autoFocus value={title} maxLength={120} required placeholder="Weekend in Goa" onChange={(e) => setTitle(e.target.value)} />
            </label>
          </form>
        </Modal>
      )}
    </>
  );
};

export default SaveShareButtons;
