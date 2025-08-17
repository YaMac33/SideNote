import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { JSDOM } from 'jsdom';
import lunr from 'lunr';
import { TinySegmenter } from 'tiny-segmenter'; // ★ 変更点

const siteRoot = './'; // サイトのルートをカレントディレクトリに変更
const outputDir = './';

// ★★★★★ 追加：ここから ★★★★★
// 日本語の分割ルールをLunr.jsに教える
const segmenter = new TinySegmenter();
const japaneseTokenizer = function (token) {
  return segmenter.segment(token.toString());
};
lunr.tokenizer.registerFunction(japaneseTokenizer, 'japaneseTokenizer');
// ★★★★★ 追加：ここまで ★★★★★

async function createSearchIndex() {
  console.log('Starting to build search index...');

  const files = await glob('**/index.html', {
    cwd: siteRoot,
    ignore: ['index.html', 'node_modules/**'], // ルートとnode_modulesを除外
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
    const body =
      document.querySelector('main')?.textContent ||
      document.body.textContent ||
      '';

    // ★ 変更点: URLを相対パスで生成
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
    // ★ 変更点: 日本語用の分割ルールを使用する
    this.tokenizer = japaneseTokenizer;
    this.ref('id');
    this.field('title', { boost: 10 });
    this.field('body');

    documents.forEach(function (doc) {
      this.add(doc);
    }, this);
  });

  try {
    await fs.writeFile(
      path.join(outputDir, 'lunr-index.json'),
      JSON.stringify(idx)
    );
    await fs.writeFile(
      path.join(outputDir, 'document-store.json'),
      JSON.stringify(documentStore)
    );
    console.log('Search index and document store created successfully!');
  } catch (err) {
    console.error('Error writing index files:', err);
  }
}

createSearchIndex();
