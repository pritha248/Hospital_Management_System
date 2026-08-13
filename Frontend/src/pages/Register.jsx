import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, User, Mail, Lock, Stethoscope, HeartPulse, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import DaySelector from '../components/DaySelector';

const Register = () => {
  const [role, setRole] = useState('patient');

  // Common Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Patient Fields
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [history, setHistory] = useState('');

  // Doctor Fields
  const [specialization, setSpecialization] = useState('General Medicine');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [availableDays, setAvailableDays] = useState('Mon,Tue,Wed,Thu,Fri');
  const [bio, setBio] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let payload = { name, email, password, role, phone };
    if (role === 'patient') {
      payload = {
        ...payload,
        age: parseInt(age, 10) || 30,
        gender,
        blood_group: bloodGroup,
        height,
        weight,
        allergies,
        emergency_contact: emergencyContact,
        history
      };
    } else if (role === 'doctor') {
      payload = {
        ...payload,
        specialization,
        qualification,
        experience_years: parseInt(experienceYears, 10) || 5,
        consultation_fee: parseFloat(consultationFee) || 100.00,
        available_days: availableDays,
        bio
      };
    }

    const res = await register(payload);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 30%, rgba(13, 148, 136, 0.15) 0%, transparent 60%), #0b0f19',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '640px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--gradient-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: 'var(--shadow-glow)',
            marginBottom: '1rem'
          }}>
            <Activity size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Create EMR Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Fill in your complete profile details to get started
          </p>
        </div>

        <div className="glass-card">
          {error && (
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Select Account Role</label>
              <select 
                value={role} 
                onChange={e => setRole(e.target.value)}
                className="form-control"
                style={{ fontWeight: 700, color: '#38bdf8' }}
              >
                <option value="patient">Patient Account (Medical History & Profile)</option>
                <option value="doctor">Medical Doctor (Specialization & Consultation Rate)</option>
                <option value="admin">Hospital Manager / Admin (System & Operational Management)</option>
              </select>
            </div>

            {/* Basic Info */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem' }}>
              Account Credentials
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. John Doe / Jane Smith"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="user@hospital.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>

            {/* PATIENT SPECIFIC INPUTS */}
            {role === 'patient' && (
              <>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginTop: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HeartPulse size={18} style={{ color: '#34d399' }} /> Patient Health Metrics
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Age *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 45"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Gender *</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="form-control">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Blood Group *</label>
                    <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="form-control">
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Height (cm / ft)</label>
                    <input
                      type="text"
                      placeholder="e.g. 175 cm"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Weight (kg / lbs)</label>
                    <input
                      type="text"
                      placeholder="e.g. 70 kg"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Allergies & Reactions</label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Latex, Peanuts (or None)"
                    value={allergies}
                    onChange={e => setAllergies(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Emergency Contact Person & Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse / Parent Name (+1 555 999 0000)"
                    value={emergencyContact}
                    onChange={e => setEmergencyContact(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Chronic Diseases / Medical History</label>
                  <textarea
                    rows="3"
                    placeholder="Describe any chronic conditions, prior surgeries, or medical history..."
                    value={history}
                    onChange={e => setHistory(e.target.value)}
                    className="form-control"
                  ></textarea>
                </div>
              </>
            )}

            {/* DOCTOR SPECIFIC INPUTS */}
            {role === 'doctor' && (
              <>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginTop: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Stethoscope size={18} style={{ color: '#c084fc' }} /> Practice Details & Consultation Fee
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Specialization *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cardiology / Pediatrics / General Medicine"
                      value={specialization}
                      onChange={e => setSpecialization(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Qualifications & Degrees</label>
                    <input
                      type="text"
                      placeholder="e.g. MD, FACC, MBBS"
                      value={qualification}
                      onChange={e => setQualification(e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Years of Clinical Experience</label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      value={experienceYears}
                      onChange={e => setExperienceYears(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Consultation Fee / Rate ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 150.00"
                      value={consultationFee}
                      onChange={e => setConsultationFee(e.target.value)}
                      className="form-control"
                      style={{ fontWeight: 700, color: '#34d399' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <DaySelector selectedDays={availableDays} onChange={setAvailableDays} />
                </div>

                <div className="form-group">
                  <label>Doctor Bio / Clinical Focus</label>
                  <textarea
                    rows="3"
                    placeholder="Brief description of clinical expertise and patient care focus..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="form-control"
                  ></textarea>
                </div>
              </>
            )}

            {/* ADMIN / MANAGER SPECIFIC INFORMATIONAL BANNER */}
            {role === 'admin' && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={18} /> Hospital Manager & Operational Oversight
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Registering as a Hospital Manager grants you executive access to system analytics, financial billing oversight, insurance claims processing, and administrative platform controls.
                </p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}>
              {loading ? 'Submitting Registration...' : 'Complete & Launch EMR'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already registered? <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
