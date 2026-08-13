const db = require("../config/database");

const getAllAppointments = async (filters = {}) => {
  let query = `
    SELECT a.*, up.name as patient_name, p.age, p.gender, ud.name as doctor_name, d.specialization
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users up ON p.user_id = up.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
  `;
  const params = [];

  if (filters.patient_id) {
    query += " WHERE a.patient_id = ?";
    params.push(filters.patient_id);
  } else if (filters.doctor_id) {
    query += " WHERE a.doctor_id = ?";
    params.push(filters.doctor_id);
  }

  query += " ORDER BY a.appointment_date DESC, a.appointment_time ASC";

  const [rows] = await db.query(query, params);
  return rows;
};

const createAppointment = async (data) => {
  const { patient_id, doctor_id, appointment_date, appointment_time, reason, notes } = data;

  // 1. Fetch Doctor details from database to ensure fresh working days validation
  const [docRows] = await db.query(`
    SELECT d.*, u.name as doctor_name 
    FROM doctors d 
    JOIN users u ON d.user_id = u.id 
    WHERE d.id = ?
  `, [doctor_id]);

  if (docRows.length === 0) {
    const err = new Error("Selected doctor does not exist.");
    err.statusCode = 400;
    throw err;
  }

  const doctor = docRows[0];
  const rawWorkingDays = doctor.available_days || 'Mon,Tue,Wed,Thu,Fri';
  const availableDaysList = rawWorkingDays.split(',').map(d => d.trim());

  // 2. Parse selected appointment_date
  const [year, month, day] = appointment_date.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day);

  const dayAbbrs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayFullNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const dayIndex = selectedDate.getDay();
  const dayAbbr = dayAbbrs[dayIndex];
  const dayFull = dayFullNames[dayIndex];

  // 3. Validate day of week against doctor's working schedule
  if (!availableDaysList.includes(dayAbbr)) {
    const errorMsg = `${doctor.doctor_name} is not available on ${dayFull}s. Please select one of the available working days (${rawWorkingDays}).`;
    const err = new Error(errorMsg);
    err.statusCode = 400;
    throw err;
  }

  // 4. Insert appointment if valid
  const [result] = await db.query(`
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status, notes)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `, [patient_id, doctor_id, appointment_date, appointment_time, reason, notes || '']);

  return { id: result.insertId, ...data, status: 'pending' };
};

const billingService = require("./billingService");

const updateAppointmentStatus = async (id, status, notes) => {
  await db.query(`
    UPDATE appointments 
    SET status = ?, notes = COALESCE(?, notes)
    WHERE id = ?
  `, [status, notes, id]);

  if (status === 'completed') {
    try {
      await billingService.autoGenerateBillForCompletedAppointment(id);
    } catch (billErr) {
      console.error("Auto bill generation error:", billErr.message);
    }
  }

  return { id, status };
};

const deleteAppointment = async (id) => {
  const [result] = await db.query("DELETE FROM appointments WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    throw new Error("Appointment not found");
  }
  return { id };
};

const resubmitLaterAdmissionRequest = async (appointmentId) => {
  const [apts] = await db.query("SELECT * FROM appointments WHERE id = ?", [appointmentId]);
  if (apts.length === 0) {
    const err = new Error("Appointment not found.");
    err.statusCode = 404;
    throw err;
  }

  const apt = apts[0];

  if (apt.status !== 'Rejected Admission Request') {
    const err = new Error(`Cannot resubmit admission request for appointment in '${apt.status}' status.`);
    err.statusCode = 400;
    throw err;
  }

  if (apt.admission_rejection_count >= 2) {
    await db.query("UPDATE appointments SET status = 'No Admission Can Be Done Here' WHERE id = ?", [appointmentId]);
    const err = new Error("No further admission requests can be submitted. Maximum admission rejections reached for this hospital.");
    err.statusCode = 400;
    throw err;
  }

  // Check 24-hour waiting period
  if (apt.last_rejection_at) {
    const lastRejectionTime = new Date(apt.last_rejection_at).getTime();
    const nowTime = Date.now();
    const hoursElapsed = (nowTime - lastRejectionTime) / (1000 * 60 * 60);

    if (hoursElapsed < 24) {
      const hoursLeft = Math.ceil(24 - hoursElapsed);
      const err = new Error(`A 24-hour waiting period is required before resubmitting an admission request. Please wait ${hoursLeft} more hour(s).`);
      err.statusCode = 400;
      throw err;
    }
  }

  // Find existing hospitalization record for this appointment
  const [hospRows] = await db.query("SELECT * FROM hospitalizations WHERE appointment_id = ? ORDER BY created_at DESC LIMIT 1", [appointmentId]);
  if (hospRows.length > 0) {
    await db.query("UPDATE hospitalizations SET status = 'pending_approval' WHERE id = ?", [hospRows[0].id]);
    if (hospRows[0].prescription_id) {
      await db.query("UPDATE prescriptions SET admission_status = 'pending_approval' WHERE id = ?", [hospRows[0].prescription_id]);
    }
  }

  // Update appointment status back to "Pending Admin Approval for Admission"
  await db.query(`
    UPDATE appointments 
    SET status = 'Pending Admin Approval for Admission', resubmitted_at = NOW() 
    WHERE id = ?
  `, [appointmentId]);

  return { success: true, message: "Later Admission Request resubmitted successfully to Admin.", appointment_id: appointmentId };
};

module.exports = { getAllAppointments, createAppointment, updateAppointmentStatus, deleteAppointment, resubmitLaterAdmissionRequest };
