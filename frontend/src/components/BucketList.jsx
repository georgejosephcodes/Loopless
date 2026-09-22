import React, { useRef } from 'react';
import { Trash2, Zap, GripVertical, Navigation, X } from 'lucide-react';
import { pinFor } from '../constants/pins';

const MAX_STOPS = 15;

function ListItem({ item, index, count, onRemove, onDragStart, onDragOver, onDrop, isDragging, mode }) {
  const pin = pinFor(index);
  const roleLabel = mode === 'oneway'
    ? (index === 0 ? 'Start point' : index === count - 1 ? 'End point' : null)
    : (index === 0 ? 'Start & return point' : null);

  return (
    <li
      className={`bucket-item${isDragging ? ' is-dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      style={{ '--pin': pin.bg }}
    >
      <GripVertical size={15} className="bucket-grip" aria-hidden="true" />
      <span className="bucket-pin" style={{ background: pin.bg, color: pin.fg }}>{index + 1}</span>
      <div className="bucket-name">
        <span className="truncate">{item.name}</span>
        {roleLabel && <small>{roleLabel}</small>}
      </div>
      <button type="button" className="icon-btn bucket-remove" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`} title="Remove">
        <X size={15} />
      </button>
    </li>
  );
}

const BucketList = ({
  list, onRemove, onClearAll, onOptimize, onReorder, loading,
  mode = 'roundtrip', setMode,
}) => {
  const count = list.length;
  const isFull = count >= MAX_STOPS;
  const canOptimize = count >= 2 && !loading;

  const dragIndex = useRef(null);
  const dragOverIndex = useRef(null);

  const handleDragStart = (e, index) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index || !onReorder) return;

    const reordered = [...list];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(index, 0, moved);
    onReorder(reordered);
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  return (
    <div className="bucket">
      <div className="bucket-head">
        <div className="bucket-head-row">
          <h2>Your trip</h2>
          <div className="bucket-head-actions">
            {count > 0 && (
              <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} onClick={onClearAll} title="Clear all stops" aria-label="Clear all stops">
                <Trash2 size={16} />
              </button>
            )}
            <span className={`badge num ${isFull ? '' : 'badge-accent'}`} style={isFull ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : undefined}>
              {count} / {MAX_STOPS}
            </span>
          </div>
        </div>
        <div className="bucket-progress" role="progressbar" aria-valuemin={0} aria-valuemax={MAX_STOPS} aria-valuenow={count}>
          <div style={{ width: `${(count / MAX_STOPS) * 100}%`, background: isFull ? 'var(--danger)' : 'var(--accent)' }} />
        </div>
      </div>

      {count >= 2 && setMode && (
        <div className="bucket-mode" style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="option-list" style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`chip${mode === 'roundtrip' ? ' is-active' : ''}`}
              onClick={() => setMode('roundtrip')}
            >
              Round trip
            </button>
            <button
              type="button"
              className={`chip${mode === 'oneway' ? ' is-active' : ''}`}
              onClick={() => setMode('oneway')}
            >
              One-way
            </button>
          </div>
        </div>
      )}

      <div className="bucket-scroll">
        {count === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Navigation size={24} /></div>
            <h3>No stops yet</h3>
            <p>Search for a place or let AI suggest a plan. Add at least 2 stops to optimize.</p>
          </div>
        ) : (
          <ul className="bucket-list">
            {list.map((item, index) => (
              <ListItem
                key={item.id}
                item={item}
                index={index}
                count={count}
                onRemove={onRemove}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={dragIndex.current === index}
                mode={mode}
              />
            ))}
          </ul>
        )}
        {count >= 2 && (
          <p className="bucket-hint">
            <GripVertical size={12} />
            {mode === 'oneway'
              ? ' Drag to reorder. The first stop is the start, the last is the end.'
              : ' Drag to reorder. The first stop is where the loop starts and ends.'}
          </p>
        )}
      </div>

      <div className="bucket-foot">
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onOptimize} disabled={!canOptimize}>
          {loading ? <span className="spinner" /> : <Zap size={18} />}
          {loading ? 'Optimizing…' : 'Optimize route'}
        </button>
        {count < 2 && <p className="bucket-foot-hint">Add {2 - count} more {2 - count === 1 ? 'stop' : 'stops'} to optimize</p>}
      </div>
    </div>
  );
};

export default BucketList;
