const db = require("../config/database");

const getReleaseLettersByPatient = async (patientId) => {
  // Resolve patientId (supports both patients.id and users.id)
  const [patRows] = await db.query("SELECT id FROM patients WHERE id = ? OR user_id = ?", [patientId, patientId]);
  if (patRows.length === 0) return [];
  const validPatientId = patRows[0].id;

  const [rows] = await db.query(`
    SELECT rl.*, h.admission_type, h.admission_days, h.daily_room_rate, h.total_charge,
           u.name as patient_name, ud.name as doctor_full_name
    FROM release_letters rl
    JOIN hospitalizations h ON rl.hospitalization_id = h.id
    JOIN patients p ON rl.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN doctors d ON rl.doctor_id = d.id
    LEFT JOIN users ud ON d.user_id = ud.id
    WHERE rl.patient_id = ? AND rl.status = 'approved'
    ORDER BY rl.created_at DESC
  `, [validPatientId]);
  return rows;
};

const getAllReleaseLetters = async () => {
  const [rows] = await db.query(`
    SELECT rl.*, h.admission_type, h.admission_days, h.daily_room_rate, h.total_charge,
           u.name as patient_name, ud.name as doctor_full_name
    FROM release_letters rl
    JOIN hospitalizations h ON rl.hospitalization_id = h.id
    JOIN patients p ON rl.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN doctors d ON rl.doctor_id = d.id
    LEFT JOIN users ud ON d.user_id = ud.id
    ORDER BY rl.created_at DESC
  `);
  return rows;
};

// Helper: Revalidate patient release eligibility on backend
const checkReleaseEligibility = async (patientId, hospitalizationId) => {
  let hosp;
  if (hospitalizationId) {
    const [hospRows] = await db.query("SELECT * FROM hospitalizations WHERE id = ?", [hospitalizationId]);
    if (hospRows.length === 0) {
      const err = new Error("Hospitalization record not found.");
      err.statusCode = 404;
      throw err;
    }
    hosp = hospRows[0];
  } else if (patientId) {
    const [patRows] = await db.query("SELECT id FROM patients WHERE id = ? OR user_id = ?", [patientId, patientId]);
    if (patRows.length === 0) {
      const err = new Error("Patient not found.");
      err.statusCode = 404;
      throw err;
    }
    const validPatId = patRows[0].id;
    const [hospRows] = await db.query(
      "SELECT * FROM hospitalizations WHERE patient_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1",
      [validPatId]
    );
    if (hospRows.length === 0) {
      const err = new Error("Patient has no active, approved hospital admission eligible for discharge. Release applies only to admitted/readmitted patients.");
      err.statusCode = 400;
      throw err;
    }
    hosp = hospRows[0];
  } else {
    const err = new Error("Patient ID or Hospitalization ID is required.");
    err.statusCode = 400;
    throw err;
  }

  if (hosp.status === 'discharged' || hosp.status === 'released') {
    const err = new Error("Patient has already been discharged and released.");
    err.statusCode = 400;
    throw err;
  }

  if (hosp.status !== 'approved') {
    const err = new Error("Patient does not have an active approved hospitalization. Patients who were never admitted or have completed/rejected admission status cannot be released.");
    err.statusCode = 400;
    throw err;
  }

  const validPatientId = hosp.patient_id;

  // 1. Financial Clearance Check: Total Payable Amount MUST be ₹0 ($0.00)
  const [bills] = await db.query(
    "SELECT * FROM bills WHERE patient_id = ? AND status != 'paid'",
    [validPatientId]
  );

  const totalUnpaid = bills.reduce((acc, b) => {
    const curTotal = parseFloat(b.total_amount) || 0;
    const curInsurance = parseFloat(b.insurance_used || 0);
    const curDiscount = parseFloat(b.discount_amount || 0);
    const curDeduction = parseFloat(b.deduction_amount || 0);
    const payable = b.patient_payable !== null ? parseFloat(b.patient_payable) : Math.max(0, curTotal - curInsurance - curDiscount - curDeduction);
    return acc + (payable > 0 ? payable : 0);
  }, 0);

  if (totalUnpaid > 0.001) {
    const err = new Error(`Cannot process discharge: Patient has an unpaid total balance of $${totalUnpaid.toFixed(2)}. Total payable amount must be $0.00 before release.`);
    err.statusCode = 400;
    throw err;
  }

  // 2. Clinical Clearance Check: No Pending Admission / Readmission Recommendations
  const [pendingHosps] = await db.query(
    "SELECT id FROM hospitalizations WHERE patient_id = ? AND status = 'pending_approval' AND id != ?",
    [validPatientId, hosp.id]
  );
  if (pendingHosps.length > 0) {
    const err = new Error("Cannot process discharge: Patient has a pending hospital admission recommendation waiting for Admin approval.");
    err.statusCode = 400;
    throw err;
  }

  const [pendingPrescriptions] = await db.query(
    "SELECT id FROM prescriptions WHERE patient_id = ? AND admission_status = 'pending_approval'",
    [validPatientId]
  );
  if (pendingPrescriptions.length > 0) {
    const err = new Error("Cannot process discharge: Patient has a pending admission or readmission recommendation from the doctor.");
    err.statusCode = 400;
    throw err;
  }

  const [pendingApts] = await db.query(
    "SELECT id FROM appointments WHERE patient_id = ? AND status IN ('Pending Admin Approval for Admission', 'Pending Admin Approval for Readmission', 'Pending Readmission Approval')",
    [validPatientId]
  );
  if (pendingApts.length > 0) {
    const err = new Error("Cannot process discharge: Patient has a pending admission approval request on an appointment.");
    err.statusCode = 400;
    throw err;
  }

  return hosp;
};

const requestReleaseLetter = async (data) => {
  const { hospitalization_id, patient_id, doctor_id, appointment_id, diagnosis, treatment_summary, discharge_instructions, doctor_name } = data;

  const hosp = await checkReleaseEligibility(patient_id, hospitalization_id);

  // Check if duplicate release letter already exists
  const [existing] = await db.query(
    "SELECT * FROM release_letters WHERE hospitalization_id = ? AND status IN ('pending_approval', 'approved')",
    [hosp.id]
  );

  if (existing.length > 0) {
    if (existing[0].status === 'approved') {
      const err = new Error("Release letter has already been approved and patient discharged.");
      err.statusCode = 400;
      throw err;
    }
    return { id: existing[0].id, status: 'pending_approval', message: 'Release letter request is already pending Admin approval.' };
  }

  // Resolve the doctor's real name from the doctors/users tables
  const resolvedDoctorId = doctor_id || hosp.doctor_id;
  let resolvedDoctorName = doctor_name || null;
  if (!resolvedDoctorName && resolvedDoctorId) {
    const [docRows] = await db.query(
      `SELECT u.name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`,
      [resolvedDoctorId]
    );
    if (docRows.length > 0) {
      resolvedDoctorName = `Dr. ${docRows[0].name}`;
    }
  }
  // Ultimate fallback: look up by user_id in case doctor_id is actually a user_id
  if (!resolvedDoctorName && resolvedDoctorId) {
    const [userRows] = await db.query(
      `SELECT u.name FROM users u WHERE u.id = ?`,
      [resolvedDoctorId]
    );
    if (userRows.length > 0) {
      resolvedDoctorName = `Dr. ${userRows[0].name}`;
    }
  }
  resolvedDoctorName = resolvedDoctorName || 'Dr. Specialist';

  // Create Release Letter in pending_approval status
  const [res] = await db.query(`
    INSERT INTO release_letters (
      hospitalization_id, patient_id, doctor_id, appointment_id,
      diagnosis, treatment_summary, discharge_instructions, doctor_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval')
  `, [
    hosp.id,
    hosp.patient_id,
    resolvedDoctorId,
    appointment_id || hosp.appointment_id || null,
    diagnosis || 'Hospital Inpatient Treatment',
    treatment_summary || 'Completed inpatient hospital care and medical monitoring.',
    discharge_instructions || 'Rest at home, take prescribed medications, and follow up if symptoms recur.',
    resolvedDoctorName,
  ]);

  const letterId = res.insertId;

  if (hosp.appointment_id) {
    await db.query("UPDATE appointments SET status = 'Pending Release Approval' WHERE id = ?", [hosp.appointment_id]);
  } else {
    await db.query("UPDATE appointments SET status = 'Pending Release Approval' WHERE patient_id = ? AND status = 'Admitted to Hospital'", [hosp.patient_id]);
  }

  return { id: letterId, status: 'pending_approval', message: 'Release letter request submitted and set to Pending Release Approval.' };
};

const approveReleaseLetter = async (id, adminInfo = {}) => {
  const [rows] = await db.query("SELECT * FROM release_letters WHERE id = ?", [id]);
  if (rows.length === 0) {
    const err = new Error("Release Letter not found.");
    err.statusCode = 404;
    throw err;
  }

  const letter = rows[0];
  if (letter.status === 'approved') {
    const err = new Error("Release letter has already been approved.");
    err.statusCode = 400;
    throw err;
  }

  // Revalidate ALL conditions on backend before approval
  const hosp = await checkReleaseEligibility(letter.patient_id, letter.hospitalization_id);

  const adminName = adminInfo.user_name || adminInfo.name || 'Admin';

  // 1. Update Release Letter status -> approved
  await db.query(`
    UPDATE release_letters 
    SET status = 'approved', approved_by = ?, approved_at = NOW() 
    WHERE id = ?
  `, [adminName, id]);

  // 2. Mark Hospitalization record -> discharged
  await db.query(`
    UPDATE hospitalizations 
    SET status = 'discharged' 
    WHERE id = ?
  `, [hosp.id]);

  // 3. Set Appointment status -> Released
  if (letter.appointment_id) {
    await db.query(`
      UPDATE appointments 
      SET status = 'Released' 
      WHERE id = ?
    `, [letter.appointment_id]);
  }
  await db.query(`
    UPDATE appointments 
    SET status = 'Released' 
    WHERE patient_id = ? AND status IN ('Admitted to Hospital', 'Pending Release Approval')
  `, [hosp.patient_id]);

  // 4. Record discharge and approval details in audit log
  const [patientBills] = await db.query("SELECT id FROM bills WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1", [hosp.patient_id]);
  const auditBillId = patientBills.length > 0 ? patientBills[0].id : null;
  if (auditBillId) {
    await db.query(`
      INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
      VALUES (?, ?, 'Discharge Approved & Release Letter Finalized', 0, 0, ?)
    `, [
      auditBillId,
      adminName,
      `Admin approved inpatient discharge for patient PAT-${hosp.patient_id} (Hospitalization #${hosp.id}). Unpaid balance clear ($0.00). Approved Release Letter #${letter.id}.`
    ]);
  }

  return { success: true, status: 'approved', message: 'Release Letter approved and patient successfully discharged.' };
};

const initiateAndApproveRelease = async (data, adminInfo = {}) => {
  const { hospitalization_id, patient_id } = data;
  
  // 1. Validate eligibility
  const hosp = await checkReleaseEligibility(patient_id, hospitalization_id);

  // 2. Check if a release letter already exists
  const [existing] = await db.query(
    "SELECT * FROM release_letters WHERE hospitalization_id = ?",
    [hosp.id]
  );

  let letterId;
  if (existing.length > 0) {
    letterId = existing[0].id;
  } else {
    const reqRes = await requestReleaseLetter({
      hospitalization_id: hosp.id,
      patient_id: hosp.patient_id,
      doctor_id: hosp.doctor_id,
      appointment_id: hosp.appointment_id,
      ...data
    });
    letterId = reqRes.id;
  }

  // 3. Approve discharge
  return await approveReleaseLetter(letterId, adminInfo);
};

module.exports = {
  getReleaseLettersByPatient,
  getAllReleaseLetters,
  requestReleaseLetter,
  approveReleaseLetter,
  initiateAndApproveRelease,
  checkReleaseEligibility
};
