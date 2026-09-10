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

    // 提示词：要求 Gemini 分析图片并输出喜茶风格的矢量海报 (SVG 格式)
    const prompt = `
Analyze the uploaded image. Design a premium, high-end HeyTea (喜茶) editorial advertising poster as a complete valid SVG string.

Design Requirements:
1. Output ONLY a valid <svg>...</svg> element, without markdown codeblock syntax, HTML wrap, or explanations.
2. SVG dimensions: viewBox="0 0 600 800" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg".
3. Background: Minimalist off-white cream background (#FAF9F6).
4. Main Subject: In the center, draw a clean artistic vector graphic representation or framed showcase of the main item from the user's uploaded photo.
5. Micro Line-Art Characters: Draw cute black & white stick-figure doodle characters interacting with the main item (e.g., climbing ladders, painting, pushing tiny wheelbarrows, resting on top).
6. Editorial Typography:
   - Include stylish minimal text layout: "灵感之茶", "HEYTEA", "INSPIRATION OF TEA", minimal border lines, and modern poster layout elements.
7. Color Palette: Cream background (#FAF9F6), soft dark lines (#1C1C1C), elegant muted accent colors.
`;

    // 使用 Node.js 原生 fetch 调用 Gemini 2.0 接口，无需任何第三方 npm 包
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
    
    // 提取生成的 SVG 海报代码
    const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      return res.status(500).json({ error: '海报生成格式解析失败，请重新点击生成' });
    }

    const svgCode = svgMatch[0];
    
    // 将 SVG 转为可直接被 <img> 标签读取的 Data URL
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
