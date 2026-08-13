import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import { useAuth } from '../context/AuthContext';
import { Bot, Send, X, Sparkles, User, RefreshCw, Server, ShieldCheck } from 'lucide-react';

const AiChatbotDrawer = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your Backend AI Medical Assistant. Ask me anything about symptoms, drug interactions, disease definitions, or hospital procedures.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Hide AI chatbot for Hospital Manager role
  if (!user || user.role === 'admin' || user.role === 'manager') return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/ai/medical-chatbot`, { query: userMsg });
      if (res.data && res.data.success) {
        setMessages(prev => [...prev, { sender: 'ai', text: res.data.data.response }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: 'Backend AI server could not complete the request.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I ran into an issue contacting the Backend AI Server.' }]);
    } finally {
      setLoading(false);
    }
  };

  const parseMarkdownText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'white', fontWeight: 700 }}>{part.substring(2, part.length - 2)}</strong>;
      }
      return part;
    });
  };

  const renderFormattedMessage = (text) => {
    if (!text) return null;
    const lines = text.split('\n').filter(line => line.trim() !== '');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {lines.map((line, idx) => {
          if (line.match(/^[\*\-•]\s/)) {
            const listContent = line.replace(/^[\*\-•]\s/, '');
            return (
              <div key={idx} style={{ margin: '0.2rem 0', paddingLeft: '0.8rem', position: 'relative', fontSize: '0.9rem' }}>
                <span style={{ position: 'absolute', left: 0, color: '#c084fc' }}>•</span>
                {parseMarkdownText(listContent)}
              </div>
            );
          }
          return (
            <div key={idx} style={{ fontWeight: 400, fontSize: '0.9rem', lineHeight: '1.4' }}>
              {parseMarkdownText(line)}
            </div>
          );
        })}

        <div style={{
          fontSize: '0.68rem',
          color: '#c084fc',
          marginTop: '0.4rem',
          paddingTop: '0.3rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontWeight: 600
        }}>
          <ShieldCheck size={12} /> Processed via Backend AI Engine
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Toggle Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--gradient-ai)',
          border: 'none',
          color: 'white',
          boxShadow: 'var(--shadow-ai-glow)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          transition: 'transform 0.2s ease'
        }}
        className="hover:scale-110"
      >
        <Sparkles size={24} />
      </button>

      {/* Floating Drawer / Chatbox */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '24px',
          width: '400px',
          height: '560px',
          background: '#111827',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.7), var(--shadow-ai-glow)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 99,
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          {/* Header */}
          <div style={{
            background: 'var(--gradient-ai)',
            padding: '0.85rem 1.15rem',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
              <div style={{
                padding: '0.4rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bot size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  AI Health Assistant
                </h4>
                <div style={{ fontSize: '0.7rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ⚙️ Backend Server AI
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                background: m.sender === 'user' ? 'var(--gradient-primary)' : 'rgba(31, 41, 55, 0.85)',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                fontSize: '0.85rem',
                border: m.sender === 'ai' ? '1px solid var(--glass-border)' : 'none',
                lineHeight: 1.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                {m.sender === 'ai' ? renderFormattedMessage(m.text) : m.text}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontSize: '0.8rem', padding: '0.5rem' }}>
                <RefreshCw size={14} className="animate-spin" /> Consulting Backend AI Server...
              </div>
            )}
          </div>

          {/* Quick Prompt Pills */}
          <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem', overflowX: 'auto', borderTop: '1px solid var(--glass-border)' }}>
            {['What is hypertension?', 'Drug interaction risks', 'Pneumonia symptoms'].map((topic, i) => (
              <button 
                key={i}
                onClick={() => setInput(topic)}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.7rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '99px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c084fc',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  cursor: 'pointer'
                }}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} style={{ padding: '0.75rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '0.5rem', background: '#0b0f19' }}>
            <input
              type="text"
              placeholder="Ask Backend AI medical question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="form-control"
              style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn btn-ai" style={{ padding: '0.55rem 0.85rem' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiChatbotDrawer;
