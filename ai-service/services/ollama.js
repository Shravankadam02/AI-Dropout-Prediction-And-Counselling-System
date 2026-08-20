const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export async function generateEmbedding(text) {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama embedding failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.embeddings?.[0]) {
    throw new Error('Ollama returned no embedding');
  }

  return data.embeddings[0];
}

export async function generateChat(messages, systemPrompt = '') {
  const ollamaMessages = [];

  if (systemPrompt) {
    ollamaMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  ollamaMessages.push(...messages);

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama chat failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.message?.content) {
    throw new Error('Ollama returned no chat response');
  }

  return data.message.content.trim();
}
