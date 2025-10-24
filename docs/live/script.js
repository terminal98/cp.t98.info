
// Cloudflare Workerのデプロイ先URL
// (ローカル開発時: http://127.0.0.1:8787)
const API_BASE_URL = 'https://tiny-glitter-532a.t98.workers.dev';

function statusUpdater() {
  return {
    isLoading: true,
    error: null,
    data: null,
    lastFetchData: null, // 差分更新用
    now: new Date(), // 現在時刻（タイマーで更新）

    // --- 初期化 ---
    init() {
      this.fetchData();

      // ★修正：2分ごとにデータを再フェッチ
      setInterval(() => {
        this.fetchData();
      }, 120000); // 2分

      // 1秒ごとに現在時刻を更新（「N分前」表示のため）
      setInterval(() => {
        this.now = new Date();
      }, 1000);
    },

    // --- データフェッチ ---
    async fetchData() {
      try {
        const response = await fetch(API_BASE_URL + '/api/current');
        if (!response.ok) {
          throw new Error('データの取得に失敗しました。');
        }
        const newData = await response.json();

        const newDataString = JSON.stringify(newData);
        if (newDataString !== this.lastFetchData) {
          this.data = newData;
          this.lastFetchData = newDataString;
          console.log('Data updated:', newData);
        }

        this.error = null;
      } catch (e) {
        this.error = e.message;
      } finally {
        this.isLoading = false;
      }
    },

    // --- ヘルパー関数 (View表示用) ---

    // ★復活：テンプレート画像のURLを生成
    getTemplateImageUrl() {
      if (!this.data) return '';
      // テンプレート画像はキャッシュを活用するため、更新日時はつけない
      return `${API_BASE_URL}/api/templates/${this.data.templateId}/image`;
    },

    // ★復活：ピンのCSS (left/top) を生成
    getPinStyle() {
      if (!this.data) return { left: '50%', top: '50%' };
      return {
        left: `${this.data.position.x * 100}%`,
        top: `${this.data.position.y * 100}%`,
      };
    },

    // (getUpdateTime, getFormattedTime, getTimeAgo, isOutdated は変更なし)
    // ...
    getUpdateTime() {
      if (!this.data) return new Date();
      return new Date(this.data.lastupdate * 1000);
    },

    getFormattedTime() {
      if (!this.data) return '';
      const d = this.getUpdateTime();
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    },

    getTimeAgo() {
      if (!this.data) return '';
      const diffSeconds = Math.floor((this.now - this.getUpdateTime()) / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);

      if (diffMinutes < 1) return 'たった今';
      return `${diffMinutes} 分前`;
    },

    isOutdated() {
      if (!this.data) return false;
      const diffSeconds = Math.floor((this.now - this.getUpdateTime()) / 1000);
      return diffSeconds > (15 * 60); // 15分
    }
  };
}