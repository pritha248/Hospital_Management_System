import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_URL from '../config/api';
import { FileSpreadsheet, UploadCloud, Sparkles, FileText, CheckCircle2, Search, ExternalLink } from 'lucide-react';

const ReportsPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('Blood Report');
  const [parsedText, setParsedText] = useState('');
  const [file, setFile] = useState(null);

  const [releaseLetters, setReleaseLetters] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    try {
      if (user.role === 'patient') {
        const pRes = await axios.get(`${API_URL}/api/patients/${user.id}`);
        if (pRes.data.success) {
          const pat = pRes.data.data;
          setPatientProfile(pat);
          fetchReportsForPatient(pat.id);
          fetchReleaseLettersForPatient(pat.id);
        }
      } else if (user.role === 'doctor') {
        const pListRes = await axios.get('${API_URL}/api/patients');
        if (pListRes.data.success) {
          setPatients(pListRes.data.data);
          if (pListRes.data.data.length > 0) {
            setSelectedPatientId(pListRes.data.data[0].id);
            fetchReportsForPatient(pListRes.data.data[0].id);
            fetchReleaseLettersForPatient(pListRes.data.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReleaseLettersForPatient = async (patId) => {
    try {
      const res = await axios.get(`${API_URL}/api/release-letters/patient/${patId}`);
      if (res.data.success) {
        setReleaseLetters(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReportsForPatient = async (patId) => {
    try {
      const res = await axios.get(`${API_URL}/api/reports/patient/${patId}`);
      if (res.data.success) {
        setReports(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePatientSelectChange = (patId) => {
    setSelectedPatientId(patId);
    fetchReportsForPatient(patId);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const targetPatientId = user.role === 'patient' 
        ? (patientProfile ? patientProfile.id : 1) 
        : (selectedPatientId || 1);

      const formData = new FormData();
      formData.append('patient_id', targetPatientId);
      formData.append('title', title);
      formData.append('report_type', reportType);
      formData.append('parsed_text', parsedText);
      if (file) {
        formData.append('reportFile', file);
      }

      const res = await axios.post('${API_URL}/api/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setShowModal(false);
        setTitle('');
        setParsedText('');
        setFile(null);
        fetchReportsForPatient(targetPatientId);
      }
    } catch (err) {
      alert("Error uploading report.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Diagnostic Medical Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lab reports, radiology scans & AI OCR summaries</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user.role === 'doctor' && patients.length > 0 && (
            <select
              value={selectedPatientId}
              onChange={e => handlePatientSelectChange(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>Filter: {p.name}</option>
              ))}
            </select>
          )}

          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <UploadCloud size={18} /> Upload Medical Report
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {reports.map(r => (
          <div key={r.id} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>{r.report_type}</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>{r.title}</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* AI Summary Card */}
            {r.ai_summary && (
              <div style={{ background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <Sparkles size={14} /> AI Report Insights
                </div>
                <div style={{ fontSize: '0.85rem', color: '#e9d5ff', lineHeight: 1.45 }}>
                  {r.ai_summary}
                </div>
              </div>
            )}

            {/* Parsed Raw Text Snippet */}
            {r.parsed_text && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.25)', padding: '0.65rem', borderRadius: '6px', marginBottom: '1rem' }}>
                <strong>Extracted Text:</strong> {r.parsed_text.substring(0, 140)}...
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <a 
                href={`${API_URL}${r.file_url}`} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              >
                <FileText size={14} /> View File <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No diagnostic reports found for this patient.
          </div>
        )}
      </div>

      {/* Release Letters Section (Only generated & displayed if patient was admitted and release approved) */}
      {releaseLetters.length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={22} style={{ color: '#34d399' }} /> Hospital Release & Discharge Letters
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {releaseLetters.map(rl => (
              <div key={rl.id} className="glass-card" style={{ border: '1px solid rgba(52, 211, 153, 0.4)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(31, 41, 55, 0.6) 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
                  <div>
                    <span className="badge badge-success" style={{ background: '#059669', color: 'white', fontWeight: 700 }}>OFFICIAL DISCHARGE RELEASE LETTER</span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginTop: '0.35rem' }}>{rl.patient_name || 'Patient Discharge Summary'}</h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {new Date(rl.discharge_date || rl.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                  <strong>Attending Doctor:</strong> {rl.doctor_name || rl.doctor_full_name || 'Medical Specialist'}<br />
                  <strong>Admission Type:</strong> {rl.admission_type || 'Inpatient Hospitalization'} ({rl.admission_days || 1} Days)<br />
                  <strong>Diagnosis:</strong> {rl.diagnosis || 'Clinical Inpatient Care'}<br />
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#94a3b8', border: '1px solid var(--glass-border)' }}>
                  <div style={{ color: '#34d399', fontWeight: 700, marginBottom: '0.2rem' }}>Treatment Summary & Care:</div>
                  {rl.treatment_summary || 'Completed inpatient hospital care and medical monitoring.'}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', color: '#94a3b8', border: '1px solid var(--glass-border)' }}>
                  <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: '0.2rem' }}>Discharge Instructions:</div>
                  {rl.discharge_instructions || 'Rest at home, take prescribed medications, and follow up if symptoms recur.'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UploadCloud size={20} style={{ color: 'var(--accent-blue)' }} /> Upload Diagnostic Report
            </h3>

            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Report Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Comprehensive Metabolic Panel & HbA1c"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Report Type</label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  className="form-control"
                >
                  <option value="Blood Report">Blood Report</option>
                  <option value="X-Ray">Chest X-Ray / Radiograph</option>
                  <option value="MRI / CT Scan">MRI / CT Scan</option>
                  <option value="Urine Analysis">Urine Analysis</option>
                  <option value="General Lab Report">General Lab Report</option>
                </select>
              </div>

              <div className="form-group">
                <label>Select Report File (PDF / Image)</label>
                <input
                  type="file"
                  onChange={e => setFile(e.target.files[0])}
                  className="form-control"
                  style={{ padding: '0.5rem' }}
                />
              </div>

              <div className="form-group">
                <label>Report Text / OCR Input (Optional Manual Paste)</label>
                <textarea
                  rows="4"
                  placeholder="Paste report text here for instant AI parameter extraction (e.g., Glucose: 138 mg/dL, HbA1c: 7.2%)..."
                  value={parsedText}
                  onChange={e => setParsedText(e.target.value)}
                  className="form-control"
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn btn-primary" style={{ flex: 1 }}>
                  {uploading ? 'Processing OCR & AI...' : 'Upload & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
