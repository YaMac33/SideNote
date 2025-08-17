import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { JSDOM } from 'jsdom';
import lunr from 'lunr';
import TinySegmenter from 'tiny-segmenter';

const siteRoot = './';
const outputDir = './';

// 日本語の分割ルールを定義
const japaneseTokenizer = (token) => {
  const segmenter = new TinySegmenter();
  return segmenter.segment(token.toString());
};

// ▼▼▼▼▼ 変更点① ▼▼▼▼▼
// この行を削除します → lunr.tokenizer.register('japaneseTokenizer', japaneseTokenizer);

async function createSearchIndex() {
  console.log('Starting to build search index...');

  const files = await glob('**/index.html', {
    cwd: siteRoot,
    ignore: ['index.html', 'node_modules/**'],
  });

  console.log(`Found ${files.length} HTML files to index.`);

  const documents = [];
  const documentStore = {};

  for (const file of files) {
    const filePath = path.join(siteRoot, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const dom = new JSDOM(content);
    const document = dom.window.document;

    const title = document.querySelector('title')?.textContent || 'No title';
    const body = document.querySelector('main')?.textContent || document.body.textContent || '';

    const url = `./${file.replace(/index\.html$/, '')}`;

    documents.push({
      id: url,
      title: title,
      body: body.replace(/\s+/g, ' ').trim(),
    });

    documentStore[url] = {
      title: title,
      snippet: body.substring(0, 150) + '...',
    };
  }

  const idx = lunr(function () {
    // ▼▼▼▼▼ 変更点② ▼▼▼▼▼
    // 登録された名前を呼び出すのではなく、定義した関数を直接セットします
    this.tokenizer = japaneseTokenizer;
    // ▲▲▲▲▲ 変更ここまで ▲▲▲▲▲

    this.ref('id');
    this.field('title', { boost: 10 });
    this.field('body');

    documents.forEach(function (doc) {
      this.add(doc);
    }, this);
  });

  try {
    await fs.writeFile(path.join(outputDir, 'lunr-index.json'), JSON.stringify(idx));
    await fs.writeFile(path.join(outputDir, 'document-store.json'), JSON.stringify(documentStore));
    console.log('Search index and document store created successfully!');
  } catch (err) {
    console.error('Error writing index files:', err);
  }
}

createSearchIndex();
