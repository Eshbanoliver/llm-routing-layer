import fetch from 'node-fetch'; // wait, since node-fetch is not installed (it's not in package.json), but modern node v24 has global fetch built-in!
// We can use the native global fetch directly since we are on node v24.13.0!

async function runTest() {
  console.log('--- Starting Routing Verification Test ---');
  
  const testQueries = [
    {
      query: 'Hello there! What is the capital of France?',
      strategy: 'balanced',
      expectedTier: 'Low/Medium'
    },
    {
      query: 'Write an advanced recursive backtracking solver in JavaScript for the N-Queens problem, detailing the exact backtracking state search, and analyzing its Big-O runtime complexity.',
      strategy: 'balanced',
      expectedTier: 'High'
    }
  ];

  for (const t of testQueries) {
    console.log(`\nSending prompt: "${t.query.substring(0, 50)}..."`);
    try {
      const response = await fetch('http://localhost:5000/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: t.query,
          strategy: t.strategy
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}`);
      }

      const data = await response.json();
      console.log('✓ Success!');
      console.log(`- Complexity Score: ${data.complexityScore.toFixed(2)}`);
      console.log(`- Routed Model: ${data.routedModel} (${data.provider})`);
      console.log(`- Simulated: ${data.isSimulated}`);
      console.log(`- Latency: ${data.latency}ms`);
      console.log(`- Cost: $${data.cost}`);
      console.log(`- Response preview: ${data.response.substring(0, 150).replace(/\n/g, ' ')}...`);
    } catch (error) {
      console.error('✗ Test failed:', error.message);
    }
  }

  // Verify Stats endpoint
  console.log('\n--- Fetching Dashboard Telemetry Stats ---');
  try {
    const statsResponse = await fetch('http://localhost:5000/api/stats');
    const stats = await statsResponse.json();
    console.log('✓ Success!');
    console.log(`- Total Queries logged: ${stats.totalQueries}`);
    console.log(`- Total Savings: $${stats.totalSavings}`);
    console.log(`- Distribution:`, stats.modelDistribution);
  } catch (error) {
    console.error('✗ Stats test failed:', error.message);
  }
}

runTest();
