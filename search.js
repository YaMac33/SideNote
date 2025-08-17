document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchResultsContainer = document.getElementById('searchResults');
  const projectListContainer = document.getElementById('project-list-container');

  // パスはルートからの相対パス './' に統一するのが最も安全です
  const LUNR_INDEX_URL = './lunr-index.json';
  const DOC_STORE_URL = './document-store.json';

  let lunrIndex;
  let documentStore;
  let isIndexLoaded = false;
  // 日本語分かち書きライブラリのインスタンスを生成
  const segmenter = new TinySegmenter();

  // 検索データ（JSONファイル）を非同期で読み込む
  async function loadSearchData() {
    try {
      const [indexResponse, storeResponse] = await Promise.all([
        fetch(LUNR_INDEX_URL),
        fetch(DOC_STORE_URL)
      ]);
      if (!indexResponse.ok || !storeResponse.ok) {
        throw new Error('検索データの読み込みに失敗しました。');
      }
      const lunrIndexData = await indexResponse.json();
      documentStore = await storeResponse.json();
      // lunr.js のインデックスを読み込む
      lunrIndex = lunr.Index.load(lunrIndexData);
      isIndexLoaded = true;
      console.log('検索インデックスの準備ができました。');
    } catch (error) {
      console.error(error);
      searchInput.disabled = true;
      searchInput.placeholder = '検索機能は現在利用できません';
    }
  }

  // ▼▼▼▼▼ ここからが最重要の修正箇所 ▼▼▼▼▼
  /**
   * 検索を実行する関数
   * @param {string} query ユーザーが入力した検索キーワード
   */
  function performSearch(query) {
    // 検索クエリがない、またはインデックスが未ロードの場合は結果をクリアして終了
    if (!query.trim() || !isIndexLoaded) {
      searchResultsContainer.innerHTML = '';
      searchResultsContainer.style.display = 'none';
      projectListContainer.style.display = 'grid'; // 元のリストを再表示
      return;
    }

    // 検索が始まったら、元のリストを隠して結果表示エリアを表示
    projectListContainer.style.display = 'none';
    searchResultsContainer.style.display = 'block';

    try {
      // 1. TinySegmenterで日本語の検索クエリを単語に分割する
      const tokens = segmenter.segment(query.toLowerCase());

      // 2. lunr.jsのクエリビルダーを使い、分割した単語ごとに検索条件を組み立てる
      //    これが日本語検索を正しく機能させるための核心部分です。
      const results = lunrIndex.query(function (q) {
        tokens.forEach(token => {
          // 検索キーワードにワイルドカード（*）を付けて部分一致を可能にする
          const tokenWildcard = token + '*';

          // 各単語について、タイトル(boost: 10)と本文(boost: 1)の両方を検索対象にする
          q.term(token, { fields: ['title'], boost: 10 });
          q.term(tokenWildcard, { fields: ['title'], boost: 9, wildcard: lunr.Query.wildcard.TRAILING });
          
          q.term(token, { fields: ['body'] });
          q.term(tokenWildcard, { fields: ['body'], wildcard: lunr.Query.wildcard.TRAILING });
        });
      });

      displayResults(results, query);
    } catch (e) {
      console.error("検索エラー:", e);
      displayResults([], query);
    }
  }
  // ▲▲▲▲▲ 修正はここまで ▲▲▲▲▲

  /**
   * 検索結果をHTMLに描画する関数
   * @param {Array} results lunr.jsから返された検索結果
   * @param {string} query ユーザーが入力した検索キーワード
   */
  function displayResults(results, query) {
    searchResultsContainer.innerHTML = '';
    if (results.length === 0) {
      searchResultsContainer.innerHTML = `<p class="text-center text-gray-500">「${escapeHTML(query)}」に一致する結果は見つかりませんでした。</p>`;
      return;
    }

    const resultList = document.createElement('ul');
    resultList.className = 'space-y-4';
    results.forEach(result => {
      const doc = documentStore[result.ref];
      if (!doc) return;

      const listItem = document.createElement('li');
      listItem.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200';
      
      const link = document.createElement('a');
      link.href = result.ref; // result.refは './250812-GPT-5/' のような相対パス
      link.className = 'block';

      const title = document.createElement('h3');
      title.className = 'text-lg font-semibold text-indigo-600';
      title.innerHTML = highlightMatches(doc.title, query);

      const snippet = document.createElement('p');
      snippet.className = 'text-sm text-gray-600 mt-1';
      snippet.innerHTML = highlightMatches(doc.snippet, query);

      link.appendChild(title);
      link.appendChild(snippet);
      listItem.appendChild(link);
      resultList.appendChild(listItem);
    });
    searchResultsContainer.appendChild(resultList);
  }

  // （以下のヘルパー関数は変更ありません）
  function highlightMatches(text, query) {
    if (!query.trim()) return escapeHTML(text);
    const tokens = segmenter.segment(query).map(t => escapeRegExp(t));
    const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
    return escapeHTML(text).replace(regex, '<mark class="bg-yellow-200 rounded-sm px-1">$1</mark>');
  }

  function escapeHTML(str) {
    return str.replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ページの読み込みが完了したら、検索データをロード開始
  loadSearchData();
  // 検索ボックスに入力があるたびに検索を実行
  searchInput.addEventListener('input', () => performSearch(searchInput.value));
});
