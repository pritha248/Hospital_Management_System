import React from 'react';
import { Server, ShieldCheck, CheckCircle2, Cpu } from 'lucide-react';

const LocalLlmControlBar = () => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.4)',
      borderRadius: '14px',
      padding: '0.85rem 1.25rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{
          padding: '0.55rem',
          borderRadius: '12px',
          background: 'rgba(139, 92, 246, 0.2)',
          color: '#c084fc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Server size={22} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>
              Backend AI Server Engine
            </span>
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem' }}>
              <ShieldCheck size={13} /> BACKEND PROCESSED
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            All clinical inference, differential diagnosis, and drug interaction analysis run securely on the Backend Node.js AI Server.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        <CheckCircle2 size={16} /> Server Active
      </div>
    </div>
  );
};

export default LocalLlmControlBar;
