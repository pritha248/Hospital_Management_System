import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import { Sparkles, Stethoscope, AlertTriangle, Activity, FileText, Bot, Search, ArrowRight, ShieldCheck, RefreshCw, Cpu } from 'lucide-react';
import LocalLlmControlBar from '../components/LocalLlmControlBar';

const AiHubPage = () => {
  const [activeTab, setActiveTab] = useState('diagnosis');

  // Module 1: Differential Diagnosis State
  const [symptomsInput, setSymptomsInput] = useState('Fever, Cough, Chest Pain');
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState(null);

  // Module 2: Drug Interaction State
  const [drugsInput, setDrugsInput] = useState('');
  const [drugResult, setDrugResult] = useState(null);
  const [drugLoading, setDrugLoading] = useState(false);
  const [drugError, setDrugError] = useState(null);

  // Module 3: Readmission Risk State
  const [age, setAge] = useState(68);
  const [stayDays, setStayDays] = useState(5);
  const [priorAdmissions, setPriorAdmissions] = useState(2);
  const [riskResult, setRiskResult] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState(null);

  // Module 4: History Summarizer State
  const [rawHistoryText, setRawHistoryText] = useState('Patient Robert Paulson (52M). Diagnosed with Type 2 Diabetes mellitus in 2019. Developed mild essential hypertension in 2021. Fasting glucose 138 mg/dL, HbA1c 7.2%. Allergic to Penicillin and Shellfish.');
  const [summaryResult, setSummaryResult] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Handlers
  const handleDifferentialDiagnosis = async (e) => {
    e.preventDefault();
    if (!symptomsInput || !symptomsInput.trim()) return;
    setDiagLoading(true);
    setDiagnosisResult(null); // Instantly clear stale result
    setDiagError(null);
    try {
      const res = await axios.post('${API_URL}/api/ai/differential-diagnosis', { symptoms: symptomsInput });
      if (res.data && res.data.success) {
        setDiagnosisResult(res.data.data);
      } else {
        setDiagError(res.data?.message || "Failed to compute differential diagnosis.");
      }
    } catch (err) {
      console.error(err);
      setDiagError(err.response?.data?.message || err.message || "Failed to generate differential diagnosis with LLaMA model.");
    } finally {
      setDiagLoading(false);
    }
  };

  const handleDrugCheck = async (e, customInput) => {
    if (e && e.preventDefault) e.preventDefault();
    const queryStr = customInput !== undefined ? customInput : drugsInput;
    if (!queryStr || !queryStr.trim()) return;
    setDrugLoading(true);
    setDrugResult(null); // Instantly clear stale result
    setDrugError(null);
    try {
      const res = await axios.post('${API_URL}/api/ai/drug-interactions', { medications: queryStr, patientId: 1 });
      if (res.data && res.data.success) {
        setDrugResult(res.data.data);
      } else {
        setDrugError(res.data?.message || "Failed to analyze drug interaction risk.");
      }
    } catch (err) {
      console.error(err);
      setDrugError(err.response?.data?.message || err.message || "Failed to analyze drug interaction risk with LLaMA model.");
    } finally {
      setDrugLoading(false);
    }
  };

  const handleReadmissionPredict = async (e) => {
    e.preventDefault();
    setRiskLoading(true);
    setRiskResult(null); // Instantly clear stale result
    setRiskError(null);
    try {
      const res = await axios.post('${API_URL}/api/ai/readmission-risk', {
        age: parseInt(age, 10),
        lengthOfStayDays: parseInt(stayDays, 10),
        previousAdmissionsCount: parseInt(priorAdmissions, 10),
        chronicConditionsCount: 2,
        hasDiabetes: true,
        hasHypertension: true
      });
      if (res.data && res.data.success) {
        setRiskResult(res.data.data);
      } else {
        setRiskError(res.data?.message || "Failed to predict readmission risk.");
      }
    } catch (err) {
      console.error(err);
      setRiskError(err.response?.data?.message || err.message || "Failed to predict readmission risk with LLaMA model.");
    } finally {
      setRiskLoading(false);
    }
  };

  const handleHistorySummarize = async (e) => {
    e.preventDefault();
    if (!rawHistoryText || !rawHistoryText.trim()) return;
    setSummaryLoading(true);
    setSummaryResult(null); // Instantly clear stale result
    setSummaryError(null);
    try {
      const res = await axios.post('${API_URL}/api/ai/summarize-history', { text: rawHistoryText });
      if (res.data && res.data.success) {
        setSummaryResult(res.data.data);
      } else {
        setSummaryError(res.data?.message || "Failed to summarize medical history.");
      }
    } catch (err) {
      console.error(err);
      setSummaryError(err.response?.data?.message || err.message || "Failed to summarize medical record with LLaMA model.");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <span className="badge badge-purple"><Sparkles size={14} /> AI CLINICAL INTELLIGENCE</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>Clinical AI Decision Support Hub</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Backend AI engine for differential diagnosis, drug interaction safety, readmission prediction & history summarization
        </p>
      </div>

      {/* Meta Llama 3.2 Control Bar */}
      <LocalLlmControlBar />

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          { id: 'diagnosis', label: 'Differential Diagnosis', icon: Stethoscope },
          { id: 'drug', label: 'Drug Interactions', icon: AlertTriangle },
          { id: 'risk', label: '30-Day Readmission Risk', icon: Activity },
          { id: 'summary', label: 'Medical Record Summarizer', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                border: isActive ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid var(--glass-border)',
                background: isActive ? 'var(--gradient-ai)' : 'rgba(17, 24, 39, 0.7)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? 'var(--shadow-ai-glow)' : 'none'
              }}
            >
              <Icon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DIFFERENTIAL DIAGNOSIS */}
      {activeTab === 'diagnosis' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
          <div className="glass-card glass-card-ai">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Stethoscope size={20} style={{ color: '#c084fc' }} /> Symptom Input Engine
            </h3>

            <form onSubmit={handleDifferentialDiagnosis}>
              <div className="form-group">
                <label>Observed Symptoms (Comma separated)</label>
                <textarea
                  rows="4"
                  required
                  placeholder="e.g. Fever, Cough, Chest Pain, Shortness of breath"
                  value={symptomsInput}
                  onChange={e => setSymptomsInput(e.target.value)}
                  className="form-control"
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {['Fever, Cough, Chest Pain', 'Chest pain, Sweating, Radiating pain', 'Headache, Aura, Nausea', 'Fever, Cough, Loss of taste'].map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSymptomsInput(s)}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    Preset #{idx+1}
                  </button>
                ))}
              </div>

              <button type="submit" disabled={diagLoading} className="btn btn-ai" style={{ width: '100%', padding: '0.85rem' }}>
                {diagLoading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />} Predict Differential Diagnosis
              </button>
            </form>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Ranked Candidate Conditions</h3>

            {diagLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'rgba(192, 132, 252, 0.08)', borderRadius: '12px', border: '1px dashed rgba(192, 132, 252, 0.35)' }}>
                <RefreshCw className="animate-spin" size={32} style={{ color: '#c084fc', marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem' }}>
                  Please wait...
                </h4>
                <p style={{ color: '#e9d5ff', fontSize: '0.88rem', fontWeight: 600 }}>
                  LLaMA AI is computing probability-ranked candidate conditions and diagnostic recommendations.
                </p>
              </div>
            ) : diagError ? (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '1.25rem', borderRadius: '12px', color: '#fca5a5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 800, color: '#f87171', marginBottom: '0.4rem' }}>
                  <AlertTriangle size={20} /> LLaMA AI Analysis Error
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#fca5a5' }}>
                  {diagError}
                </div>
              </div>
            ) : diagnosisResult ? (
              <div>
                <div style={{ background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', color: '#e9d5ff', fontSize: '0.9rem' }}>
                  💡 <strong>Primary Clinical Assessment:</strong> {diagnosisResult.primaryRecommendation}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {diagnosisResult.differentialDiagnoses?.map((d, idx) => (
                    <div key={idx} style={{ background: 'rgba(31, 41, 55, 0.6)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ color: 'white', fontSize: '1.05rem' }}>{idx+1}. {d.condition}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Urgency: <span className={`badge ${d.urgencyLevel === 'Critical' ? 'badge-danger' : d.urgencyLevel === 'High' ? 'badge-warning' : 'badge-info'}`}>{d.urgencyLevel}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: d.probabilityPercentage > 70 ? '#34d399' : '#fbbf24' }}>
                            {d.probabilityPercentage}%
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Confidence</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <strong>Recommended Diagnostics:</strong> {d.recommendedTests?.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
                Enter patient symptoms on the left to compute probability-ranked candidate diagnoses.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DRUG INTERACTIONS */}
      {activeTab === 'drug' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
          <div className="glass-card glass-card-ai">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} style={{ color: '#f87171' }} /> Drug Interaction Safety Checker
            </h3>

            <form onSubmit={handleDrugCheck}>
              <div className="form-group">
                <label>Candidate Medication Pair / List (Comma separated)</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Warfarin, Aspirin"
                  value={drugsInput}
                  onChange={e => setDrugsInput(e.target.value)}
                  className="form-control"
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button type="button" onClick={() => { setDrugsInput('Warfarin, Aspirin'); handleDrugCheck(null, 'Warfarin, Aspirin'); }} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Warfarin + Aspirin</button>
                <button type="button" onClick={() => { setDrugsInput('Lisinopril, Spironolactone'); handleDrugCheck(null, 'Lisinopril, Spironolactone'); }} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Lisinopril + Spironolactone</button>
                <button type="button" onClick={() => { setDrugsInput('Amoxicillin, Metformin'); handleDrugCheck(null, 'Amoxicillin, Metformin'); }} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Amoxicillin + Metformin</button>
              </div>

              <button type="submit" disabled={drugLoading} className="btn btn-ai" style={{ width: '100%', padding: '0.85rem' }}>
                {drugLoading ? <RefreshCw className="animate-spin" size={18} /> : <AlertTriangle size={18} />} Evaluate Interaction Hazards
              </button>
            </form>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Clinical Safety Evaluation Report</h3>

            {drugLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px dashed rgba(59, 130, 246, 0.35)' }}>
                <RefreshCw className="animate-spin" size={32} style={{ color: '#60a5fa', marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem' }}>
                  Please wait...
                </h4>
                <p style={{ color: '#93c5fd', fontSize: '0.88rem', fontWeight: 600 }}>
                  LLaMA AI is analyzing candidate medications for adverse drug interactions and pharmacological risks.
                </p>
              </div>
            ) : drugError ? (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '1.25rem', borderRadius: '12px', color: '#fca5a5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 800, color: '#f87171', marginBottom: '0.4rem' }}>
                  <AlertTriangle size={20} /> LLaMA AI Analysis Error
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#fca5a5' }}>
                  {drugError}
                </div>
              </div>
            ) : drugResult ? (
              <div>
                <div style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  marginBottom: '1.25rem',
                  background: drugResult.isSafe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: `1px solid ${drugResult.isSafe ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  {drugResult.isSafe ? <ShieldCheck size={28} style={{ color: '#34d399' }} /> : <AlertTriangle size={28} style={{ color: '#f87171' }} />}
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: drugResult.isSafe ? '#34d399' : '#f87171' }}>
                      {drugResult.isSafe ? 'No Known Adverse Interactions Detected' : `WARNING: ${drugResult.overallRisk} Risk Drug Combination`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Evaluated medications: {(drugResult.medicationsEvaluated || drugResult.newMedicationsEvaluated)?.join(', ')}
                    </div>
                  </div>
                </div>

                {drugResult.interactionWarnings?.map((w, i) => (
                  <div key={i} style={{ background: 'rgba(31, 41, 55, 0.6)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: 'white' }}>{w.drugA} ↔ {w.drugB}</strong>
                      <span className="badge badge-danger">{w.severity} Severity</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#fca5a5' }}>{w.description}</p>
                  </div>
                ))}

                {drugResult.allergyWarnings?.map((a, i) => (
                  <div key={i} style={{ background: 'rgba(244, 63, 94, 0.2)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.5)', marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#f87171' }}>⚠️ Documented Patient Allergy Hazard: {a.drug}</strong>
                    <p style={{ fontSize: '0.85rem', color: '#fca5a5', marginTop: '0.3rem' }}>{a.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
                Select or type medications to screen for adverse drug interactions and contraindications.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: READMISSION RISK */}
      {activeTab === 'risk' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
          <div className="glass-card glass-card-ai">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} style={{ color: '#60a5fa' }} /> Readmission Predictor Inputs
            </h3>

            <form onSubmit={handleReadmissionPredict}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Patient Age (years)</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Length of Stay (days)</label>
                  <input type="number" value={stayDays} onChange={e => setStayDays(e.target.value)} className="form-control" />
                </div>
              </div>

              <div className="form-group">
                <label>Previous Admissions (Past 12 months)</label>
                <input type="number" value={priorAdmissions} onChange={e => setPriorAdmissions(e.target.value)} className="form-control" />
              </div>

              <button type="submit" disabled={riskLoading} className="btn btn-ai" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}>
                {riskLoading ? <RefreshCw className="animate-spin" size={18} /> : <Activity size={18} />} Calculate 30-Day Readmission Risk
              </button>
            </form>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>30-Day Readmission Risk Output</h3>

            {riskLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px dashed rgba(59, 130, 246, 0.35)' }}>
                <RefreshCw className="animate-spin" size={32} style={{ color: '#60a5fa', marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem' }}>
                  Please wait...
                </h4>
                <p style={{ color: '#93c5fd', fontSize: '0.88rem', fontWeight: 600 }}>
                  LLaMA AI is calculating 30-day post-discharge readmission probability.
                </p>
              </div>
            ) : riskError ? (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '1.25rem', borderRadius: '12px', color: '#fca5a5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 800, color: '#f87171', marginBottom: '0.4rem' }}>
                  <AlertTriangle size={20} /> LLaMA AI Analysis Error
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#fca5a5' }}>
                  {riskError}
                </div>
              </div>
            ) : riskResult ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(31, 41, 55, 0.6)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: riskResult.riskScorePercentage >= 70 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    border: `3px solid ${riskResult.riskScorePercentage >= 70 ? '#f87171' : '#fbbf24'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: riskResult.riskScorePercentage >= 70 ? '#f87171' : '#fbbf24'
                  }}>
                    {riskResult.riskScorePercentage}%
                  </div>

                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculated Risk Tier</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
                      {riskResult.riskTier?.includes('Readmission') ? riskResult.riskTier : `${riskResult.riskTier} Risk of Readmission`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Evaluated at {new Date(riskResult.evaluatedAt).toLocaleTimeString()}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'white' }}>Key Contributing Factors:</strong>
                  <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {riskResult.contributingFactors?.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>

                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#34d399' }}>Recommended Preventative Protocol:</strong>
                  <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', color: '#a7f3d0', fontSize: '0.85rem' }}>
                    {riskResult.preventativeActions?.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
                Fill in clinical parameters to estimate 30-day post-discharge readmission probability.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MEDICAL HISTORY SUMMARIZER */}
      {activeTab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
          <div className="glass-card glass-card-ai">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} style={{ color: '#38bdf8' }} /> Raw Medical Records Input
            </h3>

            <form onSubmit={handleHistorySummarize}>
              <div className="form-group">
                <label>Paste Long Clinical Notes / Lab Reports</label>
                <textarea
                  rows="8"
                  required
                  value={rawHistoryText}
                  onChange={e => setRawHistoryText(e.target.value)}
                  className="form-control"
                ></textarea>
              </div>

              <button type="submit" disabled={summaryLoading} className="btn btn-ai" style={{ width: '100%', padding: '0.85rem' }}>
                {summaryLoading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />} Generate Executive Summary
              </button>
            </form>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>AI Generated Clinical Summary</h3>

            {summaryLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '12px', border: '1px dashed rgba(56, 189, 248, 0.35)' }}>
                <RefreshCw className="animate-spin" size={32} style={{ color: '#38bdf8', marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem' }}>
                  Please wait...
                </h4>
                <p style={{ color: '#bae6fd', fontSize: '0.88rem', fontWeight: 600 }}>
                  LLaMA AI is synthesizing clinical notes and extracting executive highlights.
                </p>
              </div>
            ) : summaryError ? (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '1.25rem', borderRadius: '12px', color: '#fca5a5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 800, color: '#f87171', marginBottom: '0.4rem' }}>
                  <AlertTriangle size={20} /> LLaMA AI Analysis Error
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#fca5a5' }}>
                  {summaryError}
                </div>
              </div>
            ) : summaryResult ? (
              <div>
                <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', color: '#93c5fd', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {summaryResult.executiveSummary}
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Clinical Highlights:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {summaryResult.clinicalHighlights?.map((h, i) => (
                    <div key={i} style={{ background: 'rgba(31, 41, 55, 0.6)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'white' }}>
                      • {h}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
                Paste medical notes to condense multi-page records into key actionable findings.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiHubPage;
