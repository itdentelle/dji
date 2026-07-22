require('dotenv').config({ path: '.env.local' });
const { getMachineBlockAnalytics } = require('./actions/dashboard-actions');

async function test() {
  const res = await getMachineBlockAnalytics("R1", 30);
  console.log(JSON.stringify(res, null, 2));
}

test();
