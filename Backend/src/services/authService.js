const db = require("../config/database");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const fs = require("fs");
const path = require("path");

const registerUser = async (userData) => {
  const { 
    name, email, password, role = 'patient', phone = '',
    // Patient Profile Fields
    age, gender, blood_group, height, weight, allergies, emergency_contact, history,
    // Doctor Profile Fields
    specialization, qualification, experience_years, consultation_fee, available_days, bio
  } = userData;

  const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

  if (existingUser.length > 0) {
    throw new Error("Email already registered");
  }

  // Explicitly generate unique salt and hash password
  const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, salt);

  const dbRole = (role === 'manager' || role === 'admin') ? 'admin' : role;

  // Use database connection transaction to ensure atomic multi-table updates
  const connection = await db.getConnection();
  let patientId = null;
  let doctorId = null;

  try {
    await connection.beginTransaction();

    // 1. Update users table
    const [userResult] = await connection.query(
      "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, dbRole, phone]
    );

    const userId = userResult.insertId;

    // 2. Update role-specific table (patients or doctors) immediately
    if (role === 'patient') {
      const [pResult] = await connection.query(`
        INSERT INTO patients (user_id, age, gender, blood_group, height, weight, allergies, emergency_contact, history)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        age || 30,
        gender || 'Male',
        blood_group || 'O+',
        height || '',
        weight || '',
        allergies || 'None',
        emergency_contact || '',
        history || 'No prior chronic conditions.'
      ]);
      patientId = pResult.insertId;
    } else if (role === 'doctor') {
      const [dResult] = await connection.query(`
        INSERT INTO doctors (user_id, specialization, qualification, experience_years, consultation_fee, available_days, bio)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        specialization || 'General Medicine',
        qualification || 'MD',
        experience_years || 5,
        consultation_fee || 100.00,
        available_days || 'Mon,Tue,Wed,Thu,Fri',
        bio || ''
      ]);
      doctorId = dResult.insertId;
    }

    await connection.commit();
    connection.release();

    const userObj = {
      id: userId,
      patientId,
      doctorId,
      name,
      email,
      role: dbRole,
      avatar: null
    };

    const token = generateToken(userObj);

    return {
      token,
      user: userObj
    };

  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

const loginUser = async (email, password) => {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

  if (rows.length === 0) {
    throw new Error("User not found");
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid password");
  }

  let patientId = null;
  let doctorId = null;

  if (user.role === 'patient') {
    const [p] = await db.query("SELECT id FROM patients WHERE user_id = ?", [user.id]);
    if (p.length > 0) patientId = p[0].id;
  } else if (user.role === 'doctor') {
    const [d] = await db.query("SELECT id FROM doctors WHERE user_id = ?", [user.id]);
    if (d.length > 0) doctorId = d[0].id;
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      patientId,
      doctorId,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  };
};

const updateAvatar = async (userId, avatarUrl) => {
  await db.query("UPDATE users SET avatar = ? WHERE id = ?", [avatarUrl, userId]);
  const [rows] = await db.query("SELECT id, name, email, role, avatar FROM users WHERE id = ?", [userId]);
  return rows[0];
};

module.exports = {
  registerUser,
  loginUser,
  updateAvatar
};