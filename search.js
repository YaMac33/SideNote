// search.js

// DOM要素を取得
const searchInput = document.getElementById('searchInput');
const searchResultsContainer = document.getElementById('searchResults');
const searchStatus = document.getElementById('search-status');

// 検索インデックスのパス（create-index.jsの出力先と合わせる）
const SEARCH_INDEX_URL = './search-index.json'; // ルートディレクトリに配置する場合

let searchIndex = [];

/**
 * 検索インデックスファイルを非同期で読み込む関数
 */
async function loadSearchIndex() {
    try {
        const response = await fetch(SEARCH_INDEX_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        searchIndex = await response.json();
        console.log('Search index loaded successfully.');
    } catch (error) {
        console.error('Failed to load search index:', error);
        searchStatus.textContent = '検索インデックスの読み込みに失敗しました。';
    }
}

/**
 * 検索を実行し、結果を描画する関数
 * @param {string} query - 検索クエリ
 */
function performSearch(query) {
    // クエリが空の場合は結果をクリアして終了
    if (!query.trim()) {
        searchResultsContainer.innerHTML = '';
        searchStatus.textContent = '検索結果はここに表示されます。';
        searchStatus.style.display = 'block';
        return;
    }

    // 検索キーワードを小文字に変換（大文字・小文字を区別しないため）
    const lowerCaseQuery = query.toLowerCase();

    // インデックスから一致する項目をフィルタリング
    // ここではタイトルとコンテンツの両方を検索対象にしています
    const results = searchIndex.filter(item => {
        const titleMatch = item.title.toLowerCase().includes(lowerCaseQuery);
        const contentMatch = item.content.toLowerCase().includes(lowerCaseQuery);
        return titleMatch || contentMatch;
    });

    displayResults(results, query);
}

/**
 * 検索結果をHTMLに描画する関数
 * @param {Array} results - 検索結果の配列
 * @param {string} query - 元の検索クエリ
 */
function displayResults(results, query) {
    // 結果表示エリアをクリア
    searchResultsContainer.innerHTML = '';

    if (results.length === 0) {
        searchStatus.textContent = `「${escapeHTML(query)}」に一致する結果は見つかりませんでした。`;
        searchStatus.style.display = 'block';
    } else {
        searchStatus.style.display = 'none';
        const resultList = document.createElement('ul');
        resultList.className = 'space-y-4';

        results.forEach(result => {
            const listItem = document.createElement('li');
            listItem.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200';

            const link = document.createElement('a');
            link.href = result.url;
            link.className = 'block';

            const title = document.createElement('h3');
            title.className = 'text-lg font-semibold text-indigo-600';
            // 検索キーワードをハイライト
            title.innerHTML = highlightMatches(result.title, query);

            const snippet = document.createElement('p');
            snippet.className = 'text-sm text-gray-600 mt-1';
            // コンテンツからスニペット（抜粋）を生成してキーワードをハイライト
            snippet.innerHTML = createSnippet(result.content, query);

            link.appendChild(title);
            link.appendChild(snippet);
            listItem.appendChild(link);
            resultList.appendChild(listItem);
        });
        searchResultsContainer.appendChild(resultList);
    }
}

/**
 * テキスト内のキーワードをハイライトするためのヘルパー関数
 * @param {string} text - 対象のテキスト
 * @param {string} query - ハイライトするキーワード
 * @returns {string} - ハイライト処理後のHTML文字列
 */
function highlightMatches(text, query) {
    if (!query.trim()) return escapeHTML(text);
    // 'gi'フラグで、グローバル(g)かつ大文字小文字を区別しない(i)検索
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return escapeHTML(text).replace(regex, '<mark class="bg-yellow-200 rounded-sm px-1">$1</mark>');
}

/**
 * コンテンツからスニペット（抜粋）を生成する関数
 * @param {string} content - 全文コンテンツ
 * @param {string} query - 検索キーワード
 * @returns {string} - スニペットのHTML文字列
 */
function createSnippet(content, query) {
    const lowerCaseContent = content.toLowerCase();
    const lowerCaseQuery = query.toLowerCase();
    const index = lowerCaseContent.indexOf(lowerCaseQuery);
    
    const snippetLength = 150; // スニペットの長さ
    let startIndex = Math.max(0, index - Math.floor(snippetLength / 2));
    
    // 最初のキーワードが見つからない場合は、コンテンツの先頭から抜粋
    if (index === -1) {
        startIndex = 0;
    }
    
    let snippetText = content.substring(startIndex, startIndex + snippetLength);

    // 文の途中で切れている場合に「...」を追加
    if (startIndex > 0) {
        snippetText = '... ' + snippetText;
    }
    if (startIndex + snippetLength < content.length) {
        snippetText += ' ...';
    }

    return highlightMatches(snippetText, query);
}

/**
 * HTML特殊文字をエスケープする
 * @param {string} str - エスケープする文字列
 */
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

/**
 * 正規表現の特殊文字をエスケープする
 * @param {string} str - エスケープする文字列
 */
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// --- イベントリスナーの設定 ---

// ページが読み込まれたらインデックスをロード
document.addEventListener('DOMContentLoaded', loadSearchIndex);

// 検索ボックスに入力があるたびに検索を実行
// 'input'イベントはキー入力ごとに発生します
searchInput.addEventListener('input', () => {
    performSearch(searchInput.value);
});
