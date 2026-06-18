const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Sem GEMINI_API_KEY no .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.5-flash', 'gemini-1.5-flash-8b'];
  for (const m of models) {
    try {
      console.log('Testando', m);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent('Diga apenas "API Funciona"');
      const response = await result.response;
      console.log('Sucesso com', m, ':', response.text());
      return;
    } catch (error) {
      console.error('Erro no', m, ':', error.message || error);
    }
  }
}

run();
