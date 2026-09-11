import { generateChat } from './ollama.js';

// Fast first-pass — catches obvious explicit cases cheaply, without an extra API call
const DISTRESS_PATTERNS = [
  /\b(suicid|self.?harm|kill myself|end my life|hurt myself|taking my life)\b/i,
  /\b(want to die|no reason to (live|keep living)|don'?t want to live|can'?t go on|give up on life|giving up on life)\b/i,
  /\b(talk to (a )?(real|human) (person|mentor|counselor)|speak to my mentor|connect me (with|to) my mentor)\b/i,
  /\b(being harassed|being bullied|someone is threatening)\b/i,
];

export function checkDistressKeywords(message) {
  return DISTRESS_PATTERNS.some((pattern) => pattern.test(message));
}

// Real safety net — classifies intent even when wording doesn't match a pattern
export async function checkDistressIntent(message) {
  const prompt = `Classify this message from a student to an AI mentor. Respond with ONLY one word: "escalate" or "safe".

Respond "escalate" if the message expresses: suicidal thoughts or self-harm intent (even indirectly phrased, like hopelessness about the future or "not seeing the point"), a request to talk to a real person, harassment, abuse, or a crisis the student needs human help with.

Respond "safe" for normal academic, emotional, or day-to-day concerns, even if stressed or frustrated in tone.

Message: "${message}"

Classification:`;

  try {
    const result = await generateChat([
      {
        role: 'user',
        content: prompt,
      },
    ]);
    const classification = result.trim().toLowerCase();
    return (
      classification.includes('escalate') ||
      /\b(suicid|self-harm|helpline|crisis|lifeline)\b/i.test(classification)
    );
  } catch (err) {
    console.error('Distress intent classification failed:', err.message);
    return false;
  }
}