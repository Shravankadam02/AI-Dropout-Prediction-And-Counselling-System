import { generateChat } from './ollama.js';

function isSafetyRelated(text) {
  const safetyPatterns = [
    /\bsuicid/i,
    /\bself.?harm/i,
    /\bkill myself/i,
    /\bend my life/i,
    /\bhurt myself/i,
    /\bwant to die/i,
    /\bno reason to live/i,
    /\bcan't go on/i,
    /\bnot seeing the point/i,
  ];

  return safetyPatterns.some((pattern) => pattern.test(text));
}

function isHumanHelpRequest(text) {
  const patterns = [
    /\btalk to (a )?(real|human) (person|mentor)/i,
    /\bspeak to my mentor/i,
    /\bconnect me (with|to) my mentor/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

export async function generateEscalationSummary(messages) {
  const transcript = messages
    .map(
      (m) =>
        `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`
    )
    .join('\n');

  // Safety-related escalations get a deterministic factual handoff.
  // This avoids an LLM refusal when the conversation contains crisis language.
  if (isSafetyRelated(transcript)) {
    return 'The student expressed thoughts indicating possible self-harm or suicidal intent and requires human support. Immediate follow-up by the student’s mentor is recommended.';
  }

  // Explicit request for a human mentor.
  if (isHumanHelpRequest(transcript)) {
    return 'The student requested to speak with a human mentor about their situation. Mentor follow-up is recommended to provide personalized support.';
  }

  // Normal escalation: use Llama to summarize the conversation.
  const prompt = `You are preparing an internal handoff summary for a human college mentor.

Summarize the student conversation in 2-3 short factual sentences.

Include:
- the student's main concern
- important details they mentioned
- why human mentor follow-up may be useful

This is an internal support handoff, not a response to the student.
Do not give advice.
Do not diagnose.
Do not speculate about mental health conditions.
Do not refuse to summarize.
Only describe information that was actually stated in the conversation.

Conversation:
${transcript}

Summary:`;

  const summary = await generateChat([
    {
      role: 'user',
      content: prompt,
    },
  ]);

  return summary.trim();
}