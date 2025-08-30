/**
 * Node script to publish today's puzzle file from the bank (and optionally grow the bank).
 * Run locally or from GitHub Actions.
 */
const fs = require('fs');
const path = require('path');

const today = new Date().toISOString().slice(0,10);
const bankPath = path.join(__dirname, '..', 'puzzles', 'bank.json');
const outPath = path.join(__dirname, '..', 'puzzles', `${today}.json`);

function pickFromBank(date) {
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  if(!Array.isArray(bank) || !bank.length) throw new Error('Bank empty');
  const seed = Number(date.replaceAll('-',''));
  const pick = JSON.parse(JSON.stringify(bank[seed % bank.length]));
  pick.date = date; return pick;
}

async function maybeGenerateWithLLM(){
  if(process.env.USE_LLM !== 'true') return null;
  const key = process.env.OPENROUTER_API_KEY; if(!key) return null;
  const prompt = `Create an ORIGINAL 5x5 mini crossword in JSON. Use '.' for black squares. Provide valid crossing. Schema: {\"date\":\"YYYY-MM-DD\",\"size\":{\"rows\":5,\"cols\":5},\"grid\":[\".....\"×5],\"clues\":{\"across\":[{num,row,col,answer,clue}],\"down\":[...]}}. Answers must be common words; clues fair and concise.`;
  const body = {
    model: process.env.LLM_MODEL || 'openai/gpt-oss-20b:free',
    messages: [{role:'user', content: prompt}],
    temperature: 0.6,
  };
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${key}` },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  const txt = data.choices?.[0]?.message?.content?.trim();
  if(!txt) return null;
  try { return JSON.parse(txt); } catch { return null; }
}

(async () => {
  // Ensure bank exists
  if(!fs.existsSync(bankPath)){
    fs.mkdirSync(path.dirname(bankPath), {recursive:true});
    fs.writeFileSync(bankPath, '[]');
  }
  // Write today's puzzle if missing
  if(!fs.existsSync(outPath)){
    const puz = pickFromBank(today);
    fs.mkdirSync(path.dirname(outPath), {recursive:true});
    fs.writeFileSync(outPath, JSON.stringify(puz, null, 2));
  }
  // Optionally grow the bank
  try {
    const gen = await maybeGenerateWithLLM();
    if(gen){
      const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
      bank.push(gen);
      fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2));
    }
  } catch(e){ console.warn('LLM gen failed:', e.message); }
})();