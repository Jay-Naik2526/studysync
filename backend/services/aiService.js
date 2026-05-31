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
You are an elite university professor writing a definitive textbook chapter. Your output will be rendered in a markdown viewer that supports LaTeX (KaTeX), tables, and code blocks.

TOPIC: ${sourceText}

STRUCTURE REQUIREMENTS:
1. Begin with a brief "Chapter Overview" (2-3 sentences on what the reader will master).
2. Use # for the chapter title, ## for major sections, ### for subsections.
3. Include a summary table of key concepts at the start using markdown tables.

CONTENT REQUIREMENTS:
4. THEORY: Explain every concept from first principles. Never assume prior knowledge.
5. EXAMPLES: After every concept, include a concrete worked example with step-by-step reasoning (use code blocks for code, math blocks for equations).
6. ANALOGIES: Use one vivid real-world analogy per major section to make abstract ideas tangible.
7. MATH: Use inline LaTeX ($...$) for all formulas and block LaTeX ($$...$$) for standalone equations.
8. COMPARISONS: Use markdown tables to compare techniques, trade-offs, or variations side by side.
9. PITFALLS: Include a "⚠️ Common Mistakes" box after complex sections.
10. APPLICATIONS: End with a "🚀 Real-World Applications" section showing where this topic appears in industry.
11. SUMMARY: Close with a "Key Takeaways" bullet list of the 5-7 most important points.

Write comprehensively. Do not truncate or summarize — produce the full chapter.
    `,

    short: `
You are a top-ranked exam coach creating the ultimate last-minute revision sheet. Your output will be rendered in a markdown viewer supporting LaTeX and tables.

TOPIC: ${sourceText}

REQUIREMENTS:
1. START with a "⚡ Core Idea in One Line" — the single most important sentence about this topic.
2. Use ## headers to separate each concept. Keep sections tight and scannable.
3. HIGH-YIELD FACTS: Bold every testable fact. Use bullet points, not paragraphs.
4. FORMULAS: Present every formula in LaTeX ($...$). Immediately after, explain each variable in one line.
5. MNEMONICS: Create 3–5 original memory hooks (🧠) — acronyms, rhymes, or vivid imagery.
6. QUICK-LOGIC: For tricky concepts, add a "🔗 Why it works:" one-liner that explains the mechanism.
7. TRAPS: Include a "⚠️ Don't confuse:" section listing the 3 most common exam errors on this topic.
8. COMPARISON TABLE: Include at least one markdown table comparing related concepts, methods, or formulas.
9. LAST-MINUTE CHECKLIST: End with 5–7 bullet points of things to verify before an exam.

Be dense and ruthlessly concise. Every sentence must add exam value.
    `,

    flashcards: `
You are a cognitive science expert designing active-recall flashcards for a student exam.

TOPIC: ${sourceText}

OUTPUT FORMAT — return ONLY a valid JSON array, no markdown, no explanation outside JSON:
[
  {
    "question": "Question text here — test application, not just definition",
    "answer": "Crisp answer in 1–2 sentences maximum.",
    "hint": "One-word or short phrase hint if the student is stuck"
  }
]

CONTENT RULES:
1. Generate exactly 15 flashcards covering the breadth of the topic.
2. QUESTION STYLE: Mix question types — "What is...", "Why does...", "What happens when...", "How do you...", "Which is better X or Y when...". At least 8 must be application or reasoning questions, not pure recall.
3. ANSWER LENGTH: STRICT MAXIMUM of 2 sentences. Cut ruthlessly. If you cannot say it in 2 sentences, find the core insight and say only that.
4. HINT: A single keyword or short phrase (3 words max) that nudges recall without giving it away.
5. NO OVERLAP: Every card must test a distinct concept. Do not repeat ideas across cards.
6. DIFFICULTY SPREAD: 5 easy (definitions/facts), 5 medium (application), 5 hard (reasoning/edge cases).

Return ONLY the JSON array. No code fences, no preamble, no explanation.
    `,

    quiz: `
You are a rigorous academic examiner creating a high-stakes practice test.

TOPIC: ${sourceText}

OUTPUT FORMAT — return ONLY a valid JSON array, no markdown, no explanation outside JSON:
[
  {
    "question": "Full question text here",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswer": "Exact text of the correct option (must match one of the options exactly)",
    "explanation": "2–3 sentence explanation of why the correct answer is right and why the top distractor is wrong."
  }
]

CONTENT RULES:
1. Generate exactly 10 questions.
2. DIFFICULTY: 3 easy (recall), 4 medium (application), 3 hard (analysis/traps). Label nothing — just vary the difficulty.
3. OPTIONS: Always exactly 4 options. All options must be plausible — no obviously wrong decoys.
4. TRAPS: In at least 3 questions, include a "close but wrong" distractor that targets a common misconception.
5. SCENARIO QUESTIONS: At least 5 questions must present a mini-scenario or problem to solve, not just ask "What is X?".
6. CORRECT ANSWER: The "correctAnswer" field must contain the EXACT same string as one of the four options (copy-paste it).
7. EXPLANATION: Explain why the correct answer is right. In one sentence, explain why the most tempting wrong answer fails.
8. COVERAGE: Distribute questions across the full breadth of the topic — don't cluster on one subtopic.

Return ONLY the JSON array. No code fences, no preamble, no explanation.
    `
  };

  for (let i = 0; i < API_KEYS.length; i++) {
    for (const modelName of MODELS) {
      try {
        console.log(`📡 Attempting ${modelName} with Key #${i + 1}...`);
        
        const genAI = new GoogleGenerativeAI(API_KEYS[i]);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: "You are an elite academic content engine. For notes/revision: produce exhaustive, well-structured Markdown with LaTeX math, tables, and code blocks. STRICT MATH FORMATTING RULES: (1) Use inline LaTeX ($...$) ONLY for actual mathematical formulas/variables (e.g., $O(N \\log N)$). Never use single '$' for numbering, lists, labels, or currency (e.g. NEVER write '1$' or '2$'). (2) Block math ($$...$$) MUST start and end on their own separate newlines. Never write $$ inline with other text. (3) For piecewise/recurrence cases, wrap the entire \\begin{cases} and \\end{cases} inside $$...$$ with proper newlines. (4) Never leave a '$' sign unclosed. For flashcards/quiz: return ONLY a raw JSON array — no markdown fences, no preamble, no trailing text. Your JSON must be valid and parseable. Never truncate output."
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