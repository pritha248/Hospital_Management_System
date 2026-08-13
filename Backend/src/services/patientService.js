const db = require("../config/database");

const getAllPatients = async () => {
  const [rows] = await db.query(`
    SELECT p.*, u.name, u.email, COALESCE(NULLIF(u.phone, ''), NULLIF(p.emergency_contact, '')) AS phone 
    FROM patients p 
    JOIN users u ON p.user_id = u.id 
    ORDER BY p.id DESC
  `);
  return rows;
};

const getPatientById = async (id) => {
  const [patients] = await db.query(`
    SELECT p.*, u.name, u.email, COALESCE(NULLIF(u.phone, ''), NULLIF(p.emergency_contact, '')) AS phone 
    FROM patients p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.id = ? OR p.user_id = ?
  `, [id, id]);

  let patient;
  if (patients.length === 0) {
    // Check if user exists in users table
    const [uRows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (uRows.length > 0 && uRows[0].role?.toLowerCase() === 'patient') {
      const u = uRows[0];
      const [newP] = await db.query(
        "INSERT INTO patients (user_id, age, gender, blood_group, history) VALUES (?, 30, 'Male', 'O+', 'No prior chronic conditions.')",
        [u.id]
      );
      patient = { id: newP.insertId, user_id: u.id, name: u.name, email: u.email, phone: u.phone || null, age: 30, gender: 'Male', blood_group: 'O+', history: 'No prior chronic conditions.' };
    } else {
      const err = new Error("Patient record not found");
      err.statusCode = 404;
      err.status = 404;
      throw err;
    }
  } else {
    patient = patients[0];
  }

  const [appointments] = await db.query(`
    SELECT a.*, ud.name as doctor_name, d.specialization 
    FROM appointments a 
    JOIN doctors d ON a.doctor_id = d.id 
    JOIN users ud ON d.user_id = ud.id
    WHERE a.patient_id = ? 
    ORDER BY a.appointment_date DESC
  `, [patient.id]);

  const [prescriptions] = await db.query(`
    SELECT pr.*, COALESCE(ud.name, 'Dr. Medical Specialist') as doctor_name 
    FROM prescriptions pr 
    LEFT JOIN doctors d ON pr.doctor_id = d.id 
    LEFT JOIN users ud ON d.user_id = ud.id
    WHERE pr.patient_id = ? 
    ORDER BY pr.created_at DESC
  `, [patient.id]);

  const [reports] = await db.query(`
    SELECT * FROM medical_reports 
    WHERE patient_id = ? 
    ORDER BY created_at DESC
  `, [patient.id]);

  return {
    ...patient,
    appointments,
    prescriptions,
    reports
  };
};

const createPatient = async (patientData) => {
  const { user_id, name, age, gender, blood_group, height, weight, allergies, emergency_contact, history } = patientData;
  const [result] = await db.query(`
    INSERT INTO patients (user_id, age, gender, blood_group, height, weight, allergies, emergency_contact, history)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [user_id, age, gender, blood_group, height, weight, allergies, emergency_contact, history]);

  return { id: result.insertId, ...patientData };
};

const updatePatient = async (id, data) => {
  const { age, gender, blood_group, height, weight, allergies, emergency_contact, history } = data;
  await db.query(`
    UPDATE patients 
    SET age = ?, gender = ?, blood_group = ?, height = ?, weight = ?, allergies = ?, emergency_contact = ?, history = ?
    WHERE id = ?
  `, [age, gender, blood_group, height, weight, allergies, emergency_contact, history, id]);
  return { id, ...data };
};

const deletePatient = async (id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Resolve Patient ID and User ID
    const [pRows] = await connection.query("SELECT id, user_id FROM patients WHERE id = ? OR user_id = ?", [id, id]);
    if (pRows.length === 0) {
      const [uRows] = await connection.query("SELECT id FROM users WHERE id = ?", [id]);
      if (uRows.length > 0) {
        await connection.query("DELETE FROM users WHERE id = ?", [id]);
        await connection.commit();
        connection.release();
        return { id, message: "User account purged successfully." };
      }
      connection.release();
      const err = new Error("Patient record not found.");
      err.statusCode = 404;
      throw err;
    }

    const patientId = pRows[0].id;
    const userId = pRows[0].user_id;

    // 2. Active Appointment Check
    // Check if any appointment for this patient is not Completed or Cancelled (e.g. pending, confirmed, in_consultation)
    const [activeApts] = await connection.query(
      "SELECT * FROM appointments WHERE patient_id = ? AND status NOT IN ('completed', 'cancelled')",
      [patientId]
    );

    if (activeApts.length > 0) {
      await connection.rollback();
      connection.release();
      const err = new Error("You have an active appointment. Complete or cancel it before deleting your account.");
      err.statusCode = 400;
      throw err;
    }

    // 3. Unpaid Bill Check (Check for actual remaining payable balance > 0)
    const [unpaidBills] = await connection.query(
      "SELECT * FROM bills WHERE patient_id = ? AND status != 'paid' AND COALESCE(patient_payable, total_amount) > 0",
      [patientId]
    );

    if (unpaidBills.length > 0) {
      const totalUnpaid = unpaidBills.reduce((acc, b) => acc + parseFloat(b.patient_payable !== null ? b.patient_payable : b.total_amount), 0);
      if (totalUnpaid > 0) {
        await connection.rollback();
        connection.release();
        const err = new Error(`Your account cannot be deleted because you have an unpaid balance of $${totalUnpaid.toFixed(2)}. Please complete all pending payments first.`);
        err.statusCode = 400;
        throw err;
      }
    }

    // 4. Perform complete transactional purge in correct dependency order
    await connection.query("DELETE FROM hospitalizations WHERE patient_id = ?", [patientId]);
    await connection.query("DELETE FROM bill_audit_logs WHERE bill_id IN (SELECT id FROM bills WHERE patient_id = ?) OR user_id = ?", [patientId, userId || 0]);
    await connection.query("DELETE FROM insurance_claims WHERE patient_id = ?", [patientId]);
    await connection.query("DELETE FROM bills WHERE patient_id = ?", [patientId]);
    await connection.query("DELETE FROM prescriptions WHERE patient_id = ?", [patientId]);
    await connection.query("DELETE FROM appointments WHERE patient_id = ?", [patientId]);
    await connection.query("DELETE FROM medical_reports WHERE patient_id = ?", [patientId]);
    await connection.query("DELETE FROM patients WHERE id = ?", [patientId]);

    if (userId) {
      await connection.query("DELETE FROM users WHERE id = ?", [userId]);
    }

    await connection.commit();
    connection.release();
    return { id: patientId, message: "Patient profile, user credentials, and all health records purged successfully." };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
};
