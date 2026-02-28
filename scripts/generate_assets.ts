import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

export async function generateAssets(apiKey: string) {
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets');
  const AVATARS_DIR = path.join(ASSETS_DIR, 'avatars');
  const ICONS_DIR = path.join(ASSETS_DIR, 'icons');
  const BG_DIR = path.join(ASSETS_DIR, 'bg');

  // Ensure directories exist
  [AVATARS_DIR, ICONS_DIR, BG_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const IMAGES_TO_GENERATE = [
    // Avatars
    {
      name: 'ronnie.png',
      dir: AVATARS_DIR,
      prompt: 'Caricature of a 1980s American president, cowboy hat, confident smile, digital painting style, high resolution, detailed, no text, isolated on dark background',
      aspectRatio: '1:1'
    },
    {
      name: 'khadaffy.png',
      dir: AVATARS_DIR,
      prompt: 'Caricature of a middle eastern dictator, military uniform, sunglasses, digital painting style, high resolution, detailed, no text, isolated on dark background',
      aspectRatio: '1:1'
    },
    {
      name: 'mao.png',
      dir: AVATARS_DIR,
      prompt: 'Caricature of an asian revolutionary leader, grey tunic, benevolent smile, digital painting style, high resolution, detailed, no text, isolated on dark background',
      aspectRatio: '1:1'
    },
    {
      name: 'jimi.png',
      dir: AVATARS_DIR,
      prompt: 'Caricature of a peanut farmer president, big smile, casual suit, digital painting style, high resolution, detailed, no text, isolated on dark background',
      aspectRatio: '1:1'
    },
    {
      name: 'castro.png',
      dir: AVATARS_DIR,
      prompt: 'Caricature of a bearded revolutionary, green fatigue cap, cigar, digital painting style, high resolution, detailed, no text, isolated on dark background',
      aspectRatio: '1:1'
    },
    // Icons
    {
      name: 'missile.png',
      dir: ICONS_DIR,
      prompt: 'Nuclear missile flying upwards, metallic, 3d render, isolated on black background, high resolution, detailed, no text',
      aspectRatio: '1:1'
    },
    {
      name: 'bomber.png',
      dir: ICONS_DIR,
      prompt: 'Strategic stealth bomber aircraft, top view, 3d render, isolated on black background, high resolution, detailed, no text',
      aspectRatio: '1:1'
    },
    {
      name: 'warhead.png',
      dir: ICONS_DIR,
      prompt: 'Nuclear warhead cone, metallic, danger symbol, 3d render, isolated on black background, high resolution, detailed, no text',
      aspectRatio: '1:1'
    },
    {
      name: 'defense.png',
      dir: ICONS_DIR,
      prompt: 'Missile defense system radar dish, 3d render, isolated on black background, high resolution, detailed, no text',
      aspectRatio: '1:1'
    },
    // Background
    {
      name: 'world_map.png',
      dir: BG_DIR,
      prompt: 'Dark blue digital world map, glowing green borders, war room aesthetic, high tech interface background, 4k resolution, detailed, no text',
      aspectRatio: '16:9'
    }
  ];

  const LOG_FILE = path.join(ASSETS_DIR, 'log.txt');
  const log = (msg: string) => {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
  };

  log(`Using API Key starting with: ${apiKey.substring(0, 4)}...`);

  async function generateWithGemini(item: any) {
    const filePath = path.join(item.dir, item.name);
    if (fs.existsSync(filePath)) {
      log(`Skipping ${item.name} (already exists)`);
      return;
    }

    log(`Generating ${item.name}...`);
    try {
      // Try 2.5 flash image first as it might be more reliable with the default key
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: item.prompt,
            },
          ],
        },
        // 2.5 flash image doesn't support imageConfig for size/ratio in the same way?
        // Instructions say: "DO NOT set responseMimeType... DO NOT set responseSchema... for nano banana series models."
        // "Image Configuration... aspectRatio... imageSize... Available for gemini-3-pro-image-preview... and gemini-3.1-flash-image-preview"
        // So for 2.5, I should probably NOT set config? Or maybe just aspectRatio?
        // "aspectRatio: Changes the aspect ratio... Supported values are 1:1, 3:4, 4:3, 9:16, 16:9. The default is 1:1."
        config: {
           // imageConfig: { aspectRatio: "1:1" } // Let's try minimal config
        }
      });

      if (!response.candidates || !response.candidates[0]) {
        log(`No candidates for ${item.name}`);
        return;
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);
          log(`Saved ${item.name}`);
          return;
        }
      }
      log(`No image data found for ${item.name}`);
    } catch (error: any) {
      log(`Error generating ${item.name}: ${error.message}`);
    }
  }

  for (const item of IMAGES_TO_GENERATE) {
    await generateWithGemini(item);
  }
}
