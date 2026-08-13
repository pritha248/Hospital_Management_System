const db = require("./database");

async function initDb() {
  try {
    console.log("🔄 Initializing EMR Database Schema...");

    // 1. Users Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
        phone VARCHAR(50),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Patients Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        age INT NOT NULL,
        gender ENUM('Male', 'Female', 'Other') NOT NULL,
        blood_group VARCHAR(10),
        height VARCHAR(20),
        weight VARCHAR(20),
        allergies TEXT,
        emergency_contact VARCHAR(100),
        history TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 3. Doctors Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        specialization VARCHAR(255) NOT NULL,
        qualification VARCHAR(255),
        experience_years INT DEFAULT 5,
        consultation_fee DECIMAL(10, 2) DEFAULT 100.00,
        available_days VARCHAR(255) DEFAULT 'Mon,Tue,Wed,Thu,Fri',
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 4. Appointments Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time VARCHAR(50) NOT NULL,
        reason VARCHAR(255),
        status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      );
    `);

    // 5. Prescriptions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        diagnosis VARCHAR(255) NOT NULL,
        medicines JSON NOT NULL,
        instructions TEXT,
        diagnostic_tests TEXT,
        follow_up_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      );
    `);

    try {
      await db.query("ALTER TABLE prescriptions ADD COLUMN diagnostic_tests TEXT NULL");
    } catch (e) {}

    // 6. Medical Reports Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS medical_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        report_type VARCHAR(100) NOT NULL,
        file_url VARCHAR(255) NOT NULL,
        parsed_text TEXT,
        ai_summary TEXT,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    // 7. Medicines & Interactions Tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100),
        dosage_form VARCHAR(50),
        description TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS drug_interactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        drug_a VARCHAR(255) NOT NULL,
        drug_b VARCHAR(255) NOT NULL,
        severity ENUM('High', 'Moderate', 'Low') NOT NULL,
        description TEXT NOT NULL
      );
    `);

    // Seed drug_interactions table if empty
    const [existingInteractions] = await db.query("SELECT COUNT(*) as count FROM drug_interactions");
    if (existingInteractions[0].count === 0) {
      await db.query(`
        INSERT INTO drug_interactions (drug_a, drug_b, severity, description) VALUES
        ('Warfarin', 'Aspirin', 'High', 'Concurrent use of Warfarin and Aspirin significantly increases the risk of severe gastrointestinal and systemic bleeding due to dual anticoagulant and antiplatelet inhibition.'),
        ('Warfarin', 'Heparin', 'High', 'Dual anticoagulation with Warfarin and Heparin markedly elevates hemorrhage risk. Requires strict INR and aPTT monitoring.'),
        ('Warfarin', 'Ibuprofen', 'High', 'NSAIDs such as Ibuprofen inhibit platelet aggregation and cause gastric mucosal injury, dramatically heightening bleeding risk when combined with Warfarin.'),
        ('Warfarin', 'Clarithromycin', 'High', 'Clarithromycin inhibits CYP3A4 and P-glycoprotein, significantly elevating Warfarin blood concentrations and INR levels.'),
        ('Lisinopril', 'Spironolactone', 'High', 'Combining Lisinopril (ACE inhibitor) and Spironolactone (potassium-sparing diuretic) can lead to severe, life-threatening hyperkalemia.'),
        ('Lisinopril', 'Potassium', 'High', 'Potassium supplements combined with Lisinopril induce severe hyperkalemia leading to cardiac dysrhythmias.'),
        ('Amoxicillin', 'Allopurinol', 'High', 'Co-administration of Amoxicillin and Allopurinol significantly increases the incidence of severe hypersensitivity skin rashes.'),
        ('Sildenafil', 'Nitroglycerin', 'High', 'CONTRAINDICATED: Sildenafil potentiates the hypotensive effects of Nitroglycerin, potentially causing profound, fatal drops in blood pressure.'),
        ('Simvastatin', 'Clarithromycin', 'High', 'Clarithromycin potently inhibits CYP3A4 metabolism of Simvastatin, leading to elevated statin levels and high risk of rhabdomyolysis and acute renal failure.'),
        ('Tramadol', 'Fluoxetine', 'High', 'Combining Tramadol with Fluoxetine (SSRI) increases the risk of Serotonin Syndrome and lowers the seizure threshold.'),
        ('Methotrexate', 'Ibuprofen', 'High', 'NSAIDs like Ibuprofen reduce renal clearance of Methotrexate, precipitating severe Methotrexate toxicity and bone marrow suppression.'),
        ('Digoxin', 'Amiodarone', 'High', 'Amiodarone reduces Digoxin clearance, doubling serum Digoxin concentrations and predisposing to cardiac arrhythmias.'),
        ('Metformin', 'Contrast Media', 'High', 'Iodinated contrast media combined with Metformin can precipitate acute renal failure and severe lactic acidosis.'),
        ('Ciprofloxacin', 'Antacids', 'Moderate', 'Aluminum or Magnesium antacids chelate Ciprofloxacin in the GI tract, drastically reducing oral absorption and antibacterial efficacy.'),
        ('Sertraline', 'Ibuprofen', 'Moderate', 'Combining Sertraline (SSRI) with NSAIDs like Ibuprofen increases the risk of upper gastrointestinal ulceration and bleeding.'),
        ('Metformin', 'Alcohol', 'Moderate', 'Acute or chronic alcohol ingestion potentiates Metformin effect on lactate metabolism, elevating lactic acidosis risk.')
      `);
      console.log("✅ Seeded initial drug_interactions data.");
    }

    // 8. Bills & Insurance Claims Tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        appointment_id INT,
        total_amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'paid', 'partially_paid') DEFAULT 'pending',
        line_items JSON,
        payment_method VARCHAR(50),
        payment_date TIMESTAMP NULL,
        transaction_id VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    // Ensure columns exist on already created tables
    try {
      await db.query("ALTER TABLE bills ADD COLUMN visit_date TIMESTAMP NULL");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE bills ADD COLUMN payment_date TIMESTAMP NULL");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE bills ADD COLUMN transaction_id VARCHAR(100) NULL");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE bills MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE bills ADD COLUMN insurance_claimed DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE bills ADD COLUMN insurance_used DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE bills ADD COLUMN patient_payable DECIMAL(10, 2) DEFAULT NULL");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE bills ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE bills ADD COLUMN deduction_amount DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}

    await db.query(`
      CREATE TABLE IF NOT EXISTS insurance_claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        bill_id INT NULL,
        provider_name VARCHAR(255) NOT NULL,
        policy_number VARCHAR(100) NOT NULL,
        coverage_amount DECIMAL(10, 2) DEFAULT 0.00,
        amount_claimed DECIMAL(10, 2) NOT NULL,
        amount_approved DECIMAL(10, 2) DEFAULT 0.00,
        amount_used DECIMAL(10, 2) DEFAULT 0.00,
        remaining_coverage DECIMAL(10, 2) DEFAULT 0.00,
        patient_payable_amount DECIMAL(10, 2) DEFAULT 0.00,
        status ENUM('submitted', 'under_review', 'approved', 'rejected') DEFAULT 'submitted',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    try {
      await db.query("ALTER TABLE insurance_claims ADD COLUMN claim_amount DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims MODIFY COLUMN claim_amount DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims MODIFY COLUMN status VARCHAR(50) DEFAULT 'submitted'");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims ADD COLUMN bill_id INT NULL");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims ADD COLUMN coverage_amount DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims ADD COLUMN amount_claimed DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims ADD COLUMN amount_approved DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims ADD COLUMN amount_used DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims ADD COLUMN remaining_coverage DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE insurance_claims ADD COLUMN patient_payable_amount DECIMAL(10, 2) DEFAULT 0.00");
    } catch (e) {}

    // 9. Master Diagnostic Tests Catalog Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS diagnostic_tests_catalog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        department VARCHAR(100) NOT NULL,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Master Diagnostic Tests Catalog if empty
    const [existingTests] = await db.query("SELECT COUNT(*) as count FROM diagnostic_tests_catalog");
    if (existingTests[0].count === 0) {
      await db.query(`
        INSERT INTO diagnostic_tests_catalog (test_name, category, description, price, department, status) VALUES
        ('ECG (Electrocardiogram)', 'Cardiology', '12-lead electrical activity trace of heart cardiac rhythm', 50.00, 'Cardiology', 'Active'),
        ('Complete Blood Count (CBC)', 'Hematology', 'Full blood count analyzing WBC, RBC, hemoglobin & platelets', 35.00, 'Hematology', 'Active'),
        ('Chest X-Ray (PA View)', 'Radiology', 'Posterior-anterior chest radiograph for lung & cardiac imaging', 75.00, 'Radiology', 'Active'),
        ('Comprehensive Metabolic Panel (CMP)', 'Pathology', 'Assesses electrolyte, renal, hepatic, and blood glucose balance', 45.00, 'Pathology', 'Active'),
        ('MRI Brain Scan', 'Radiology', 'High-resolution magnetic resonance imaging of brain parenchyma', 250.00, 'Radiology', 'Active'),
        ('Lipid Profile Panel', 'Biochemistry', 'Total cholesterol, HDL, LDL, and triglycerides serum test', 40.00, 'Biochemistry', 'Active'),
        ('Echocardiogram (2D Echo)', 'Cardiology', 'Ultrasound cardiac imaging assessing ejection fraction & valves', 120.00, 'Cardiology', 'Active'),
        ('CT Scan Abdomen', 'Radiology', 'Computed tomography of abdomen and pelvis with contrast', 200.00, 'Radiology', 'Active'),
        ('Thyroid Function Test (TSH)', 'Endocrinology', 'Serum thyroid stimulating hormone quantitative assay', 30.00, 'Endocrinology', 'Active')
      `);
      console.log("✅ Seeded Master Diagnostic Tests Catalog.");
    }

    // 10. Bill Audit Logs Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bill_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        user_id INT,
        user_name VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        previous_amount DECIMAL(10, 2) NOT NULL,
        new_amount DECIMAL(10, 2) NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      );
    `);

    // 11. Hospitalization Requests & Record Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS hospitalizations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prescription_id INT NOT NULL,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        appointment_id INT NULL,
        bill_id INT NULL,
        admission_type VARCHAR(50) NOT NULL DEFAULT 'New Admission',
        admission_days INT NOT NULL DEFAULT 1,
        daily_room_rate DECIMAL(10, 2) NOT NULL DEFAULT 150.00,
        total_charge DECIMAL(10, 2) NOT NULL DEFAULT 150.00,
        status VARCHAR(50) DEFAULT 'pending_approval',
        approved_by VARCHAR(255) NULL,
        approved_at TIMESTAMP NULL,
        admin_remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    // Ensure admission columns exist in prescriptions
    try {
      await db.query("ALTER TABLE prescriptions ADD COLUMN recommend_admission BOOLEAN DEFAULT FALSE");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE prescriptions ADD COLUMN admission_days INT DEFAULT 0");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE prescriptions ADD COLUMN daily_room_rate DECIMAL(10, 2) DEFAULT 150.00");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE prescriptions ADD COLUMN admission_type VARCHAR(50) DEFAULT 'None'");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE prescriptions ADD COLUMN admission_status VARCHAR(50) DEFAULT 'none'");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE prescriptions ADD COLUMN test_ids JSON NULL");
    } catch (e) {}

    // Ensure admission rejection tracking columns exist in appointments
    try {
      await db.query("ALTER TABLE appointments MODIFY COLUMN status VARCHAR(100) DEFAULT 'pending'");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE appointments ADD COLUMN admission_rejection_count INT DEFAULT 0");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE appointments ADD COLUMN last_rejection_at TIMESTAMP NULL");
    } catch (e) {}
    try {
      await db.query("ALTER TABLE appointments ADD COLUMN resubmitted_at TIMESTAMP NULL");
    } catch (e) {}

    // Ensure prescription_id column exists in bills
    try {
      await db.query("ALTER TABLE bills ADD COLUMN prescription_id INT NULL");
    } catch (e) {}

    // 12. Release Letters Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS release_letters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hospitalization_id INT NOT NULL,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        appointment_id INT NULL,
        discharge_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        diagnosis TEXT NULL,
        treatment_summary TEXT NULL,
        discharge_instructions TEXT NULL,
        doctor_name VARCHAR(255) NULL,
        status VARCHAR(50) DEFAULT 'pending_approval',
        approved_by VARCHAR(255) NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hospitalization_id) REFERENCES hospitalizations(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Tables verified/created.");
  } catch (error) {
    console.error("❌ Error initializing database tables:", error);
  }
};

module.exports = initDb;
