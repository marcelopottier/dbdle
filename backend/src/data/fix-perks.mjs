import fs from 'fs/promises';
import path from 'path';

async function fixPerks() {
  const charactersPath = path.resolve('h:/dbdle/backend/src/data/characters.json');
  const content = await fs.readFile(charactersPath, 'utf-8');
  const data = JSON.parse(content);

  data.characters.forEach(char => {
    char.perks.forEach(perk => {
      if (!perk.name || perk.name === "") {
        // Extract from iconUrl: /assets/perks/IconPerks_sprint_burst.png
        const match = perk.iconUrl.match(/IconPerks_(.+)\.png/);
        if (match && match[1]) {
          const slug = match[1];
          // Simple title case
          perk.name = slug
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
            
          // Special cases if needed
          if (perk.name === "Prove Thyself") perk.name = "Prove Thyself"; // already ok
          if (perk.name === "Adrenaline") perk.name = "Adrenaline";
        }
      }
    });
  });

  await fs.writeFile(charactersPath, JSON.stringify(data, null, 2));
  console.log('Fixed perks in characters.json');
}

fixPerks().catch(console.error);
