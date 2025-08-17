import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { JSDOM } from 'jsdom';
import lunr from 'lunr';
import TinySegmenter from 'tiny-segmenter';

const siteRoot = './';
const outputDir = './';

// ▼▼▼▼▼ 変更点 1: トークナイザーの修正 ▼▼▼▼▼
// TinySegmenterのインスタンスは毎回作ると非効率なので、一度だけ生成します。
const segmenter = new TinySegmenter();

/**
 * 日本語用のカスタムトークナイザー
 * @param {string | null | undefined} text 分割対象の文字列全体
 * @returns {lunr.Token[]} Lunr.jsが処理できるTokenオブジェクトの配列
 */
const japaneseTokenizer = (text) => {
  // textがnullやundefinedの場合は空の配列を返します。
  if (text == null || text === undefined) {
    return [];
  }
  // TinySegmenterで文字列を単語に分割し、検索しやすいように小文字に統一します。
  const segments = segmenter.segment(String(text).toLowerCase());
  // 分割された各単語（文字列）を `lunr.Token` オブジェクトに変換して返します。
  // これがエラーを修正する最も重要な変更点です。
  return segments.map(seg => new lunr.Token(seg));
};
// ▲▲▲▲▲ 変更ここまで ▲▲▲▲▲

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
    // ▼▼▼▼▼ 変更点 2: Lunr.jsの設定 ▼▼▼▼▼
    // 英語の単語を原型に戻す処理（stemmer）は日本語には不要で、
    // むしろ検索精度を落とす原因になるため、パイプラインから削除します。
    this.pipeline.remove(lunr.stemmer);

    // 作成した日本語用トークナイザーを登録します。
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
