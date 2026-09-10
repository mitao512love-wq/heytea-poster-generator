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

    const prompt = `
Analyze the uploaded image. Design a premium, high-end HeyTea (喜茶) editorial advertising poster as a complete valid SVG string.

Design Requirements:
1. Output ONLY a valid <svg>...</svg> string.
2. SVG dimensions: viewBox="0 0 600 800".
3. Background: #FAF9F6 (minimal cream).
4. Draw a simple poster layout: main item graphic in center, clean stick-figure doodles climbing on it, and clean "HEYTEA 灵感之茶" text at the bottom. Keep SVG paths clean and simple.
`;

    // 重点修改：调用 gemini-1.5-flash-latest，确保 API 能正确识别模型
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
                { text: prompt }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(500).json({ error: data.error?.message || 'Gemini API 请求失败' });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);
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
