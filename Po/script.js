// ボタン要素とテキスト要素を取得
const copyButton = document.querySelector('.copy-button');
const textToCopy = document.querySelector('#text-to-copy').innerText;

// ボタンがクリックされたときの処理
copyButton.addEventListener('click', () => {
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      // 成功したとき
      copyButton.textContent = 'コピーしました！';
      // 2秒後にボタンのテキストを元に戻す
      setTimeout(() => {
        copyButton.textContent = 'コピー';
      }, 2000);
    })
    .catch(err => {
      // 失敗したとき
      console.error('コピーに失敗しました', err);
      alert('コピーに失敗しました。');
    });
});
