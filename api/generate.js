import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: '环境变量未配置 GEMINI_API_KEY' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: '请上传图片' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 使用 Gemini 2.5 Flash 多模态模型
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 喜茶风格的核心 Prompt
    const prompt = `
      Analyze the main product/object in this image. 
      Generate a detailed textual image prompt describing a HeyTea style editorial poster based on it.
      Requirements:
      1. Minimal off-white cream background with generous negative space.
      2. Cute black and white line-art doodle stick figures interacting with the main object (climbing a ladder, pushing a tiny wheelbarrow, spraying water, carrying ingredients).
      3. High-end, clean, aesthetic design with modern poster composition.
    `;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    return res.status(200).json({ 
      success: true, 
      message: '分析成功',
      promptResult: responseText 
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || '生成失败，请检查 API Key 或稍后重试' });
  }
}
