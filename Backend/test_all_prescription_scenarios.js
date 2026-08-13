const mysql = require('mysql2/promise');

async function testAllScenarios() {
  console.log("==========================================");
  console.log("TESTING ALL PRESCRIPTION & INVOICE SCENARIOS");
  console.log("==========================================");

  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Pritha@123',
    database: 'healthcare_emr'
  });

  try {
    const [pRows] = await connection.query("SELECT p.id, p.user_id, u.name FROM patients p JOIN users u ON p.user_id = u.id LIMIT 1");
    const [dRows] = await connection.query("SELECT d.id, d.user_id FROM doctors d LIMIT 1");
    
    if (pRows.length === 0 || dRows.length === 0) {
      console.error("No patient or doctor found in database!");
      return;
    }

    const patId = pRows[0].id;
    const patUserId = pRows[0].user_id;
    const docId = dRows[0].id;
    const docUserId = dRows[0].user_id;

    console.log(`[DATA] Patient id=${patId}, user_id=${patUserId}. Doctor id=${docId}, user_id=${docUserId}`);

    // SCENARIO 1: Basic prescription with medicines only (no tests, no admission)
    console.log("\n--- SCENARIO 1: Prescription with medicines only ---");
    const res1 = await fetch("http://localhost:5000/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patId,
        doctor_id: docUserId, // passing doctor's user_id
        diagnosis: "Hypertension Routine Check",
        medicines: [{ name: "Amlodipine 5mg", dosage: "1 tab", frequency: "Daily", duration: "30 days" }],
        instructions: "Take in morning.",
        diagnostic_tests: "",
        test_ids: [],
        recommend_admission: false,
        admission_type: "None",
        admission_days: 0
      })
    });
    const data1 = await res1.json();
    console.log("Scenario 1 HTTP status:", res1.status, "Response:", data1);

    if (res1.ok && data1.success) {
      const rxId1 = data1.data.id;
      // Check if bill was generated for scenario 1
      const [bills1] = await connection.query("SELECT * FROM bills WHERE prescription_id = ?", [rxId1]);
      console.log(`Scenario 1 Bill generated? Count: ${bills1.length}`);
      if (bills1.length > 0) {
        console.log("  Bill Item:", bills1[0].id, "Total:", bills1[0].total_amount, "Line Items:", bills1[0].line_items);
      }
    }

    // SCENARIO 2: Prescription with tests & admission recommended
    console.log("\n--- SCENARIO 2: Prescription with tests & recommended admission ---");
    const res2 = await fetch("http://localhost:5000/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patId,
        doctor_id: docId,
        diagnosis: "Severe Pneumonia",
        medicines: [{ name: "Azithromycin 500mg", dosage: "1 tab", frequency: "Daily", duration: "5 days" }],
        instructions: "Rest and fluids.",
        diagnostic_tests: "Chest X-Ray, Blood Culture",
        test_ids: [],
        recommend_admission: true,
        admission_type: "New Admission",
        admission_days: 3,
        daily_room_rate: 150.00
      })
    });
    const data2 = await res2.json();
    console.log("Scenario 2 HTTP status:", res2.status, "Response:", data2);

    if (res2.ok && data2.success) {
      const rxId2 = data2.data.id;
      const [bills2] = await connection.query("SELECT * FROM bills WHERE prescription_id = ?", [rxId2]);
      console.log(`Scenario 2 Bill generated? Count: ${bills2.length}`);
      if (bills2.length > 0) {
        console.log("  Bill Item:", bills2[0].id, "Total:", bills2[0].total_amount, "Line Items:", bills2[0].line_items);
      }
    }

    // SCENARIO 3: Doctor fetch for patId
    console.log("\n--- SCENARIO 3: Doctor Fetching Prescriptions for Patient ID =", patId, "---");
    const docFetchRes = await fetch(`http://localhost:5000/api/prescriptions?role=doctor&patient_id=${patId}`);
    const docFetchData = await docFetchRes.json();
    console.log("Doctor Fetch Count:", docFetchData.data?.length);

  } catch (err) {
    console.error("Scenario test failed:", err);
  } finally {
    await connection.end();
  }
}

testAllScenarios();
