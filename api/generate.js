import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: '未在 Vercel 配置 GEMINI_API_KEY 环境变量' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: '请选择并上传图片' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // 使用精准匹配的 gemini-1.5-flash-8b 模型名称，解决 404 问题
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Analyze the uploaded image. Design a premium, high-end HeyTea (喜茶) editorial advertising poster as a complete valid SVG string.

Design Requirements:
1. Output ONLY a valid <svg>...</svg> string, without markdown codeblock syntax or extra text.
2. SVG dimensions: viewBox="0 0 600 800".
3. Background: #FAF9F6 (minimal cream).
4. Draw a simple poster layout: main item graphic in center, clean stick-figure doodles climbing on it, and clean "HEYTEA 灵感之茶" text at the bottom. Keep SVG paths clean and simple.
`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    const svgMatch = responseText.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      return res.status(500).json({ error: '海报生成格式解析失败，请重新点击生成' });
    }

    const svgCode = svgMatch[0];
    const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误，请重试' });
  }
}
