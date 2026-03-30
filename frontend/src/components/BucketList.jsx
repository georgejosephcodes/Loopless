import React from 'react';
import { Trash2, Zap } from 'lucide-react';

const BucketList = ({ list, onRemove, onOptimize, dark }) => {
  const count = list.length;
  const isFull = count >= 15;

  const t = {
    titleColor: dark ? '#f1f5f9' : '#1e293b',
    countColor: isFull ? '#ef4444' : (dark ? '#94a3b8' : '#64748b'),
    progressBg: dark ? '#334155' : '#f1f5f9',
    emptyColor: dark ? '#475569' : '#94a3b8',
    itemBg: dark ? '#0f172a' : '#f8fafc',
    itemBorder: dark ? '#334155' : '#f1f5f9',
    itemText: dark ? '#e2e8f0' : '#334155',
    trashColor: dark ? '#475569' : '#94a3b8',
    btnDisabledBg: dark ? '#1e293b' : '#e2e8f0',
    btnDisabledColor: dark ? '#475569' : '#94a3b8',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '13px', margin: '0 0 12px 0' }}>
          First item is the Start Point
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: t.titleColor }}>Your Bucket List</h3>
          <span style={{ fontSize: '14px', fontWeight: '600', color: t.countColor }}>{count}/15</span>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: t.progressBg, borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${(count / 15) * 100}%`, height: '100%', backgroundColor: isFull ? '#ef4444' : '#3b82f6', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px', color: t.emptyColor }}>
            <p>Your list is empty.</p>
          </div>
        ) : (
          list.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: t.itemBg, borderRadius: '10px', marginBottom: '10px', border: `1px solid ${t.itemBorder}`, transition: 'background-color 0.3s' }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: t.itemText, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {item.name}
                </div>
              </div>
              <Trash2 size={18} color={t.trashColor} style={{ cursor: 'pointer', marginLeft: '10px', flexShrink: 0 }} onClick={() => onRemove(item.id)} />
            </div>
          ))
        )}
      </div>

      <button onClick={onOptimize} disabled={count < 2} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: count < 2 ? t.btnDisabledBg : '#10b981', color: count < 2 ? t.btnDisabledColor : 'white', fontWeight: 'bold', cursor: count < 2 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', transition: 'background-color 0.3s' }}>
        <Zap size={18} /> Optimize Route
      </button>
    </div>
  );
};

export default BucketList;