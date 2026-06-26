const { getRealProductionsData } = require('./actions/dashboard-actions.ts');

async function test() {
  const result = await getRealProductionsData();
  console.log(JSON.stringify(result, null, 2));
}

// Tapi itu nextJS server action, I can't require it directly in plain node easily.
