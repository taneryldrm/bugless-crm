/**
 * Bugless CRM AI Service - Core v2.0
 * Pure & Clean implementation for Gemini API.
 */

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Common fetch wrapper for Gemini API
 */
async function callGemini(endpoint, payload, apiKey) {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) throw new Error("API Key is missing.");

  const response = await fetch(`${BASE_URL}/models/${endpoint}?key=${cleanKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (data.error) {
    console.error("Gemini API Error:", data.error);
    throw new Error(data.error.message || "AI Service Error");
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

/**
 * Generate Proposal Line Items
 */
export async function generateProposalItems(projectDescription, apiKey) {
  const prompt = `
    Role: Professional Project Estimator
    Task: Create 3-6 line items for a proposal based on this description: "${projectDescription}"
    Output: JSON Array ONLY. No markdown.
    Schema: [{ "description": string, "quantity": number, "unit_price": number }]
    Currency: TRY (Turkish Lira context)
  `;

  // Using gemini-1.5-flash as the standard stable model
  const model = "gemini-1.5-flash"; 
  console.log(`[AI] Generating proposal items with ${model}...`);

  const text = await callGemini(`${model}:generateContent`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  }, apiKey);

  if (!text) throw new Error("AI returned no content.");
  
  // Clean potential markdown and parse
  const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanJson);
}

/**
 * Extract Tasks from Meeting Notes
 */
export async function extractTasksFromNotes(notes, apiKey) {
  const prompt = `
    Analyze meeting notes and extract actionable tasks.
    Output: JSON Array of strings.
    Example: ["Email client", "Update UI"]
    Notes: "${notes}"
  `;

  const text = await callGemini("gemini-1.5-flash:generateContent", {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 }
  }, apiKey);

  if (!text) throw new Error("AI returned no content.");
  
  const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanJson);
}


