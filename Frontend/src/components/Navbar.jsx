import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, User, Sparkles, Bell, Camera, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config/api';

const Navbar = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  const isManager = user && (user.role === 'admin' || user.role === 'manager');

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('avatar', file);

    try {
      setUploading(true);
      const res = await axios.post(`${API_URL}/api/auth/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        updateUser({ avatar: res.data.data.avatar });
        setAvatarVersion(Date.now());
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      alert('Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <header style={{
        height: '70px',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Brand */}
        <div 
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Activity size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Automated Healthcare System
            </h2>
            <span style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: 600, letterSpacing: '0.5px' }}>
              INTELLIGENT HOSPITAL PLATFORM
            </span>
          </div>
        </div>

        {/* User Actions */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Hidden File Input for Avatar */}
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Hide AI Clinical Hub for Hospital Manager */}
            {!isManager && (
              <button 
                onClick={() => navigate('/ai-hub')}
                className="btn btn-ai"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
              >
                <Sparkles size={16} /> AI Clinical Hub
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)' }}>
              {/* Interactive Avatar Container with Bottom-Right Camera Badge */}
              <div 
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => setShowModal(true)}
                title="Click to view zoomed PFP"
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: user.avatar ? 'none' : 'rgba(59, 130, 246, 0.2)',
                  border: '2px solid rgba(59, 130, 246, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  fontWeight: 700,
                  overflow: 'hidden',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)'
                }}>
                  {uploading ? (
                    <Loader2 className="animate-spin" size={18} color="#60a5fa" />
                  ) : user.avatar ? (
                    <img 
                      src={`${API_URL}${user.avatar}?v=${avatarVersion}`} 
                      alt={user.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{user.name?.charAt(0)}</span>
                  )}
                </div>

                {/* Bottom-Right Camera Badge */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileInput();
                  }}
                  title="Upload / Change Photo"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    border: '2px solid #111827',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Camera size={10} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{user.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#a7f3d0', textTransform: 'capitalize', fontWeight: 600 }}>
                  {isManager ? 'Manager' : user.role}
                </div>
              </div>
            </div>

            <button 
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
                padding: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => navigate('/login')} className="btn btn-secondary">Sign In</button>
            <button onClick={() => navigate('/register')} className="btn btn-primary">Get Started</button>
          </div>
        )}
      </header>

      {/* Zoomed-in PFP Modal */}
      {showModal && user && (
        <div 
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid var(--glass-border)',
              borderRadius: '24px',
              padding: '2rem 2.5rem',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>
              Profile Picture
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {user.name} ({isManager ? 'Manager' : user.role})
            </p>

            {/* Large Zoomed Avatar Preview */}
            <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 1.75rem auto' }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: user.avatar ? 'none' : 'rgba(59, 130, 246, 0.2)',
                border: '3px solid #3b82f6',
                boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                color: '#60a5fa',
                fontSize: '4rem',
                fontWeight: 800
              }}>
                {uploading ? (
                  <Loader2 className="animate-spin" size={48} color="#60a5fa" />
                ) : user.avatar ? (
                  <img 
                    src={`${API_URL}${user.avatar}?v=${avatarVersion}`} 
                    alt={user.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>{user.name?.charAt(0)}</span>
                )}
              </div>

              {/* Camera Badge inside Zoomed Modal */}
              <button 
                onClick={triggerFileInput}
                title="Change Photo"
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: '3px solid #111827',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Camera size={20} />
              </button>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={triggerFileInput}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
              >
                <Camera size={16} /> {user.avatar ? 'Change Photo' : 'Upload Photo'}
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.2rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
