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

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient
};
