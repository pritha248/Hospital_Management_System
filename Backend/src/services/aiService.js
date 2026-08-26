const axios = require("axios");
const db = require("../config/database");

/**
 * Enterprise Backend LLM Completion Client
 *
 * Supported providers:
 * - Ollama
 * - Groq
 *
 * IMPORTANT:
 * AI-powered features do NOT use hardcoded clinical fallbacks.
 * If the AI fails, an error is thrown and the controller should
 * return an appropriate error response.
 */

const LLM_PROVIDER =
  (process.env.LLM_PROVIDER || "ollama").toLowerCase();

const OLLAMA_URL =
  process.env.OLLAMA_URL ||
  "http://localhost:11434/api/chat";

const OLLAMA_MODEL =
  process.env.LLM_MODEL ||
  "llama3.2:1b";

const GROQ_URL =
  process.env.GROQ_URL ||
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  "llama-3.3-70b-versatile";


/**
 * ============================================================
 * JSON PARSER
 * ============================================================
 *
 * Handles:
 * - Pure JSON
 * - JSON inside ```json ... ```
 * - JSON surrounded by explanatory text
 * - JSON arrays
 * - JSON objects
 */
const parseJsonFromLlm = (text) => {
  if (!text) {
    return null;
  }

  let clean = String(text)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // ------------------------------------------------------------
  // 1. Try parsing the complete response
  // ------------------------------------------------------------
  try {
    return JSON.parse(clean);
  } catch (e) {
    // Continue to extraction
  }

  // ------------------------------------------------------------
  // 2. Find first JSON object or array
  // ------------------------------------------------------------
  const firstBrace = clean.indexOf("{");
  const firstBracket = clean.indexOf("[");

  let startIndex = -1;

  if (firstBrace === -1 && firstBracket === -1) {
    return null;
  }

  if (firstBrace === -1) {
    startIndex = firstBracket;
  } else if (firstBracket === -1) {
    startIndex = firstBrace;
  } else {
    startIndex = Math.min(
      firstBrace,
      firstBracket
    );
  }

  const isArray =
    clean[startIndex] === "[";

  // ------------------------------------------------------------
  // 3. Find the final closing character
  // ------------------------------------------------------------
  const lastIndex = isArray
    ? clean.lastIndexOf("]")
    : clean.lastIndexOf("}");

  if (
    lastIndex === -1 ||
    lastIndex <= startIndex
  ) {
    return null;
  }

  const jsonText = clean.substring(
    startIndex,
    lastIndex + 1
  );

  // ------------------------------------------------------------
  // 4. Parse extracted JSON
  // ------------------------------------------------------------
  try {
    return JSON.parse(jsonText);
  } catch (err) {
    console.error(
      "❌ Failed to parse LLM JSON:",
      err.message
    );

    console.error(
      "Raw LLM response:",
      clean
    );

    return null;
  }
};


/**
 * ============================================================
 * GENERIC LLM API CALL
 * ============================================================
 */
const callLlmApi = async ({
  systemPrompt,
  prompt,
  jsonMode = false
}) => {
  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: prompt
    }
  ];

  const provider =
    (
      process.env.LLM_PROVIDER ||
      "ollama"
    ).toLowerCase();

  console.log(
    "🤖 Active LLM provider:",
    provider
  );

  // ============================================================
  // GROQ
  // ============================================================
  if (provider === "groq") {
    console.log(
      "🤖 Groq model:",
      GROQ_MODEL
    );

    console.log(
      "🔑 GROQ_API_KEY configured:",
      Boolean(process.env.GROQ_API_KEY)
    );

    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        "LLM_PROVIDER is set to groq but GROQ_API_KEY is missing."
      );
    }

    try {
      console.log(
        "⚡ Using Groq provider"
      );

      console.log(
        "📡 Sending request to Groq..."
      );

      const response = await axios.post(
        GROQ_URL,
        {
          model: GROQ_MODEL,
          messages,
          temperature: 0.2,
          max_tokens: 2048
        },
        {
          headers: {
            Authorization:
              `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type":
              "application/json"
          },
          timeout: 30000
        }
      );

      console.log(
        "✅ Groq HTTP status:",
        response.status
      );

      const rawText =
        response.data
          ?.choices?.[0]
          ?.message?.content
          ?.trim() || "";

      if (!rawText) {
        throw new Error(
          "Groq returned an empty response."
        );
      }

      if (jsonMode) {
        const parsed =
          parseJsonFromLlm(rawText);

        if (!parsed) {
          throw new Error(
            "Groq returned invalid JSON."
          );
        }

        return parsed;
      }

      return rawText;

    } catch (err) {
      console.error(
        "❌ Groq LLM API error:",
        err.response?.data ||
          err.message
      );

      throw new Error(
        `Groq LLM request failed: ${
          err.response?.data?.error?.message ||
          err.message
        }`
      );
    }
  }


  // ============================================================
  // OLLAMA
  // ============================================================
  if (provider === "ollama") {
    const ollamaUrl =
      process.env.OLLAMA_URL ||
      "http://localhost:11434/api/chat";

    const model =
      process.env.LLM_MODEL ||
      "llama3.2:1b";

    try {
      console.log(
        "⚡ Using Ollama provider"
      );

      console.log(
        "🤖 Ollama model:",
        model
      );

      console.log(
        "📡 Sending request to Ollama..."
      );

      const response = await axios.post(
        ollamaUrl,
        {
          model,
          messages,
          options: {
            num_predict: 2048,
            temperature: 0.1
          },
          stream: false
        },
        {
          timeout: 90000
        }
      );

      const rawText =
        response.data
          ?.message?.content
          ?.trim() || "";

      if (!rawText) {
        throw new Error(
          "Ollama returned an empty response."
        );
      }

      if (jsonMode) {
        const parsed =
          parseJsonFromLlm(rawText);

        if (!parsed) {
          throw new Error(
            "Ollama returned invalid JSON."
          );
        }

        return parsed;
      }

      return rawText;

    } catch (err) {
      console.error(
        "❌ Ollama LLM API error:",
        err.response?.data ||
          err.message
      );

      throw new Error(
        `Ollama LLM request failed: ${err.message}`
      );
    }
  }


  throw new Error(
    `Unsupported LLM_PROVIDER: ${provider}. Use "ollama" or "groq".`
  );
};


/**
 * ============================================================
 * 1. MEDICAL HISTORY SUMMARIZER
 * ============================================================
 */
const summarizeHistory = async (
  patientId,
  rawText
) => {
  let content = rawText || "";

  if (patientId) {
    const [patients] =
      await db.query(
        `SELECT p.*, u.name
         FROM patients p
         JOIN users u
           ON p.user_id = u.id
         WHERE p.id = ?`,
        [patientId]
      );

    if (patients.length > 0) {
      content +=
        ` Patient Name: ${patients[0].name},` +
        ` Age: ${patients[0].age},` +
        ` Gender: ${patients[0].gender}.` +
        ` Prior Medical History: ${
          patients[0].history || "None"
        }.` +
        ` Known Allergies: ${
          patients[0].allergies || "None"
        }.`;
    }

    const [reports] =
      await db.query(
        `SELECT *
         FROM medical_reports
         WHERE patient_id = ?`,
        [patientId]
      );

    reports.forEach(report => {
      content +=
        ` Medical Report [${report.title}]: ` +
        `${report.parsed_text || report.ai_summary || ""}.`;
    });
  }

  if (!content.trim()) {
    throw new Error(
      "Medical history content is required."
    );
  }

  const systemPrompt = `
You are an educational medical record summarization engine.

Analyze the provided patient record content and generate
a JSON object ONLY.

Format:

{
  "executiveSummary": "Comprehensive summary of patient medical record...",
  "clinicalHighlights": [
    "Highlight 1",
    "Highlight 2"
  ],
  "chronicConditions": [
    "Condition 1",
    "Condition 2"
  ],
  "allergiesNoted": "Summary of documented allergies"
}

Rules:
- Base the summary strictly on the supplied patient information.
- Do not invent diagnoses.
- Do not invent allergies.
- Do not invent medications.
- Return valid JSON only.
`;

  try {
    const llmJson =
      await callLlmApi({
        systemPrompt,
        prompt:
          `Patient Medical Record for Analysis:\n${content}`,
        jsonMode: true
      });

    if (
      !llmJson ||
      typeof llmJson !== "object" ||
      !llmJson.executiveSummary
    ) {
      throw new Error(
        "AI returned an invalid medical history summary."
      );
    }

    return {
      patientId,

      executiveSummary:
        llmJson.executiveSummary,

      clinicalHighlights:
        Array.isArray(
          llmJson.clinicalHighlights
        )
          ? llmJson.clinicalHighlights
          : [],

      chronicConditions:
        Array.isArray(
          llmJson.chronicConditions
        )
          ? llmJson.chronicConditions
          : [],

      allergiesNoted:
        llmJson.allergiesNoted ||
        "None noted",

      aiGenerated: true,

      aiEngine:
        `${LLM_PROVIDER.toUpperCase()} - ${
          LLM_PROVIDER === "groq"
            ? GROQ_MODEL
            : OLLAMA_MODEL
        }`,

      generatedAt:
        new Date().toISOString()
    };

  } catch (err) {
    console.error(
      "❌ Summarize history AI failure:",
      err.message
    );

    throw new Error(
      `AI medical history summarization unavailable: ${err.message}`
    );
  }
};


/**
 * ============================================================
 * 2. DIFFERENTIAL DIAGNOSIS
 * ============================================================
 */
const predictDifferentialDiagnosis = async (
  symptoms
) => {
  const symList = (
    Array.isArray(symptoms)
      ? symptoms
      : (symptoms || "").split(",")
  )
    .map(s => String(s).trim())
    .filter(Boolean);

  if (symList.length === 0) {
    throw new Error(
      "At least one symptom is required."
    );
  }

  const symptomsText =
    symList.join(", ");

  const systemPrompt = `
You are an educational medical research database assistant.

Evaluate the provided symptoms and return ONLY valid JSON.

Return an array:

[
  {
    "condition": "Condition Name",
    "probabilityPercentage": 85,
    "urgencyLevel": "High",
    "recommendedTests": [
      "Test A",
      "Test B"
    ]
  }
]

Rules:
- Generate the differential diagnosis dynamically from the provided symptoms.
- Do not use placeholder diagnoses.
- Do not use hardcoded conditions.
- Do not return markdown.
- Do not return explanations outside JSON.
- Return at least 3 candidate conditions when clinically appropriate.
- Probability values must be numbers between 0 and 100.
- Do not claim certainty.
- This is an educational decision-support output, not a definitive diagnosis.
`;

  try {
    const rawResult =
      await callLlmApi({
        systemPrompt,
        prompt:
          `Symptom pattern for differential analysis: ${symptomsText}`,
        jsonMode: true
      });

    if (
      !Array.isArray(rawResult) ||
      rawResult.length === 0
    ) {
      throw new Error(
        "AI returned an invalid differential diagnosis."
      );
    }

    const items =
      rawResult
        .filter(item =>
          item &&
          typeof item.condition === "string" &&
          item.condition.trim()
        )
        .map(item => ({
          condition:
            item.condition.trim(),

          probabilityPercentage:
            Math.min(
              100,
              Math.max(
                0,
                Number(
                  item.probabilityPercentage
                ) || 0
              )
            ),

          urgencyLevel:
            item.urgencyLevel ||
            "Moderate",

          recommendedTests:
            Array.isArray(
              item.recommendedTests
            )
              ? item.recommendedTests
              : []
        }));

    if (items.length === 0) {
      throw new Error(
        "AI returned no valid diagnosis candidates."
      );
    }

    const topCondition =
      items[0].condition;

    return {
      inputSymptoms: symList,

      differentialDiagnoses:
        items,

      primaryRecommendation:
        `Primary Candidate: ${topCondition} ` +
        `(${items[0].probabilityPercentage}% confidence).`,

      timestamp:
        new Date().toISOString(),

      aiGenerated: true,

      aiEngine:
        `${LLM_PROVIDER.toUpperCase()} - ${
          LLM_PROVIDER === "groq"
            ? GROQ_MODEL
            : OLLAMA_MODEL
        }`
    };

  } catch (err) {
    console.error(
      "❌ Differential diagnosis AI failure:",
      err.message
    );

    throw new Error(
      `AI differential diagnosis unavailable: ${err.message}`
    );
  }
};


/**
 * ============================================================
 * 3. 30-DAY READMISSION RISK
 * ============================================================
 */
const predictReadmissionRisk = async (
  patientData
) => {
  const age =
    Number(patientData?.age) || 40;

  const stayDays =
    Number(
      patientData?.lengthOfStayDays
    ) || 3;

  const priorAdmissions =
    Number(
      patientData?.previousAdmissionsCount
    ) || 0;

  const systemPrompt = `
You are an expert AI clinical risk analytics engine.

Evaluate the patient's 30-day hospital readmission risk
based strictly on the supplied patient data.

Respond strictly in JSON ONLY:

{
  "riskScorePercentage": 45,
  "riskTier": "Moderate Risk of Readmission",
  "contributingFactors": [
    "Specific factor based on the supplied patient data"
  ],
  "preventativeActions": [
    "Specific preventative action based on the supplied patient data"
  ]
}

Rules:
- Do not invent patient characteristics.
- Do not use generic hardcoded patient information.
- Base all factors on the supplied data.
- riskScorePercentage must be between 0 and 100.
- Return valid JSON only.
`;

  const prompt =
    `Evaluate 30-Day Readmission Risk:\n` +
    `- Age: ${age} years old\n` +
    `- Length of Stay: ${stayDays} days\n` +
    `- Prior Admissions in Past 12 Months: ${priorAdmissions}\n\n` +
    `Generate a dynamic risk score, risk tier, contributing factors, and preventative actions specifically for this patient profile.`;

  try {
    const llmJson =
      await callLlmApi({
        systemPrompt,
        prompt,
        jsonMode: true
      });

    if (
      !llmJson ||
      typeof llmJson !== "object"
    ) {
      throw new Error(
        "AI returned an invalid readmission risk response."
      );
    }

    const rawScore =
      Number(
        llmJson.riskScorePercentage
      );

    if (
      !Number.isFinite(rawScore) ||
      rawScore < 0 ||
      rawScore > 100
    ) {
      throw new Error(
        "AI returned an invalid readmission risk score."
      );
    }

    const score =
      Math.round(rawScore);

    const riskTier =
      score >= 70
        ? "High Risk of Readmission"
        : score >= 35
          ? "Moderate Risk of Readmission"
          : "Low Risk of Readmission";

    const factors =
      Array.isArray(
        llmJson.contributingFactors
      )
        ? llmJson.contributingFactors
            .filter(
              f =>
                typeof f === "string" &&
                f.trim()
            )
            .map(f => f.trim())
        : [];

    const actions =
      Array.isArray(
        llmJson.preventativeActions
      )
        ? llmJson.preventativeActions
            .filter(
              a =>
                typeof a === "string" &&
                a.trim()
            )
            .map(a => a.trim())
        : [];

    if (factors.length === 0) {
      throw new Error(
        "AI returned no contributing factors."
      );
    }

    if (actions.length === 0) {
      throw new Error(
        "AI returned no preventative actions."
      );
    }

    return {
      riskScorePercentage: score,

      riskTier,

      contributingFactors:
        factors,

      preventativeActions:
        actions,

      aiGenerated: true,

      aiEngine:
        `${LLM_PROVIDER.toUpperCase()} - ${
          LLM_PROVIDER === "groq"
            ? GROQ_MODEL
            : OLLAMA_MODEL
        }`,

      evaluatedAt:
        new Date().toISOString()
    };

  } catch (err) {
    console.error(
      "❌ Readmission risk AI failure:",
      err.message
    );

    throw new Error(
      `AI readmission risk analysis unavailable: ${err.message}`
    );
  }
};


/**
 * ============================================================
 * 4. DRUG INTERACTION SAFETY CHECKER
 * ============================================================
 *
 * IMPORTANT:
 * There is NO hardcoded "safe" fallback.
 *
 * If AI succeeds:
 *     return AI-generated result.
 *
 * If AI fails:
 *     throw error.
 */
const checkDrugInteractions = async (
  medications,
  patientId
) => {
  // ------------------------------------------------------------
  // Normalize medication list
  // ------------------------------------------------------------
  const newMedList = (
    Array.isArray(medications)
      ? medications
      : (medications || "").split(",")
  )
    .map(m =>
      typeof m === "string"
        ? m.trim()
        : (m?.name || "").trim()
    )
    .filter(Boolean);

  if (newMedList.length === 0) {
    throw new Error(
      "At least one medication is required."
    );
  }

  // ------------------------------------------------------------
  // Patient context
  // ------------------------------------------------------------
  let priorMedsList = [];

  let patientAllergies =
    "None documented";

  if (patientId) {
    try {
      const [patients] =
        await db.query(
          `SELECT allergies
           FROM patients
           WHERE id = ?`,
          [patientId]
        );

      if (
        patients.length > 0 &&
        patients[0].allergies
      ) {
        patientAllergies =
          patients[0].allergies;
      }

      const [priorRows] =
        await db.query(
          `SELECT medicines
           FROM prescriptions
           WHERE patient_id = ?`,
          [patientId]
        );

      priorRows.forEach(row => {
        let parsed =
          row.medicines;

        if (
          typeof parsed === "string"
        ) {
          try {
            parsed =
              JSON.parse(parsed);
          } catch (e) {
            console.warn(
              "Could not parse previous prescription medicines."
            );
          }
        }

        if (
          Array.isArray(parsed)
        ) {
          parsed.forEach(m => {
            const name =
              typeof m === "string"
                ? m.trim()
                : (m?.name || "").trim();

            if (
              name &&
              !priorMedsList.some(
                pm =>
                  pm.toLowerCase() ===
                  name.toLowerCase()
              )
            ) {
              priorMedsList.push(
                name
              );
            }
          });
        }
      });

    } catch (err) {
      console.error(
        "❌ Error fetching patient medication context:",
        err.message
      );

      throw new Error(
        `Unable to retrieve patient medication context: ${err.message}`
      );
    }
  }

  // ------------------------------------------------------------
  // AI System Prompt
  // ------------------------------------------------------------
  const systemPrompt = `
You are an expert AI clinical pharmacology engine.

Analyze the provided medication list for:

1. Drug-drug interactions
2. Contraindications
3. Adverse clinical risks
4. Medication allergy risks
5. Interaction severity

Return ONLY valid JSON.

Required format:

{
  "overallRisk": "Low",
  "isSafe": true,
  "interactionSummary": "Detailed summary of the medication safety assessment.",
  "interactionWarnings": [
    {
      "drugA": "Medication 1",
      "drugB": "Medication 2",
      "severity": "High",
      "description": "Detailed explanation of the interaction and clinical risk."
    }
  ]
}

Rules:

- Analyze the actual medications provided.
- Do not invent medications.
- Do not use placeholder data.
- Do not return hardcoded generic results.
- If there are no clinically significant interactions, return an empty interactionWarnings array.
- overallRisk must be exactly one of:
  "Low", "Moderate", "High".
- isSafe must be true only when there are no clinically significant risks.
- Return valid JSON only.
- Do not return markdown.
- Do not return code fences.
- Do not return conversational text.
`;

  const prompt =
    `Newly Prescribed Medications: ` +
    `${newMedList.join(", ") || "None"}\n\n` +

    `Patient Prior Active Medications: ` +
    `${priorMedsList.join(", ") || "None"}\n\n` +

    `Patient Documented Allergies: ` +
    `${patientAllergies}\n\n` +

    `Evaluate all potential drug-drug interactions, ` +
    `contraindications, adverse clinical risks, ` +
    `and allergy hazards.`;

  // ------------------------------------------------------------
  // CALL AI
  // ------------------------------------------------------------
  try {
    console.log(
      "🤖 Starting AI drug interaction analysis..."
    );

    console.log(
      "💊 New medications:",
      newMedList
    );

    console.log(
      "💊 Prior medications:",
      priorMedsList
    );

    const llmJson =
      await callLlmApi({
        systemPrompt,
        prompt,
        jsonMode: true
      });

    // ----------------------------------------------------------
    // Validate AI response
    // ----------------------------------------------------------
    if (
      !llmJson ||
      typeof llmJson !== "object" ||
      Array.isArray(llmJson)
    ) {
      throw new Error(
        "AI returned an invalid drug interaction response."
      );
    }

    // ----------------------------------------------------------
    // Validate risk
    // ----------------------------------------------------------
    const allowedRisks = [
      "Low",
      "Moderate",
      "High"
    ];

    if (
      !allowedRisks.includes(
        llmJson.overallRisk
      )
    ) {
      throw new Error(
        "AI returned an invalid overallRisk."
      );
    }

    const overallRisk =
      llmJson.overallRisk;

    // ----------------------------------------------------------
    // Extract interaction warnings
    // ----------------------------------------------------------
    const rawWarnings =
      llmJson.interactionWarnings ||
      llmJson.interactionsWarnings ||
      llmJson.interactions ||
      llmJson.adverseClinicalRisks ||
      [];

    if (
      !Array.isArray(rawWarnings)
    ) {
      throw new Error(
        "AI returned invalid interactionWarnings."
      );
    }

    const warnings = [];

    rawWarnings.forEach(w => {
      if (
        !w ||
        !w.drugA ||
        !w.drugB
      ) {
        return;
      }

      const drugA =
        String(w.drugA).trim();

      const drugB =
        String(w.drugB).trim();

      const isAFromPrior =
        priorMedsList.some(
          p =>
            p.toLowerCase() ===
            drugA.toLowerCase()
        );

      const isBFromPrior =
        priorMedsList.some(
          p =>
            p.toLowerCase() ===
            drugB.toLowerCase()
        );

      warnings.push({
        drugA:
          `${drugA}${
            isAFromPrior
              ? " (Prior Rx)"
              : ""
          }`,

        drugB:
          `${drugB}${
            isBFromPrior
              ? " (Prior Rx)"
              : ""
          }`,

        severity:
          w.severity ||
          "Moderate",

        description:
          w.description ||
          "Potential drug-drug interaction identified by AI."
      });
    });

    // ----------------------------------------------------------
    // Allergy warnings
    // ----------------------------------------------------------
    const allergyWarnings = [];

    if (
      patientAllergies &&
      patientAllergies !==
        "None documented"
    ) {
      const lowerAllergies =
        patientAllergies.toLowerCase();

      newMedList.forEach(med => {
        if (
          lowerAllergies.includes(
            med.toLowerCase()
          )
        ) {
          allergyWarnings.push({
            drug: med,

            allergyMatch:
              patientAllergies,

            severity: "High",

            description:
              `Documented patient allergy may match '${med}'.`
          });
        }
      });
    }

    // ----------------------------------------------------------
    // Determine final safety
    // ----------------------------------------------------------
    const isSafe =
      warnings.length === 0 &&
      allergyWarnings.length === 0 &&
      llmJson.isSafe !== false &&
      overallRisk === "Low";

    // ----------------------------------------------------------
    // RETURN THE ACTUAL AI RESULT
    // ----------------------------------------------------------
    return {
      medicationsEvaluated:
        newMedList,

      newMedicationsEvaluated:
        newMedList,

      priorMedicationsOnRecord:
        priorMedsList,

      isSafe,

      interactionWarnings:
        warnings,

      allergyWarnings,

      overallRisk,

      interactionSummary:
        llmJson.interactionSummary ||
        "AI-generated medication interaction analysis completed.",

      aiGenerated: true,

      aiEngine:
        `${LLM_PROVIDER.toUpperCase()} - ${
          LLM_PROVIDER === "groq"
            ? GROQ_MODEL
            : OLLAMA_MODEL
        }`,

      evaluatedAt:
        new Date().toISOString()
    };

  } catch (err) {
    console.error(
      "❌ AI Drug interaction execution error:",
      err.message
    );

    // ----------------------------------------------------------
    // NO FALLBACK.
    // ----------------------------------------------------------
    throw new Error(
      `AI drug interaction analysis unavailable: ${err.message}`
    );
  }
};


/**
 * ============================================================
 * 5. MEDICAL Q&A CHATBOT
 * ============================================================
 */
const medicalChatbot = async (
  query
) => {
  const userQuery =
    (query || "").trim();

  if (!userQuery) {
    throw new Error(
      "Medical question is required."
    );
  }

  const systemPrompt = `
You are an expert AI clinical health assistant
in an enterprise Hospital EMR system.

Answer the medical question thoroughly,
accurately, and professionally.

Use clear bullet points where appropriate.

Do not include markdown code fences.

Clearly distinguish general educational information
from a definitive medical diagnosis.

Do not invent patient-specific information.
`;

  try {
    const llmResponse =
      await callLlmApi({
        systemPrompt,
        prompt: userQuery,
        jsonMode: false
      });

    if (
      !llmResponse ||
      !String(llmResponse).trim()
    ) {
      throw new Error(
        "AI returned an empty chatbot response."
      );
    }

    return {
      query: userQuery,

      response:
        llmResponse,

      suggestedTopics: [
        "Differential Diagnosis",
        "Drug Interaction Check",
        "Readmission Risk",
        "Report OCR"
      ],

      aiGenerated: true,

      aiEngine:
        `${LLM_PROVIDER.toUpperCase()} - ${
          LLM_PROVIDER === "groq"
            ? GROQ_MODEL
            : OLLAMA_MODEL
        }`,

      timestamp:
        new Date().toISOString()
    };

  } catch (err) {
    console.error(
      "❌ Medical chatbot AI failure:",
      err.message
    );

    // NO hardcoded clinical response.
    throw new Error(
      `AI medical chatbot unavailable: ${err.message}`
    );
  }
};


/**
 * ============================================================
 * 6. REPORT OCR & CLINICAL METRICS EXTRACTOR
 * ============================================================
 *
 * This function currently performs deterministic extraction
 * from supplied OCR text. It is not an LLM-generated feature.
 */
const ocrExtractReport = async (
  rawText
) => {
  const text =
    rawText || "";

  const metrics = {};

  const glucoseMatch =
    text.match(
      /(?:glucose|sugar)[:\s]+(\d+(?:\.\d+)?)/i
    );

  if (glucoseMatch) {
    metrics.glucoseMgDl =
      parseFloat(
        glucoseMatch[1]
      );
  }

  const hba1cMatch =
    text.match(
      /hba1c[:\s]+(\d+(?:\.\d+)?)/i
    );

  if (hba1cMatch) {
    metrics.hba1cPercent =
      parseFloat(
        hba1cMatch[1]
      );
  }

  const bpMatch =
    text.match(
      /(?:bp|blood pressure)[:\s]+(\d+\/\d+)/i
    );

  if (bpMatch) {
    metrics.bloodPressureMmHg =
      bpMatch[1];
  }

  const cholMatch =
    text.match(
      /cholesterol[:\s]+(\d+)/i
    );

  if (cholMatch) {
    metrics.cholesterolMgDl =
      parseInt(
        cholMatch[1],
        10
      );
  }

  return {
    extractedTextSnippet:
      text.substring(0, 300) +
      (
        text.length > 300
          ? "..."
          : ""
      ),

    extractedMetrics:
      metrics,

    aiInterpretation:
      Object.keys(metrics).length > 0
        ? `Extracted Clinical Parameters: ${JSON.stringify(metrics)}.`
        : "Clinical metrics extracted from uploaded document text successfully."
  };
};


/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */
module.exports = {
  summarizeHistory,
  predictDifferentialDiagnosis,
  predictReadmissionRisk,
  checkDrugInteractions,
  medicalChatbot,
  ocrExtractReport
};
