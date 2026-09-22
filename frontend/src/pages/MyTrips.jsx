import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Link2Off, Trash2, Pencil, MapPin, Navigation, Plus, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import AppBar from '../components/AppBar';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import api, { errorMessage } from '../lib/api';
import './Trips.css';

const MyTrips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState(null); // trip being renamed
  const [deleting, setDeleting] = useState(null); // trip pending delete confirmation
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/trips');
      setTrips(data.trips);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your trips.'));
      setTrips([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (id, changes) => setTrips((list) => list.map((tr) => (tr.id === id ? { ...tr, ...changes } : tr)));

  const open = async (id) => {
    try {
      const { data } = await api.get(`/api/trips/${id}`);
      const s = data.snapshot;
      const base = {
        locations: s.locations,
        mode: s.mode,
        matrix: s.matrix,
        durationMatrix: s.durationMatrix,
        estimatedMatrix: s.estimatedMatrix,
        routeGeometry: s.routeGeometry,
        settings: s.settings,
        tripId: data.id,
        title: data.title,
      };
      if (s.itinerary?.length) {
        navigate('/itinerary', { state: { ...base, itinerary: s.itinerary, totalDistanceKm: s.totalDistanceKm } });
      } else {
        navigate('/result', { state: { ...base, distance: s.totalDistanceKm } });
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Could not open trip.'));
    }
  };

  const startRename = (trip) => {
    setTitle(trip.title);
    setRenaming(trip);
  };

  const confirmRename = async (e) => {
    e.preventDefault();
    const next = title.trim();
    if (!next || next === renaming.title) { setRenaming(null); return; }
    setBusy(true);
    try {
      await api.put(`/api/trips/${renaming.id}`, { title: next });
      patch(renaming.id, { title: next });
      setRenaming(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not rename trip.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/trips/${deleting.id}`);
      setTrips((list) => list.filter((tr) => tr.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete trip.'));
    } finally {
      setBusy(false);
    }
  };

  const share = async (trip) => {
    try {
      const { data } = await api.post(`/api/trips/${trip.id}/share`);
      const url = `${window.location.origin}/shared/${data.shareToken}`;
      patch(trip.id, { isShared: true, shareToken: data.shareToken });
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Share link copied');
      } catch {
        toast(url, { duration: 8000 });
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create share link.'));
    }
  };

  const revoke = async (trip) => {
    try {
      await api.delete(`/api/trips/${trip.id}/share`);
      patch(trip.id, { isShared: false, shareToken: null });
      toast.success('Sharing turned off');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not revoke link.'));
    }
  };

  return (
    <div className="page-shell">
      <AppBar
        left={(
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/plan')}>
            <ArrowLeft size={16} /> <span className="hide-mobile">Back to map</span>
          </button>
        )}
        center={<h1 className="appbar-title">My trips</h1>}
        right={(
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/plan')}>
            <Plus size={15} /> <span className="hide-mobile">New trip</span>
          </button>
        )}
      />

      <div className="page-scroll">
        <div className="trips">
          {error && <div role="alert" className="alert alert-danger">{error}</div>}

          {trips === null && (
            <div className="trips-grid">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 150 }} />)}
            </div>
          )}

          {trips?.length === 0 && !error && (
            <div className="card">
              <EmptyState
                icon={Bookmark}
                title="No saved trips yet"
                action={<button type="button" className="btn btn-primary" onClick={() => navigate('/plan')}>Plan your first trip</button>}
              >
                Optimize a route, then press Save. Your trips show up here, ready to reopen or share.
              </EmptyState>
            </div>
          )}

          {trips?.length > 0 && (
            <div className="trips-grid">
              {trips.map((trip) => (
                <article key={trip.id} className="card trip-card">
                  <div className="trip-top">
                    <h2 className="trip-title truncate" title={trip.title}>{trip.title}</h2>
                    {trip.isShared && <span className="badge badge-success"><Link2 size={11} /> Shared</span>}
                  </div>

                  <div className="trip-meta">
                    <span><MapPin size={13} /> {trip.stops} stops</span>
                    <span className="num"><Navigation size={13} /> {Number(trip.totalDistanceKm).toFixed(2)} km</span>
                    <span>{new Date(trip.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>

                  <div className="trip-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => open(trip.id)}>Open</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => share(trip)} title="Copy public link">
                      <Link2 size={14} /> {trip.isShared ? 'Copy link' : 'Share'}
                    </button>
                    {trip.isShared && (
                      <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => revoke(trip)} title="Turn off sharing" aria-label="Turn off sharing">
                        <Link2Off size={15} />
                      </button>
                    )}
                    <span style={{ flex: 1 }} />
                    <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => startRename(trip)} title="Rename" aria-label="Rename trip">
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-btn trip-delete" style={{ width: 34, height: 34 }} onClick={() => setDeleting(trip)} title="Delete" aria-label="Delete trip">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {renaming && (
        <Modal
          title="Rename trip"
          onClose={() => setRenaming(null)}
          busy={busy}
          actions={(
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setRenaming(null)} disabled={busy}>Cancel</button>
              <button type="submit" form="rename-form" className="btn btn-primary" disabled={busy || !title.trim()}>Save</button>
            </>
          )}
        >
          <form id="rename-form" onSubmit={confirmRename}>
            <label className="field">
              <span className="field-label">Trip name</span>
              <input className="input" autoFocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
            </label>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Delete this trip?"
          description={`"${deleting.title}" will be removed permanently${deleting.isShared ? ', and its share link will stop working' : ''}.`}
          onClose={() => setDeleting(null)}
          busy={busy}
          actions={(
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={busy}>
                {busy && <span className="spinner" />} Delete
              </button>
            </>
          )}
        />
      )}
    </div>
  );
};

export default MyTrips;
