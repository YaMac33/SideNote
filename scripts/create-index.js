// ES Modules形式のインポート
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { JSDOM } from 'jsdom';
import lunr from 'lunr';

// サイトのルートディレクトリ（このスクリプトが/scriptsにあると仮定）
const siteRoot = '../';
// インデックスの出力先
const outputDir = './';

async function createSearchIndex() {
  console.log('Starting to build search index...');

  // 1. サイト内の全HTMLファイルを取得 (トップのindex.htmlは除外)
  const files = await glob('**/index.html', {
    cwd: siteRoot,
    ignore: 'index.html', // ルートのindex.htmlは除外
  });

  console.log(`Found ${files.length} HTML files to index.`);

  const documents = [];
  const documentStore = {};

  // 2. 各HTMLファイルを処理
  for (const file of files) {
    const filePath = path.join(siteRoot, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const dom = new JSDOM(content);
    const document = dom.window.document;

    // ページのタイトルと本文を取得
    // 本文は<main>や<body>タグなど、サイトの構造に合わせて調整してください
    const title = document.querySelector('title')?.textContent || 'No title';
    const body = document.querySelector('main')?.textContent || document.body.textContent || '';
    
    // URLを生成（例: 'article/index.html' -> '/SideNote/article/')
    const url = `/SideNote/${file.replace(/index\.html$/, '')}`;

    // Lunr.js用のドキュメントオブジェクト
    documents.push({
      id: url,
      title: title,
      body: body.replace(/\s+/g, ' ').trim(), // 改行や余分なスペースを削除
    });

    // 検索結果表示用のデータストア
    documentStore[url] = {
      title: title,
      // スニペット用に本文の先頭150文字を保存
      snippet: body.substring(0, 150) + '...',
    };
  }

  // 3. Lunr.jsでインデックスを構築
  const idx = lunr(function () {
    // 日本語対応（簡易版）
    // this.use(lunr.jp); // より高度な日本語検索にはlunr-jpなどが必要
    this.ref('id'); // 各ドキュメントの一意なID
    this.field('title', { boost: 10 }); // タイトルを本文より10倍重視
    this.field('body');

    documents.forEach(function (doc) {
      this.add(doc);
    }, this);
  });

  // 4. 2つのJSONファイルとして書き出し
  try {
    // Lunrインデックス
    await fs.writeFile(
      path.join(outputDir, 'lunr-index.json'),
      JSON.stringify(idx)
    );
    // データストア
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
