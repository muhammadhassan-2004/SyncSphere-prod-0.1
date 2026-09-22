import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const API_KEY = firebaseConfig.apiKey;

const ACCOUNTS = [
  { email: 'admin@syncsphere.com', newPassword: 'Password123!' },
  { email: 'orbics@syncsphere.com', newPassword: 'Password123!' },
  { email: 'adam@syncsphere.com', newPassword: 'Password123!' },
  { email: 'client.demo@syncsphere.io', newPassword: 'Password123!' },
  { email: 'symbiote.elena@syncsphere.io', newPassword: 'Password123!' },
];

async function resetUserPassword(email: string, newPassword: string) {
  console.log(`\n----------------------------------------`);
  console.log(`Processing ${email}...`);

  const oobRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });

  const oobData = await oobRes.json();
  console.log('oobData:', JSON.stringify(oobData, null, 2));

  if (oobData.error) return;

  // Extract oobCode from oobLink if present
  let oobCode = oobData.oobCode;
  if (!oobCode && oobData.oobLink) {
    const url = new URL(oobData.oobLink);
    oobCode = url.searchParams.get('oobCode');
  }

  console.log(`oobCode extracted: "${oobCode}"`);

  const resetRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oobCode, newPassword }),
  });

  const resetData = await resetRes.json();
  if (resetData.error) {
    console.error(`Failed to reset password for ${email}:`, resetData.error);
  } else {
    console.log(`SUCCESSFULLY RESET password for ${email} (UID: "${resetData.email}", UID: "${resetData.localId}") to "${newPassword}"!`);
  }
}

async function main() {
  for (const acc of ACCOUNTS) {
    await resetUserPassword(acc.email, acc.newPassword);
  }
}

main().catch(console.error);
