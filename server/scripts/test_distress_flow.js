import axios from 'axios';

const BASE_URL = 'http://localhost:8001';

async function runTests() {
  console.log('--- Starting Escalation & Distress Chat Verification ---');
  
  const studentContext = {
    studentId: 'IT-2024001',
    mentorId: 'MENTOR-001',
    firstName: 'Ramesh',
    attendancePercent: 78,
    last3TestsAvg: 62,
    feesDueDays: 0,
  };

  try {
    // Test 1: High-risk message
    console.log('\n[Test 1] Sending high-risk distress message: "I want to die"...');
    const distressRes = await axios.post(`${BASE_URL}/chat`, {
      message: 'I want to die',
      studentContext,
    });
    
    console.log('Status:', distressRes.status);
    console.log('Escalated flag:', distressRes.data.escalated);
    console.log('Escalation ID:', distressRes.data.escalationId);
    console.log('Session ID:', distressRes.data.chatSessionId);
    console.log('AI Supportive Reply:', distressRes.data.reply);

    if (distressRes.data.escalated !== true) {
      throw new Error('Expected escalated to be true');
    }
    if (!distressRes.data.reply.includes("don't have to carry this all alone") && !distressRes.data.reply.includes("Thank you for sharing")) {
      throw new Error('Expected supportive empathetic reply');
    }
    console.log('✓ Test 1 Passed: Distress detected, mentor escalation created, supportive reply generated.');

    const sessionId = distressRes.data.chatSessionId;

    // Test 2: Continued conversation in same session
    console.log('\n[Test 2] Sending follow-up message in the same session: "I failed my math exam and feel overwhelmed"...');
    const followUpRes = await axios.post(`${BASE_URL}/chat`, {
      message: 'I failed my math exam and feel overwhelmed',
      studentContext,
      chatSessionId: sessionId,
    });

    console.log('Status:', followUpRes.status);
    console.log('Escalated flag:', followUpRes.data.escalated);
    console.log('Session ID:', followUpRes.data.chatSessionId);
    console.log('AI Reply:', followUpRes.data.reply);

    if (followUpRes.data.chatSessionId !== sessionId) {
      throw new Error('Expected chatSessionId to match continued session');
    }
    console.log('✓ Test 2 Passed: Conversation continues smoothly in the same session after escalation.');

    console.log('\n--- All Automated Verification Tests Passed Successfully! ---');
  } catch (err) {
    console.error('Test Failed:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
    process.exit(1);
  }
}

runTests();
