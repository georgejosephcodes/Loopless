import React from 'react';
import { Trash2, Zap } from 'lucide-react';

const BucketList = ({ list, onRemove, onOptimize }) => {
  const count = list.length;
  const isFull = count >= 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Your Bucket List</h3>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: isFull ? '#ef4444' : '#64748b' 
          }}>
            {count}/15
          </span>
        </div>
        
        <div style={{ 
          width: '100%', 
          height: '6px', 
          backgroundColor: '#f1f5f9', 
          borderRadius: '3px', 
          overflow: 'hidden' 
        }}>
          <div style={{ 
            width: `${(count / 15) * 100}%`, 
            height: '100%', 
            backgroundColor: isFull ? '#ef4444' : '#3b82f6', 
            transition: 'width 0.3s ease' 
          }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#94a3b8' }}>
            <p>Your list is empty.</p>
          </div>
        ) : (
          list.map(item => (
            <div key={item.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '10px', 
              marginBottom: '10px',
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#334155', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {item.name}
                </div>
              </div>
              <Trash2 
                size={18} 
                color="#94a3b8" 
                style={{ cursor: 'pointer', marginLeft: '10px', flexShrink: 0 }} 
                onClick={() => onRemove(item.id)} 
              />
            </div>
          ))
        )}
      </div>

      <button 
        onClick={onOptimize} 
        disabled={count < 2} 
        style={{ 
          width: '100%', 
          padding: '16px', 
          borderRadius: '12px', 
          border: 'none', 
          background: count < 2 ? '#e2e8f0' : '#10b981',
          color: 'white', 
          fontWeight: 'bold', 
          cursor: count < 2 ? 'not-allowed' : 'pointer', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px'
        }}
      >
        <Zap size={18} /> Optimize Route
      </button>
    </div>
  );
};

export default BucketList;