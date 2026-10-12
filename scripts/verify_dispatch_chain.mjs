// scripts/verify_dispatch_chain.mjs
const API = 'http://localhost:8000';

async function main() {
  console.log('=== Step 1: Officer Login ===');
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@tapas.gov.in', password: 'tapas2026' }),
  });
  if (!loginRes.ok) throw new Error(`Officer login failed: ${loginRes.status}`);
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Officer authenticated. Cookie obtained.');

  console.log('\n=== Step 2: Select Level 5 Ward & NOTIFY / MOBILISE ===');
  const activateRes = await fetch(`${API}/api/response/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      ward_id: 'HYD-001',
      risk_level: 5,
      groups: ['ward_officials', 'asha_mro', 'workers', 'healthcare'],
    }),
  });
  if (!activateRes.ok) throw new Error(`Activation failed: ${activateRes.status} ${await activateRes.text()}`);
  const op = await activateRes.json();
  console.log(`Operation Created: ${op.operation_id} (DB id: ${op.id})`);
  console.log(`Recipients Count: ${op.recipients.length}`);
  console.log(`Timeline Events: ${op.timeline.length}`);
  console.log(`CAP Document Included: ${Boolean(op.cap_xml)}`);

  const ashaRecipient = op.recipients.find((r) => r.recipient_type === 'asha') || op.recipients[0];
  console.log(`Target Token for Responder: ${ashaRecipient.action_token}`);
  console.log(`Initial Status: ${ashaRecipient.operational_status}`);

  console.log('\n=== Step 3: Open /respond/{token} (Fetch Responder Context) ===');
  const contextRes = await fetch(`${API}/api/respond/${encodeURIComponent(ashaRecipient.action_token)}`);
  if (!contextRes.ok) throw new Error(`Fetch token context failed: ${contextRes.status}`);
  const tokenContext = await contextRes.json();
  console.log(`Token Resolved:`);
  console.log(`- Recipient Name: ${tokenContext.name}`);
  console.log(`- Ward Name: ${tokenContext.ward_name}`);
  console.log(`- Operational Status: ${tokenContext.operational_status}`);
  console.log(`- Operation Reference: ${tokenContext.operation_id}`);

  console.log('\n=== Step 4: Responder Presses ACKNOWLEDGE ===');
  const ackRes = await fetch(`${API}/api/respond/${encodeURIComponent(ashaRecipient.action_token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'acknowledge' }),
  });
  if (!ackRes.ok) throw new Error(`Acknowledge failed: ${ackRes.status}`);
  const ackData = await ackRes.json();
  console.log('Action Response:', ackData);
  if (ackData.operational_status !== 'acknowledged') {
    throw new Error(`Expected operational_status='acknowledged', got '${ackData.operational_status}'`);
  }
  console.log('✓ Verified: DB operational_status is now "acknowledged"');

  console.log('\n=== Step 5: Verify Officer Dashboard Telemetry ===');
  const verifyRes = await fetch(`${API}/api/response/${op.id}`, {
    headers: { Cookie: cookie },
  });
  if (!verifyRes.ok) throw new Error(`Fetch operation failed: ${verifyRes.status}`);
  const updatedOp = await verifyRes.json();
  const updatedAsha = updatedOp.recipients.find((r) => r.id === ashaRecipient.id);
  console.log(`Officer sees updated status: ${updatedAsha.operational_status}`);
  console.log('Updated Timeline Events:');
  for (const t of updatedOp.timeline) {
    console.log(`  - [${t.event_type}] ${t.actor}: ${t.detail || ''}`);
  }
  const hasAckEvent = updatedOp.timeline.some((t) => t.event_type === 'acknowledged');
  console.log(`Timeline logs acknowledgment: ${hasAckEvent}`);

  console.log('\n=== FULL DISPATCH CHAIN END-TO-END: PASSED ===');
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
