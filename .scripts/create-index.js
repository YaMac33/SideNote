// 必要な部品を読み込む
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const cheerio = require('cheerio');

const rootDir = './'; // サイトのルートディレクトリ
const outputFile = './search-index.json'; // 出力するJSONファイル名
const articles = [];
let idCounter = 0;

// publicフォルダ内の全HTMLファイルを取得（index.htmlや404.htmlなどを除く）
const files = glob.sync('**/*.html', {
  cwd: rootDir,
  ignore: ['index.html', '404.html', '**/node_modules/**'] // 除外したいファイルを指定
});

// 各HTMLファイルを処理する
files.forEach(file => {
  const html = fs.readFileSync(path.join(rootDir, file), 'utf-8');
  const $ = cheerio.load(html); // HTMLを解析

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★ ここはあなたのサイトの構造に合わせて変更してください ★
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const title = $('h1').first().text(); // <h1>タグの最初のものをタイトルとして取得
  const content = $('main').text(); // <main>タグの中の全テキストを本文として取得

  // タイトルが空の場合はスキップ
  if (!title) {
    return;
  }
  
  // 本文から改行や余分なスペースを削除して整形
  const cleanedContent = content.replace(/\s+/g, ' ').trim();
  
  // データを配列に追加
  articles.push({
    id: idCounter++,
    url: `/${file.replace(/index\.html$/, '')}`, // URLを整形
    title: title,
    content: cleanedContent.substring(0, 200) // 本文は200文字に制限（ファイルサイズを抑えるため）
  });
});

// JSONファイルとして書き出す
fs.writeFileSync(outputFile, JSON.stringify(articles, null, 2));

console.log(`Successfully created ${outputFile} with ${articles.length} entries.`);
