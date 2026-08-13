import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config/api';
import { Calendar, Clock, Plus, User, Stethoscope, CheckCircle, XCircle, Search, FileText, Trash2 } from 'lucide-react';

const AppointmentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State for Booking
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00 AM');
  const [reason, setReason] = useState('');
  const [dateError, setDateError] = useState('');

  const selectedDocObj = doctors.find(d => String(d.id) === String(selectedDoctor));

  const validateWorkingDay = (docId, dateStr) => {
    if (!docId || !dateStr) {
      setDateError('');
      return true;
    }
    const doc = doctors.find(d => String(d.id) === String(docId));
    if (!doc) return true;

    const rawWorkingDays = doc.available_days || 'Mon,Tue,Wed,Thu,Fri';
    const allowedDays = rawWorkingDays.split(',').map(d => d.trim());

    const [year, month, day] = dateStr.split('-').map(Number);
    const selDate = new Date(year, month - 1, day);

    const dayAbbrs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayFullNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayIndex = selDate.getDay();
    const dayAbbr = dayAbbrs[dayIndex];
    const dayFull = dayFullNames[dayIndex];

    if (!allowedDays.includes(dayAbbr)) {
      const msg = `${doc.name} is not available on ${dayFull}s. Please select one of the available working days (${rawWorkingDays}).`;
      setDateError(msg);
      return false;
    }

    setDateError('');
    return true;
  };

  const handleDoctorChange = (docId) => {
    setSelectedDoctor(docId);
    if (date) validateWorkingDay(docId, date);
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    if (selectedDoctor) validateWorkingDay(selectedDoctor, newDate);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const aptRes = await axios.get('${API_URL}/api/appointments');
      const docRes = await axios.get('${API_URL}/api/doctors');

      if (docRes.data.success) setDoctors(docRes.data.data);

      if (aptRes.data.success) {
        let list = aptRes.data.data;
        if (user.role === 'patient') {
          list = list.filter(a => a.patient_name?.toLowerCase().includes(user.name.toLowerCase()) || a.patient_name === user.name);
          const pRes = await axios.get(`${API_URL}/api/patients/${user.id}`);
          if (pRes.data.success) setPatientProfile(pRes.data.data);
        } else if (user.role === 'doctor') {
          list = list.filter(a => a.doctor_name?.toLowerCase().includes(user.name.toLowerCase()) || a.doctor_name === user.name);
        }
        setAppointments(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!validateWorkingDay(selectedDoctor, date)) return;

    try {
      const targetPatientId = patientProfile ? patientProfile.id : 1;
      const res = await axios.post('${API_URL}/api/appointments', {
        patient_id: targetPatientId,
        doctor_id: selectedDoctor,
        appointment_date: date,
        appointment_time: time,
        reason
      });

      if (res.data.success) {
        setShowModal(false);
        setDateError('');
        setReason('');
        setDate('');
        fetchData();
      }
    } catch (err) {
      const apiMsg = err.response?.data?.message || "Failed to book appointment.";
      setDateError(apiMsg);
      alert(apiMsg);
    }
  };

  const handleStatusChange = async (aptId, status, notes) => {
    try {
      await axios.patch(`${API_URL}/api/appointments/${aptId}/status`, { status, notes });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePatientCancelAppointment = async (aptId) => {
    if (!window.confirm("Are you sure you want to cancel this pending appointment? The doctor and admin will be notified.")) return;
    try {
      await axios.patch(`${API_URL}/api/appointments/${aptId}/status`, {
        status: 'cancelled',
        notes: 'Cancelled by Patient'
      });
      fetchData();
    } catch (err) {
      alert("Failed to cancel appointment.");
    }
  };

  const handlePatientDeleteAppointment = async (aptId) => {
    if (!window.confirm("Are you sure you want to delete this appointment record completely?")) return;
    try {
      await axios.delete(`${API_URL}/api/appointments/${aptId}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete appointment.");
    }
  };

  // Navigate to Digital Prescriptions Page prefilled for this appointment
  const handleWritePrescriptionClick = (apt) => {
    navigate('/prescriptions', {
      state: {
        appointmentId: apt.id,
        patientId: apt.patient_id,
        patientName: apt.patient_name,
        reason: apt.reason
      }
    });
  };

  const isFutureDate = (dateStr) => {
    if (!dateStr) return false;
    const aptDate = new Date(dateStr);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return aptDate > endOfToday;
  };

  const futureAppointmentsCount = appointments.filter(a => isFutureDate(a.appointment_date) && a.status !== 'cancelled').length;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Appointment Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Schedule and manage medical consultations</p>
        </div>

        {user.role === 'patient' && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} /> Book Appointment
          </button>
        )}
      </div>

      {/* Future Appointments Metric Badge */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="glass-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1', maxWidth: '320px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Future Scheduled Appointments</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>
              {futureAppointmentsCount} {futureAppointmentsCount === 1 ? 'Appointment' : 'Appointments'}
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Date & Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(apt => (
                <tr key={apt.id}>
                  <td><strong style={{ color: 'white' }}>{apt.patient_name}</strong></td>
                  <td>{apt.doctor_name}</td>
                  <td><span className="badge badge-info">{apt.specialization}</span></td>
                  <td>
                    {new Date(apt.appointment_date).toLocaleDateString()} <span style={{ color: 'var(--text-muted)' }}>({apt.appointment_time})</span>
                  </td>
                  <td>{apt.reason}</td>
                  <td>
                    <span className={`badge ${
                      apt.status === 'confirmed' || apt.status === 'Released' ? 'badge-success' :
                      apt.status === 'completed' || apt.status === 'Completed' ? 'badge-info' :
                      apt.status === 'Admitted to Hospital' ? 'badge-purple' :
                      apt.status === 'Rejected Admission Request' || apt.status === 'No Admission Can Be Done Here' || apt.status === 'cancelled' ? 'badge-danger' :
                      'badge-warning'
                    }`}>
                      {apt.status} {apt.notes ? `(${apt.notes})` : ''}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {user.role === 'doctor' && apt.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatusChange(apt.id, 'confirmed')} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            <CheckCircle size={14} /> Accept
                          </button>
                          <button onClick={() => handleStatusChange(apt.id, 'cancelled')} className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}
                      {user.role === 'doctor' && (
                        apt.status === 'confirmed' || 
                        apt.status === 'Admitted to Hospital' || 
                        apt.status === 'admitted to hospital' || 
                        apt.status === 'Pending Admin Approval for Admission' || 
                        apt.status === 'Pending Admin Approval for Readmission' || 
                        apt.status === 'Pending Readmission Approval' || 
                        apt.status === "pending for admin's admission approval"
                      ) && (
                        <button 
                          onClick={() => handleWritePrescriptionClick(apt)} 
                          className="btn btn-ai" 
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <FileText size={14} /> Write Prescription
                        </button>
                      )}
                      {user.role === 'doctor' && apt.status === 'Rejected Admission Request' && (apt.admission_rejection_count || 0) < 2 && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await axios.post(`${API_URL}/api/appointments/${apt.id}/resubmit-admission`);
                              if (res.data.success) {
                                alert("Later Admission Request resubmitted successfully to Admin.");
                                fetchAppointments();
                              }
                            } catch (err) {
                              alert(err.response?.data?.message || err.message || "Failed to resubmit admission request.");
                            }
                          }} 
                          className="btn btn-warning" 
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                        >
                          Resubmit Admission Request
                        </button>
                      )}
                      {user.role === 'patient' && apt.status === 'pending' && (
                        <button 
                          onClick={() => handlePatientCancelAppointment(apt.id)} 
                          className="btn btn-danger" 
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Cancel Appointment (Informs Doctor & Admin)"
                        >
                          <XCircle size={13} /> Cancel Appointment
                        </button>
                      )}
                      {user.role === 'patient' && apt.status !== 'pending' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No action required</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white' }}>Book Medical Consultation</h3>

            <form onSubmit={handleBookAppointment}>
              {dateError && (
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.2rem', color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={18} style={{ flexShrink: 0, color: '#f87171' }} />
                  <span>{dateError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Select Specialist Doctor</label>
                <select 
                  required
                  value={selectedDoctor}
                  onChange={e => handleDoctorChange(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Choose Specialist Doctor --</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.specialization}) - ${doc.consultation_fee} | Available: {doc.available_days || 'Mon,Tue,Wed,Thu,Fri'}
                    </option>
                  ))}
                </select>
                {selectedDocObj && (
                  <div style={{ marginTop: '0.45rem', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>
                    📅 Working Days: <span style={{ color: '#38bdf8' }}>{selectedDocObj.available_days || 'Mon,Tue,Wed,Thu,Fri'}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={e => handleDateChange(e.target.value)}
                    className="form-control"
                    style={dateError ? { border: '1px solid #f87171' } : {}}
                  />
                </div>

                <div className="form-group">
                  <label>Time Slot</label>
                  <select
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="form-control"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Reason / Symptoms</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Describe your health concern or symptoms..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="form-control"
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setShowModal(false); setDateError(''); }} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={!!dateError} className="btn btn-primary" style={{ flex: 1, opacity: dateError ? 0.6 : 1 }}>
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;

