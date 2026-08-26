import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_URL from '../config/api';
import { 
  Users, UserCheck, Calendar, FileText, Activity, Sparkles, 
  Clock, Plus, ShieldAlert, HeartPulse, Stethoscope, ArrowRight, CheckCircle2, Edit3, DollarSign, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DaySelector from '../components/DaySelector';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [patientData, setPatientData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [managerStats, setManagerStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile Modals
  const [showPatientEdit, setShowPatientEdit] = useState(false);
  const [showDoctorEdit, setShowDoctorEdit] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Admin Rate Edit Modal State
  const [showAdminRateModal, setShowAdminRateModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [adminFeeInput, setAdminFeeInput] = useState('');

  // Patient Edit Form State
  const [pAge, setPAge] = useState('');
  const [pGender, setPGender] = useState('Male');
  const [pBlood, setPBlood] = useState('O+');
  const [pHeight, setPHeight] = useState('');
  const [pWeight, setPWeight] = useState('');
  const [pAllergies, setPAllergies] = useState('');
  const [pEmergency, setPEmergency] = useState('');
  const [pHistory, setPHistory] = useState('');

  // Doctor Edit Form State
  const [dSpec, setDSpec] = useState('');
  const [dQual, setDQual] = useState('');
  const [dExp, setDExp] = useState('');
  const [dFee, setDFee] = useState('');
  const [dDays, setDDays] = useState('');
  const [dBio, setDBio] = useState('');

  const isManager = user && (user.role === 'admin' || user.role === 'manager');

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (user.role === 'patient') {
        const res = await axios.get(`${API_URL}/api/patients/${user.id}`);
        if (res.data.success) {
          const p = res.data.data;
          setPatientData(p);
          setPAge(p.age || '');
          setPGender(p.gender || 'Male');
          setPBlood(p.blood_group || 'O+');
          setPHeight(p.height || '');
          setPWeight(p.weight || '');
          setPAllergies(p.allergies || '');
          setPEmergency(p.emergency_contact || '');
          setPHistory(p.history || '');
        }
      } else if (user.role === 'doctor') {
        const res = await axios.get(`${API_URL}/api/doctors/${user.id}`);
        if (res.data.success) {
          const d = res.data.data;
          setDoctorData(d);
          setDSpec(d.specialization || '');
          setDQual(d.qualification || '');
          setDExp(d.experience_years || '');
          setDFee(d.consultation_fee || '');
          setDDays(d.available_days || '');
          setDBio(d.bio || '');
        }
      } else if (isManager) {
        const [pRes, dRes, aRes, bRes] = await Promise.all([
          axios.get(`${API_URL}/api/patients`),
          axios.get(`${API_URL}/api/doctors`),
          axios.get(`${API_URL}/api/appointments`),
          axios.get(`${API_URL}/api/billing/all`)
        ]);
        const activeApts = aRes.data.data ? aRes.data.data.filter(a => a.status !== 'cancelled') : [];
        setManagerStats({
          totalPatients: pRes.data.data.length,
          totalDoctors: dRes.data.data.length,
          totalAppointments: activeApts.length,
          doctorsList: dRes.data.data,
          patientsList: pRes.data.data
        });
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePatientProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await axios.put(`${API_URL}/api/patients/${patientData.id}`, {
        age: parseInt(pAge, 10),
        gender: pGender,
        blood_group: pBlood,
        height: pHeight,
        weight: pWeight,
        allergies: pAllergies,
        emergency_contact: pEmergency,
        history: pHistory
      });
      setShowPatientEdit(false);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update patient profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateDoctorProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await axios.put(`${API_URL}/api/doctors/${doctorData.id}`, {
        specialization: dSpec,
        qualification: dQual,
        experience_years: parseInt(dExp, 10),
        available_days: dDays,
        bio: dBio
      });
      setShowDoctorEdit(false);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update doctor practice details.");
    } finally {
      setSavingProfile(false);
    }
  };

  const openAdminRateModal = (doc) => {
    setEditingDoc(doc);
    setAdminFeeInput(doc.consultation_fee || '');
    setShowAdminRateModal(true);
  };

  const handleSaveAdminDoctorRate = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;
    try {
      await axios.put(`${API_URL}/api/doctors/${editingDoc.id}`, {
        consultation_fee: parseFloat(adminFeeInput)
      });
      setShowAdminRateModal(false);
      setEditingDoc(null);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update doctor consultation rate.");
    }
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  };

  const handleAdminDeletePatient = async (patientId, patientName) => {
    const confirmMsg = `WARNING: Are you sure you want to delete patient "${patientName}" (ID: PAT-${patientId})?\n\nThis will PERMANENTLY PURGE their profile, appointments, prescriptions, billing records, and medical files from the hospital EMR system.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.delete(`${API_URL}/api/patients/${patientId}`);
      if (res.data.success) {
        alert(`Patient "${patientName}" and all associated health records have been permanently deleted.`);
        fetchDashboardData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to delete patient account.";
      alert(msg);
    }
  };

  const handleDeleteDoctorAccount = async () => {
    if (!doctorData) return;
    const confirmMsg = "WARNING: Are you sure you want to delete your doctor profile and user account?\n\nThis will PERMANENTLY ERASE your doctor profile, appointments, and prescriptions from the hospital database.";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.delete(`${API_URL}/api/doctors/${doctorData.id}`);
      if (res.data.success) {
        alert("Your doctor account has been permanently deleted.");
        logout();
        navigate('/login');
      }
    } catch (err) {
      alert("Failed to delete doctor account: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
          <Activity size={24} className="animate-spin" /> Loading EMR Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div className="glass-card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="badge badge-info">{isManager ? 'MANAGER PORTAL' : `${user.role.toUpperCase()} PORTAL`}</span>
              {!isManager && <span className="badge badge-purple"><Sparkles size={12} /> AI ENABLED</span>}
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Welcome back, {user.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              {user.role === 'patient' && 'Track your health metrics, medical history, and edit your personal health record.'}
              {user.role === 'doctor' && 'Manage your schedule, set your consultation rate ($), write e-prescriptions, and review patient queues.'}
              {isManager && 'Monitor hospital operations, doctor consultation fees, and process insurance approvals.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {user.role === 'patient' && (
              <button
                onClick={() => setShowPatientEdit(true)}
                className="btn btn-secondary"
              >
                <Edit3 size={16} /> Edit Health Record
              </button>
            )}
            {user.role === 'doctor' && (
              <>
                <button onClick={() => setShowDoctorEdit(true)} className="btn btn-secondary">
                  <Edit3 size={16} /> Edit Practice Details
                </button>
                <button 
                  onClick={handleDeleteDoctorAccount} 
                  className="btn btn-danger" 
                  style={{ 
                    padding: '0.55rem 1.1rem', 
                    fontSize: '0.88rem', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.45rem', 
                    background: '#dc2626', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '10px', 
                    cursor: 'pointer', 
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.45)' 
                  }}
                  title="Permanently erase doctor profile and user account from database"
                >
                  <Trash2 size={16} /> Delete Account
                </button>
              </>
            )}
            {/* Hide AI Hub button for Manager */}
            {!isManager && (
              <button onClick={() => navigate('/ai-hub')} className="btn btn-ai">
                <Sparkles size={18} /> Launch AI Hub
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PATIENT VIEW */}
      {user.role === 'patient' && patientData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Quick Metrics */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <HeartPulse size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Blood Group & Demographics</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>{patientData.blood_group} | {patientData.gender} ({patientData.age} yrs)</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>Height/Weight:</strong> {patientData.height || 'N/A'} / {patientData.weight || 'N/A'}<br/>
              <strong>Allergies:</strong> <span style={{ color: '#f87171' }}>{patientData.allergies || 'None'}</span><br/>
              <strong>Emergency:</strong> {patientData.emergency_contact || 'None'}
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <Calendar size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upcoming Scheduled Appointments</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                  {patientData.appointments?.filter(a => a.status === 'pending' || a.status === 'confirmed').length || 0} Scheduled
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/appointments')} className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem' }}>
              Book New Appointment <ArrowRight size={14} />
            </button>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                <FileText size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Prescriptions</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>{patientData.prescriptions?.length || 0} Active</div>
              </div>
            </div>
            <button onClick={() => navigate('/prescriptions')} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }}>
              View Prescriptions <ArrowRight size={14} />
            </button>
          </div>

          {/* Medical History Section */}
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Activity size={20} style={{ color: '#38bdf8' }} /> Patient Medical History & Chronic Conditions
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', background: 'rgba(31, 41, 55, 0.5)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              {patientData.history || 'No prior chronic conditions recorded.'}
            </p>
          </div>
        </div>
      )}

      {/* DOCTOR VIEW */}
      {user.role === 'doctor' && doctorData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <Stethoscope size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Specialization & Qualification</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{doctorData.specialization} ({doctorData.qualification})</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your Consultation Rate</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>${doctorData.consultation_fee} / session</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Working / Available Days</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{doctorData.available_days || 'Mon,Tue,Wed,Thu,Fri'}</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                <Calendar size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Today's Active Patient Queue</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                  {doctorData.appointments?.filter(a => isToday(a.appointment_date) && (a.status === 'pending' || a.status === 'confirmed')).length || 0} Appointments
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Queue Table for Today */}
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Today's Consultation Queue</h3>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Age / Gender</th>
                    <th>Date & Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorData.appointments?.filter(a => isToday(a.appointment_date)).map(apt => (
                    <tr key={apt.id}>
                      <td><strong style={{ color: 'white' }}>{apt.patient_name}</strong></td>
                      <td>{apt.age} yrs / {apt.gender}</td>
                      <td>{new Date(apt.appointment_date).toLocaleDateString()} ({apt.appointment_time})</td>
                      <td>{apt.reason}</td>
                      <td>
                        <span className={`badge ${apt.status === 'confirmed' ? 'badge-success' : apt.status === 'completed' ? 'badge-info' : apt.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                          {apt.status} {apt.notes ? `(${apt.notes})` : ''}
                        </span>
                      </td>
                      <td>
                        {(
                          apt.status === 'confirmed' || 
                          apt.status === 'Admitted to Hospital' || 
                          apt.status === 'admitted to hospital' || 
                          apt.status === 'Pending Admin Approval for Admission' || 
                          apt.status === 'Pending Admin Approval for Readmission' || 
                          apt.status === 'Pending Readmission Approval' || 
                          apt.status === "pending for admin's admission approval"
                        ) && (
                          <button 
                            onClick={() => navigate('/prescriptions', {
                              state: {
                                appointmentId: apt.id,
                                patientId: apt.patient_id,
                                patientName: apt.patient_name,
                                reason: apt.reason
                              }
                            })} 
                            className="btn btn-ai" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Write Prescription
                          </button>
                        )}
                        {apt.status === 'Rejected Admission Request' && (apt.admission_rejection_count || 0) < 2 && (
                          <button 
                            onClick={async () => {
                              try {
                                const res = await axios.post(`${API_URL}/api/appointments/${apt.id}/resubmit-admission`);
                                if (res.data.success) {
                                  alert("Later Admission Request resubmitted successfully to Admin.");
                                  fetchDashboardData();
                                }
                              } catch (err) {
                                alert(err.response?.data?.message || err.message || "Failed to resubmit admission request.");
                              }
                            }} 
                            className="btn btn-warning" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginTop: '0.2rem' }}
                          >
                            Resubmit Admission Request
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!doctorData.appointments || doctorData.appointments.filter(a => isToday(a.appointment_date)).length === 0) && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No consultations scheduled for today</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER / ADMIN VIEW */}
      {isManager && managerStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered Patients</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{managerStats.totalPatients}</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <UserCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Medical Staff</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{managerStats.totalDoctors}</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                <Calendar size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Appointments</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{managerStats.totalAppointments}</div>
              </div>
            </div>
          </div>

          {/* Hospital Doctors List */}
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>Hospital Staff Directory & Consultation Rates</h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Specialization</th>
                    <th>Experience</th>
                    <th>Working Days</th>
                    <th>Consultation Rate ($)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managerStats.doctorsList.map(doc => (
                    <tr key={doc.id}>
                      <td><strong style={{ color: 'white' }}>{doc.name}</strong></td>
                      <td><span className="badge badge-info">{doc.specialization}</span></td>
                      <td>{doc.experience_years} Years</td>
                      <td><span className="badge badge-purple">{doc.available_days || 'Mon,Tue,Wed,Thu,Fri'}</span></td>
                      <td><strong style={{ color: '#34d399' }}>${doc.consultation_fee}</strong></td>
                      <td>
                        <button 
                          onClick={() => openAdminRateModal(doc)} 
                          className="btn btn-primary" 
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          title="Only Admin can edit doctor consultation fees"
                        >
                          <Edit3 size={13} /> Edit Rate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hospital Patients Directory */}
          <div className="glass-card" style={{ gridColumn: '1 / -1', marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#60a5fa" /> Hospital Registered Patients Directory & EMR Management
            </h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Patient Name & Contact</th>
                    <th>Age / Gender</th>
                    <th>Blood Group</th>
                    <th>Medical History / Allergies</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managerStats.patientsList && managerStats.patientsList.length > 0 ? (
                    managerStats.patientsList.map(pat => (
                      <tr key={pat.id}>
                        <td><span className="badge badge-info">PAT-{pat.id}</span></td>
                        <td>
                          <strong style={{ color: 'white' }}>{pat.name}</strong><br/>
                          <small style={{ color: 'var(--text-muted)' }}>{pat.email}</small>
                        </td>
                        <td>{pat.age} Yrs / {pat.gender}</td>
                        <td><span className="badge badge-purple">{pat.blood_group || 'N/A'}</span></td>
                        <td style={{ maxWidth: '260px', whiteSpace: 'truncate' }} title={pat.history || ''}>
                          {pat.history || 'No prior chronic conditions.'}
                        </td>
                        <td>
                          <button 
                            onClick={() => handleAdminDeletePatient(pat.id, pat.name)} 
                            className="btn btn-danger" 
                            style={{ 
                              padding: '0.3rem 0.65rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              background: '#dc2626', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '6px', 
                              cursor: 'pointer' 
                            }}
                            title="Purge patient record, credentials, and all health files"
                          >
                            <Trash2 size={13} /> Delete Patient
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                        No registered patients found in hospital database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT EDIT PROFILE MODAL */}
      {showPatientEdit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white' }}>Edit Health Profile</h3>
            <form onSubmit={handleUpdatePatientProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" value={pAge} onChange={e => setPAge(e.target.value)} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={pGender} onChange={e => setPGender(e.target.value)} className="form-control">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Blood Group</label>
                  <select value={pBlood} onChange={e => setPBlood(e.target.value)} className="form-control">
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
                  <label>Height</label>
                  <input type="text" value={pHeight} onChange={e => setPHeight(e.target.value)} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Weight</label>
                  <input type="text" value={pWeight} onChange={e => setPWeight(e.target.value)} className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>Allergies & Reactions</label>
                <input type="text" value={pAllergies} onChange={e => setPAllergies(e.target.value)} className="form-control" />
              </div>

              <div className="form-group">
                <label>Emergency Contact</label>
                <input type="text" value={pEmergency} onChange={e => setPEmergency(e.target.value)} className="form-control" />
              </div>

              <div className="form-group">
                <label>Chronic Diseases / Medical History</label>
                <textarea rows="3" value={pHistory} onChange={e => setPHistory(e.target.value)} className="form-control"></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowPatientEdit(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ flex: 1 }}>
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR EDIT PRACTICE MODAL */}
      {showDoctorEdit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white' }}>Edit Practice Details</h3>
            <form onSubmit={handleUpdateDoctorProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Specialization</label>
                  <input type="text" value={dSpec} onChange={e => setDSpec(e.target.value)} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Qualification</label>
                  <input type="text" value={dQual} onChange={e => setDQual(e.target.value)} className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>Experience (Years)</label>
                <input type="number" value={dExp} onChange={e => setDExp(e.target.value)} className="form-control" />
              </div>

              <div className="form-group">
                <DaySelector selectedDays={dDays} onChange={setDDays} />
              </div>

              <div className="form-group">
                <label>Doctor Bio / Focus</label>
                <textarea rows="3" value={dBio} onChange={e => setDBio(e.target.value)} className="form-control"></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowDoctorEdit(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ flex: 1 }}>
                  {savingProfile ? 'Saving...' : 'Save Practice Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN EDIT DOCTOR CONSULTATION RATE MODAL */}
      {showAdminRateModal && editingDoc && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>Edit Consultation Rate</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
              Doctor: <strong style={{ color: 'white' }}>{editingDoc.name}</strong> ({editingDoc.specialization})
            </p>

            <form onSubmit={handleSaveAdminDoctorRate}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>New Consultation Fee / Rate ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={adminFeeInput} 
                  onChange={e => setAdminFeeInput(e.target.value)} 
                  className="form-control" 
                  style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowAdminRateModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Update Fee Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
