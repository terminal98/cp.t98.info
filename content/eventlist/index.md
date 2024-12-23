---
title: "スケジュール"
date: 2023-03-26T02:36:15+09:00
draft: false
series: ["撮影について"]
series_order: 2
layout: "simple"
featureimage: "https://g2.t98.info/pub/svg/c/eventlist/eventlist-featured.webp"
---

<h3 class="profile-name text-center text-2xl">依頼受付カレンダー</h3>

<div id="cal-button">
<button id="prevButton" class="flex m-1 rounded enabled:bg-neutral-300 p-1.5 enabled:text-neutral-700 enabled:hover:bg-primary-500 enabled:hover:text-neutral enabled:dark:bg-neutral-700 dark:text-neutral-300 enabled:dark:hover:bg-primary-400 enabled:dark:hover:text-neutral-800 disabled:border disabled:border-neutral-300 disabled:dark:border-neutral-700 disabled:cursor-not-allowed disabled:m-0.5 items-center" onclick="changeMonth(-1)" disabled>
<span class="relative block align-text-bottom icon">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path fill="currentColor" d="M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 246.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>
</span>
前月</button>
<span id="monthYear" class="p-1.5">読込中です…</span>
<button id="nextButton" class="flex m-1 rounded enabled:bg-neutral-300 p-1.5 enabled:text-neutral-700 enabled:hover:bg-primary-500 enabled:hover:text-neutral enabled:dark:bg-neutral-700 dark:text-neutral-300 enabled:dark:hover:bg-primary-400 enabled:dark:hover:text-neutral-800 disabled:border disabled:border-neutral-300 disabled:dark:border-neutral-700 disabled:cursor-not-allowed disabled:m-0.5 items-center" onclick="changeMonth(1)" disabled>翌月
<span class="relative block align-text-bottom icon">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path fill="currentColor" d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/></svg>
</span>
</button>
</div>

<div id="calendar">
  <div className="flex justify-center" aria-label="読み込み中">
    <p class="text-center text-xl">読込中です。しばらくお待ちください…</p>
  </div>
</div>

`◯ 受付中` `△ 要相談` `✕ 締切` `▲ 条件付` 

<span id="showMaxRange">調 整 中</span>  

<script src="/show-event-cal.js"></script>

{{< alert >}}
**2024年 依頼受付締切のお知らせ**   
2024年内の撮影依頼は締め切りました。今年も1年大変お世話になりました。来年は4日(土)より受け付けております。
{{< /alert >}}

記載のない進行中の案件も多数ございます。ご相談はお早めにお願いいたします。

<h3 id="event" class="profile-name text-center text-2xl">イベント参加予定</h3>

<div class="grid grid-cols-1 lg:grid-cols-2">
<div>

### 2024年 {#event-2024}

| 日付      | イベント名                      |
| --------- | ------------------------------- |
| 12/29(日) | コミックマーケット105(一般)     |
| 12/30(月) | コミックマーケット105(サークル) |

</div><div>

### 2025年 {#event-2025}

| 日付      | イベント名                             |
| --------- | -------------------------------------- |
| 3/22(土)  | ※ AnimeJapan2025(仮)                   |
| 4/26(土)  | ※ ニコニコ超会議2025(仮)               |
| 8/16(土)  | コミックマーケット106(一般)            |
| 8/17(日)  | コミックマーケット106(サークル)        |
| 9/27(土)  | ※ 東京ゲームショウ2025(仮)             |
| 10/25(土) | ※ 池袋ハロウィンコスプレフェス2025(仮) |
| 12月末    | ※ コミックマーケット107                |

</div></div>

(仮)の予定は撮影依頼も受け付けている日です。