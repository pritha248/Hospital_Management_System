# Automated Hospital Management & Electronic Medical Record (EMR) System

A full-stack Hospital Management and Electronic Medical Record (EMR) system designed to manage patients, doctors, appointments, consultations, prescriptions, diagnostic tests, hospitalization, billing, insurance, payments, medical reports, release letters, and AI-assisted clinical workflows.

The application follows a **backend-authoritative architecture**, where security-sensitive operations and core hospital business rules are enforced by the Node.js/Express backend rather than relying only on frontend validation.

---

## 🌐 Live Website

Anyone who wants to see the deployed website can visit:

https://hospital-management-system-2tf2.vercel.app

The website is deployed online and can be accessed directly from a web browser.

## 📌 Project Overview

The system provides a connected hospital workflow:

```text
Patient
   ↓
Appointment
   ↓
Doctor Confirmation
   ↓
Consultation
   ↓
Prescription / Diagnostic Tests
   ↓
Billing
   ↓
Admission Recommendation
   ↓
Admin Decision
   ↓
Hospitalization
   ↓
Additional Prescriptions
   ↓
Insurance / Payment
   ↓
Discharge Approval
   ↓
Release Letter
```

The objective is to maintain consistency between the frontend, backend, database, billing system, admission workflow, and AI services rather than treating each feature as an isolated module.

---

## ✨ Major Features

### 👤 Patient Management

* Patient registration and authentication
* Patient profile management
* Medical history
* Allergy information
* Appointment management
* Prescription viewing
* Medical report viewing
* Billing and outstanding balance viewing
* Online payment workflow
* Insurance claim submission
* Hospital admission status tracking
* Release letter access after approval

Patients cannot:

* Modify prescriptions
* Modify billing
* Approve hospital admissions
* Approve discharge
* Apply billing discounts
* Approve insurance claims
* Cancel confirmed appointments
* Delete their own account

---

### 👨‍⚕️ Doctor Management

Doctors can:

* View assigned appointments
* Accept or reject appointments
* Conduct consultations
* Write prescriptions
* Prescribe medicines
* Prescribe diagnostic tests
* Recommend hospital admission/readmission
* Submit later admission requests
* View appropriate patient medical information
* Use the AI Clinical Hub

Doctors cannot:

* Approve hospital admission
* Directly admit patients
* Approve discharge
* Modify billing
* Approve insurance claims
* Delete prescriptions
* Delete their profile while unresolved responsibilities remain

---

### 🛡️ Admin Management

Administrators control sensitive hospital operations including:

* Admission approval/rejection
* Hospitalization management
* Discharge approval
* Billing management
* Discounts
* Billing adjustments
* Cash payments
* Insurance approval
* Doctor management
* Patient-management operations
* Release-letter approval
* Hospital configuration and operational workflows

---

# 📅 Appointment Management

The appointment system supports controlled state transitions.

Typical workflow:

```text
Pending
   ↓
Confirmed
   ↓
In Consultation
   ↓
Completed
```

If admission is recommended:

```text
In Consultation
   ↓
Pending Admin Approval for Admission
   ↓
Admitted to Hospital
```

If admission is rejected:

```text
Pending Admin Approval for Admission
   ↓
Rejected Admission Request
```

After the required waiting period, a later admission request may be submitted.

A second consecutive rejection results in:

```text
No Admission Can Be Done Here
```

These transitions are controlled by backend business rules rather than allowing arbitrary status modification.

---

# 🏥 Hospital Admission & Readmission

The system distinguishes between:

* Consultation
* Admission recommendation
* Admission approval
* Actual hospitalization
* Readmission
* Discharge

A doctor's recommendation does **not** immediately create hospitalization charges.

The workflow is:

```text
Doctor recommends admission
        ↓
Pending Admin Approval
        ↓
Admin approves
        ↓
Admitted to Hospital
        ↓
Hospitalization begins
```

This prevents hospitalization charges from being created before administrative approval.

The system also supports later admission requests following a rejected admission request, subject to the configured waiting period and rejection rules.

---

# 💊 Prescription Management

Doctors can create prescriptions containing:

* Medicines
* Dosage information
* Medication instructions
* Diagnostic tests
* Patient-specific clinical information

The system maintains patient-specific prescription history.

Additional prescriptions can be created for appropriately admitted patients.

Prescription deletion is restricted according to the project's business rules so that historical medical and financial records are not incorrectly removed.

---

# 🧪 Diagnostic Tests

Doctors can prescribe diagnostic tests during consultations.

The system supports:

* Test prescription
* Test catalog management
* Patient-specific test records
* Consultation-linked test billing
* Medical report workflows

Diagnostic test charges are incorporated into the appropriate billing workflow.

---

# 💰 Billing & Payments

The billing system is connected to consultations, diagnostic tests, hospitalization, prescriptions, insurance, payments, discounts, and billing adjustments.

### Date-wise Billing

Consultation-related billing is maintained according to the relevant consultation date.

Example:

```text
Visit – 07 Aug 2026
├── Doctor Consultation Fee
├── Blood Test
├── X-Ray
└── Other applicable charges
```

Hospitalization charges are added only when hospitalization has actually been approved.

### Billing Principles

* Prevent duplicate billing
* Preserve historical billing information
* Repeated API requests must not create duplicate charges
* Consultation charges are not duplicated when admission is approved
* Hospitalization charges begin only after admission approval
* Discounts can be applied by authorized administrators
* Billing adjustments preserve historical financial information
* Negative outstanding balances are prevented

The acceptance specification explicitly requires repeated API calls to avoid duplicate billing and multiple visits to preserve date-wise billing history.

---

# 🏦 Insurance Claims

The system supports insurance-based payment workflows.

Features include:

* Insurance claim submission
* Claim amount entry
* Admin approval
* Multiple claims
* Outstanding balance calculation
* Application of approved claim amounts to unpaid balances

Multiple insurance claims can progressively reduce the outstanding balance without producing a negative balance.

---

# 💳 Payment Management

The system supports separate payment workflows for patients and administrators.

### Patient

Patients can pay their outstanding balance online.

### Admin

Administrators can record cash payments.

The system calculates the remaining amount rather than treating each payment as an independent total.

---

# 📄 Medical Reports

The system supports medical report management and extraction of selected clinical metrics.

The AI/report workflow can process information such as:

* Glucose
* HbA1c
* Blood pressure
* Cholesterol

The backend exposes an OCR/clinical extraction endpoint for processing report text.

---

# 📃 Release / Discharge Letter

A release letter is generated only when the appropriate discharge conditions are satisfied.

Important rules include:

```text
Never admitted
    → No Release Letter

Admitted + Outstanding Balance
    → Cannot be released

Admitted + ₹0 outstanding
+ no new admission recommendation
+ Admin approval
    → Released
    → Release Letter available
```

These conditions are explicitly included in the project's acceptance requirements.

---

# 🤖 AI Clinical Hub

The project includes an AI Clinical Hub integrated into the backend.

Current AI capabilities include:

### 1. Medical History Summarization

Processes patient medical information and produces:

* Executive summary
* Clinical highlights
* Chronic conditions
* Allergy summary

### 2. Differential Diagnosis Support

Accepts symptom information and generates candidate differential conditions containing:

* Condition
* Probability estimate
* Urgency level
* Recommended diagnostic tests

### 3. 30-Day Readmission Risk

Evaluates:

* Patient age
* Length of hospital stay
* Previous admissions

and generates a risk assessment with contributing factors and preventative actions.

### 4. Drug Interaction & Allergy Analysis

The system combines:

* Newly prescribed medications
* Previous patient prescriptions
* Patient allergies

and sends the medication context to the configured LLM provider for interaction analysis.

The backend then processes the response and produces:

* Interaction warnings
* Severity
* Drug pairs
* Allergy warnings
* Overall risk
* Safety status

### 5. Medical Chatbot

The AI Clinical Hub also provides a medical question-answering interface for educational clinical information.

### 6. Report/OCR Extraction

The backend provides an endpoint for extracting selected clinical parameters from report text.

---

# 🧠 AI Architecture

The backend uses a provider-based LLM architecture.

```text
Frontend
    ↓
AI API Route
    ↓
AI Controller
    ↓
AI Service
    ↓
callLlmApi()
    ↓
Configured LLM Provider
    ↓
LLM Response
    ↓
Backend Processing
    ↓
Frontend
```

The current server-side configuration uses **Groq**.

Example:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
```

The application is designed so that the provider can be selected through environment configuration.

> **Important:** AI-generated medical information is intended as decision-support/educational assistance and must not replace evaluation, diagnosis, or treatment by a qualified healthcare professional.

---

# 🔐 Authentication & Authorization

The backend uses:

* JWT authentication
* Role-based authorization
* Protected API routes
* Authentication middleware
* Backend-side authorization checks

The backend remains the authoritative layer for security-sensitive operations.

Frontend restrictions are intended for user experience; they are not considered sufficient security controls on their own.

---

# 🏗️ Technology Stack

## Frontend

* React
* Vite
* JavaScript / JSX
* CSS
* React Context API

## Backend

* Node.js
* Express.js
* Axios
* JWT
* MySQL2
* dotenv
* Morgan

## Database

* MySQL
* Aiven MySQL-compatible hosted database

## AI

* Groq API
* Llama-family models
* Local Ollama/LLaMA support for local development

## Development Tools

* Git
* GitHub
* VS Code / compatible IDE
* Postman
* Beekeeper Studio

---

# 📁 Project Structure

```text
Hospital_Management_System/
│
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── initDb.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── patientController.js
│   │   │   ├── doctorController.js
│   │   │   ├── appointmentController.js
│   │   │   ├── prescriptionController.js
│   │   │   ├── reportController.js
│   │   │   ├── billingController.js
│   │   │   ├── aiController.js
│   │   │   └── ...
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── patientRoutes.js
│   │   │   ├── doctorRoutes.js
│   │   │   ├── appointmentRoutes.js
│   │   │   ├── prescriptionRoutes.js
│   │   │   ├── aiRoutes.js
│   │   │   └── ...
│   │   │
│   │   ├── services/
│   │   │   ├── aiService.js
│   │   │   ├── billingService.js
│   │   │   ├── appointmentService.js
│   │   │   └── ...
│   │   │
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js
│   │   │   ├── roleMiddleware.js
│   │   │   └── errorMiddleware.js
│   │   │
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── uploads/
│   ├── package.json
│   └── .env
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── AiHubPage.jsx
│   │   │   ├── AppointmentsPage.jsx
│   │   │   ├── BillingPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── PrescriptionsPage.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ReportsPage.jsx
│   │   ├── styles/
│   │   │   └── theme.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

The repository structure follows a separation between frontend UI, backend controllers/routes/services, middleware, configuration, and database initialization.

---

# ⚙️ Prerequisites

Install the following before running the project:

* Node.js
* npm
* MySQL-compatible database
* Git

For server-side AI:

* Groq API key

For local LLaMA/Ollama development:

* Ollama
* A compatible LLaMA model

---

# 🚀 Installation

## 1. Clone the repository

```bash
git clone https://github.com/pritha248/Hospital_Management_System.git
cd Hospital_Management_System
```

---

## 2. Backend Setup

```bash
cd Backend
npm install
```

Create:

```text
Backend/.env
```

Example:

```env
# Server
PORT=5000

# Database
DB_HOST=your_database_host
DB_PORT=your_database_port
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# JWT
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=1d

# Password hashing
SALT_ROUNDS=10

# AI - Groq
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
```

**Never commit `.env` files or API keys to GitHub.**

---

## 3. Start the Backend

From the `Backend` directory:

```bash
npm start
```

For development, if a development script is available:

```bash
npm run dev
```

The backend will normally listen on the configured `PORT`.

When deployed on Render, the service should listen on the port supplied by the platform.

---

# 🎨 Frontend Setup

Open another terminal:

```bash
cd Frontend
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

---

# 🔗 Backend API

The backend exposes REST APIs organized by application module.

Examples include:

```text
/api/auth
/api/patients
/api/doctors
/api/appointments
/api/prescriptions
/api/reports
/api/billing
/api/ai
```

---

# 🤖 AI API Endpoints

The AI routes currently include:

```text
POST /api/ai/summarize-history
POST /api/ai/differential-diagnosis
POST /api/ai/readmission-risk
POST /api/ai/drug-interactions
POST /api/ai/medical-chatbot
POST /api/ai/ocr-extract
```

The AI controller passes requests to the corresponding AI service functions.

### Example: Medical Chatbot

```bash
curl -X POST http://localhost:5000/api/ai/medical-chatbot \
  -H "Content-Type: application/json" \
  -d '{"query":"What are common symptoms of dehydration?"}'
```

A successful response should contain the submitted query and the generated AI response.

---

# 🧪 Testing the Groq Integration

After configuring the Groq environment variables, check the backend startup logs.

Expected configuration:

```text
LLM_PROVIDER: groq
GROQ_MODEL: llama-3.1-8b-instant
GROQ_API_KEY configured: true
```

When an AI request is processed, the backend should log the Groq request and response status.

For example:

```text
Using Groq provider
Groq model: llama-3.1-8b-instant
Sending request to Groq...
Groq HTTP status: 200
Groq response received
```

---

# ☁️ Deployment

The application can be deployed with separate frontend and backend services.

A typical deployment architecture is:

```text
                 ┌─────────────────────┐
                 │      Frontend       │
                 │    React + Vite     │
                 └──────────┬──────────┘
                            │
                            │ HTTPS / REST API
                            ▼
                 ┌─────────────────────┐
                 │       Backend       │
                 │   Node + Express    │
                 └───────┬─────┬───────┘
                         │     │
             ┌───────────┘     └────────────┐
             ▼                              ▼
      ┌──────────────┐              ┌──────────────┐
      │ MySQL/Aiven  │              │  Groq API    │
      │   Database   │              │ Llama Model  │
      └──────────────┘              └──────────────┘
```

The backend requires the appropriate environment variables to be configured in the hosting provider.

Do not rely on a local `.env` file for production deployment.

---

# 🔒 Environment Variables

| Variable         | Purpose                         |
| ---------------- | ------------------------------- |
| `PORT`           | Backend server port             |
| `DB_HOST`        | MySQL host                      |
| `DB_PORT`        | MySQL port                      |
| `DB_USER`        | Database user                   |
| `DB_PASSWORD`    | Database password               |
| `DB_NAME`        | Database name                   |
| `JWT_SECRET`     | JWT signing secret              |
| `JWT_EXPIRES_IN` | JWT expiration period           |
| `SALT_ROUNDS`    | Password hashing cost           |
| `LLM_PROVIDER`   | AI provider (`groq` / `ollama`) |
| `GROQ_API_KEY`   | Groq authentication key         |
| `GROQ_MODEL`     | Groq model                      |
| `OLLAMA_URL`     | Local Ollama API URL            |
| `LLM_MODEL`      | Local Ollama model              |

Only configure the AI-provider variables required by the selected provider.

---

# 🔄 Business Rules

The system follows several important business rules.

### Appointment Cancellation

```text
Pending → Patient can cancel

Confirmed → Patient cannot cancel
```

### Admission

```text
Doctor recommends admission
        ↓
Pending Admin Approval
        ↓
Admin approves
        ↓
Admitted to Hospital
```

Doctor recommendation alone does not create hospitalization charges.

### Admission Rejection

```text
Admin rejects
        ↓
Rejected Admission Request
        ↓
Wait required period
        ↓
Later Admission Request
```

Two consecutive admission rejections result in:

```text
No Admission Can Be Done Here
```

and further admission requests are permanently disabled for that workflow.

### Discharge

```text
Admitted
   ↓
Outstanding balance must be ₹0
   ↓
No new admission recommendation
   ↓
Admin approves discharge
   ↓
Released
   ↓
Release Letter
```

These workflows are part of the required acceptance tests for the project.

---

# 🧩 Architecture Principles

The project follows these principles:

### Backend Authority

Business-critical rules are enforced on the backend.

### Role-Based Access

Different operations are available to patients, doctors, and administrators.

### Controlled State Transitions

Users cannot arbitrarily change appointment or admission statuses.

### Historical Data Preservation

Medical and financial history should not be destroyed simply because the current state changes.

### Consistent Billing

Every billing-related operation must maintain consistency with the associated consultation, prescription, diagnostic test, hospitalization, insurance, and payment records.

### Connected Workflow

Changes to one module must be evaluated against dependent modules.

The project specification explicitly defines the backend as the final authority and requires preservation of historical medical and financial data.

---

# 🛠️ Development Workflow

When modifying the system, follow this sequence:

```text
1. Audit existing implementation
        ↓
2. Check database/schema
        ↓
3. Implement backend business logic
        ↓
4. Verify billing/payment/insurance
        ↓
5. Update frontend
        ↓
6. Verify AI functionality
        ↓
7. Run tests
        ↓
8. Perform regression testing
```

This avoids modifying the entire application blindly and helps preserve existing functionality.

---

# 🧪 Acceptance Testing

Important scenarios include:

* Doctor working-day validation
* Appointment cancellation rules
* Normal consultation
* Consultation billing
* Admission recommendation
* Admission approval
* Admission rejection
* Later admission request
* Consecutive admission rejection
* Additional prescriptions
* Date-wise billing
* Duplicate-billing prevention
* Insurance claims
* Multiple insurance claims
* Payment calculation
* Discharge approval
* Release-letter generation
* Doctor deletion restrictions
* Patient deletion restrictions

The project specification defines these as acceptance conditions for the system.

---

# 🚨 Security Notes

Never commit:

```text
.env
API keys
JWT secrets
Database passwords
Private credentials
```

Add environment files to `.gitignore`.

Example:

```gitignore
.env
.env.*
!.env.example
node_modules/
dist/
uploads/*
```

Use an `.env.example` file containing placeholder values instead of real credentials.

---

# 🐛 Troubleshooting

## Database connection failure

Check:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

and verify that the database accepts connections from the deployment server.

---

## Groq authentication failure

Check:

```text
LLM_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=...
```

Do not add spaces or quotation mistakes around the key.

---

## AI returns fallback response

Check the backend logs for:

```text
Groq LLM API error
```

Possible causes include:

* Invalid API key
* Missing API key
* Model unavailable
* Rate/quota limitation
* Network/API failure
* Incorrect request format

---

## Frontend cannot reach backend

Verify:

* Backend is running
* Frontend API base URL is correct
* CORS configuration allows the frontend origin
* Deployment environment variables are configured
* The backend URL uses HTTPS in production

---

# 📜 Project Status

The system is an actively developed Hospital Management / EMR application.

Current major areas include:

* Patient management
* Doctor management
* Admin management
* Authentication
* Appointments
* Consultations
* Prescriptions
* Diagnostic tests
* Hospital admission/readmission
* Billing
* Payments
* Insurance
* Medical reports
* Release letters
* AI Clinical Hub
* Groq-based server-side LLM integration
* Local LLaMA/Ollama support

---

# ⚠️ Medical Disclaimer

This project is a software/academic engineering project.

AI-generated information must **not** be considered a substitute for diagnosis, treatment, prescription, or professional medical judgment.

Healthcare professionals must independently verify AI-generated information before using it for patient care.

---

# 👩‍💻 Author

**Pritha Mondal**

B.Tech — Computer Science & Engineering

---

# ⭐ Repository

GitHub:

`https://github.com/pritha248/Hospital_Management_System`

If this project is useful, consider giving the repository a ⭐.

---

## 📄 License

Add the appropriate license for your project before publishing the repository publicly.

If no license has been selected yet, do not assume that the project is open-source.
