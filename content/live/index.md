---
title: "11/1 ラグコスTW 現在地マップ"
date: 2025-02-15T03:37:24+09:00
draft: false
layout: "simple"
#categories: [""]
#tags: [""]
#featureimage: ""
#externalUrl: ""
---

<h3 id="event" class="profile-name text-center text-2xl">11/1 ラグコスTW</h3>
<style>
.map-pin {
    position: absolute;
    width: 20px;
    height: 20px;
    background-color: red;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
    /* ピンの中心が座標に来るように調整 */
    transform: translate(-50%, -50%); 
    z-index: 10;
  }
    .promo-text {
    font-size: 0.875rem; /* 14px */
    color: #374151; /* gray-700 */
    text-align: center;
    margin-bottom: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  }
  .x-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border: 2px solid #000;
    background-color: transparent;
    color: #000;
    border-radius: 9999px; /* pill shape */
    text-decoration: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    font-weight: 600; /* semibold */
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
  .x-button svg {
    width: 20px;
    height: 20px;
    margin-right: 8px;
    fill: currentColor;
  }
  .x-button:hover {
    background-color: #000;
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px 0 rgba(0, 0, 0, 0.15);
  }
</style>
<script src="script.js"></script>
<!-- 
  Font Awesome (アイコン用)
-->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">

<!-- 
  Alpine.js
-->
<script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!--
  Alpine.js コンポーネント
-->
<div 
  x-data="statusUpdater()" 
  x-init="init()"
  class="flex justify-center items-center min-h-screen bg-gray-100 p-4"
>
  <!-- ★修正：全体の枠を削除し、コンテナのみに -->
  <div class="w-full max-w-lg mx-auto">
    <!-- ローディング中またはエラー時 -->
    <template x-if="isLoading">
      <div class="p-8 text-center text-gray-500">
        読み込み中...
      </div>
    </template>
    <template x-if="error">
      <div class="p-8 text-center text-red-500" x-text="error" style="color:red;"></div>
    </template>
    <!-- データ表示 -->
    <template x-if="!isLoading && !error && data">
      <div class="space-y-6"> <!-- ★修正：要素間のマージン用 -->
        <!-- ★修正：1. ステータスと場所 (スマホで1カラム、md以上で2カラム) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- ステータス -->
          <div class="flex gap-3 bg-white rounded-lg">
              <h5
                class="text-2xl font-extrabold text-center break-words"   text-xl
                :style="{ color: data.statusColor || '#000' }"
                x-text="data.status"
              >
                <!-- データが入る -->
              </h5>
          </div>
          <!-- 場所 -->
          <div class="flex items-center gap-3 bg-white rounded-lg">
            <!-- 場所アイコン -->
            <i class="fa-solid fa-location-dot text-2xl text-gray-500 w-8 text-center"></i>
              <h5 class="text-xl font-bold text-gray-800 break-words" x-text="data.place"> <!-- (h5相当の text-xl は変更なし) -->
                <!-- データが入る -->
              </h5>
          </div>
        </div>
        <!-- ★修正：2. マップ画像とピン (スタイル修正) -->
        <!-- ★修正: shadow-lg, border, border-gray-200, aspect-video 削除。 max-h-[50vh] 追加 -->
        <div class="relative w-full rounded-lg overflow-hidden max-h-[50vh]">
          <!-- ベースマップ画像 -->
          <img 
            id="map-image"
            :src="getTemplateImageUrl()"
            alt="Map"
            class="w-full h-full object-cover"
          >
          <!-- ピン (CSSで位置決め) -->
          <div 
            id="map-pin"
            class="map-pin"
            :style="getPinStyle()"
          ></div>
        </div>
        <!-- ★修正：3. 更新日時 -->
        <div 
          class="flex items-center justify-center gap-2 rounded-lg text-lg font-semibold"
          :style="isOutdated() ? 'color:red;' : 'color:green;'"
        >
          <!-- 時計アイコン -->
          <i class="fa-regular fa-clock"></i>
          <span x-text="getFormattedTime()"></span>
          (<span x-text="getTimeAgo()"></span>)
        </div>
      </div>
    </template>
    <!-- ★追加：X (Twitter) リンクボタンセクション -->
    <div class="text-center mt-8">
      <p class="promo-text">\ 撮影依頼はリプライやDMでお気軽に！ /</p>
      <a href="https://x.com/98tml" target="_blank" rel="noopener noreferrer" class="x-button">
        <!-- X アイコン SVG -->
        <svg viewBox="0 0 24 24" aria-hidden="true"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
        <span>@98tml</span>
      </a>
    </div>
  </div>
</div>

なるべくリアルタイム更新できるように頑張ります！ 撮影のお声がけ大歓迎！リプライやDMいただければ向かいます！