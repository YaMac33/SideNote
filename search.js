document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchResultsContainer = document.getElementById('searchResults');
  const projectListContainer = document.getElementById('project-list-container');

  const LUNR_INDEX_URL = './lunr-index.json';
  const DOC_STORE_URL = './document-store.json';

  let lunrIndex;
  let documentStore;
  let isIndexLoaded = false;
  const segmenter = new TinySegmenter(); // ★ 変更点

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
      lunrIndex = lunr.Index.load(lunrIndexData);
      isIndexLoaded = true;
      console.log('Search index and document store loaded.');
    } catch (error) {
      console.error(error);
      searchInput.disabled = true;
      searchInput.placeholder = '検索機能の読込に失敗しました';
    }
  }

  function performSearch(query) {
    if (!query.trim() || !isIndexLoaded) {
      searchResultsContainer.innerHTML = '';
      searchResultsContainer.style.display = 'none';
      projectListContainer.style.display = 'grid';
      return;
    }

    projectListContainer.style.display = 'none';
    searchResultsContainer.style.display = 'block';

    try {
      // ★ 変更点: 検索キーワードを日本語分割してから検索
      const tokens = segmenter.segment(query);
      const searchQuery = tokens.join(' '); // 分割した単語をスペースで連結
      const results = lunrIndex.search(`${searchQuery}*`);
      displayResults(results, query);
    } catch (e) {
      console.error("Search error:", e);
      displayResults([], query);
    }
  }

  function displayResults(results, query) {
    searchResultsContainer.innerHTML = '';
    if (results.length === 0) {
      searchResultsContainer.innerHTML =
        `<p class="text-center text-gray-500">「${escapeHTML(query)}」に一致する結果は見つかりませんでした。</p>`;
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
      link.href = result.ref;
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

  function highlightMatches(text, query) {
    if (!query.trim()) return escapeHTML(text);
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return escapeHTML(text).replace(
      regex,
      '<mark class="bg-yellow-200 rounded-sm px-1">$1</mark>'
    );
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
    );
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  loadSearchData();
  searchInput.addEventListener('input', () => performSearch(searchInput.value));
});
