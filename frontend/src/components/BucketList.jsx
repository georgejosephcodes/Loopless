import React, { useRef } from 'react';
import { Trash2, Zap, MapPin, GripVertical, Navigation } from 'lucide-react';

const PIN_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

function ListItem({ item, index, dark, onRemove, onDragStart, onDragOver, onDrop, isDragging }) {
  const pinColor = PIN_COLORS[index % PIN_COLORS.length];
  const isFirst = index === 0;

  const t = {
    itemBg: dark ? '#0f172a' : '#f8fafc',
    itemBorder: dark ? '#334155' : '#eef2f7',
    itemText: dark ? '#e2e8f0' : '#1e293b',
    itemSub: dark ? '#475569' : '#94a3b8',
    gripColor: dark ? '#334155' : '#cbd5e1',
    trashColor: dark ? '#475569' : '#cbd5e1',
    trashHover: '#ef4444',
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        backgroundColor: t.itemBg,
        borderRadius: '12px',
        marginBottom: '8px',
        border: `1px solid ${isDragging ? pinColor : t.itemBorder}`,
        opacity: isDragging ? 0.45 : 1,
        transition: 'border-color 0.2s, opacity 0.2s, box-shadow 0.2s',
        cursor: 'grab',
        boxShadow: isDragging
          ? `0 0 0 2px ${pinColor}33`
          : 'none',
      }}
    >
      <GripVertical
        size={14}
        color={t.gripColor}
        style={{ flexShrink: 0, cursor: 'grab' }}
      />

      <div style={{
        width: '24px', height: '24px', flexShrink: 0,
        backgroundColor: pinColor,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: 800, fontSize: '10px',
        boxShadow: `0 2px 6px ${pinColor}55`,
      }}>
        {index + 1}
      </div>

      {/* Name */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontWeight: 600, fontSize: '13px',
          color: t.itemText,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.name}
        </div>
        {isFirst && (
          <div style={{
            fontSize: '10px', fontWeight: 700,
            color: '#10b981', marginTop: '1px',
            letterSpacing: '0.04em',
          }}>
            START POINT
          </div>
        )}
      </div>

      <button
        onClick={() => onRemove(item.id)}
        title="Remove location"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px', borderRadius: '6px', flexShrink: 0,
          color: t.trashColor, display: 'flex', alignItems: 'center',
          transition: 'color 0.15s, background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ef4444';
          e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = t.trashColor;
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

const BucketList = ({ list, onRemove, onOptimize, onReorder, dark, loading }) => {
  const count = list.length;
  const isFull = count >= 15;
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
    if (
      dragIndex.current === null ||
      dragIndex.current === index ||
      !onReorder
    ) return;

    const reordered = [...list];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(index, 0, moved);
    onReorder(reordered);
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  const t = {
    headerColor: dark ? '#f1f5f9' : '#1e293b',
    countColor: isFull ? '#ef4444' : (dark ? '#64748b' : '#94a3b8'),
    progressTrack: dark ? '#1e293b' : '#f1f5f9',
    progressFill: isFull ? '#ef4444' : '#3b82f6',
    divider: dark ? '#1e293b' : '#f1f5f9',
    emptyIconBg: dark ? '#1e293b' : '#f1f5f9',
    emptyIconColor: dark ? '#334155' : '#cbd5e1',
    emptyTextColor: dark ? '#475569' : '#94a3b8',
    hintColor: dark ? '#334155' : '#e2e8f0',
    hintText: dark ? '#475569' : '#94a3b8',
    btnDisabledBg: dark ? '#1e293b' : '#f1f5f9',
    btnDisabledColor: dark ? '#334155' : '#cbd5e1',
    btnActiveBg: 'linear-gradient(135deg, #10b981, #059669)',
    btnActiveShadow: '0 4px 14px rgba(16,185,129,0.35)',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', padding: '20px',
    }}>

      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '10px',
        }}>
          <h3 style={{
            margin: 0, fontSize: '16px', fontWeight: 800,
            color: t.headerColor, letterSpacing: '-0.02em',
          }}>
            Route Stops
          </h3>
          <span style={{
            fontSize: '12px', fontWeight: 700,
            color: t.countColor,
            backgroundColor: isFull
              ? 'rgba(239,68,68,0.1)'
              : (dark ? '#1e293b' : '#f1f5f9'),
            padding: '3px 9px', borderRadius: '20px',
            transition: 'color 0.3s',
          }}>
            {count} / 15
          </span>
        </div>

        <div style={{
          width: '100%', height: '4px',
          backgroundColor: t.progressTrack,
          borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${(count / 15) * 100}%`,
            height: '100%',
            backgroundColor: t.progressFill,
            borderRadius: '2px',
            transition: 'width 0.35s ease, background-color 0.3s',
          }} />
        </div>

        {count > 0 && (
          <p style={{
            margin: '10px 0 0', fontSize: '11px',
            fontWeight: 600, color: '#10b981',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <span style={{
              display: 'inline-block', width: '8px', height: '8px',
              borderRadius: '50%', backgroundColor: '#10b981',
              flexShrink: 0,
            }} />
            Stop #1 is the start &amp; return point
          </p>
        )}
      </div>

      <div style={{
        height: '1px', backgroundColor: t.divider,
        marginBottom: '14px', flexShrink: 0,
      }} />

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '14px' }}>
        {count === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', textAlign: 'center', padding: '20px',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              backgroundColor: t.emptyIconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px',
            }}>
              <Navigation size={24} color={t.emptyIconColor} />
            </div>
            <p style={{
              margin: '0 0 6px', fontSize: '14px',
              fontWeight: 700, color: t.emptyTextColor,
            }}>
              No stops yet
            </p>
            <p style={{
              margin: 0, fontSize: '12px',
              color: t.emptyTextColor, opacity: 0.7, lineHeight: 1.5,
            }}>
              Search for places using the bar above and add at least 2 to optimize a route.
            </p>
          </div>
        ) : (
          <>
            {list.map((item, index) => (
              <ListItem
                key={item.id}
                item={item}
                index={index}
                dark={dark}
                onRemove={onRemove}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={dragIndex.current === index}
              />
            ))}

            {/* Drag hint — only show when 2+ items */}
            {count >= 2 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 10px', marginTop: '2px',
                borderRadius: '8px',
                backgroundColor: dark ? 'transparent' : 'transparent',
              }}>
                <GripVertical size={12} color={t.hintColor} />
                <span style={{ fontSize: '11px', color: t.hintText }}>
                  Drag to reorder stops
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={onOptimize}
        disabled={!canOptimize}
        style={{
          width: '100%', padding: '15px',
          borderRadius: '14px', border: 'none',
          background: canOptimize ? t.btnActiveBg : t.btnDisabledBg,
          color: canOptimize ? 'white' : t.btnDisabledColor,
          fontWeight: 800, fontSize: '14px',
          cursor: canOptimize ? 'pointer' : 'not-allowed',
          display: 'flex', justifyContent: 'center',
          alignItems: 'center', gap: '8px',
          boxShadow: canOptimize ? t.btnActiveShadow : 'none',
          transition: 'background 0.3s, box-shadow 0.3s, transform 0.15s',
          flexShrink: 0,
          letterSpacing: '-0.01em',
        }}
        onMouseEnter={(e) => {
          if (canOptimize) e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onMouseDown={(e) => {
          if (canOptimize) e.currentTarget.style.transform = 'translateY(1px)';
        }}
        onMouseUp={(e) => {
          if (canOptimize) e.currentTarget.style.transform = 'translateY(-1px)';
        }}
      >
        <Zap size={16} strokeWidth={2.5} />
        {loading ? 'Optimizing…' : 'Optimize Route'}
      </button>

      {/* Min-stops hint below button */}
      {count < 2 && count > 0 && (
        <p style={{
          margin: '8px 0 0', fontSize: '11px',
          color: t.hintText, textAlign: 'center',
        }}>
          Add {2 - count} more stop{2 - count > 1 ? 's' : ''} to enable
        </p>
      )}
      {count === 0 && (
        <p style={{
          margin: '8px 0 0', fontSize: '11px',
          color: t.hintText, textAlign: 'center',
        }}>
          Add at least 2 stops to optimize
        </p>
      )}
    </div>
  );
};

export default BucketList;