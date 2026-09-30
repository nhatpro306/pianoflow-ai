const { execSync } = require('child_process');

const envVars = {
  "NEXT_PUBLIC_MODAL_SUBMIT_URL": "https://nhatpro306--pianoflow-transcribe-web.modal.run",
  "NEXT_PUBLIC_MODAL_RESULT_URL": "https://nhatpro306--pianoflow-transcribe-web.modal.run",
  "NEXT_PUBLIC_DEMO_TOKEN": "Y4TjCGfR92Kuv9jG-orTCP841bGs9wdw",
  "MODAL_SUBMIT_URL": "https://nhatpro306--pianoflow-transcribe-web.modal.run/submit",
  "MODAL_RESULT_URL": "https://nhatpro306--pianoflow-transcribe-web.modal.run/result",
  "DEMO_TOKEN": "Y4TjCGfR92Kuv9jG-orTCP841bGs9wdw"
};

for (const [key, value] of Object.entries(envVars)) {
  console.log(`Setting ${key}...`);
  // Remove the old one just in case
  try {
    execSync(`vercel env rm ${key} production -y`, { stdio: 'ignore' });
  } catch (e) {
    // ignore if it doesn't exist
  }
  
  // Add the new one securely
  execSync(`vercel env add ${key} production --force`, {
    input: value, // This passes the string EXACTLY as is, no \r or \n appended!
    encoding: 'utf8'
  });
}
console.log('All set! Redeploying...');
execSync('vercel --prod --yes', { stdio: 'inherit' });
