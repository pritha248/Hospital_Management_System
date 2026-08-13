const db = require("../config/database");

const getAllDoctors = async () => {
  const [rows] = await db.query(`
    SELECT d.*, u.name, u.email 
    FROM doctors d 
    JOIN users u ON d.user_id = u.id 
    ORDER BY d.id ASC
  `);
  return rows;
};

const getDoctorById = async (id) => {
  const [doctors] = await db.query(`
    SELECT d.*, u.name, u.email 
    FROM doctors d 
    JOIN users u ON d.user_id = u.id 
    WHERE d.id = ? OR d.user_id = ?
  `, [id, id]);

  let doctor;
  if (doctors.length === 0) {
    const [uRows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (uRows.length > 0) {
      const u = uRows[0];
      const [newD] = await db.query(
        "INSERT INTO doctors (user_id, specialization, qualification) VALUES (?, 'General Medicine', 'MD')",
        [u.id]
      );
      doctor = { id: newD.insertId, user_id: u.id, name: u.name, specialization: 'General Medicine', qualification: 'MD', experience_years: 5, consultation_fee: 100.00 };
    } else {
      throw new Error("Doctor not found");
    }
  } else {
    doctor = doctors[0];
  }

  const [appointments] = await db.query(`
    SELECT a.*, up.name as patient_name, p.age, p.gender, p.blood_group 
    FROM appointments a 
    JOIN patients p ON a.patient_id = p.id 
    JOIN users up ON p.user_id = up.id
    WHERE a.doctor_id = ? 
    ORDER BY a.appointment_date DESC
  `, [doctor.id]);

  return { ...doctor, appointments };
};

const createDoctor = async (data) => {
  const { user_id, name, specialization, qualification, experience_years, consultation_fee, available_days, bio } = data;
  const [result] = await db.query(`
    INSERT INTO doctors (user_id, specialization, qualification, experience_years, consultation_fee, available_days, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [user_id, specialization, qualification, experience_years, consultation_fee, available_days, bio]);
  return { id: result.insertId, ...data };
};

const updateDoctor = async (id, data) => {
  const { name, specialization, qualification, experience_years, consultation_fee, available_days, bio } = data;
  
  if (name) {
    await db.query(`
      UPDATE users u 
      JOIN doctors d ON u.id = d.user_id 
      SET u.name = ? 
      WHERE d.id = ? OR d.user_id = ?
    `, [name, id, id]);
  }

  await db.query(`
    UPDATE doctors 
    SET specialization = COALESCE(?, specialization),
        qualification = COALESCE(?, qualification),
        experience_years = COALESCE(?, experience_years),
        consultation_fee = COALESCE(?, consultation_fee),
        available_days = COALESCE(?, available_days),
        bio = COALESCE(?, bio)
    WHERE id = ? OR user_id = ?
  `, [
    specialization ?? null,
    qualification ?? null,
    experience_years ?? null,
    consultation_fee ?? null,
    available_days ?? null,
    bio ?? null,
    id, id
  ]);

  return { id, ...data };
};

const deleteDoctor = async (id) => {
  const [dRows] = await db.query("SELECT id, user_id FROM doctors WHERE id = ? OR user_id = ?", [id, id]);
  if (dRows.length === 0) {
    const err = new Error("Doctor profile not found.");
    err.statusCode = 404;
    throw err;
  }

  const docId = dRows[0].id;
  const userId = dRows[0].user_id;

  // 1. Check if doctor has any active hospitalizations pending or approved
  const [activeHosps] = await db.query(`
    SELECT * FROM hospitalizations 
    WHERE doctor_id = ? AND status IN ('pending_approval', 'approved')
  `, [docId]);

  if (activeHosps.length > 0) {
    const err = new Error("Cannot delete doctor profile: A patient is currently admitted or awaiting admission approval under your care and has not yet been released.");
    err.statusCode = 400;
    throw err;
  }

  // 2. Check all appointments assigned to doctor
  // Terminal statuses are ONLY: 'Completed', 'Released', 'No Admission Can Be Done Here'
  const [nonTerminalApts] = await db.query(`
    SELECT * FROM appointments 
    WHERE doctor_id = ? AND status NOT IN ('Completed', 'completed', 'Released', 'released', 'No Admission Can Be Done Here', 'cancelled')
  `, [docId]);

  if (nonTerminalApts.length > 0) {
    const activeStatuses = [...new Set(nonTerminalApts.map(a => a.status))].join(', ');
    const err = new Error(`Cannot delete doctor profile: You have active clinical responsibilities. Appointments exist in non-terminal status ('${activeStatuses}'). Every assigned patient must reach either 'Completed', 'Released', or 'No Admission Can Be Done Here' status before profile deletion.`);
    err.statusCode = 400;
    throw err;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query("DELETE FROM prescriptions WHERE doctor_id = ?", [docId]);
    await connection.query("DELETE FROM appointments WHERE doctor_id = ?", [docId]);
    await connection.query("DELETE FROM doctors WHERE id = ?", [docId]);

    if (userId) {
      await connection.query("DELETE FROM users WHERE id = ?", [userId]);
    }

    await connection.commit();
    connection.release();
    return { id: docId, message: "Doctor profile deleted successfully." };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
};

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor };
