// search.js (Lunr.js対応版)

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchResultsContainer = document.getElementById('searchResults');
  const projectListContainer = document.getElementById('project-list-container');

  const LUNR_INDEX_URL = './lunr-index.json';
  const DOC_STORE_URL = './document-store.json';

  let lunrIndex;
  let documentStore;
  let isIndexLoaded = false;

  /**
   * 必要なJSONファイルを非同期で読み込む
   */
  async function loadSearchData() {
    try {
      const [indexResponse, storeResponse] = await Promise.all([
        fetch(LUNR_INDEX_URL),
        fetch(DOC_STORE_URL)
      ]);

      if (!indexResponse.ok || !storeResponse.ok) {
        throw new Error('Failed to load search data.');
      }

      const lunrIndexData = await indexResponse.json();
      documentStore = await storeResponse.json();
      
      // Lunrインデックスを復元
      lunrIndex = lunr.Index.load(lunrIndexData);
      isIndexLoaded = true;
      console.log('Search index and document store loaded.');
    } catch (error) {
      console.error(error);
      searchInput.disabled = true;
      searchInput.placeholder = '検索機能の読込に失敗しました';
    }
  }

  /**
   * 検索を実行し、結果を描画する
   * @param {string} query - 検索クエリ
   */
  function performSearch(query) {
    // 検索クエリが空か、インデックスが未ロードの場合は元の一覧を表示
    if (!query.trim() || !isIndexLoaded) {
      searchResultsContainer.innerHTML = '';
      searchResultsContainer.style.display = 'none';
      projectListContainer.style.display = 'grid';
      return;
    }

    // 記事一覧を隠し、検索結果エリアを表示
    projectListContainer.style.display = 'none';
    searchResultsContainer.style.display = 'block';

    try {
      // Lunr.jsで検索実行
      // クエリの最後にワイルドカードを追加して部分一致検索を強化
      const results = lunrIndex.search(`${query}*`);
      displayResults(results, query);
    } catch (e) {
      console.error("Search error:", e);
      displayResults([], query); // エラー時も空の結果を表示
    }
  }

  /**
   * 検索結果をHTMLに描画する
   * @param {Array} results - Lunr.jsからの検索結果
   * @param {string} query - 元の検索クエリ
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
      // result.refはドキュメントのID (URL)
      const doc = documentStore[result.ref];
      if (!doc) return;

      const listItem = document.createElement('li');
      listItem.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200';
      
      const link = document.createElement('a');
      link.href = result.ref; // URLをhrefに設定
      link.className = 'block';
      
      const title = document.createElement('h3');
      title.className = 'text-lg font-semibold text-indigo-600';
      title.innerHTML = highlightMatches(doc.title, query); // キーワードをハイライト
      
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

  // --- ヘルパー関数 (変更なし) ---
  function highlightMatches(text, query) {
    if (!query.trim()) return escapeHTML(text);
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return escapeHTML(text).replace(regex, '<mark class="bg-yellow-200 rounded-sm px-1">$1</mark>');
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
  }
  
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // --- イベントリスナー ---
  loadSearchData(); // ページ読み込み時にデータをロード
  searchInput.addEventListener('input', () => performSearch(searchInput.value));
});
