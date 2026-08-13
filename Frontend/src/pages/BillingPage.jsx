import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_URL from '../config/api';
import { CreditCard, ShieldCheck, Plus, CheckCircle, Clock, FileText, AlertCircle, Check, X, Edit3, DollarSign, Calendar, Users, Tag, Percent } from 'lucide-react';

const formatVisitHeading = (dateInput) => {
  if (!dateInput) return 'Visit';
  let d;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else if (typeof dateInput === 'string') {
    if (!dateInput.includes('T') && dateInput.includes('-')) {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2].padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (monthIdx >= 0 && monthIdx < 12) {
          return `Visit – ${day} ${months[monthIdx]} ${year}`;
        }
      }
    }
    d = new Date(dateInput);
  } else {
    d = new Date(dateInput);
  }
  if (isNaN(d.getTime())) return 'Visit';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `Visit – ${day} ${month} ${year}`;
};

const BillingPage = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [claims, setClaims] = useState([]);
  const [admissionRequests, setAdmissionRequests] = useState([]);
  const [allReleaseLetters, setAllReleaseLetters] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedAdminPatientId, setSelectedAdminPatientId] = useState('');
  const [loading, setLoading] = useState(true);

  // Insurance Claim Modal State
  const [showClaimModal, setShowClaimModal] = useState(false);
  // Claim Form State
  const [selectedClaimBillId, setSelectedClaimBillId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [claimPatientName, setClaimPatientName] = useState('');
  const [claimPatientId, setClaimPatientId] = useState('');
  const [claimInvoiceDetails, setClaimInvoiceDetails] = useState('');
  const [claimTotalRemainingReadOnly, setClaimTotalRemainingReadOnly] = useState('');
  const [patientAuditLogs, setPatientAuditLogs] = useState([]);

  // Manager Approval Modal State
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [managerNotes, setManagerNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Admin Standalone Additional Charges, Deductions & Audit Log State
  const [showAddChargesModal, setShowAddChargesModal] = useState(false);
  const [editBillTab, setEditBillTab] = useState('add'); // 'add' | 'deduct'
  const [additionalChargeAmount, setAdditionalChargeAmount] = useState('');
  const [additionalChargeReason, setAdditionalChargeReason] = useState('');

  const [deductBillId, setDeductBillId] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');

  const [showApplyDiscountModal, setShowApplyDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedAuditBillId, setSelectedAuditBillId] = useState(null);

  const isManager = user && (user.role === 'admin' || user.role === 'manager');

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  // Set default selected patient for Admin when patients load
  useEffect(() => {
    if (isManager && patients.length > 0 && !selectedAdminPatientId) {
      setSelectedAdminPatientId(String(patients[0].id));
    }
  }, [patients, isManager, selectedAdminPatientId]);

  const fetchBillingData = async () => {
    try {
      let bRes, pRes, dRes, aRes, rxRes, admRes, rlRes;
      bRes = await axios.get(`${API_URL}/api/billing/all`);
      pRes = await axios.get(`${API_URL}/api/patients`);
      dRes = await axios.get(`${API_URL}/api/doctors`);
      aRes = await axios.get(`${API_URL}/api/appointments`);
      rxRes = await axios.get(`${API_URL}/api/prescriptions`);
      admRes = await axios.get(`${API_URL}/api/billing/admission-requests`);
      try {
        rlRes = await axios.get(`${API_URL}/api/release-letters/all`);
        if (rlRes.data.success) setAllReleaseLetters(rlRes.data.data);
      } catch (e) {}

      if (pRes.data.success) setPatients(pRes.data.data);
      if (dRes.data.success) setDoctors(dRes.data.data);
      if (aRes.data.success) setAppointments(aRes.data.data);
      if (rxRes.data.success) setPrescriptions(rxRes.data.data);
      if (admRes.data.success) setAdmissionRequests(admRes.data.data);

      if (bRes.data.success) {
        let bList = bRes.data.data.bills || [];
        let cList = bRes.data.data.claims || [];

        if (user && user.role === 'patient') {
          const uName = (user.name || '').toLowerCase();
          const userPat = (pRes.data.data || []).find(p => String(p.id) === String(user.patientId) || String(p.user_id) === String(user.id));
          const validPatIds = [user.patientId, user.id, userPat?.id, userPat?.user_id].filter(Boolean).map(String);
          bList = bList.filter(b => (uName && b.patient_name?.toLowerCase().includes(uName)) || validPatIds.includes(String(b.patient_id)));
          cList = cList.filter(c => (uName && c.patient_name?.toLowerCase().includes(uName)) || validPatIds.includes(String(c.patient_id)));
        }
        setBills(bList);
        setClaims(cList);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Derive active patient ID for strict patient-wise calculations
  let patientUserObj = null;
  if (user && user.role === 'patient') {
    patientUserObj = patients.find(p => p.name?.toLowerCase() === user.name?.toLowerCase() || String(p.user_id) === String(user.id));
  }

  const activeAdminPatientId = user && user.role === 'patient'
    ? (patientUserObj ? String(patientUserObj.id) : (bills[0]?.patient_id ? String(bills[0].patient_id) : ''))
    : (selectedAdminPatientId || (patients.length > 0 ? String(patients[0].id) : ''));

  useEffect(() => {
    if (activeAdminPatientId) {
      fetchPatientAuditLogs(activeAdminPatientId);
    }
  }, [activeAdminPatientId, bills]);

  const fetchPatientAuditLogs = async (patId) => {
    try {
      const res = await axios.get(`${API_URL}/api/billing/patient/${patId}/audit-logs`);
      if (res.data.success) {
        setPatientAuditLogs(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch patient audit logs", err);
    }
  };

  // Strict patient-wise filtered datasets
  const displayedBills = bills.filter(b => String(b.patient_id) === String(activeAdminPatientId));
  const displayedClaims = claims.filter(c => String(c.patient_id) === String(activeAdminPatientId));
  const displayedAdmissionRequests = admissionRequests.filter(r => String(r.patient_id) === String(activeAdminPatientId));

  const selectedPatientObj = patients.find(p => String(p.id) === String(activeAdminPatientId));
  const activePatientDisplayName = user && user.role === 'patient' 
    ? user.name 
    : (selectedPatientObj ? `${selectedPatientObj.name} (PAT-${selectedPatientObj.id})` : (displayedBills[0]?.patient_name ? `${displayedBills[0].patient_name} (PAT-${activeAdminPatientId})` : 'Selected Patient'));

  // Calculate per-patient financial metrics
  const totalBilledForPatient = displayedBills.reduce((acc, b) => acc + parseFloat(b.total_amount || 0), 0);
  const totalInsuranceDeductedForPatient = displayedBills.reduce((acc, b) => acc + parseFloat(b.insurance_used || 0), 0);
  const totalPaidForPatient = displayedBills.reduce((acc, b) => {
    if (b.status === 'paid') return acc + parseFloat(b.total_amount || 0);
    const payable = b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount || 0);
    const paidPart = parseFloat(b.total_amount || 0) - payable;
    return acc + Math.max(0, paidPart);
  }, 0);

  const totalRemainingAmount = displayedBills.reduce((acc, b) => {
    const payable = b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount);
    return acc + (b.status === 'paid' ? 0 : Math.max(0, payable));
  }, 0);

  const handleAdmissionDecision = async (requestId, status) => {
    try {
      const res = await axios.patch(`${API_URL}/api/billing/admission-requests/${requestId}/decision`, {
        status,
        admin_name: user?.name || 'Mr. Admin',
        admin_remarks: status === 'approved' ? 'Approved by Admin' : 'Rejected by Admin'
      });
      if (res.data.success) {
        fetchBillingData();
      }
    } catch (err) {
      alert("Error processing admission decision: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDischargePatient = async (hospitalizationId, releaseLetterId) => {
    try {
      if (releaseLetterId) {
        const res = await axios.patch(`${API_URL}/api/release-letters/${releaseLetterId}/approve`, {
          user_name: user?.name || 'Admin'
        });
        if (res.data.success) {
          alert("Patient discharge approved and Release Letter finalized successfully!");
          fetchBillingData();
        }
      } else {
        const res = await axios.post(`${API_URL}/api/release-letters/initiate-and-approve`, {
          hospitalization_id: hospitalizationId,
          patient_id: activeAdminPatientId,
          user_name: user?.name || 'Admin'
        });
        if (res.data.success) {
          alert("Patient discharge approved and Release Letter finalized successfully!");
          fetchBillingData();
        }
      }
    } catch (err) {
      alert("Discharge Rejected: " + (err.response?.data?.message || err.message));
    }
  };

  const handlePayBill = async (billId, paymentMethod = 'Credit Card') => {
    try {
      await axios.patch(`${API_URL}/api/billing/bills/${billId}/pay`, { payment_method: paymentMethod });
      fetchBillingData();
    } catch (err) {
      alert("Payment failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenClaimModal = () => {
    const openInvoices = displayedBills.filter(b => b.status !== 'paid' && (b.patient_payable === null || parseFloat(b.patient_payable) > 0));
    const calcTotal = openInvoices.reduce((acc, b) => acc + (b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount)), 0);

    const targetPatientName = selectedPatientObj ? selectedPatientObj.name : (displayedBills[0]?.patient_name || user?.name || 'Patient');
    const targetPatientIdVal = activeAdminPatientId || (selectedPatientObj?.id || '15');
    const patIdDisplay = `PAT-${targetPatientIdVal}`;

    const invoiceBreakdownStr = openInvoices.map(b => {
      const heading = b.visit_heading || formatVisitHeading(b.visit_date || b.created_at);
      const amt = b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount);
      return `• ${heading} (Invoice #${b.id}): $${amt.toFixed(2)}`;
    }).join('\n');

    setClaimPatientName(targetPatientName);
    setClaimPatientId(patIdDisplay);
    setClaimInvoiceDetails(invoiceBreakdownStr || 'All active date-wise visit invoices');
    setClaimTotalRemainingReadOnly(calcTotal > 0 ? calcTotal.toFixed(2) : '0.00');
    setClaimAmount(calcTotal > 0 ? calcTotal.toFixed(2) : '0.00');
    setShowClaimModal(true);
  };

  const handleFileClaim = async (e) => {
    e.preventDefault();
    const openInvoices = displayedBills.filter(b => b.status !== 'paid' && (b.patient_payable === null || parseFloat(b.patient_payable) > 0));
    const targetPatientId = activeAdminPatientId || openInvoices[0]?.patient_id || patients[0]?.id || 15;

    try {
      const res = await axios.post('${API_URL}/api/billing/claims', {
        patient_id: targetPatientId,
        bill_id: openInvoices[0]?.id,
        provider_name: providerName,
        policy_number: policyNumber,
        coverage_amount: parseFloat(claimAmount),
        notes: claimNotes || `Consolidated claim for total remaining balance ($${claimAmount})`
      });

      if (res.data.success) {
        setShowClaimModal(false);
        setProviderName('');
        setPolicyNumber('');
        setClaimAmount('');
        setClaimNotes('');
        fetchBillingData();
      }
    } catch (err) {
      alert("Failed to apply insurance claim: " + (err.response?.data?.message || err.message));
    }
  };

  const handleManagerInsuranceDecision = async (claimId, status) => {
    setReviewing(true);
    try {
      await axios.patch(`${API_URL}/api/billing/claims/${claimId}/status`, {
        status,
        managerNotes,
        approved_amount: approvedAmount ? parseFloat(approvedAmount) : undefined,
        admin_name: user?.name || 'Admin'
      });
      setSelectedClaim(null);
      setManagerNotes('');
      setApprovedAmount('');
      fetchBillingData();
    } catch (err) {
      alert("Failed to update claim confirmation: " + (err.response?.data?.message || err.message));
    } finally {
      setReviewing(false);
    }
  };

  const handleOpenAddChargesModal = () => {
    setEditBillTab('add');
    setAdditionalChargeAmount('');
    setAdditionalChargeReason('');
    setDeductBillId('');
    setDeductAmount('');
    setDeductReason('');
    setShowAddChargesModal(true);
  };

  const handleSaveAdditionalCharges = async (e) => {
    e.preventDefault();
    if (!activeAdminPatientId) {
      alert("Please select a patient first.");
      return;
    }
    if (!additionalChargeAmount || parseFloat(additionalChargeAmount) <= 0) {
      alert("Please enter a valid charge amount greater than 0.");
      return;
    }
    if (!additionalChargeReason.trim()) {
      alert("Please enter a mandatory reason for adding this additional charge.");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/billing/patient/${activeAdminPatientId}/add-charges`, {
        amount: parseFloat(additionalChargeAmount),
        reason: additionalChargeReason.trim(),
        user_name: user?.name || 'Mr. Admin',
        user_id: user?.id
      });

      if (res.data.success) {
        setShowAddChargesModal(false);
        setAdditionalChargeAmount('');
        setAdditionalChargeReason('');
        fetchBillingData();
      }
    } catch (err) {
      alert("Failed to add additional charges: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveDeduction = async (e) => {
    e.preventDefault();
    if (!activeAdminPatientId) {
      alert("Please select a patient first.");
      return;
    }
    const val = parseFloat(deductAmount);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid deduction amount greater than 0.");
      return;
    }
    if (!deductReason.trim()) {
      alert("Please enter a mandatory reason for deducting test charges.");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/billing/patient/${activeAdminPatientId}/deduct-charges`, {
        bill_id: deductBillId || undefined,
        amount: val,
        reason: deductReason.trim(),
        user_name: user?.name || 'Mr. Admin',
        user_id: user?.id
      });

      if (res.data.success) {
        setShowAddChargesModal(false);
        setDeductAmount('');
        setDeductReason('');
        setDeductBillId('');
        fetchBillingData();
      }
    } catch (err) {
      alert("Failed to deduct test charges: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenDiscountModal = () => {
    if (totalRemainingAmount <= 0) {
      alert("Cannot apply discount: Patient has no unpaid invoices. All invoices for this patient are fully paid.");
      return;
    }
    setDiscountType('fixed');
    setDiscountValue('');
    setDiscountReason('');
    setShowApplyDiscountModal(true);
  };

  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    if (!activeAdminPatientId) {
      alert("Please select a patient first.");
      return;
    }
    if (totalRemainingAmount <= 0) {
      alert("Cannot apply discount: Patient has no unpaid invoices. All invoices for this patient are fully paid.");
      return;
    }
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid discount value greater than 0.");
      return;
    }
    if (discountType === 'percentage' && val > 100) {
      alert("Percentage discount cannot exceed 100%.");
      return;
    }
    if (discountType === 'fixed' && val > totalRemainingAmount) {
      alert(`Discount amount ($${val.toFixed(2)}) cannot exceed the patient's total remaining unpaid balance of $${totalRemainingAmount.toFixed(2)}.`);
      return;
    }
    if (!discountReason.trim()) {
      alert("Please enter a mandatory reason for applying this discount.");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/billing/patient/${activeAdminPatientId}/apply-discount`, {
        discount_type: discountType,
        discount_value: val,
        reason: discountReason.trim(),
        user_name: user?.name || 'Mr. Admin',
        user_id: user?.id
      });

      if (res.data.success) {
        setShowApplyDiscountModal(false);
        setDiscountValue('');
        setDiscountReason('');
        fetchBillingData();
      }
    } catch (err) {
      alert("Failed to apply discount: " + (err.response?.data?.message || err.message));
    }
  };

  const handleViewAuditTrail = async (billId) => {
    try {
      setSelectedAuditBillId(billId);
      const res = await axios.get(`${API_URL}/api/billing/bills/${billId}/audit-logs`);
      if (res.data.success) {
        setAuditLogs(res.data.data);
        setShowAuditModal(true);
      }
    } catch (err) {
      alert("Failed to fetch audit logs.");
    }
  };

  const completedAppointmentsWithTests = appointments.filter(a => 
    a.status === 'completed' && 
    prescriptions.some(p => String(p.appointment_id) === String(a.id) && p.diagnostic_tests && p.diagnostic_tests.trim().length > 0)
  );

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{isManager ? "Admin Patient Billing & Financial Profile" : "Patient Billing & Financial Profile"}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Patient-wise EMR billing management, date-wise visit invoices, insurance approvals & payable calculations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {user && user.role === 'patient' && (
            <button onClick={handleOpenClaimModal} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 800 }}>
              <Plus size={18} /> Claim Insurance
            </button>
          )}
        </div>
      </div>

      {/* Prominent Patient Selection Dropdown at Top for Admin / Manager */}
      {isManager && (
        <div className="glass-card" style={{ 
          marginBottom: '1.5rem', 
          padding: '1.25rem 1.5rem', 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(96, 165, 250, 0.35)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ background: 'rgba(96, 165, 250, 0.15)', padding: '0.75rem', borderRadius: '12px', color: '#60a5fa', display: 'flex', alignItems: 'center' }}>
                <Users size={26} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '0.2rem' }}>
                  Select Patient for EMR Billing Calculation
                </label>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                  {activePatientDisplayName}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '600px', minWidth: '280px', flexWrap: 'wrap' }}>
              <select
                id="patient-select-dropdown"
                value={activeAdminPatientId}
                onChange={e => setSelectedAdminPatientId(e.target.value)}
                className="form-control"
                style={{ 
                  flex: 1, 
                  fontWeight: 800, 
                  fontSize: '0.95rem',
                  color: '#60a5fa', 
                  background: 'rgba(17, 24, 39, 0.95)',
                  border: '1.5px solid rgba(96, 165, 250, 0.5)',
                  borderRadius: '10px',
                  padding: '0.7rem 1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    👤 {p.name} (PAT-{p.id})
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={handleOpenAddChargesModal}
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Edit3 size={16} /> Edit Bill
                </button>

                <button
                  onClick={handleOpenDiscountModal}
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Tag size={16} /> Apply Discount
                </button>
              </div>
            </div>
          </div>

          {selectedPatientObj && (
            <div style={{ 
              marginTop: '1rem', 
              paddingTop: '0.85rem', 
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex', 
              gap: '1.75rem', 
              flexWrap: 'wrap',
              fontSize: '0.82rem',
              color: '#9ca3af'
            }}>
              <div>🆔 <strong>Patient ID:</strong> <span style={{ color: '#60a5fa', fontWeight: 700 }}>PAT-{selectedPatientObj.id}</span></div>
              <div>📧 <strong>Email:</strong> <span style={{ color: 'white' }}>{selectedPatientObj.email || 'N/A'}</span></div>
              <div>👤 <strong>Age / Gender:</strong> <span style={{ color: 'white' }}>{selectedPatientObj.age || 'N/A'} Yrs / {selectedPatientObj.gender || 'N/A'}</span></div>
              <div>🩸 <strong>Blood Group:</strong> <span style={{ color: '#f87171', fontWeight: 700 }}>{selectedPatientObj.blood_group || 'N/A'}</span></div>
              <div>📞 <strong>Contact:</strong> <span style={{ color: 'white' }}>{selectedPatientObj.phone || 'N/A'}</span></div>
              <div>📞 <strong>Emergency Contact:</strong> <span style={{ color: 'white' }}>{selectedPatientObj.emergency_contact || 'N/A'}</span></div>
            </div>
          )}
        </div>
      )}

      {/* Prominent Per-Patient Total Payable Amount Card */}
      <div className="glass-card" style={{ 
        marginBottom: '2rem', 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)', 
        border: '1.5px solid rgba(52, 211, 153, 0.4)',
        padding: '1.5rem 1.75rem',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              <DollarSign size={20} /> Prominent Patient Total Payable Amount ({activePatientDisplayName})
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', marginTop: '0.25rem', letterSpacing: '-0.5px' }}>
              ${totalRemainingAmount.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem', maxWidth: '680px' }}>
              Calculated cumulative unpaid balance specifically for <strong>{activePatientDisplayName}</strong> after all approved insurance deductions and discounts. Automatically updates whenever invoices, payments, insurance approvals, discounts, or hospitalization charges change.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(17, 24, 39, 0.75)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Total Billed</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>${totalBilledForPatient.toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(17, 24, 39, 0.75)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Insurance Covered</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>-${totalInsuranceDeductedForPatient.toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(17, 24, 39, 0.75)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Total Paid</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>${totalPaidForPatient.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Admission & Readmission Approval Requests Section (Filtered per patient) */}
      {isManager && (
        <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid rgba(251, 191, 36, 0.4)', background: 'rgba(31, 41, 55, 0.6)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fbbf24', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏥 Inpatient Hospital Admission Requests ({displayedAdmissionRequests.filter(r => r.status === 'pending_approval').length} Pending for {activePatientDisplayName})
          </h3>

          {displayedAdmissionRequests.filter(r => r.status === 'pending_approval').length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No pending inpatient admission or readmission requests for {activePatientDisplayName}.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {displayedAdmissionRequests.filter(r => r.status === 'pending_approval').map(req => (
                <div key={req.id} style={{ background: 'rgba(17, 24, 39, 0.85)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{req.patient_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Age {req.patient_age}, {req.patient_gender} | Doctor: {req.doctor_name}</div>
                    </div>
                    <span className={`badge ${req.admission_type === 'Readmission' ? 'badge-purple' : 'badge-amber'}`}>
                      {req.admission_type === 'Readmission' ? '🔄 Readmission' : '🏥 New Admission'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
                    <div>• <strong>Diagnosis:</strong> {req.diagnosis || 'Clinical Consultation'}</div>
                    <div>• <strong>Requested Stay:</strong> {req.admission_days} Days @ ${parseFloat(req.daily_room_rate).toFixed(2)}/day</div>
                    <div>• <strong>Est. Room Charge:</strong> <span style={{ color: '#34d399', fontWeight: 700 }}>${parseFloat(req.total_charge).toFixed(2)}</span></div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAdmissionDecision(req.id, 'approved')}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem', background: '#059669', borderColor: '#10b981', fontWeight: 700 }}
                    >
                      ✓ Approve Admission
                    </button>
                    <button
                      onClick={() => handleAdmissionDecision(req.id, 'rejected')}
                      className="btn btn-danger"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      ✕ Reject Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Inpatient Patient Discharge & Release Letter Management Section */}
      {isManager && (() => {
        const activeAdmittedHosp = displayedAdmissionRequests.find(r => r.status === 'approved');
        const activeReleaseLetter = allReleaseLetters.find(rl => String(rl.patient_id) === String(activeAdminPatientId) && String(rl.hospitalization_id) === String(activeAdmittedHosp?.id));
        const hasPendingAdmissionRec = displayedAdmissionRequests.some(r => r.status === 'pending_approval');
        const isFinanciallyCleared = totalRemainingAmount === 0;

        return (
          <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(31, 41, 55, 0.6)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#60a5fa', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📋 Inpatient Patient Discharge & Release Letter Management ({activePatientDisplayName})
            </h3>

            {!activeAdmittedHosp ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No active inpatient admission record for {activePatientDisplayName}. Release applies only to admitted/readmitted patients. Patients who were never admitted or have completed/rejected admission status cannot receive a Release Letter.
              </div>
            ) : (
              <div style={{ background: 'rgba(17, 24, 39, 0.85)', padding: '1.2rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'white', fontSize: '1.05rem' }}>
                      Active Inpatient Stay — {activeAdmittedHosp.admission_type || 'New Admission'} (Hospitalization #{activeAdmittedHosp.id})
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Attending Doctor: {activeAdmittedHosp.doctor_name} | Length of Stay: {activeAdmittedHosp.admission_days} Days @ ${parseFloat(activeAdmittedHosp.daily_room_rate).toFixed(2)}/day
                    </div>
                  </div>
                  <span className={`badge ${activeAdmittedHosp.status === 'discharged' ? 'badge-success' : activeReleaseLetter?.status === 'pending_approval' ? 'badge-amber' : 'badge-purple'}`}>
                    {activeAdmittedHosp.status === 'discharged' ? '✓ Discharged & Released' : activeReleaseLetter?.status === 'pending_approval' ? '⏳ Pending Release Approval' : '🏥 Admitted Inpatient'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>1. Active Hospital Admission</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399' }}>✓ Active Admission Found</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>2. Financial Clearance (Payable = ₹0)</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isFinanciallyCleared ? '#34d399' : '#f87171' }}>
                      {isFinanciallyCleared ? '✓ Clear (₹0 / $0.00 Balance)' : `❌ Unpaid Balance ($${totalRemainingAmount.toFixed(2)})`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>3. Pending Doctor Recommendations</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: !hasPendingAdmissionRec ? '#34d399' : '#fbbf24' }}>
                      {!hasPendingAdmissionRec ? '✓ None (Clear for Discharge)' : '❌ Pending Doctor Recommendation'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {activeAdmittedHosp.status === 'discharged' || activeReleaseLetter?.status === 'approved' ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.65rem 1rem', borderRadius: '8px', color: '#34d399', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      ✓ Patient Discharged & Official Release Letter Finalized
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDischargePatient(activeAdmittedHosp.id, activeReleaseLetter?.id)}
                      disabled={!isFinanciallyCleared || hasPendingAdmissionRec}
                      className="btn btn-primary"
                      style={{
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        background: (!isFinanciallyCleared || hasPendingAdmissionRec) ? 'rgba(75, 85, 99, 0.5)' : '#2563eb',
                        opacity: (!isFinanciallyCleared || hasPendingAdmissionRec) ? 0.6 : 1,
                        cursor: (!isFinanciallyCleared || hasPendingAdmissionRec) ? 'not-allowed' : 'pointer'
                      }}
                      title={!isFinanciallyCleared ? "Total payable amount must be ₹0 ($0.00) before discharge approval" : hasPendingAdmissionRec ? "Pending doctor admission recommendations must be resolved first" : "Approve discharge and finalize official Release Letter"}
                    >
                      {activeReleaseLetter?.status === 'pending_approval' ? '✓ Approve Pending Discharge & Issue Release Letter' : '🏥 Approve Patient Discharge & Finalize Release Letter'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Hospital Invoices Filtered per Selected Patient */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={20} style={{ color: '#60a5fa' }} /> Patient Invoices ({displayedBills.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayedBills.map(b => {
              const payable = b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount);
              const isPaid = b.status === 'paid' || payable === 0;
              const isPartiallyPaid = b.status === 'partially_paid';

              return (
                <div key={b.id} style={{ background: 'rgba(31, 41, 55, 0.6)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--glass-border)' }}>
                  {/* Date-wise Consultation Visit Heading */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(124, 58, 237, 0.25) 100%)', 
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                    borderRadius: '8px', 
                    padding: '0.6rem 0.85rem', 
                    marginBottom: '0.75rem',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={18} style={{ color: '#60a5fa' }} />
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', letterSpacing: '0.3px' }}>
                        {b.visit_heading || formatVisitHeading(b.visit_date || b.appointment_date || b.created_at)}
                      </span>
                    </div>
                    {b.doctor_name && (
                      <span style={{ fontSize: '0.8rem', color: '#93c5fd', fontWeight: 600 }}>
                        {b.doctor_name} ({b.specialization || 'Specialist'})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <span className="badge badge-info">Invoice #{b.id}</span>
                      {b.patient_name && <span style={{ marginLeft: '0.5rem', color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>({b.patient_name})</span>}
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>${parseFloat(b.total_amount).toFixed(2)}</div>
                    </div>
                    <span className={`badge ${b.status === 'insurance_pending' ? 'badge-purple' : isPaid ? 'badge-success' : isPartiallyPaid ? 'badge-warning' : 'badge-warning'}`}>
                      {b.status === 'insurance_pending' ? 'INSURANCE PENDING' : isPaid ? 'PAID' : isPartiallyPaid ? 'PARTIALLY PAID' : 'PENDING'}
                    </span>
                  </div>

                  {b.status === 'insurance_pending' && (
                    <div style={{ background: 'rgba(192, 132, 252, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(192, 132, 252, 0.3)', margin: '0.5rem 0', fontSize: '0.8rem', color: '#c084fc', fontWeight: 700 }}>
                      ⏳ Insurance claim submitted. Awaiting Admin verification & approval before deduction.
                    </div>
                  )}

                  {b.recommend_admission && b.admission_status === 'pending_approval' && (
                    <div style={{ background: 'rgba(251, 191, 36, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.4)', margin: '0.5rem 0', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>
                      ⏳ Inpatient Hospital Admission ({b.admission_type || 'New Admission'} - {b.admission_days || 1} Days) recommended by doctor. Hospitalization charges will be added upon Admin approval.
                    </div>
                  )}
                  {b.recommend_admission && b.admission_status === 'approved' && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.4)', margin: '0.5rem 0', fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>
                      ✅ Inpatient Hospitalization ({b.admission_type || 'New Admission'}) Approved & Room Charges Added.
                    </div>
                  )}
                  {b.recommend_admission && b.admission_status === 'rejected' && (
                    <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.4)', margin: '0.5rem 0', fontSize: '0.8rem', color: '#f87171', fontWeight: 700 }}>
                      ❌ Inpatient Hospitalization Request Rejected by Admin. Room charges omitted.
                    </div>
                  )}

                  {/* Line Items */}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                    {Array.isArray(b.line_items) && b.line_items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                        <span>• {item.description}</span>
                        <strong style={{ color: 'white' }}>${parseFloat(item.amount).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Insurance Deduction & Remaining Balance Badge */}
                  {parseFloat(b.insurance_used || 0) > 0 && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', margin: '0.6rem 0', fontSize: '0.8rem' }}>
                      <div style={{ color: '#60a5fa', fontWeight: 700 }}>🛡️ Insurance Applied ({b.payment_method || 'Insurance'})</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', marginTop: '0.2rem' }}>
                        <span>Insurance Coverage Used:</span>
                        <strong style={{ color: '#34d399' }}>-${parseFloat(b.insurance_used).toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: payable > 0 ? '#fbbf24' : '#34d399', marginTop: '0.2rem', fontWeight: 700 }}>
                        <span>Patient Payable Balance:</span>
                        <span>${payable.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {b.status === 'paid' && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(52, 211, 153, 0.2)', fontSize: '0.78rem', color: '#6ee7b7' }}>
                      <div>✓ <strong>Payment Receipt:</strong> Paid via {b.payment_method || 'Credit Card'}</div>
                      {b.transaction_id && <div>💳 <strong>TXN ID:</strong> {b.transaction_id}</div>}
                      {b.payment_date && <div>🕒 <strong>Paid On:</strong> {new Date(b.payment_date).toLocaleString()}</div>}
                    </div>
                  )}

                  {!isPaid && b.status !== 'insurance_pending' && payable > 0 && (
                    <div style={{ marginTop: '0.65rem' }}>
                      {isManager ? (
                        <button 
                          onClick={() => handlePayBill(b.id, 'Cash')} 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                        >
                          💵 Pay in Cash (${payable.toFixed(2)})
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePayBill(b.id, 'Credit Card')} 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem' }}
                        >
                          {parseFloat(b.insurance_used || 0) > 0 ? `Pay Remaining Amount Online ($${payable.toFixed(2)})` : `Pay Online ($${payable.toFixed(2)})`}
                        </button>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
            {displayedBills.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No billing invoices on file for {activePatientDisplayName}.</div>}
          </div>
        </div>

        {/* Insurance Claims Filtered per Selected Patient */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} style={{ color: '#34d399' }} /> Insurance Claims ({displayedClaims.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayedClaims.map(c => (
              <div key={c.id} style={{ background: 'rgba(31, 41, 55, 0.6)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Claim #{c.id} {c.bill_id ? `(Invoice #${c.bill_id})` : ''}</span>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginTop: '0.2rem' }}>{c.provider_name}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Policy: <strong>{c.policy_number}</strong> {c.patient_name ? `| Patient: ${c.patient_name}` : ''}
                    </div>
                  </div>
                  <span className={`badge ${c.status === 'approved' ? 'badge-success' : c.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                    {c.status.toUpperCase()}
                  </span>
                </div>

                {/* Detailed Insurance Transaction Log */}
                <div style={{ background: 'rgba(17, 24, 39, 0.7)', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.8rem', margin: '0.5rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <div>Policy Limit: <strong style={{ color: 'white' }}>${parseFloat(c.coverage_amount || c.claim_amount || 0).toFixed(2)}</strong></div>
                  <div>Invoice Claimed: <strong style={{ color: 'white' }}>${parseFloat(c.amount_claimed || c.claim_amount || 0).toFixed(2)}</strong></div>
                  <div>Insurance Used: <strong style={{ color: '#34d399' }}>${parseFloat(c.amount_used || 0).toFixed(2)}</strong></div>
                  <div>Remaining Coverage: <strong style={{ color: '#60a5fa' }}>${parseFloat(c.remaining_coverage || 0).toFixed(2)}</strong></div>
                  <div style={{ gridColumn: '1 / -1', color: '#fbbf24', fontWeight: 700, borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.3rem' }}>
                    Patient Payable Balance: ${parseFloat(c.patient_payable_amount || 0).toFixed(2)}
                  </div>
                </div>

                {c.notes && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.4rem' }}>
                    Notes: "{c.notes}"
                  </div>
                )}
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🕒 Logged Date/Time: {new Date(c.created_at || Date.now()).toLocaleString()}
                </div>

                {isManager && (c.status === 'submitted' || c.status === 'under_review') && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600 }}>Action Required:</span>
                    <button 
                      onClick={() => { 
                        setSelectedClaim(c); 
                        setManagerNotes(''); 
                        setApprovedAmount(c.coverage_amount || c.claim_amount || ''); 
                      }} 
                      className="btn btn-primary" 
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}
                    >
                      🔍 Review & Confirm Claim
                    </button>
                  </div>
                )}
              </div>
            ))}
            {displayedClaims.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No insurance claim transactions logged for {activePatientDisplayName}.</div>}
          </div>
        </div>
      </div>

      {/* Patient Payment Records & Audit Trail Summary */}
      <div className="glass-card" style={{ marginTop: '2rem', background: 'rgba(31, 41, 55, 0.7)' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} color="#a78bfa" /> Audit Trail & Payment Records Log ({patientAuditLogs.length} Entries for {activePatientDisplayName})
        </h3>

        {patientAuditLogs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            No recent payment or audit logs recorded for {activePatientDisplayName}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
            {patientAuditLogs.map((log, idx) => (
              <div key={idx} style={{ background: 'rgba(17, 24, 39, 0.8)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>{log.action}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>Invoice #{log.bill_id}</span>
                    <span style={{ fontSize: '0.8rem', color: '#93c5fd' }}>By: {log.user_name || 'System'}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    "{log.reason}"
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                    {log.previous_amount !== log.new_amount ? (
                      <span><s>${parseFloat(log.previous_amount).toFixed(2)}</s> ➔ ${parseFloat(log.new_amount).toFixed(2)}</span>
                    ) : (
                      <span>${parseFloat(log.new_amount).toFixed(2)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                    🕒 {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Claim Modal */}
      {showClaimModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} color="#34d399" /> Submit Insurance Claim for Total Balance
            </h3>

            <form onSubmit={handleFileClaim}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Patient Name (Auto-Filled)</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={claimPatientName} 
                    className="form-control" 
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'white', fontWeight: 700 }} 
                  />
                </div>
                <div className="form-group">
                  <label>Patient ID (Auto-Filled)</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={claimPatientId} 
                    className="form-control" 
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#60a5fa', fontWeight: 700 }} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Included Outstanding Visit Invoices (Auto-Filled)</label>
                <textarea
                  readOnly
                  rows="3"
                  value={claimInvoiceDetails}
                  className="form-control"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#d1d5db', fontSize: '0.85rem' }}
                ></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Total Remaining Amount ($) (Read-Only Auto-Filled)</label>
                  <input
                    type="text"
                    readOnly
                    value={`$${claimTotalRemainingReadOnly}`}
                    className="form-control"
                    style={{ background: 'rgba(255, 255, 255, 0.06)', color: '#60a5fa', fontSize: '1.1rem', fontWeight: 800 }}
                  />
                  <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Calculated cumulative unpaid balance after previous insurance deductions.
                  </div>
                </div>

                <div className="form-group">
                  <label>Claim Amount ($) (Editable Input Field) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    max={claimTotalRemainingReadOnly}
                    placeholder="Enter amount to claim"
                    value={claimAmount}
                    onChange={e => setClaimAmount(e.target.value)}
                    className="form-control"
                    style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', fontSize: '1.1rem', fontWeight: 900, border: '1px solid rgba(52, 211, 153, 0.4)' }}
                  />
                  <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Enter the exact amount you wish to claim from your insurance policy.
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Insurance Provider Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BlueCross HealthCare / MetLife / Aetna"
                  value={providerName}
                  onChange={e => setProviderName(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Policy / Member Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POL-990123-X"
                  value={policyNumber}
                  onChange={e => setPolicyNumber(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Additional Notes / Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Enter policy authorization details or notes..."
                  value={claimNotes}
                  onChange={e => setClaimNotes(e.target.value)}
                  className="form-control"
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowClaimModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 800 }}>
                  Submit Claim for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Hospital Manager Insurance Confirmation Modal */}
      {selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>
              Manager Insurance Confirmation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Review policy number <strong>{selectedClaim.policy_number}</strong> for provider <strong>{selectedClaim.provider_name}</strong> (Claim: ${selectedClaim.claim_amount}).
            </p>

            <div className="form-group">
              <label>Manager Approval Notes / Confirmation Code</label>
              <textarea
                rows="3"
                placeholder="Enter approval verification details, manager notes, or authorization code..."
                value={managerNotes}
                onChange={e => setManagerNotes(e.target.value)}
                className="form-control"
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                type="button" 
                onClick={() => setSelectedClaim(null)} 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={reviewing}
                onClick={() => handleManagerInsuranceDecision(selectedClaim.id, 'rejected')} 
                className="btn btn-danger" 
                style={{ flex: 1 }}
              >
                <X size={16} /> Reject Claim
              </button>
              <button 
                type="button" 
                disabled={reviewing}
                onClick={() => handleManagerInsuranceDecision(selectedClaim.id, 'approved')} 
                className="btn btn-primary" 
                style={{ flex: 1, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
              >
                <Check size={16} /> Confirm & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Admin Edit Bill / Add Additional Charges & Deduct Test Charges Modal */}
      {showAddChargesModal && (() => {
        const openBills = displayedBills.filter(b => b.status !== 'paid' && (b.patient_payable === null || parseFloat(b.patient_payable) > 0));
        const selectedDeductBill = openBills.find(b => String(b.id) === String(deductBillId)) || openBills[0];
        const selectedBillMaxDeduct = selectedDeductBill
          ? (selectedDeductBill.patient_payable !== null ? parseFloat(selectedDeductBill.patient_payable) : parseFloat(selectedDeductBill.total_amount))
          : 0;

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '560px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="#60a5fa" /> Edit Patient Bill Management
              </h3>

              {/* Mode Toggle Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.35rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <button
                  type="button"
                  onClick={() => setEditBillTab('add')}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    background: editBillTab === 'add' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                    color: 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ➕ Add Additional Charges
                </button>
                <button
                  type="button"
                  onClick={() => setEditBillTab('deduct')}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    background: editBillTab === 'deduct' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                    color: 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ➖ Deduct Test Amount (External)
                </button>
              </div>

              {editBillTab === 'add' ? (
                <form onSubmit={handleSaveAdditionalCharges}>
                  <div style={{ background: 'rgba(30, 41, 59, 0.75)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.2rem', border: '1px solid rgba(96, 165, 250, 0.3)', fontSize: '0.85rem' }}>
                    <div style={{ color: '#93c5fd', fontWeight: 800, fontSize: '0.95rem' }}>Selected Patient: {activePatientDisplayName}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.4' }}>
                      Adding charges creates a <strong>new date-wise invoice</strong> for this patient. Existing historical invoices remain untouched, and the patient's <strong>Total Payable Amount</strong> updates immediately.
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 700 }}>Additional Charge Amount ($) *</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 50.00"
                      value={additionalChargeAmount}
                      onChange={e => setAdditionalChargeAmount(e.target.value)}
                      className="form-control"
                      style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', background: 'rgba(17, 24, 39, 0.9)', border: '1.5px solid rgba(52, 211, 153, 0.5)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 700 }}>Mandatory Description / Reason for Additional Charge *</label>
                    <textarea
                      required
                      rows="3"
                      placeholder="State why this additional charge is being added (e.g. Specialist consultation surcharge / Emergency lab diagnostic kit)..."
                      value={additionalChargeReason}
                      onChange={e => setAdditionalChargeReason(e.target.value)}
                      className="form-control"
                      style={{ fontSize: '0.9rem' }}
                    ></textarea>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowAddChargesModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', fontWeight: 800 }}>
                      Generate New Invoice & Update Total
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveDeduction}>
                  <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.2rem', border: '1px solid rgba(245, 158, 11, 0.35)', fontSize: '0.85rem' }}>
                    <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.95rem' }}>🔬 External Diagnostic Test Deduction</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.4' }}>
                      Deduct test charges when a patient completes prescribed diagnostic tests at an <strong>external laboratory or hospital</strong>. Deductions apply only to unpaid invoices without modifying original bill totals.
                    </div>
                  </div>

                  {openBills.length === 0 ? (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1rem', fontSize: '0.88rem', fontWeight: 600 }}>
                      ⚠️ No unpaid invoices found for this patient. Paid invoices cannot be modified or deducted.
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label style={{ fontWeight: 700 }}>Select Target Unpaid Invoice *</label>
                        <select
                          value={deductBillId || selectedDeductBill?.id || ''}
                          onChange={e => setDeductBillId(e.target.value)}
                          className="form-control"
                          style={{ background: 'rgba(17, 24, 39, 0.9)', color: 'white', fontWeight: 700 }}
                        >
                          {openBills.map(b => {
                            const heading = b.visit_heading || formatVisitHeading(b.visit_date || b.created_at);
                            const rem = b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount);
                            return (
                              <option key={b.id} value={b.id}>
                                Invoice #{b.id} - {heading} (Unpaid Balance: ${rem.toFixed(2)})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ fontWeight: 700 }}>Deduction Amount ($) (Max: ${selectedBillMaxDeduct.toFixed(2)}) *</label>
                        <input 
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={selectedBillMaxDeduct}
                          required
                          placeholder={`e.g. ${Math.min(50, selectedBillMaxDeduct).toFixed(2)}`}
                          value={deductAmount}
                          onChange={e => setDeductAmount(e.target.value)}
                          className="form-control"
                          style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', background: 'rgba(17, 24, 39, 0.9)', border: '1.5px solid rgba(245, 158, 11, 0.5)' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ fontWeight: 700 }}>Mandatory Description / Reason for Deduction *</label>
                        <textarea
                          required
                          rows="3"
                          placeholder="Specify the external lab/hospital details and reason (e.g. ECG & Blood Panel completed at City Diagnostics External Lab)..."
                          value={deductReason}
                          onChange={e => setDeductReason(e.target.value)}
                          className="form-control"
                          style={{ fontSize: '0.9rem' }}
                        ></textarea>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowAddChargesModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={openBills.length === 0}
                      className="btn btn-primary" 
                      style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', fontWeight: 800, opacity: openBills.length === 0 ? 0.5 : 1 }}
                    >
                      Deduct Test Charges & Recalculate
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}

      {/* Standalone Apply Discount Modal */}
      {showApplyDiscountModal && (() => {
        const val = parseFloat(discountValue) || 0;
        const discountDollars = discountType === 'percentage' 
          ? (totalRemainingAmount * Math.min(100, val) / 100)
          : Math.min(totalRemainingAmount, val);
        const projectedNewPayable = Math.max(0, totalRemainingAmount - discountDollars);

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '540px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} color="#10b981" /> Apply Patient Discount
              </h3>

              <form onSubmit={handleSaveDiscount}>
                <div style={{ background: 'rgba(30, 41, 59, 0.75)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.2rem', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.85rem' }}>
                  <div style={{ color: '#93c5fd', fontWeight: 800, fontSize: '0.95rem' }}>Selected Patient: {activePatientDisplayName}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.4' }}>
                    Discount will apply directly to the patient's <strong>Total Payable Amount</strong> across all outstanding invoices after insurance deductions.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'rgba(31, 41, 55, 0.6)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Current Total Payable:</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>${totalRemainingAmount.toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
                    <div style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>Projected New Payable:</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399' }}>${projectedNewPayable.toFixed(2)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Savings: -${discountDollars.toFixed(2)}</div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Select Discount Type *</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: discountType === 'fixed' ? '#34d399' : 'white', fontWeight: 700 }}>
                      <input 
                        type="radio" 
                        name="discountType" 
                        value="fixed" 
                        checked={discountType === 'fixed'} 
                        onChange={() => setDiscountType('fixed')}
                      /> Fixed Amount ($)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: discountType === 'percentage' ? '#34d399' : 'white', fontWeight: 700 }}>
                      <input 
                        type="radio" 
                        name="discountType" 
                        value="percentage" 
                        checked={discountType === 'percentage'} 
                        onChange={() => setDiscountType('percentage')}
                      /> Percentage (%)
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>
                    Discount Value ({discountType === 'percentage' ? '%' : '$'}) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={discountType === 'percentage' ? '100' : undefined}
                    required
                    placeholder={discountType === 'percentage' ? 'e.g. 10 (for 10%)' : 'e.g. 50.00 (for $50)'}
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', background: 'rgba(17, 24, 39, 0.9)', border: '1.5px solid rgba(52, 211, 153, 0.5)' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>Mandatory Reason for Discount *</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="State why this discount is being granted (e.g. Senior citizen discount / Financial hardship approval)..."
                    value={discountReason}
                    onChange={e => setDiscountReason(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.9rem' }}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setShowApplyDiscountModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 800 }}>
                    Confirm & Apply Discount
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Invoice Audit Trail Modal */}
      {showAuditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
                📜 Audit Trail Log for Invoice #{selectedAuditBillId}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAuditModal(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '400px', overflowY: 'auto' }}>
              {auditLogs.map((log, idx) => (
                <div key={idx} style={{ background: 'rgba(31, 41, 55, 0.6)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{log.action}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600, marginBottom: '0.3rem' }}>
                    By: {log.user_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#60a5fa', marginBottom: '0.3rem' }}>
                    Amount Changed: <s>${log.previous_amount}</s> ➔ <strong style={{ color: '#34d399' }}>${log.new_amount}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                    "{log.reason}"
                  </div>
                </div>
              ))}

              {auditLogs.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                  No modification audit logs on file for this invoice. (Original invoice untouched).
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button type="button" onClick={() => setShowAuditModal(false)} className="btn btn-secondary">
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
