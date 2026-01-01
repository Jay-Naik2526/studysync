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

// Priority list as per your research
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-pro"];

export const generateStudyMaterials = async (fileBuffers, description, type) => {
  let sourceText = description || "";
  if (fileBuffers?.length > 0) {
    for (const buffer of fileBuffers) {
      const text = await new Promise((res) => officeParser.parseOffice(buffer, (d) => res(d || "")));
      sourceText += `\n\n[OFFICE_DOC_START]\n${text}\n[OFFICE_DOC_END]`;
    }
  }

  const prompts = {
    detailed: `
      Act as a Distinguished University Professor and Author. Create a "Masterclass Textbook Chapter" based on: ${sourceText}.
      
      REQUIREMENTS:
      1. STYLE: Write in a formal, exhaustive textbook style. Include a "Table of Contents" at the start.
      2. EXAMPLES: For every theoretical concept, provide 2+ practical coding examples or logical walkthroughs (🛠️).
      3. ANALOGIES: Use deep, creative analogies (🔬) to explain complex logic.
      4. DATA & TABLES: Use Markdown tables (📊) to compare methods, pros/cons, or different versions.
      5. APPLICATIONS: Include a dedicated section for "Real-World Industry Applications" (🚀) (e.g., Web Dev, ML, or Systems).
      6. MATH: Use LaTeX ($) for all technical notations (e.g., $O(n \log n)$, $\sum x_i$).
      7. STRUCTURE: Use # for Title, ## for Main Chapters, ### for Sub-sections.
    `,

    short: `
      Act as a Senior Teaching Assistant. Create "Logic-Dense Revision Notes" for: ${sourceText}.
      - Focus on high-yield facts, exam-critical logic, and core mechanisms (⚡).
      - Include at least 3 unique mnemonics (🧠) for memory retention.
      - Use "Quick-Logic Blocks" to explain the "Why" behind a concept.
      - Include a "Common Pitfalls" section (⚠️) to identify frequent student errors.
      - Use bold text and emojis (✅, 🔗, 📌) for clarity.
      - Ensure all formulas use LaTeX ($).
    `,

    flashcards: `
      Act as a Cognitive Science Expert. Generate "Definition-to-Application" Flashcards for: ${sourceText}.
      
      CRITICAL INSTRUCTIONS:
      1. CONCEPTUAL DEPTH: Do not just ask for definitions. Focus on how a concept is applied in a specific scenario.
      2. STRUCTURE: Frame questions as "What happens if..." or "How would you implement..." to test active recall.
      3. FEEDBACK: Each answer must include a brief "Pro-Tip" or extra context starting with 💡.
      4. FORMAT: Return ONLY a JSON array of objects.
      
      Example: [{"question": "❓ How does X behave in Scenario Y?", "answer": "💡 X does Z because... Pro-tip: Remember to check for edge case A."}]
    `,

    quiz: `
      Act as a Rigorous Academic Examiner. Create a "High-Stakes Practice Exam" for: ${sourceText}.
      
      REQUIREMENTS:
      1. DIFFICULTY: Include "Conceptual Traps" where two options seem correct but only one is perfectly accurate.
      2. BALANCE: 40% Factual Recall (What is X?) and 60% Scenario-based Application (Given Y, solve for Z).
      3. EXPLANATIONS: For EVERY question, provide a "Pedagogical Breakdown" (🧠) explaining why the correct answer is right and why the distractors are wrong.
      4. FORMAT: Return ONLY a JSON array of objects.
      
      Example: [{"question": "📝 [Scenario] A developer is facing Problem A, which tool should they use?", "options": ["A", "B", "C", "D"], "correctAnswer": "B", "explanation": "🧠 Option B is correct because... Option A is a common trap because..."}]
    `
  };

  for (let i = 0; i < API_KEYS.length; i++) {
    for (const modelName of MODELS) {
      try {
        console.log(`📡 Attempting ${modelName} with Key #${i + 1}...`);
        
        const genAI = new GoogleGenerativeAI(API_KEYS[i]);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: "You are an elite academic assistant. You generate deep, accurate, and visually structured notes using LaTeX, Markdown, and Emojis."
        });

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompts[type] }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 16000, // Maximized to prevent cutting off detailed notes
          }
        });

        const response = await result.response;
        const rawText = response.text().replace(/```json|```markdown|```/g, "").trim();
        
        console.log(`✅ SUCCESS: [Model ${modelName}]`);
        return (type === 'flashcards' || type === 'quiz') ? JSON.parse(rawText) : rawText;

      } catch (err) {
        console.error(`❌ FAILED: Model: ${modelName} | Error: ${err.message}`);
        
        if (err.message.includes("429") || err.message.includes("quota")) {
          continue; 
        }
        throw err;
      }
    }
  }
  throw new Error("CRITICAL: All Gemini models and keys failed.");
};