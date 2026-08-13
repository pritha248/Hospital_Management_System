import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config/api';
import { FileText, Plus, AlertTriangle, ShieldCheck, Printer, Stethoscope, Sparkles, Trash2, RefreshCw } from 'lucide-react';

const PrescriptionsPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [testCatalog, setTestCatalog] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [selectedPatient, setSelectedPatient] = useState('');
  const [filterPatientId, setFilterPatientId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [admissionType, setAdmissionType] = useState('None');
  const [admissionDays, setAdmissionDays] = useState(3);
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '' }
  ]);

  // AI Safety Warning Banner State & Loading State
  const [aiWarning, setAiWarning] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchTestCatalog();
    fetchPatients();
    if (user.role === 'doctor') {
      fetchDoctorProfile();
    } else if (user.role === 'patient') {
      fetchPatientProfile();
    }
  }, [user]);

  useEffect(() => {
    if (user.role === 'doctor') {
      if (filterPatientId) {
        fetchPrescriptions(filterPatientId);
      } else {
        setPrescriptions([]);
      }
    } else if (user.role === 'patient') {
      fetchPrescriptions();
    }
  }, [filterPatientId, user]);

  const fetchPatientProfile = async () => {
    try {
      const pRes = await axios.get(`${API_URL}/api/patients/${user.id}`);
      if (pRes.data.success) {
        const patObj = pRes.data.data;
        fetchPrescriptions(patObj.id);
      }
    } catch (err) {
      console.error("Fetch patient profile error:", err);
    }
  };

  const fetchTestCatalog = async () => {
    try {
      const res = await axios.get('${API_URL}/api/diagnostic-tests');
      if (res.data.success) setTestCatalog(res.data.data);
    } catch (err) {
      console.error("Fetch test catalog error:", err);
    }
  };

  // Handle location state passed from Appointments Page or Dashboard "Write Prescription" action
  useEffect(() => {
    if (location.state) {
      if (location.state.patientId) {
        const patIdStr = String(location.state.patientId);
        setSelectedPatient(patIdStr);
        setFilterPatientId(patIdStr);
        fetchPrescriptions(patIdStr);
      }
      if (location.state.appointmentId) setSelectedAppointmentId(location.state.appointmentId);
      if (location.state.reason) setDiagnosis(location.state.reason);
      setShowModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchDoctorProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/doctors/${user.id}`);
      if (res.data.success) setDoctorProfile(res.data.data);
    } catch (err) {
      console.error("Fetch doctor profile error:", err);
    }
  };

  const fetchPrescriptions = async (patientIdToFetch = filterPatientId) => {
    try {
      const params = {};
      if (user.role === 'doctor') {
        params.role = 'doctor';
        if (patientIdToFetch) {
          params.patient_id = patientIdToFetch;
        } else {
          setPrescriptions([]);
          return;
        }
      } else if (user.role === 'patient') {
        params.patient_id = patientIdToFetch || user.patientId || user.id;
      }
      const res = await axios.get('${API_URL}/api/prescriptions', { params });
      if (res.data.success) {
        setPrescriptions(res.data.data);
      }
    } catch (err) {
      console.error("Fetch prescriptions error:", err);
    }
  };

  // Backend SQL query (WHERE pr.patient_id = ? OR p.user_id = ?) handles filtering accurately
  const displayedPrescriptions = Array.isArray(prescriptions) ? prescriptions : [];

  const fetchPatients = async () => {
    try {
      const res = await axios.get('${API_URL}/api/patients');
      if (res.data.success) {
        const patList = res.data.data || [];
        setPatients(patList);
        if (user.role === 'doctor' && patList.length > 0 && !filterPatientId) {
          const defaultId = String(patList[0].id);
          setFilterPatientId(defaultId);
          setSelectedPatient(defaultId);
          fetchPrescriptions(defaultId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMedicine = () => {
    const updated = [...medicines, { name: '', dosage: '', frequency: '', duration: '' }];
    setMedicines(updated);
  };
  const addMedicineRow = handleAddMedicine;

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };
  const handleMedChange = handleMedicineChange;

  const handleRemoveMedicine = (index) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated);
  };

  const toggleTestSelection = (testItem) => {
    const exists = selectedTests.some(t => t.id === testItem.id);
    if (exists) {
      setSelectedTests(selectedTests.filter(t => t.id !== testItem.id));
    } else {
      setSelectedTests([...selectedTests, testItem]);
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert("Please select a patient before saving the prescription.");
      return;
    }
    setShowModal(false);
    try {
      const validDoctorId = doctorProfile?.id || user?.doctorId || user?.id;
      const createdForPatient = String(selectedPatient);
      const selPatObj = patients.find(p => String(p.id) === createdForPatient || String(p.user_id) === createdForPatient);

      const res = await axios.post('${API_URL}/api/prescriptions', {
        appointment_id: selectedAppointmentId || null,
        patient_id: selectedPatient,
        doctor_id: validDoctorId,
        diagnosis,
        medicines,
        instructions,
        diagnostic_tests: selectedTests.map(t => t.test_name).join(', '),
        test_ids: selectedTests.map(t => t.id),
        recommend_admission: admissionType !== 'None',
        admission_type: admissionType,
        admission_days: admissionDays,
        daily_room_rate: 150.00
      });

      if (res.data.success) {
        setFilterPatientId(createdForPatient);

        // Optimistically update prescription list instantly for ZERO-DELAY display!
        const newRxData = {
          ...res.data.data,
          patient_name: selPatObj?.name || 'Patient',
          doctor_name: doctorProfile?.name || user?.name || 'Dr. Medical Specialist',
          specialization: doctorProfile?.specialization || 'General Medicine',
          created_at: new Date().toISOString()
        };

        setPrescriptions(prev => [newRxData, ...prev.filter(p => p.id !== newRxData.id)]);

        // Reset form
        setDiagnosis('');
        setInstructions('');
        setSelectedTests([]);
        setTestSearch('');
        setAdmissionType('None');
        setAdmissionDays(3);
        setSelectedAppointmentId(null);
        setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);

        // Sync with backend asynchronously in background
        Promise.all([
          fetchPrescriptions(createdForPatient),
          fetchPatients()
        ]).catch(err => console.error("Background sync error:", err));
      }
    } catch (err) {
      console.error("Error saving prescription:", err);
      alert("Error saving prescription: " + (err.response?.data?.message || err.message));
      setShowModal(true);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Digital Prescriptions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Clinical e-prescribing & medication histories</p>
        </div>

        {user.role === 'doctor' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(31, 41, 55, 0.7)', border: '1px solid var(--glass-border)', padding: '0.4rem 0.8rem', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 700 }}>Select Patient:</span>
              <select
                value={filterPatientId}
                onChange={e => {
                  const patId = e.target.value;
                  setFilterPatientId(patId);
                  if (patId) {
                    setSelectedPatient(patId);
                  } else {
                    setSelectedPatient('');
                    setPrescriptions([]);
                  }
                }}
                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="" style={{ background: '#111827', color: 'white' }}>-- Select Patient --</option>
                {patients.map(pat => (
                  <option key={pat.id} value={pat.id} style={{ background: '#111827', color: 'white' }}>
                    {pat.name} (ID #{pat.id}, Age {pat.age})
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => {
                if (filterPatientId) {
                  setSelectedPatient(filterPatientId);
                }
                setShowModal(true);
              }} 
              className="btn btn-primary"
            >
              <Plus size={18} /> Write Prescription
            </button>
          </div>
        )}
      </div>

      {/* Prescriptions List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {displayedPrescriptions.map(p => (
          <div key={p.id} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <div>
                <span className="badge badge-purple">Rx #{p.id}</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginTop: '0.3rem' }}>{p.patient_name}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prescribed by {p.doctor_name} ({p.specialization})</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Prescribed Medicines */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Prescribed Medication
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {Array.isArray(p.medicines) ? p.medicines.map((m, idx) => (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'white' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.dosage} • {m.frequency} • {m.duration}
                    </div>
                  </div>
                )) : <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No medicines prescribed</div>}
              </div>
            </div>

            {/* Diagnosis & Instructions */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              <div><strong>Diagnosis:</strong> {p.diagnosis}</div>
              {p.instructions && <div style={{ marginTop: '0.2rem' }}><strong>Instructions:</strong> {p.instructions}</div>}
              {p.diagnostic_tests && <div style={{ marginTop: '0.2rem', color: '#60a5fa' }}><strong>Prescribed Tests:</strong> {p.diagnostic_tests}</div>}
            </div>
          </div>
        ))}

        {user.role === 'doctor' && !filterPatientId && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Select a Patient</h3>
            <p>Please select a patient from the dropdown above to view or write digital prescriptions.</p>
          </div>
        )}

        {user.role === 'doctor' && filterPatientId && displayedPrescriptions.length === 0 && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>No Prescriptions Found</h3>
            <p style={{ fontSize: '0.85rem' }}>
              No previous prescriptions found for the selected patient. Click "Write Prescription" above to create one.
            </p>
          </div>
        )}

        {user.role === 'patient' && displayedPrescriptions.length === 0 && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No prescriptions found for your account.
          </div>
        )}
      </div>

      {/* Write Prescription Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Stethoscope size={20} style={{ color: 'var(--accent-blue)' }} /> E-Prescription Writer
            </h3>

            <form onSubmit={handleCreatePrescription}>
              <div className="form-group">
                <label>Select Patient</label>
                <select
                  required
                  value={selectedPatient}
                  onChange={e => setSelectedPatient(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map(pat => (
                    <option key={pat.id} value={pat.id}>{pat.name} (Age {pat.age}, {pat.gender})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Clinical Diagnosis</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Type 2 Diabetes / Acute Upper Respiratory Infection"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  className="form-control"
                />
              </div>

              {/* Medicines List Editor */}
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Prescribed Medications</label>
                  <button type="button" onClick={addMedicineRow} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                    + Add Medication
                  </button>
                </div>

                {medicines.map((m, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Warfarin)"
                      value={m.name}
                      onChange={e => handleMedChange(idx, 'name', e.target.value)}
                      className="form-control"
                    />
                    <input
                      type="text"
                      placeholder="Dosage (50mg)"
                      value={m.dosage}
                      onChange={e => handleMedChange(idx, 'dosage', e.target.value)}
                      className="form-control"
                    />
                    <input
                      type="text"
                      placeholder="Frequency (Twice daily)"
                      value={m.frequency}
                      onChange={e => handleMedChange(idx, 'frequency', e.target.value)}
                      className="form-control"
                    />
                  </div>
                ))}
              </div>

              {/* Master Test Catalog Search & Selection */}
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Select Diagnostic Tests from Master Catalog
                </label>

                {/* Selected Tests Chips */}
                {selectedTests.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    {selectedTests.map(t => (
                      <span key={t.id} className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.65rem' }}>
                        🔬 {t.test_name} (${parseFloat(t.price).toFixed(2)})
                        <button 
                          type="button" 
                          onClick={() => setSelectedTests(selectedTests.filter(x => x.id !== t.id))}
                          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 800, padding: 0, marginLeft: '0.2rem' }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="🔍 Search Diagnostic Catalog (e.g. ECG, CBC, X-Ray, MRI...)"
                  value={testSearch}
                  onChange={e => setTestSearch(e.target.value)}
                  className="form-control"
                  style={{ marginBottom: '0.4rem' }}
                />

                {testSearch.trim().length > 0 && (
                  <div style={{ maxHeight: '160px', overflowY: 'auto', background: 'rgba(17, 24, 39, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.5rem' }}>
                    {testCatalog
                      .filter(t => 
                        t.test_name.toLowerCase().includes(testSearch.toLowerCase()) || 
                        t.category.toLowerCase().includes(testSearch.toLowerCase()) ||
                        t.department.toLowerCase().includes(testSearch.toLowerCase())
                      )
                      .map(t => {
                        const isSelected = selectedTests.some(x => x.id === t.id);
                        return (
                          <div 
                            key={t.id} 
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTests(selectedTests.filter(x => x.id !== t.id));
                              } else {
                                setSelectedTests([...selectedTests, t]);
                              }
                            }}
                            style={{ 
                              padding: '0.45rem 0.75rem', 
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              justify: 'space-between', 
                              alignItems: 'center', 
                              background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                              marginBottom: '0.2rem'
                            }}
                          >
                            <div>
                              <strong style={{ color: 'white', fontSize: '0.85rem' }}>{t.test_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{t.department} - {t.category}]</span>
                            </div>
                            <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.85rem' }}>${parseFloat(t.price).toFixed(2)}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Inpatient Hospital Admission / Readmission Dropdown */}
              <div className="form-group" style={{ background: 'rgba(31, 41, 55, 0.4)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  🏥 Inpatient Hospital Admission / Readmission Recommendation
                </label>

                <select
                  value={admissionType}
                  onChange={e => setAdmissionType(e.target.value)}
                  className="form-control"
                  style={{ background: 'rgba(17, 24, 39, 0.8)', color: 'white', fontWeight: 600 }}
                >
                  <option value="None">No Hospital Admission Needed</option>
                  <option value="New Admission">🏥 Recommend New Hospital Admission</option>
                  <option value="Readmission">🔄 Recommend Patient Readmission to Hospital</option>
                </select>

                {admissionType !== 'None' && (
                  <div style={{ marginTop: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Expected Inpatient Stay (Days)</label>
                      <input 
                        type="number"
                        min="1"
                        max="60"
                        value={admissionDays}
                        onChange={e => setAdmissionDays(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600 }}>
                      Daily Room Rate: <strong>$150.00/day</strong>
                      <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.2rem' }}>
                        Est. Room Total: ${(admissionDays * 150).toFixed(2)} ({admissionType})
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Special Instructions</label>
                <textarea
                  rows="2"
                  placeholder="Take after meals. Maintain adequate fluid intake."
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  className="form-control"
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionsPage;
