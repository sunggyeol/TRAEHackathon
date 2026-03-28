
async function testAPI() {
  try {
    const port = process.env.PORT || '3000';
    const response = await fetch(`http://localhost:${port}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        message: '안녕하세요, 정산 데이터 분석 전문가님. 간단한 인사 부탁드립니다.',
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status, await response.text());
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    console.log('--- Streaming Response ---');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) process.stdout.write(parsed.text);
          } catch (e) {}
        }
      }
    }
    console.log('\n--- End ---');
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

testAPI();
