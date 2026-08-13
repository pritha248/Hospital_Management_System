const db = require("../config/database");

const formatVisitHeading = (dateInput) => {
  if (!dateInput) return 'Visit';
  let d;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else if (typeof dateInput === 'string') {
    if (!dateInput.includes('T') && !dateInput.includes(' ') && dateInput.includes('-')) {
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
  
  let timeStr = '';
  if (d.getHours() !== 0 || d.getMinutes() !== 0) {
    const rawHours = d.getHours();
    const formattedHours = rawHours % 12 || 12;
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = rawHours >= 12 ? 'PM' : 'AM';
    timeStr = ` (${String(formattedHours).padStart(2, '0')}:${mins} ${ampm})`;
  }

  return `Visit – ${day} ${months[d.getMonth()]} ${d.getFullYear()}${timeStr}`;
};

const getBillsByPatient = async (patientId) => {
  const [bills] = await db.query(`
    SELECT b.*, 
           a.appointment_date, 
           a.appointment_time, 
           d.specialization, 
           ud.name as doctor_name, 
           up.name as patient_name,
           pr.recommend_admission,
           pr.admission_type,
           pr.admission_days,
           pr.admission_status
    FROM bills b
    LEFT JOIN prescriptions pr ON b.prescription_id = pr.id
    LEFT JOIN appointments a ON COALESCE(b.appointment_id, pr.appointment_id) = a.id
    LEFT JOIN doctors d ON COALESCE(a.doctor_id, pr.doctor_id) = d.id
    LEFT JOIN users ud ON d.user_id = ud.id
    LEFT JOIN patients p ON b.patient_id = p.id
    LEFT JOIN users up ON p.user_id = up.id
    WHERE b.patient_id = ?
    ORDER BY COALESCE(b.visit_date, pr.created_at, a.appointment_date, b.created_at) DESC, b.id DESC
  `, [patientId]);

  const [claims] = await db.query(
    "SELECT * FROM insurance_claims WHERE patient_id = ? ORDER BY created_at DESC",
    [patientId]
  );

  return {
    bills: bills.map(b => {
      const dateForHeading = b.visit_date || b.created_at || b.appointment_date;
      return {
        ...b,
        visit_date: dateForHeading,
        visit_heading: formatVisitHeading(dateForHeading),
        line_items: typeof b.line_items === 'string' ? JSON.parse(b.line_items) : b.line_items
      };
    }),
    claims
  };
};

const getAllBilling = async () => {
  const [bills] = await db.query(`
    SELECT b.*, 
           a.appointment_date, 
           a.appointment_time, 
           d.specialization, 
           ud.name as doctor_name, 
           up.name as patient_name,
           pr.recommend_admission,
           pr.admission_type,
           pr.admission_days,
           pr.admission_status
    FROM bills b 
    JOIN patients p ON b.patient_id = p.id 
    JOIN users up ON p.user_id = up.id
    LEFT JOIN prescriptions pr ON b.prescription_id = pr.id
    LEFT JOIN appointments a ON COALESCE(b.appointment_id, pr.appointment_id) = a.id
    LEFT JOIN doctors d ON COALESCE(a.doctor_id, pr.doctor_id) = d.id
    LEFT JOIN users ud ON d.user_id = ud.id
    ORDER BY COALESCE(b.visit_date, pr.created_at, a.appointment_date, b.created_at) DESC, b.id DESC
  `);
  const [claims] = await db.query(`
    SELECT ic.*, u.name as patient_name 
    FROM insurance_claims ic 
    JOIN patients p ON ic.patient_id = p.id 
    JOIN users u ON p.user_id = u.id
    ORDER BY ic.created_at DESC
  `);

  return {
    bills: bills.map(b => {
      const dateForHeading = b.visit_date || b.created_at || b.appointment_date;
      return {
        ...b,
        visit_date: dateForHeading,
        visit_heading: formatVisitHeading(dateForHeading),
        line_items: typeof b.line_items === 'string' ? JSON.parse(b.line_items) : b.line_items
      };
    }),
    claims
  };
};

const createBill = async (data) => {
  const { patient_id, appointment_id, total_amount, line_items, payment_method } = data;

  if (!appointment_id) {
    const err = new Error("Bill cannot be generated because the consultation has not been completed.");
    err.statusCode = 400;
    throw err;
  }

  const [apts] = await db.query("SELECT * FROM appointments WHERE id = ?", [appointment_id]);
  if (apts.length === 0) {
    const err = new Error("Associated appointment does not exist.");
    err.statusCode = 400;
    throw err;
  }

  const apt = apts[0];
  if (apt.status === 'cancelled') {
    const err = new Error("Billing is permanently disabled for cancelled appointments.");
    err.statusCode = 400;
    throw err;
  }

  if (apt.status !== 'completed') {
    const err = new Error("Bill cannot be generated because the consultation has not been completed.");
    err.statusCode = 400;
    throw err;
  }

  const [prescriptions] = await db.query("SELECT * FROM prescriptions WHERE appointment_id = ? ORDER BY created_at DESC", [appointment_id]);
  const hasTests = prescriptions.length > 0 && prescriptions[0].diagnostic_tests && prescriptions[0].diagnostic_tests.trim().length > 0;

  if (!hasTests) {
    const err = new Error("Custom invoice cannot be generated because no diagnostic tests were prescribed during this consultation.");
    err.statusCode = 400;
    throw err;
  }

  const [existingBills] = await db.query("SELECT * FROM bills WHERE appointment_id = ?", [appointment_id]);
  if (existingBills.length > 0) {
    const err = new Error("A bill has already been generated for this completed appointment.");
    err.statusCode = 400;
    throw err;
  }

  const prescribedTests = prescriptions[0].diagnostic_tests.trim();
  const finalLineItems = line_items && line_items.length > 0 ? line_items : [
    { description: 'Doctor Specialist Consultation', amount: parseFloat(total_amount) || 100 },
    { description: `Prescribed Diagnostic Test: ${prescribedTests}`, amount: 50 }
  ];

  const finalTotal = finalLineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const visitDate = apt.appointment_date || new Date();

  const [result] = await db.query(`
    INSERT INTO bills (patient_id, appointment_id, visit_date, total_amount, status, line_items, payment_method)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `, [patient_id || apt.patient_id, appointment_id, visitDate, finalTotal, JSON.stringify(finalLineItems), payment_method || 'Credit Card']);

  return { 
    id: result.insertId, 
    patient_id: patient_id || apt.patient_id, 
    appointment_id, 
    visit_date: visitDate,
    visit_heading: formatVisitHeading(visitDate),
    total_amount: finalTotal, 
    line_items: finalLineItems, 
    status: 'pending' 
  };
};

const payBill = async (billId, payment_method) => {
  const [bills] = await db.query("SELECT * FROM bills WHERE id = ?", [billId]);
  if (bills.length === 0) {
    const err = new Error("Bill not found.");
    err.statusCode = 404;
    throw err;
  }

  const bill = bills[0];
  const payable = bill.patient_payable !== null ? parseFloat(bill.patient_payable) : parseFloat(bill.total_amount);

  if (payable === 0) {
    const err = new Error("This bill has already been 100% covered by insurance. No balance is due.");
    err.statusCode = 400;
    throw err;
  }

  const method = payment_method || 'Credit Card';
  const transactionId = (method === 'Cash' ? 'CASH-TXN-' : 'TXN-') + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
  const paymentDate = new Date();

  await db.query(`
    UPDATE bills 
    SET status = 'paid', payment_method = ?, payment_date = ?, transaction_id = ?, patient_payable = 0 
    WHERE id = ?
  `, [method, paymentDate, transactionId, billId]);

  // Log in bill_audit_logs
  await db.query(`
    INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
    VALUES (?, 'Patient / Self-Service', 'Payment Processed', ?, 0, ?)
  `, [billId, payable, `Patient paid remaining balance of $${payable.toFixed(2)} via ${method}. Transaction ID: ${transactionId}`]);

  return { 
    id: billId, 
    status: 'paid', 
    payment_method: method, 
    transaction_id: transactionId, 
    payment_date: paymentDate,
    patient_payable: 0 
  };
};

const fileClaim = async (data) => {
  const { 
    bill_id, 
    patient_id, 
    provider_name, 
    insurance_provider, 
    policy_number, 
    claim_amount, 
    coverage_amount, 
    amount_claimed,
    notes 
  } = data;

  let targetPatientId = patient_id;
  let primaryBillId = bill_id;

  if (bill_id) {
    const [existingBills] = await db.query("SELECT * FROM bills WHERE id = ?", [bill_id]);
    if (existingBills.length > 0) {
      targetPatientId = targetPatientId || existingBills[0].patient_id;
    }
  }

  if (!targetPatientId) {
    const err = new Error("Patient ID is required to file an insurance claim.");
    err.statusCode = 400;
    throw err;
  }

  // Fetch all open/unpaid bills for target patient
  const [openBills] = await db.query(`
    SELECT b.* 
    FROM bills b
    WHERE b.patient_id = ? AND b.status != 'paid' AND COALESCE(b.patient_payable, b.total_amount) > 0
    ORDER BY COALESCE(b.visit_date, b.created_at) ASC, b.id ASC
  `, [targetPatientId]);

  if (openBills.length === 0) {
    const err = new Error("This patient has no outstanding unpaid medical balance left to claim.");
    err.statusCode = 400;
    throw err;
  }

  if (!primaryBillId) {
    primaryBillId = openBills[0].id;
  }

  const totalRemainingPayable = openBills.reduce((acc, b) => acc + (b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount)), 0);

  const provider = provider_name || insurance_provider || 'General Health Insurance';
  const policy = policy_number || 'POL-DEFAULT';
  const rawAmount = parseFloat(claim_amount || coverage_amount || amount_claimed || 0);
  const requestedClaimAmount = rawAmount > 0 ? Math.min(rawAmount, totalRemainingPayable) : totalRemainingPayable;

  if (requestedClaimAmount <= 0) {
    const err = new Error("Claim amount must be greater than zero.");
    err.statusCode = 400;
    throw err;
  }

  const [result] = await db.query(`
    INSERT INTO insurance_claims (
      bill_id, patient_id, provider_name, policy_number, claim_amount, 
      coverage_amount, amount_claimed, patient_payable_amount, status, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
  `, [
    primaryBillId, 
    targetPatientId, 
    provider, 
    policy, 
    requestedClaimAmount, 
    requestedClaimAmount, 
    requestedClaimAmount, 
    totalRemainingPayable, 
    notes || `Consolidated insurance claim for total remaining balance ($${totalRemainingPayable.toFixed(2)}) across open visit invoices.`
  ]);

  const claimId = result.insertId;

  // Set all open bills for this patient to 'insurance_pending'
  await db.query("UPDATE bills SET status = 'insurance_pending', insurance_claimed = ? WHERE patient_id = ? AND status != 'paid'", [requestedClaimAmount, targetPatientId]);

  // Log in bill_audit_logs for primary bill and open bills
  for (const b of openBills) {
    const currentPayable = b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount);
    await db.query(`
      INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
      VALUES (?, 'Patient / Insurance Portal', 'Filed Consolidated Insurance Claim', ?, ?, ?)
    `, [b.id, currentPayable, currentPayable, `Filed consolidated insurance claim #${claimId} of $${requestedClaimAmount.toFixed(2)} with ${provider} (Policy: ${policy})`]);
  }

  return {
    id: claimId,
    bill_id: primaryBillId,
    patient_id: targetPatientId,
    provider_name: provider,
    policy_number: policy,
    claim_amount: requestedClaimAmount,
    coverage_amount: requestedClaimAmount,
    patient_payable_amount: totalRemainingPayable,
    status: 'submitted',
    notes: notes || 'Insurance claim submitted for Admin review'
  };
};

const updateClaimStatus = async (claimId, status, managerNotes, adminName) => {
  const [claims] = await db.query("SELECT * FROM insurance_claims WHERE id = ?", [claimId]);
  if (claims.length === 0) {
    const err = new Error("Insurance claim not found.");
    err.statusCode = 404;
    throw err;
  }

  const claim = claims[0];
  const patientId = claim.patient_id;

  // Fetch all unpaid/partially-paid bills for this patient ordered chronologically (oldest first)
  const [bills] = await db.query(`
    SELECT b.*, 
           pr.created_at as rx_created_at,
           a.appointment_date
    FROM bills b
    LEFT JOIN prescriptions pr ON b.prescription_id = pr.id
    LEFT JOIN appointments a ON COALESCE(b.appointment_id, pr.appointment_id) = a.id
    WHERE b.patient_id = ? AND b.status != 'paid' AND COALESCE(b.patient_payable, b.total_amount) > 0
    ORDER BY COALESCE(b.visit_date, pr.created_at, a.appointment_date, b.created_at) ASC, b.id ASC
  `, [patientId]);

  if (status === 'approved') {
    const approvedAmount = parseFloat(claim.claim_amount || claim.coverage_amount || claim.amount_claimed || 0);
    let remainingClaimToDistribute = approvedAmount;
    let totalUsedAcrossInvoices = 0;
    let overallNewRemainingPayable = 0;

    for (const bill of bills) {
      const billTotal = parseFloat(bill.total_amount);
      const prevInsuranceUsed = parseFloat(bill.insurance_used || 0);
      const currentPayable = bill.patient_payable !== null ? parseFloat(bill.patient_payable) : (billTotal - prevInsuranceUsed);

      if (remainingClaimToDistribute > 0 && currentPayable > 0) {
        const allocatedForThisBill = Math.min(remainingClaimToDistribute, currentPayable);
        remainingClaimToDistribute -= allocatedForThisBill;
        totalUsedAcrossInvoices += allocatedForThisBill;

        const cumulativeInsuranceUsed = prevInsuranceUsed + allocatedForThisBill;
        const newPatientPayable = Math.max(0, billTotal - cumulativeInsuranceUsed);
        const newBillStatus = newPatientPayable === 0 ? 'paid' : 'partially_paid';

        if (newPatientPayable === 0) {
          const transactionId = 'INS-TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
          const transactionDate = new Date();

          await db.query(`
            UPDATE bills 
            SET status = 'paid', insurance_used = ?, patient_payable = 0, 
                payment_method = ?, payment_date = ?, transaction_id = ? 
            WHERE id = ?
          `, [cumulativeInsuranceUsed, `Insurance (${claim.provider_name})`, transactionDate, transactionId, bill.id]);
        } else {
          await db.query(`
            UPDATE bills 
            SET status = 'partially_paid', insurance_used = ?, patient_payable = ? 
            WHERE id = ?
          `, [cumulativeInsuranceUsed, newPatientPayable, bill.id]);
        }

        await db.query(`
          INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          bill.id, 
          adminName || 'Mr. Admin', 
          'Approved Insurance Claim Deduction', 
          currentPayable, 
          newPatientPayable, 
          `Applied $${allocatedForThisBill.toFixed(2)} insurance deduction (Claim #${claimId} from ${claim.provider_name}). Remaining balance: $${newPatientPayable.toFixed(2)}. Remarks: ${managerNotes || 'Approved by Admin'}`
        ]);

        overallNewRemainingPayable += newPatientPayable;
      } else {
        // Revert bill status if no claim deduction was allocated
        const newBillStatus = currentPayable === billTotal ? 'pending' : 'partially_paid';
        await db.query("UPDATE bills SET status = ? WHERE id = ?", [newBillStatus, bill.id]);
        overallNewRemainingPayable += currentPayable;
      }
    }

    // Update insurance claim record
    await db.query(`
      UPDATE insurance_claims 
      SET status = 'approved', amount_approved = ?, amount_used = ?, remaining_coverage = ?, 
          patient_payable_amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | Admin Approval Note: ', ?) 
      WHERE id = ?
    `, [approvedAmount, totalUsedAcrossInvoices, 0, overallNewRemainingPayable, managerNotes || 'Approved by Admin', claimId]);

    return { 
      id: claimId, 
      status: 'approved', 
      amount_used_this_claim: totalUsedAcrossInvoices, 
      patient_payable: overallNewRemainingPayable, 
      bill_status: overallNewRemainingPayable === 0 ? 'paid' : 'partially_paid' 
    };
  } else if (status === 'rejected') {
    // Revert all pending insurance status for this patient
    for (const bill of bills) {
      const billTotal = parseFloat(bill.total_amount);
      const prevInsuranceUsed = parseFloat(bill.insurance_used || 0);
      const currentPayable = bill.patient_payable !== null ? parseFloat(bill.patient_payable) : (billTotal - prevInsuranceUsed);
      const revertedStatus = prevInsuranceUsed > 0 ? 'partially_paid' : 'pending';

      await db.query("UPDATE bills SET status = ? WHERE id = ?", [revertedStatus, bill.id]);

      await db.query(`
        INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [bill.id, adminName || 'Mr. Admin', 'Rejected Insurance Claim', currentPayable, currentPayable, `Insurance claim #${claimId} rejected by Admin. Remarks: ${managerNotes || 'None'}`]);
    }

    const currentTotalRemaining = bills.reduce((acc, b) => acc + (b.patient_payable !== null ? parseFloat(b.patient_payable) : parseFloat(b.total_amount)), 0);

    await db.query(`
      UPDATE insurance_claims 
      SET status = 'rejected', amount_approved = 0, amount_used = 0, remaining_coverage = 0, 
          patient_payable_amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | Admin Rejection Note: ', ?) 
      WHERE id = ?
    `, [currentTotalRemaining, managerNotes || 'Rejected by Admin', claimId]);

    return { id: claimId, status: 'rejected', patient_payable: currentTotalRemaining, bill_status: 'rejected' };
  } else {
    const err = new Error("Invalid claim status.");
    err.statusCode = 400;
    throw err;
  }
};

const autoGenerateBillForPrescription = async (prescriptionId, actorInfo = {}) => {
  if (!prescriptionId) return null;

  const [rxs] = await db.query(`
    SELECT pr.*, 
           a.appointment_date, a.appointment_time,
           d.consultation_fee, d.specialization, 
           ud.name as doctor_name
    FROM prescriptions pr
    LEFT JOIN appointments a ON pr.appointment_id = a.id
    LEFT JOIN doctors d ON pr.doctor_id = d.id
    LEFT JOIN users ud ON d.user_id = ud.id
    WHERE pr.id = ?
  `, [prescriptionId]);

  if (rxs.length === 0) return null;

  const rx = rxs[0];
  const visitDate = rx.created_at || rx.appointment_date || new Date();
  const consultationFee = parseFloat(rx.consultation_fee) || 100.00;
  const docName = rx.doctor_name || 'Dr. Medical Specialist';

  const lineItems = [
    { description: `${rx.specialization || 'Specialist'} Consultation (${docName})`, amount: consultationFee }
  ];

  let totalAmount = consultationFee;

  let testIds = [];
  if (rx.test_ids) {
    try {
      testIds = typeof rx.test_ids === 'string' ? JSON.parse(rx.test_ids) : rx.test_ids;
    } catch (e) {}
  }

  if (Array.isArray(testIds)) {
    testIds = testIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  }

  if (Array.isArray(testIds) && testIds.length > 0) {
    const [tests] = await db.query("SELECT * FROM diagnostic_tests_catalog WHERE id IN (?)", [testIds]);
    for (const t of tests) {
      const testPrice = parseFloat(t.price) || 0;
      lineItems.push({
        description: `Diagnostic Test: ${t.test_name} (${t.department})`,
        amount: testPrice
      });
      totalAmount += testPrice;
    }
  } else if (rx.diagnostic_tests && rx.diagnostic_tests.trim().length > 0) {
    const testNames = rx.diagnostic_tests.split(',').map(s => s.trim()).filter(Boolean);
    for (const tName of testNames) {
      const [catMatches] = await db.query("SELECT * FROM diagnostic_tests_catalog WHERE test_name LIKE ?", [`%${tName}%`]);
      if (catMatches.length > 0) {
        const t = catMatches[0];
        const testPrice = parseFloat(t.price) || 0;
        lineItems.push({
          description: `Diagnostic Test: ${t.test_name} (${t.department})`,
          amount: testPrice
        });
        totalAmount += testPrice;
      }
    }
  }

  if (rx.admission_status === 'approved' && rx.recommend_admission && parseInt(rx.admission_days, 10) > 0) {
    const days = parseInt(rx.admission_days, 10);
    const rate = parseFloat(rx.daily_room_rate) || 150.00;
    const roomCharge = days * rate;
    const admissionLabel = rx.admission_type === 'Readmission' ? 'Readmission' : 'New Admission';
    lineItems.push({
      description: `Hospitalization / Room Charges (${admissionLabel} - ${days} Days @ $${rate.toFixed(2)}/day)`,
      amount: roomCharge
    });
    totalAmount += roomCharge;
  }

  const [existingBills] = await db.query("SELECT * FROM bills WHERE prescription_id = ?", [prescriptionId]);

  const userNameForAudit = actorInfo.name || docName || 'Doctor / EMR System';
  const visitHeading = formatVisitHeading(visitDate);

  if (existingBills.length > 0) {
    const existingBill = existingBills[0];
    const prevTotal = parseFloat(existingBill.total_amount) || 0;
    const prevInsuranceUsed = parseFloat(existingBill.insurance_used || 0);

    // Check if the existing bill was already fully paid by the patient
    const isAlreadyPaid = existingBill.status === 'paid' || (existingBill.patient_payable !== null && parseFloat(existingBill.patient_payable) === 0 && prevTotal > 0);
    const additionalCharges = totalAmount - prevTotal;

    if (isAlreadyPaid && additionalCharges > 0) {
      // The original bill was already paid by the patient!
      // Create a NEW pending date-wise hospitalization invoice for the additional room charges!
      const hospLineItems = lineItems.filter(item => item.description.includes('Hospitalization') || item.description.includes('Room Charges'));
      const itemsForNewBill = hospLineItems.length > 0 ? hospLineItems : [
        { description: `Hospitalization / Room Charges for ${visitHeading}`, amount: additionalCharges }
      ];

      const [newBillResult] = await db.query(`
        INSERT INTO bills (patient_id, appointment_id, prescription_id, visit_date, total_amount, patient_payable, status, line_items, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 'Credit Card / Insurance')
      `, [rx.patient_id, rx.appointment_id || null, prescriptionId, visitDate, additionalCharges, additionalCharges, JSON.stringify(itemsForNewBill)]);

      const newHospBillId = newBillResult.insertId;

      const auditAction = actorInfo.action || 'Generated Hospitalization Invoice';
      const auditReason = actorInfo.reason || `Created new pending hospitalization invoice #${newHospBillId} for $${additionalCharges.toFixed(2)} room charges after initial consultation invoice #${existingBill.id} was paid.`;

      await db.query(`
        INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
        VALUES (?, ?, ?, 0, ?, ?)
      `, [newHospBillId, userNameForAudit, auditAction, additionalCharges, auditReason]);

      return {
        id: newHospBillId,
        patient_id: rx.patient_id,
        appointment_id: rx.appointment_id,
        prescription_id: prescriptionId,
        visit_date: visitDate,
        visit_heading: visitHeading,
        total_amount: additionalCharges,
        patient_payable: additionalCharges,
        line_items: itemsForNewBill,
        status: 'pending'
      };
    } else {
      // The existing bill was not fully paid yet (or totalAmount decreased/remained same)
      const paidSoFar = existingBill.status === 'paid' 
        ? prevTotal 
        : (existingBill.patient_payable !== null ? Math.max(0, prevTotal - parseFloat(existingBill.patient_payable)) : 0);

      const newPatientPayable = Math.max(0, totalAmount - paidSoFar - prevInsuranceUsed);

      let updatedStatus = existingBill.status;
      if (newPatientPayable === 0 && totalAmount > 0) {
        updatedStatus = 'paid';
      } else if (paidSoFar > 0 || prevInsuranceUsed > 0) {
        updatedStatus = 'partially_paid';
      } else {
        updatedStatus = 'pending';
      }

      await db.query(`
        UPDATE bills 
        SET visit_date = ?, total_amount = ?, line_items = ?, patient_payable = ?, status = ? 
        WHERE id = ?
      `, [visitDate, totalAmount, JSON.stringify(lineItems), newPatientPayable, updatedStatus, existingBill.id]);

      const auditAction = actorInfo.action || 'Updated Visit Invoice';
      const auditReason = actorInfo.reason || 'Automatically recalculated line items after doctor added/updated prescription & tests';

      await db.query(`
        INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [existingBill.id, userNameForAudit, auditAction, prevTotal, totalAmount, auditReason]);

      return {
        id: existingBill.id,
        patient_id: rx.patient_id,
        appointment_id: rx.appointment_id,
        prescription_id: prescriptionId,
        visit_date: visitDate,
        visit_heading: visitHeading,
        total_amount: totalAmount,
        patient_payable: newPatientPayable,
        line_items: lineItems,
        status: updatedStatus
      };
    }
  } else {
    const [result] = await db.query(`
      INSERT INTO bills (patient_id, appointment_id, prescription_id, visit_date, total_amount, status, line_items, payment_method)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, 'Credit Card / Insurance')
    `, [rx.patient_id, rx.appointment_id || null, prescriptionId, visitDate, totalAmount, JSON.stringify(lineItems)]);

    const newBillId = result.insertId;

    let auditNote = `Automatically created date-wise visit invoice for prescription issued on ${visitHeading}`;
    if (rx.recommend_admission && rx.admission_status === 'pending_approval') {
      auditNote += ` (Hospitalization recommendation pending Admin approval)`;
    }

    await db.query(`
      INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
      VALUES (?, ?, 'Generated Visit Invoice', 0, ?, ?)
    `, [newBillId, userNameForAudit, totalAmount, auditNote]);

    return {
      id: newBillId,
      patient_id: rx.patient_id,
      appointment_id: rx.appointment_id,
      prescription_id: prescriptionId,
      visit_date: visitDate,
      visit_heading: visitHeading,
      total_amount: totalAmount,
      line_items: lineItems,
      status: 'pending'
    };
  }
};

const autoGenerateBillForCompletedAppointment = async (appointmentId, actorInfo = {}) => {
  const [rxs] = await db.query("SELECT id FROM prescriptions WHERE appointment_id = ? ORDER BY created_at DESC LIMIT 1", [appointmentId]);
  if (rxs.length > 0) {
    return await autoGenerateBillForPrescription(rxs[0].id, actorInfo);
  }
  return null;
};

const getAdmissionRequests = async () => {
  const [rows] = await db.query(`
    SELECT h.*, 
           up.name as patient_name, p.age as patient_age, p.gender as patient_gender,
           ud.name as doctor_name, d.specialization,
           pr.diagnosis, pr.created_at as prescription_created_at
    FROM hospitalizations h
    JOIN patients p ON h.patient_id = p.id
    JOIN users up ON p.user_id = up.id
    JOIN doctors d ON h.doctor_id = d.id
    JOIN users ud ON d.user_id = ud.id
    JOIN prescriptions pr ON h.prescription_id = pr.id
    ORDER BY h.created_at DESC
  `);
  return rows;
};

const processAdmissionDecision = async (requestId, data) => {
  const { status, admin_name, admin_remarks } = data;
  if (!['approved', 'rejected'].includes(status)) {
    const err = new Error("Invalid status. Must be 'approved' or 'rejected'.");
    err.statusCode = 400;
    throw err;
  }

  const [reqs] = await db.query("SELECT * FROM hospitalizations WHERE id = ?", [requestId]);
  if (reqs.length === 0) {
    const err = new Error("Hospitalization request not found.");
    err.statusCode = 404;
    throw err;
  }

  const req = reqs[0];
  const adminUser = admin_name || 'Admin';

  if (status === 'approved') {
    await db.query(`
      UPDATE hospitalizations 
      SET status = 'approved', approved_by = ?, approved_at = NOW(), admin_remarks = ? 
      WHERE id = ?
    `, [adminUser, admin_remarks || 'Approved by Admin', requestId]);

    await db.query(`
      UPDATE prescriptions SET admission_status = 'approved' WHERE id = ?
    `, [req.prescription_id]);

    if (req.appointment_id) {
      await db.query("UPDATE appointments SET status = 'Admitted to Hospital' WHERE id = ?", [req.appointment_id]);
    }

    const updatedBill = await autoGenerateBillForPrescription(req.prescription_id, {
      name: adminUser,
      action: `Approved ${req.admission_type || 'Admission'} Request`,
      reason: `Admin approved ${req.admission_type || 'Admission'} of ${req.admission_days} days @ $${parseFloat(req.daily_room_rate).toFixed(2)}/day. Added room charges to visit bill.`
    });

    return { success: true, status: 'approved', bill: updatedBill };
  } else {
    await db.query(`
      UPDATE hospitalizations 
      SET status = 'rejected', approved_by = ?, approved_at = NOW(), admin_remarks = ? 
      WHERE id = ?
    `, [adminUser, admin_remarks || 'Rejected by Admin', requestId]);

    await db.query(`
      UPDATE prescriptions SET admission_status = 'rejected' WHERE id = ?
    `, [req.prescription_id]);

    let finalAptStatus = 'Rejected Admission Request';
    if (req.appointment_id) {
      const [aptRows] = await db.query("SELECT * FROM appointments WHERE id = ?", [req.appointment_id]);
      if (aptRows.length > 0) {
        const apt = aptRows[0];
        const newRejectionCount = (apt.admission_rejection_count || 0) + 1;
        if (newRejectionCount >= 2) {
          finalAptStatus = 'No Admission Can Be Done Here';
        }
        await db.query(`
          UPDATE appointments 
          SET status = ?, admission_rejection_count = ?, last_rejection_at = NOW() 
          WHERE id = ?
        `, [finalAptStatus, newRejectionCount, req.appointment_id]);
      }
    }

    const [bills] = await db.query("SELECT * FROM bills WHERE prescription_id = ?", [req.prescription_id]);
    if (bills.length > 0) {
      const bill = bills[0];
      await db.query(`
        INSERT INTO bill_audit_logs (bill_id, user_name, action, previous_amount, new_amount, reason)
        VALUES (?, ?, 'Rejected Admission Request', ?, ?, ?)
      `, [bill.id, adminUser, parseFloat(bill.total_amount), parseFloat(bill.total_amount), `Admission recommendation rejected by Admin. Remarks: ${admin_remarks || 'None'} | Final Appointment Status: ${finalAptStatus}`]);
    }

    return { success: true, status: 'rejected', appointment_status: finalAptStatus };
  }
};

const modifyBill = async (billId, data) => {
  const { line_items, discount_amount, extra_charges, custom_total, reason, user_id, user_name } = data;

  const [existing] = await db.query("SELECT * FROM bills WHERE id = ?", [billId]);
  if (existing.length === 0) {
    const err = new Error("Bill not found.");
    err.statusCode = 404;
    throw err;
  }

  const bill = existing[0];
  const previousTotal = parseFloat(bill.total_amount) || 0;
  const previousInsuranceUsed = parseFloat(bill.insurance_used) || 0;
  const previousPayable = bill.patient_payable !== null ? parseFloat(bill.patient_payable) : previousTotal;

  let rawItems = [];
  if (line_items && Array.isArray(line_items)) {
    rawItems = line_items;
  } else {
    try {
      rawItems = typeof bill.line_items === 'string' ? JSON.parse(bill.line_items) : (bill.line_items || []);
    } catch (e) {
      rawItems = [];
    }
  }

  if (!Array.isArray(rawItems)) {
    rawItems = [];
  }

  // Normalize items to { description, amount }
  const normalizedItems = rawItems.map(item => {
    if (typeof item === 'string') {
      const match = item.match(/\$([0-9]+(?:\.[0-9]{2})?)/);
      const amt = match ? parseFloat(match[1]) : 0;
      return { description: item, amount: amt };
    }
    return {
      description: item.description || item.title || 'Medical Service Item',
      amount: parseFloat(item.amount) || 0
    };
  });

  const discount = Math.abs(parseFloat(discount_amount) || 0);
  const extra = Math.abs(parseFloat(extra_charges) || 0);

  let newTotal = previousTotal;

  if (custom_total !== undefined && custom_total !== null && custom_total !== '' && !isNaN(parseFloat(custom_total))) {
    newTotal = Math.max(0, parseFloat(custom_total));
    const delta = newTotal - previousTotal;
    normalizedItems.push({
      description: `Admin Manual Price Adjustment (${delta >= 0 ? '+' : ''}$${delta.toFixed(2)})`,
      amount: delta
    });
  } else {
    if (discount > 0) {
      normalizedItems.push({
        description: `Admin Discount / Adjustment (-$${discount.toFixed(2)})`,
        amount: -discount
      });
    }

    if (extra > 0) {
      normalizedItems.push({
        description: `Miscellaneous Hospital Service Charge (+$${extra.toFixed(2)})`,
        amount: extra
      });
    }

    // Recalculate total sum from items
    const itemsSum = normalizedItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    newTotal = itemsSum > 0 ? itemsSum : Math.max(0, previousTotal - discount + extra);
  }

  // Calculate new patient payable balance
  const newPatientPayable = Math.max(0, newTotal - previousInsuranceUsed);

  // Update status based on new balance
  let newStatus = bill.status;
  if (newPatientPayable === 0 && newTotal > 0) {
    newStatus = 'paid';
  } else if (previousInsuranceUsed > 0 && newPatientPayable > 0) {
    newStatus = 'partially_paid';
  } else if (newPatientPayable > 0 && bill.status === 'paid') {
    newStatus = 'pending';
  }

  await db.query(`
    UPDATE bills 
    SET total_amount = ?, patient_payable = ?, line_items = ?, status = ? 
    WHERE id = ?
  `, [newTotal, newPatientPayable, JSON.stringify(normalizedItems), newStatus, billId]);

  const action = discount > 0 
    ? 'Applied Admin Discount' 
    : (extra > 0 ? 'Added Extra Service Charges' : 'Modified Invoice Total & Line Items');

  const auditNote = reason || `Invoice total adjusted from $${previousTotal.toFixed(2)} to $${newTotal.toFixed(2)}. Remaining patient payable balance: $${newPatientPayable.toFixed(2)}.`;

  await db.query(`
    INSERT INTO bill_audit_logs (bill_id, user_id, user_name, action, previous_amount, new_amount, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [billId, user_id || null, user_name || 'Admin', action, previousTotal, newTotal, auditNote]);

  return { 
    id: billId, 
    previous_amount: previousTotal, 
    new_amount: newTotal, 
    patient_payable: newPatientPayable,
    status: newStatus,
    line_items: normalizedItems 
  };
};

const getBillAuditLogs = async (billId) => {
  const [logs] = await db.query("SELECT * FROM bill_audit_logs WHERE bill_id = ? ORDER BY created_at DESC", [billId]);
  return logs;
};

const getPatientAuditLogs = async (patientId) => {
  const [logs] = await db.query(`
    SELECT bal.*, b.patient_id 
    FROM bill_audit_logs bal
    JOIN bills b ON bal.bill_id = b.id
    WHERE b.patient_id = ?
    ORDER BY bal.created_at DESC
  `, [patientId]);
  return logs;
};

const addAdditionalChargesInvoice = async (data) => {
  const { patient_id, amount, reason, user_name, user_id } = data;
  if (!patient_id) {
    const err = new Error("Patient ID is required.");
    err.statusCode = 400;
    throw err;
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const err = new Error("Additional charge amount must be greater than zero.");
    err.statusCode = 400;
    throw err;
  }

  if (!reason || !reason.trim()) {
    const err = new Error("A mandatory reason for adding additional charges is required.");
    err.statusCode = 400;
    throw err;
  }

  const visitDate = new Date();
  const lineItems = [
    { description: reason.trim(), amount: numAmount }
  ];

  const [result] = await db.query(`
    INSERT INTO bills (patient_id, visit_date, total_amount, patient_payable, status, line_items, payment_method)
    VALUES (?, ?, ?, ?, 'pending', ?, 'Credit Card / Insurance')
  `, [patient_id, visitDate, numAmount, numAmount, JSON.stringify(lineItems)]);

  const newBillId = result.insertId;
  const adminUser = user_name || 'Mr. Admin';

  await db.query(`
    INSERT INTO bill_audit_logs (bill_id, user_id, user_name, action, previous_amount, new_amount, reason)
    VALUES (?, ?, ?, 'Added Standalone Additional Charges', 0, ?, ?)
  `, [newBillId, user_id || null, adminUser, numAmount, reason.trim()]);

  return {
    id: newBillId,
    patient_id,
    visit_date: visitDate,
    total_amount: numAmount,
    patient_payable: numAmount,
    status: 'pending',
    line_items: lineItems
  };
};

const applyPatientDiscount = async (data) => {
  const { patient_id, discount_type, discount_value, reason, user_name, user_id } = data;
  if (!patient_id) {
    const err = new Error("Patient ID is required.");
    err.statusCode = 400;
    throw err;
  }

  const val = parseFloat(discount_value);
  if (isNaN(val) || val <= 0) {
    const err = new Error("Discount value must be greater than zero.");
    err.statusCode = 400;
    throw err;
  }

  if (!['fixed', 'percentage'].includes(discount_type)) {
    const err = new Error("Discount type must be 'fixed' or 'percentage'.");
    err.statusCode = 400;
    throw err;
  }

  if (!reason || !reason.trim()) {
    const err = new Error("A mandatory reason for applying a discount is required.");
    err.statusCode = 400;
    throw err;
  }

  // Fetch open invoices for patient (oldest first)
  const [bills] = await db.query(`
    SELECT * FROM bills 
    WHERE patient_id = ? AND status != 'paid' AND (patient_payable > 0 OR patient_payable IS NULL)
    ORDER BY visit_date ASC, id ASC
  `, [patient_id]);

  if (bills.length === 0) {
    const err = new Error("Cannot apply discount: Patient has no unpaid invoices. All invoices for this patient are fully paid.");
    err.statusCode = 400;
    throw err;
  }

  const totalUnpaid = bills.reduce((acc, b) => {
    const curTotal = parseFloat(b.total_amount);
    const curInsurance = parseFloat(b.insurance_used || 0);
    const curDiscount = parseFloat(b.discount_amount || 0);
    const payable = b.patient_payable !== null ? parseFloat(b.patient_payable) : Math.max(0, curTotal - curInsurance - curDiscount);
    return acc + (payable > 0 ? payable : 0);
  }, 0);

  if (totalUnpaid <= 0) {
    const err = new Error("Cannot apply discount: Patient has no unpaid invoices. All invoices for this patient are fully paid.");
    err.statusCode = 400;
    throw err;
  }

  let discountDollars = 0;
  if (discount_type === 'percentage') {
    if (val > 100) {
      const err = new Error("Percentage discount cannot exceed 100%.");
      err.statusCode = 400;
      throw err;
    }
    discountDollars = totalUnpaid * (val / 100);
  } else {
    if (val > totalUnpaid) {
      const err = new Error(`Discount amount ($${val.toFixed(2)}) cannot exceed the patient's total remaining unpaid balance of $${totalUnpaid.toFixed(2)}.`);
      err.statusCode = 400;
      throw err;
    }
    discountDollars = val;
  }

  if (discountDollars > totalUnpaid) {
    const err = new Error(`Discount amount ($${discountDollars.toFixed(2)}) cannot exceed the patient's total remaining unpaid balance of $${totalUnpaid.toFixed(2)}.`);
    err.statusCode = 400;
    throw err;
  }

  let remainingDiscount = discountDollars;
  const adminUser = user_name || 'Mr. Admin';

  for (const bill of bills) {
    if (remainingDiscount <= 0) break;

    const curTotal = parseFloat(bill.total_amount);
    const curInsurance = parseFloat(bill.insurance_used || 0);
    const prevDiscount = parseFloat(bill.discount_amount || 0);
    const curPayable = bill.patient_payable !== null ? parseFloat(bill.patient_payable) : Math.max(0, curTotal - curInsurance - prevDiscount);

    if (curPayable <= 0) continue;

    const discountForThisBill = Math.min(curPayable, remainingDiscount);
    const newDiscountOnBill = prevDiscount + discountForThisBill;
    const newPayable = Math.max(0, curPayable - discountForThisBill);
    remainingDiscount -= discountForThisBill;

    let newStatus = bill.status;
    if (newPayable === 0) {
      newStatus = 'paid';
    } else {
      newStatus = 'partially_paid';
    }

    // UPDATE bills: original total_amount is NEVER touched or modified!
    await db.query(`
      UPDATE bills 
      SET discount_amount = ?, patient_payable = ?, status = ? 
      WHERE id = ?
    `, [newDiscountOnBill, newPayable, newStatus, bill.id]);

    const auditReasonStr = `Reason: ${reason.trim()} | Discount Type: ${discount_type.toUpperCase()} (${discount_type === 'percentage' ? val + '%' : '$' + val.toFixed(2)}) | Original Bill Total: $${curTotal.toFixed(2)} | Discount Applied: -$${discountForThisBill.toFixed(2)} | Final Remaining Payable: $${newPayable.toFixed(2)}`;

    await db.query(`
      INSERT INTO bill_audit_logs (bill_id, user_id, user_name, action, previous_amount, new_amount, reason)
      VALUES (?, ?, ?, 'Applied Patient Discount', ?, ?, ?)
    `, [bill.id, user_id || null, adminUser, curPayable, newPayable, auditReasonStr]);
  }

  return {
    success: true,
    discount_type,
    discount_value: val,
    discount_dollars: discountDollars,
    patient_id
  };
};

const deductPatientCharges = async (data) => {
  const { patient_id, bill_id, amount, reason, user_name, user_id } = data;
  if (!patient_id) {
    const err = new Error("Patient ID is required.");
    err.statusCode = 400;
    throw err;
  }

  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) {
    const err = new Error("Deduction amount must be greater than zero.");
    err.statusCode = 400;
    throw err;
  }

  if (!reason || !reason.trim()) {
    const err = new Error("A mandatory reason for applying a deduction is required.");
    err.statusCode = 400;
    throw err;
  }

  let targetBill = null;
  if (bill_id) {
    const [bRows] = await db.query("SELECT * FROM bills WHERE id = ? AND patient_id = ?", [bill_id, patient_id]);
    if (bRows.length === 0) {
      const err = new Error("Selected invoice not found for this patient.");
      err.statusCode = 404;
      throw err;
    }
    targetBill = bRows[0];
  } else {
    // Select oldest unpaid invoice for patient
    const [bRows] = await db.query(`
      SELECT * FROM bills 
      WHERE patient_id = ? AND status != 'paid' AND (patient_payable > 0 OR patient_payable IS NULL)
      ORDER BY visit_date ASC, id ASC
    `, [patient_id]);
    if (bRows.length === 0) {
      const err = new Error("Cannot deduct charges: Patient has no unpaid invoices. Paid invoices cannot be modified.");
      err.statusCode = 400;
      throw err;
    }
    targetBill = bRows[0];
  }

  if (targetBill.status === 'paid') {
    const err = new Error("Paid invoices cannot be modified or deducted.");
    err.statusCode = 400;
    throw err;
  }

  const curTotal = parseFloat(targetBill.total_amount);
  const curInsurance = parseFloat(targetBill.insurance_used || 0);
  const curDiscount = parseFloat(targetBill.discount_amount || 0);
  const prevDeduction = parseFloat(targetBill.deduction_amount || 0);
  const curPayable = targetBill.patient_payable !== null ? parseFloat(targetBill.patient_payable) : Math.max(0, curTotal - curInsurance - curDiscount - prevDeduction);

  if (curPayable <= 0) {
    const err = new Error("Selected invoice has $0.00 remaining payable balance.");
    err.statusCode = 400;
    throw err;
  }

  if (val > curPayable) {
    const err = new Error(`Deduction amount ($${val.toFixed(2)}) cannot exceed the invoice payable balance of $${curPayable.toFixed(2)}.`);
    err.statusCode = 400;
    throw err;
  }

  const newDeductionOnBill = prevDeduction + val;
  const newPayable = Math.max(0, curPayable - val);
  let newStatus = targetBill.status;
  if (newPayable === 0) {
    newStatus = 'paid';
  } else {
    newStatus = 'partially_paid';
  }

  // UPDATE bills: original total_amount is NEVER touched or modified!
  await db.query(`
    UPDATE bills 
    SET deduction_amount = ?, patient_payable = ?, status = ? 
    WHERE id = ?
  `, [newDeductionOnBill, newPayable, newStatus, targetBill.id]);

  const adminUser = user_name || 'Mr. Admin';
  const auditReasonStr = `Reason: ${reason.trim()} | Invoice Ref: #${targetBill.id} | Original Charge: $${curTotal.toFixed(2)} | Deduction Applied: -$${val.toFixed(2)} | Final Remaining Payable: $${newPayable.toFixed(2)}`;

  await db.query(`
    INSERT INTO bill_audit_logs (bill_id, user_id, user_name, action, previous_amount, new_amount, reason)
    VALUES (?, ?, ?, 'Deducted External Test Charge', ?, ?, ?)
  `, [targetBill.id, user_id || null, adminUser, curPayable, newPayable, auditReasonStr]);

  return {
    success: true,
    bill_id: targetBill.id,
    deduction_amount: val,
    new_payable: newPayable,
    patient_id
  };
};

module.exports = { 
  getBillsByPatient, 
  getAllBilling, 
  createBill, 
  payBill, 
  fileClaim, 
  updateClaimStatus, 
  autoGenerateBillForCompletedAppointment,
  autoGenerateBillForPrescription,
  getAdmissionRequests,
  processAdmissionDecision,
  modifyBill,
  getBillAuditLogs,
  getPatientAuditLogs,
  addAdditionalChargesInvoice,
  applyPatientDiscount,
  deductPatientCharges
};

