const db = require("../config/database");
const aiService = require("./aiService");

const getAllPrescriptions = async (filters = {}) => {
  let query = `
    SELECT pr.*, 
           COALESCE(up.name, 'Patient') as patient_name, 
           COALESCE(ud.name, 'Dr. Medical Specialist') as doctor_name, 
           COALESCE(d.specialization, 'General Medicine') as specialization 
    FROM prescriptions pr 
    LEFT JOIN patients p ON pr.patient_id = p.id 
    LEFT JOIN users up ON p.user_id = up.id
    LEFT JOIN doctors d ON pr.doctor_id = d.id
    LEFT JOIN users ud ON d.user_id = ud.id
  `;
  const params = [];

  if (filters.patient_id) {
    query += " WHERE (pr.patient_id = ? OR p.user_id = ?)";
    params.push(filters.patient_id, filters.patient_id);
  } else if (filters.role === 'doctor' || filters.isDoctor) {
    // Doctors must select a patient to view prescriptions. Prescriptions of other patients are never displayed.
    return [];
  } else if (filters.doctor_id) {
    query += " WHERE (pr.doctor_id = ? OR d.user_id = ?)";
    params.push(filters.doctor_id, filters.doctor_id);
  }

  query += " ORDER BY pr.created_at DESC";

  const [rows] = await db.query(query, params);

  return rows.map(row => ({
    ...row,
    medicines: typeof row.medicines === 'string' ? JSON.parse(row.medicines) : row.medicines
  }));
};

const createPrescription = async (data) => {
  const { 
    appointment_id, 
    patient_id, 
    doctor_id, 
    diagnosis, 
    medicines, 
    instructions, 
    diagnostic_tests, 
    test_ids,
    recommend_admission,
    admission_type,
    admission_days,
    daily_room_rate,
    follow_up_date 
  } = data;

  if (!patient_id) {
    const err = new Error("Patient selection is required to create a prescription.");
    err.status = 400;
    err.statusCode = 400;
    throw err;
  }

  // Resolve and validate patient_id from patients or users table
  const [patMatches] = await db.query(`
    SELECT id FROM patients WHERE id = ? OR user_id = ?
  `, [patient_id, patient_id]);

  if (patMatches.length === 0) {
    const err = new Error("Selected patient does not exist.");
    err.status = 400;
    err.statusCode = 400;
    throw err;
  }
  const validPatientId = patMatches[0].id;

  const medsJson = typeof medicines === 'string' ? medicines : JSON.stringify(medicines);
  const testIdsJson = test_ids ? (typeof test_ids === 'string' ? test_ids : JSON.stringify(test_ids)) : null;

  // Resolve doctor_id to valid doctors.id if user_id was passed
  let validDoctorId = doctor_id;
  let docName = 'Doctor';
  if (doctor_id) {
    const [docMatches] = await db.query(`
      SELECT d.id, u.name 
      FROM doctors d 
      LEFT JOIN users u ON d.user_id = u.id 
      WHERE d.id = ? OR d.user_id = ?
    `, [doctor_id, doctor_id]);
    if (docMatches.length > 0) {
      validDoctorId = docMatches[0].id;
      docName = docMatches[0].name || 'Doctor';
    }
  }

  const finalAdmissionType = admission_type || (recommend_admission ? 'New Admission' : 'None');
  const isAdmissionRecommended = recommend_admission || (finalAdmissionType !== 'None');
  const admissionStatus = isAdmissionRecommended ? 'pending_approval' : 'none';
  const days = parseInt(admission_days, 10) || 0;
  const roomRate = parseFloat(daily_room_rate) || 150.00;

  // 1. Insert prescription into database
  const [result] = await db.query(`
    INSERT INTO prescriptions (
      appointment_id, patient_id, doctor_id, diagnosis, medicines, instructions, 
      diagnostic_tests, test_ids, recommend_admission, admission_type, admission_days, daily_room_rate, admission_status, follow_up_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    appointment_id || null, 
    validPatientId, 
    validDoctorId, 
    diagnosis, 
    medsJson, 
    instructions || '', 
    diagnostic_tests || '', 
    testIdsJson,
    isAdmissionRecommended ? 1 : 0,
    finalAdmissionType,
    days,
    roomRate,
    admissionStatus,
    follow_up_date || null
  ]);

  const prescriptionId = result.insertId;

  // 2. If doctor recommends admission or readmission, create a record in hospitalizations table (Pending Admin Approval)
  if (isAdmissionRecommended && days > 0) {
    const totalEstCharge = days * roomRate;
    await db.query(`
      INSERT INTO hospitalizations (
        prescription_id, patient_id, doctor_id, appointment_id,
        admission_type, admission_days, daily_room_rate, total_charge, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval')
    `, [prescriptionId, validPatientId, validDoctorId, appointment_id || null, finalAdmissionType, days, roomRate, totalEstCharge]);
  }

  const billingService = require("./billingService");

  // 3. Resolve appointment status & trigger per-prescription visit bill generation
  let targetAptId = appointment_id;
  if (!targetAptId && validPatientId && validDoctorId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [matchingApts] = await db.query(
      "SELECT id FROM appointments WHERE patient_id = ? AND doctor_id = ? ORDER BY created_at DESC LIMIT 1",
      [validPatientId, validDoctorId]
    );
    if (matchingApts.length > 0) {
      targetAptId = matchingApts[0].id;
      await db.query("UPDATE prescriptions SET appointment_id = ? WHERE id = ?", [targetAptId, prescriptionId]);
    } else {
      const [newApt] = await db.query(`
        INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status, notes)
        VALUES (?, ?, ?, '10:00 AM', 'Consultation', 'completed', 'Auto-generated for consultation prescription')
      `, [validPatientId, validDoctorId, todayStr]);
      targetAptId = newApt.insertId;
      await db.query("UPDATE prescriptions SET appointment_id = ? WHERE id = ?", [targetAptId, prescriptionId]);
    }
  }

  if (targetAptId) {
    const newAptStatus = isAdmissionRecommended ? 'Pending Admin Approval for Admission' : 'Completed';
    await db.query("UPDATE appointments SET status = ? WHERE id = ?", [newAptStatus, targetAptId]);
  }

  // Generate unique per-prescription date & time visit invoice
  try {
    await billingService.autoGenerateBillForPrescription(prescriptionId, { 
      name: docName, 
      action: 'Added Prescription & Tests',
      reason: 'Automatically generated date-wise visit invoice for newly issued prescription'
    });
  } catch (bErr) {
    console.error("Auto bill generation on prescription error:", bErr.message);
  }

  // 4. Trigger AI Drug Interaction Safety Check asynchronously in background
  setImmediate(async () => {
    try {
      await aiService.checkDrugInteractions(medicines, patient_id);
    } catch (aiErr) {
      console.error("Background AI Safety check error:", aiErr.message);
    }
  });

  return {
    id: prescriptionId,
    ...data,
    admission_type: finalAdmissionType,
    recommend_admission: isAdmissionRecommended ? 1 : 0,
    admission_status: admissionStatus
  };
};

const deletePrescription = async (id, actorInfo = {}) => {
  const err = new Error("Prescriptions cannot be deleted once created.");
  err.statusCode = 403;
  throw err;
};

module.exports = { getAllPrescriptions, createPrescription, deletePrescription };
