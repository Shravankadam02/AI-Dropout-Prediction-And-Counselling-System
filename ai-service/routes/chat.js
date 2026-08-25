import express from 'express';
import { QdrantClient } from '@qdrant/js-client-rest';
import ChatSession from '../models/ChatSession.js';
import ChatMessage from '../models/ChatMessage.js';
import Escalation from '../models/Escalation.js';
import Notification from '../models/Notification.js';
import {
  checkDistressKeywords,
  checkDistressIntent,
} from '../services/escalationDetector.js';
import { generateEscalationSummary } from '../services/summarize.js';
import {
  generateEmbedding,
  generateChat,
} from '../services/ollama.js';

const router = express.Router();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

const COLLECTION_NAME = 'dropout_kb';
const LOW_CONFIDENCE_THRESHOLD = 0.65;

async function embedQuery(text) {
  return await generateEmbedding(text);
}

async function retrieveContext(queryVector, topK = 3) {
  const results = await qdrant.query(COLLECTION_NAME, {
    query: queryVector,
    limit: topK,
    with_payload: true,
  });

  return results.points;
}

function buildSystemPrompt(studentContext, retrievedChunks) {
  const contextText = retrievedChunks
    .map(
      (r) =>
        `[${r.payload.topic}] ${r.payload.text}`
    )
    .join('\n\n');

  return `You are a supportive AI mentor for a student at an engineering college in India.

Your role is to offer encouraging, practical guidance — not clinical or robotic advice.

Student context:
- Name: ${studentContext.firstName || 'the student'}
- Attendance: ${studentContext.attendancePercent}%
- Recent test average: ${studentContext.last3TestsAvg}
- Fee status: ${
    studentContext.feesDueDays > 0
      ? `${studentContext.feesDueDays} days overdue`
      : 'clear'
  }

Important:
- Use the student information to personalize your response.
- Never state the student's exact risk score or risk label.
- Never make the student feel judged or blamed.

Relevant guidance from the knowledge base:
${
  contextText ||
  'No specific guidance found for this topic.'
}

Instructions:
- Keep responses warm, brief (3-5 sentences), and actionable.
- Ground your advice in the knowledge base content above when relevant.
- Never make a clinical diagnosis.
- Never give medical or psychiatric advice.
- If you don't have relevant guidance for the topic, say so honestly.
- When appropriate, suggest speaking with a human mentor.
- Do not pretend to be a human counselor.`;
}

// POST /chat — main conversational endpoint
router.post('/', async (req, res) => {
  try {
    const {
      message,
      studentContext,
      chatSessionId,
    } = req.body;

    if (
      !message ||
      !studentContext ||
      !studentContext.studentId
    ) {
      return res.status(400).json({
        message:
          'message and studentContext (with studentId) are required',
      });
    }

    // Get or create the chat session
    let session = chatSessionId
      ? await ChatSession.findById(chatSessionId)
      : null;

    if (!session) {
      session = await ChatSession.create({
        studentId: studentContext.studentId,
        status: 'active',
      });
    }

    // Save student's message
    await ChatMessage.create({
      chatSessionId: session._id,
      role: 'user',
      content: message,
    });

    // Check for automatic escalation
    const isDistress =
      checkDistressKeywords(message) ||
      await checkDistressIntent(message);

    if (isDistress) {
      const allMessages = await ChatMessage.find({
        chatSessionId: session._id,
      }).sort({ createdAt: 1 });

      const summary =
        await generateEscalationSummary(allMessages);

      const escalation = await Escalation.create({
        studentId: studentContext.studentId,
        mentorId: studentContext.mentorId || null,
        reason: 'distress_keyword',
        summary,
        chatSessionId: session._id,
        status: 'open',
      });

      if (studentContext.mentorId) {
        await Notification.create({
          recipientId: studentContext.mentorId,
          title: 'New Student Escalation',
          message: `Automatic escalation triggered for ${studentContext.firstName || studentContext.studentId} due to distress keywords.`,
          type: 'warning',
          link: '/dashboard',
        });
      }

      session.status = 'escalated';
      await session.save();

      const handoffReply =
        "I hear that this is difficult, and I want to make sure you get the right support. I'm connecting you with your mentor now — they'll be able to help in a way I can't.";

      await ChatMessage.create({
        chatSessionId: session._id,
        role: 'ai',
        content: handoffReply,
      });

      return res.json({
        reply: handoffReply,
        chatSessionId: session._id,
        escalated: true,
        escalationId: escalation._id,
      });
    }

    // ---------------------------------------
    // NORMAL RAG FLOW
    // ---------------------------------------

    // Generate local embedding using Nomic
    const queryVector = await embedQuery(message);

    // Search Qdrant
    const retrieved = await retrieveContext(queryVector);

    const topScore =
      retrieved.length > 0
        ? retrieved[0].score
        : 0;

    const lowConfidence =
      topScore < LOW_CONFIDENCE_THRESHOLD;

    // Build system prompt
    const systemPrompt =
      buildSystemPrompt(
        studentContext,
        retrieved
      );

    // Get conversation history
    const history = await ChatMessage.find({
      chatSessionId: session._id,
    }).sort({ createdAt: 1 });

    // Exclude current user message
    const chatHistory = history
      .slice(0, -1)
      .map((h) => ({
        role:
          h.role === 'ai'
            ? 'assistant'
            : 'user',
        content: h.content,
      }));

    // Generate response using local Llama
    const reply = await generateChat(
      chatHistory.concat([
        {
          role: 'user',
          content: message,
        },
      ]),
      systemPrompt
    );

    // Save AI response
    await ChatMessage.create({
      chatSessionId: session._id,
      role: 'ai',
      content: reply,
      retrievedTopics: retrieved.map(
        (r) => r.payload.topic
      ),
    });

    res.json({
      reply,
      chatSessionId: session._id,
      escalated: false,
      lowConfidence,
      retrievedTopics: retrieved.map(
        (r) => r.payload.topic
      ),
    });
  } catch (err) {
    console.error('Chat failed:', err);

    res.status(500).json({
      message: 'Chat failed',
      error: err.message,
    });
  }
});

// POST /chat/escalate — manual escalation
router.post('/escalate', async (req, res) => {
  try {
    const {
      chatSessionId,
      studentContext,
    } = req.body;

    if (!chatSessionId || !studentContext) {
      return res.status(400).json({
        message:
          'chatSessionId and studentContext are required',
      });
    }

    const session =
      await ChatSession.findById(chatSessionId);

    if (!session) {
      return res.status(404).json({
        message: 'Chat session not found',
      });
    }

    const allMessages =
      await ChatMessage.find({
        chatSessionId: session._id,
      }).sort({ createdAt: 1 });

    const summary =
      allMessages.length > 0
        ? await generateEscalationSummary(
            allMessages
          )
        : 'Student requested to speak with their mentor.';

    const escalation =
      await Escalation.create({
        studentId:
          studentContext.studentId,
        mentorId:
          studentContext.mentorId || null,
        reason: 'student_requested',
        summary,
        chatSessionId: session._id,
        status: 'open',
      });

    if (studentContext.mentorId) {
      await Notification.create({
        recipientId: studentContext.mentorId,
        title: 'New Student Escalation',
        message: `${studentContext.firstName || studentContext.studentId} has manually requested to speak with you.`,
        type: 'info',
        link: '/dashboard',
      });
    }

    session.status = 'escalated';
    await session.save();

    res.json({
      message: 'Escalation created',
      escalationId: escalation._id,
    });
  } catch (err) {
    console.error(
      'Escalation failed:',
      err
    );

    res.status(500).json({
      message: 'Escalation failed',
      error: err.message,
    });
  }
});

export default router;