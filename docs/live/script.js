async function fetchAndDisplay() {
  try {
    const response = await fetch('https://g2.t98.info/data/place.json'); // APIのURLを指定
    const data = await response.json();

    // 現在の時刻（日本時間）
    const now = new Date();
    const lastUpdateDate = new Date(data.lastupdate * 1000);

    // 経過時間を計算
    const diffInSeconds = Math.floor((now - lastUpdateDate) / 1000);
    let timeAgo;
    if (diffInSeconds < 60) {
      timeAgo = '1分前';
    } else if (diffInSeconds < 3600) {
      timeAgo = `${Math.floor(diffInSeconds / 60)}分前`;
    } else {
      timeAgo = `${Math.floor(diffInSeconds / 3600)}時間前`;
    }

    // 日時フォーマット
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' };
    const formattedDate = new Intl.DateTimeFormat('ja-JP', options).format(lastUpdateDate);

    // HTMLに出力
    document.getElementById('status').textContent = `状態: ${data.status}`;
    document.getElementById('place').textContent = `場所: ${data.place}`;
    const lastUpdateElement = document.getElementById('lastupdate');
    lastUpdateElement.innerHTML = `最終更新時間: ${formattedDate} <span>(${timeAgo})</span>`;

    // 5分以上前なら赤字にする
    if (diffInSeconds >= 600) {
      lastUpdateElement.querySelector('span').style.color = 'red';
    } else {
      lastUpdateElement.querySelector('span').style.color = 'green';
    }
  } catch (error) {
    console.error('データの取得に失敗しました', error);
  }
}

// ページ読み込み時にデータ取得
window.onload = fetchAndDisplay;