import React from 'react';
import { Calendar, Check } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DaySelector = ({ selectedDays = '', onChange }) => {
  const currentList = selectedDays 
    ? selectedDays.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  const toggleDay = (day) => {
    let newList;
    if (currentList.includes(day)) {
      newList = currentList.filter(d => d !== day);
    } else {
      // Maintain natural weekday order
      newList = DAYS.filter(d => currentList.includes(d) || d === day);
    }
    onChange(newList.join(','));
  };

  const setPreset = (presetDays) => {
    onChange(presetDays.join(','));
  };

  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.6)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      padding: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={15} style={{ color: '#38bdf8' }} /> Select Working Days
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => setPreset(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.72rem',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Weekdays
          </button>
          <button
            type="button"
            onClick={() => setPreset(['Sat', 'Sun'])}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.72rem',
              borderRadius: '6px',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              background: 'rgba(192, 132, 252, 0.1)',
              color: '#c084fc',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Weekends
          </button>
          <button
            type="button"
            onClick={() => setPreset(DAYS)}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.72rem',
              borderRadius: '6px',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              background: 'rgba(52, 211, 153, 0.1)',
              color: '#34d399',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            All Days
          </button>
        </div>
      </div>

      {/* Days Pill Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
        {DAYS.map(day => {
          const isSelected = currentList.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              style={{
                padding: '0.6rem 0.2rem',
                borderRadius: '8px',
                border: isSelected ? '1px solid #60a5fa' : '1px solid var(--glass-border)',
                background: isSelected 
                  ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' 
                  : 'rgba(31, 41, 55, 0.5)',
                color: isSelected ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem',
                boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none'
              }}
            >
              <span>{day}</span>
              {isSelected && <Check size={12} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      
      {currentList.length === 0 && (
        <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.5rem', textAlign: 'center' }}>
          ⚠️ Please select at least one available day.
        </div>
      )}
    </div>
  );
};

export default DaySelector;
