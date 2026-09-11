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

    // 只让 AI 生成叠加在照片上的手绘元素，不再要求它重新画产品本身
    const prompt = `
Look at the uploaded product photo carefully (drink, fruit, food, or object).

Your task: design the DECORATIVE OVERLAY LAYER for a minimalist Chinese tea-brand editorial poster in the style of "喜茶 new-style-tea" social media posters. You are NOT drawing the product itself — a real photo of it will be placed on the canvas separately. You only output the overlay artwork that goes ON TOP of that photo.

Reference style (study this carefully):
- Ultra-minimal black outline "stick figure" people (round head, thin single-stroke limbs, no fill, no color, slightly wobbly hand-drawn line quality) doing small playful actions in scale-mismatch with the giant product — e.g. climbing a tiny ladder up the side, watering it with a hose, pushing a wheelbarrow, fanning it, fishing off the edge, riding on top. 2-4 figures max, placed only in empty margin areas of the canvas, NEVER on top of where the product photo itself will be (see placement rule below).
- A few tiny matching black-line doodle props: a ladder, a wheelbarrow, a watering can, clouds, water droplets, a small fan, an arrow — pick 1-3 that fit the specific product logically.
- ONE large handwritten Chinese headline in a loose brush/marker calligraphy style (use font-family="'STKaiti','Kaiti SC','DFKai-SB',cursive"), short (3-6 characters), poetic and playful, thematically tied to the specific product shown (e.g. a cooling drink → something about relief from heat; a fruit → something about freshness). Place it in a corner with generous surrounding empty space, large but not overlapping the product area.
- Optionally one small lowercase English word or phrase in a casual script font in a corner, very small, understated.
- Absolutely NO color fills, NO gradients, NO shading, NO background shapes — pure thin black line art (stroke width 1.5-2.5) plus the one headline text. Everything must feel hand-drawn and effortless, not vector-perfect or corporate.

Placement rule: the product photo will occupy the CENTER of the canvas, roughly viewBox area x: 100-500, y: 200-600 (a 600x800 canvas). Keep your stick figures, props, and text OUTSIDE or only lightly overlapping the very edge of that zone, so the real product photo stays fully visible and is not obscured.

Output ONLY a valid SVG fragment as a single <g>...</g> element (no <svg> wrapper, no <image> tag, no background rect, no markdown, no explanation) — just the group containing your line-art paths and text, using viewBox coordinate space 0 0 600 800.
`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    const overlayMatch = responseText.match(/<g[\s\S]*?<\/g>/i);
    if (!overlayMatch) {
      return res.status(500).json({ error: '海报生成格式解析失败，请重新点击生成' });
    }
    const overlaySvg = overlayMatch[0];

    // 服务端拼装：真实照片作为背景图层 + AI 生成的手绘叠加层
    const finalSvg = `<svg viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect x="0" y="0" width="600" height="800" fill="#FAF9F6"/>
  <image x="100" y="200" width="400" height="400" preserveAspectRatio="xMidYMid meet" xlink:href="data:${mimeType || 'image/jpeg'};base64,${imageBase64}"/>
  ${overlaySvg}
</svg>`;

    const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(finalSvg)}`;

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误，请重试' });
  }
}
