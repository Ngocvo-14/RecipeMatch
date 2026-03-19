import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  // Get all unique imageUrls
  const recipes = await col.find({}, { projection: { title: 1, imageUrl: 1 } }).toArray();
  const urlMap = new Map<string, string[]>();
  for (const r of recipes) {
    const url = r.imageUrl || '';
    if (!url) continue;
    if (!urlMap.has(url)) urlMap.set(url, []);
    urlMap.get(url)!.push(r.title);
  }

  console.log(`Unique image URLs: ${urlMap.size}`);

  // Test each URL
  const broken: string[] = [];
  for (const [url] of urlMap) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const ct = res.headers.get('content-type') || '';
      if (res.status !== 200 || !ct.includes('image')) {
        broken.push(url);
        console.log(`BROKEN (${res.status}): ${url.split('/').pop()}`);
      }
    } catch {
      broken.push(url);
      console.log(`FAILED: ${url.split('/').pop()}`);
    }
  }

  console.log(`\nBroken URLs: ${broken.length} / ${urlMap.size}`);
  broken.forEach(u => {
    const titles = urlMap.get(u) || [];
    console.log(`  ${u.split('/').pop()} → used by: ${titles.slice(0,3).join(', ')}`);
  });

  await client.close();
}
main().catch(console.error);
