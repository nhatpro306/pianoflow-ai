const { execSync } = require('child_process');

const envs = {
  'NEXT_PUBLIC_MODAL_SUBMIT_URL': 'https://nhatpro306--pianoflow-transcribe-web.modal.run',
  'NEXT_PUBLIC_MODAL_RESULT_URL': 'https://nhatpro306--pianoflow-transcribe-web.modal.run',
  'NEXT_PUBLIC_DEMO_TOKEN': 'Y4TjCGfR92Kuv9jG-orTCP841bGs9wdw',
  'MODAL_SUBMIT_URL': 'https://nhatpro306--pianoflow-transcribe-web.modal.run/submit',
  'MODAL_RESULT_URL': 'https://nhatpro306--pianoflow-transcribe-web.modal.run/result',
  'DEMO_TOKEN': 'Y4TjCGfR92Kuv9jG-orTCP841bGs9wdw',
  'NEXT_PUBLIC_API_BASE_URL': 'https://rcusueycsj.execute-api.ap-southeast-1.amazonaws.com',
  'NEXT_PUBLIC_SUPABASE_URL': 'https://kcznjjnhtajwumhvbasq.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjem5qam5odGFqd3VtaHZiYXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODkyMzksImV4cCI6MjA5Njg2NTIzOX0.WhcV5geUsLngJJd4-LKhe16j08OcsG5MOvtJaHjUsHs'
};

for (const [k, v] of Object.entries(envs)) {
  console.log('Setting', k);
  const result = execSync(`vercel env add ${k} production --value "${v}" --force --yes`, { encoding: 'utf8' });
  console.log(result);
}
console.log('Done');
