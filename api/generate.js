import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: '请上传图片' });
    }

    // 初始化 Gemini API (会自动读取环境变量中的 GEMINI_API_KEY)
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 喜茶风格的核心 Prompt Skill 指令
    const systemSkillPrompt = `
      Create a new creative photo-doodle poster based on the uploaded image in Heytea inspiration aesthetic.
      1. Isolate the main object/product cleanly from the uploaded photo.
      2. Place it on a minimal off-white cream background with generous negative space (呼吸感留白).
      3. Add playful minimalist black line art doodles of cute tiny stick-figure people interactively working around the main object (such as climbing a small ladder, pushing a tiny wheelbarrow, spraying water, carrying items).
      4. Keep the composition clean, airy, elegant, and editorial style.
      5. Output ONLY the generated image.
    `;

    // 调用 Gemini 多模态图生图模型
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: systemSkillPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '3:4', // 小红书/海报常用 3:4 比例
      },
    });

    const generatedImageBase64 = response.generatedImages[0].image.imageBytes;

    return res.status(200).json({ 
      success: true, 
      imageUrl: `data:image/jpeg;base64,${generatedImageBase64}` 
    });

  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({ error: error.message || '生成图片失败，请稍后重试' });
  }
}
