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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Look carefully at the uploaded image — it is a product cutout with a TRANSPARENT background (the object itself, no surrounding scene).

Your task: design the DECORATIVE OVERLAY LAYER for a minimalist Chinese tea-brand editorial poster in the style of "喜茶 new-style-tea" social posters. You are NOT drawing the product itself — the real cutout image will be placed in the center of the canvas separately, at roughly x:100-500, y:200-600 in a 600x800 canvas. You only output the artwork that surrounds and lightly interacts with it.

Reference style — study carefully:
- Ultra-thin, naive, slightly wobbly hand-drawn black line art (stroke-width 1-1.8, stroke="#111", fill="none"). Lines should look imperfect and casual, like a quick doodle, NOT clean vector-perfect curves.
- MANDATORY: draw EXACTLY 3 stick figures (round head circle radius ~14-18px, single-stroke thin limbs ~50-70px long, no fill). This is a hard requirement — the poster is broken without them. Each figure MUST have at least one hand or foot literally touching or overlapping the edge of the product image area (x:100-500, y:200-600) — e.g. one figure's feet standing on the rim/top edge, one figure's hands gripping the side while "climbing", one figure at the base "pushing" or "watering" it from below. Do NOT place all three figures far away in empty corners — at least two of the three must be positioned directly adjacent to or overlapping the product's edge, not just scattered decoration.
- 4-8 additional small decorative line-doodle elements scattered in the empty margins (mix at least 4 of): a ladder, a wheelbarrow, a watering can, water droplets, small clouds, a fan, an arrow, a question mark "?", an exclamation mark "!", a dash "—", a small hand-drawn leaf or plant sprig, a tiny hand-drawn piece of fruit, a fishing rod, a small cup or kettle. These should feel randomly scattered like sketchbook margin doodles, not neatly arranged.
- ONE large handwritten Chinese headline, 3-6 characters, poetic/playful, thematically tied to what this specific object is (e.g. cooling drink → relief-from-heat theme; fruit → freshness theme). Use <text> with font-family="'Zhi Mang Xing', cursive" font-size around 56-64, fill="#111". Place it in one corner (generous empty margin around it), and apply a very slight rotation transform (rotate -3 to 3 degrees) to one of the two lines for a casual hand-written feel.
- Optionally one small lowercase English phrase in a corner, font-family="'Zhi Mang Xing', cursive" font-size around 20, very understated.
- NO color, NO fills, NO gradients, NO shading, NO background rectangles — pure thin black line art plus the headline text only.

Output ONLY a valid SVG fragment as a single <g>...</g> element (no <svg> wrapper, no <image> tag, no background rect, no markdown code fences, no explanation) using the 600x800 coordinate space.
`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/png'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    const overlayMatch = responseText.match(/<g[\s\S]*<\/g>/i);
    if (!overlayMatch) {
      return res.status(500).json({ error: '海报生成格式解析失败，请重新点击生成' });
    }
    const overlaySvg = overlayMatch[0];

    const finalSvg = `<svg viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect x="0" y="0" width="600" height="800" fill="#FAF9F6"/>
  <image x="100" y="200" width="400" height="400" preserveAspectRatio="xMidYMid meet" xlink:href="data:${mimeType || 'image/png'};base64,${imageBase64}"/>
  ${overlaySvg}
</svg>`;

    return res.status(200).json({
      success: true,
      svgCode: finalSvg
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误，请重试' });
  }
}
