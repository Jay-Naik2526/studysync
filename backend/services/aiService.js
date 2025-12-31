import { GoogleGenerativeAI } from "@google/generative-ai";
import officeParser from 'officeparser';
import 'dotenv/config';

const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5
].filter(Boolean);

// Priority list as requested
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-pro"];

export const generateStudyMaterials = async (fileBuffers, description, type) => {
  let sourceText = description || "";
  if (fileBuffers?.length > 0) {
    for (const buffer of fileBuffers) {
      const text = await new Promise((res) => officeParser.parseOffice(buffer, (d) => res(d || "")));
      sourceText += `\n\n[OFFICE_DOC_START]\n${text}\n[OFFICE_DOC_END]`;
    }
  }

  // ENHANCED ACADEMIC PROMPTS
  const prompts = {
    detailed: `
      Act as a Distinguished University Professor and Author. Create a "Masterclass Textbook Chapter" based on: ${sourceText}.
      
      REQUIREMENTS:
      1. STYLE: Write in a formal, exhaustive textbook style.
      2. EXAMPLES: For every theoretical concept, provide 2+ practical coding examples or logical walkthroughs.
      3. APPLICATIONS: Include a dedicated section for "Real-World Industry Applications" (e.g., how this is used in Web Dev, ML, or Systems).
      4. STRUCTURE: Use # for Title, ## for Main Chapters, ### for Sub-sections. NO "H1:" labels.
      5. MATH: Use LaTeX ($) for all technical notations (e.g., $O(n)$, $2^n$).
      6. VISUALS: Use high emoji density (🚀, 💡, 🔬, 🛠️, 📊, 📝, 🧠) for readability.
    `,

    short: `
      Act as a Senior Teaching Assistant. Create "Logic-Dense Revision Notes" for: ${sourceText}.
      - Focus on high-yield facts, exam-critical logic, and core mechanisms.
      - Include at least 3 unique mnemonics for memory.
      - Use bold text blocks and emojis (⚡, ✅, 🧠, 🔗, 📌).
      - Ensure all formulas use LaTeX ($).
    `,

    flashcards: `Generate "Definition-to-Application" Flashcards for: ${sourceText}. Return ONLY a JSON array: [{"question": "...", "answer": "..."}]`,

    quiz: `Generate a Rigorous Practice Exam for: ${sourceText}. Include conceptual traps. Return ONLY a JSON array: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "..."}]`
  };

  for (let i = 0; i < API_KEYS.length; i++) {
    for (const modelName of MODELS) {
      try {
        console.log(`📡 [Localhost] Attempting ${modelName} with Key #${i + 1}...`);
        
        const genAI = new GoogleGenerativeAI(API_KEYS[i]);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: "You are an elite academic assistant. You generate deep, accurate, and visually structured notes without conversational filler."
        });

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompts[type] }] }],
          generationConfig: {
            ...(modelName.includes("pro") && { thinking_level: "high" }),
            temperature: 0.7,
            maxOutputTokens: 20000, // Maximum possible length for textbook style
          }
        });

        const response = await result.response;
        const rawText = response.text().replace(/```json|```markdown|```/g, "").trim();
        
        console.log(`✅ SUCCESS: [Key ${i+1}] [Model ${modelName}]`);
        return (type === 'flashcards' || type === 'quiz') ? JSON.parse(rawText) : rawText;

      } catch (err) {
        console.error(`❌ FAILED: Key #${i+1} | Model: ${modelName} | Error: ${err.message}`);
        
        // Handle network/quota errors by rotating
        if (err.message.includes("fetch failed") || err.message.includes("429") || err.message.includes("quota")) {
          continue; 
        }
        throw err; // Stop if it's a code-level error (like JSON parsing)
      }
    }
  }
  throw new Error("CRITICAL: All Gemini models and keys failed. Check your internet or API Project status.");
};