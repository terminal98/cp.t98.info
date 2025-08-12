---
title: "スケジュール"
date: 2023-03-26T02:36:15+09:00
draft: false
layout: "simple"
featureimage: "https://g2.t98.info/pub/svg/c/eventlist/eventlist-featured.webp"
---

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<h3 id="event" class="profile-name text-center text-2xl">カレンダー</h3>
<div id="calendar-container" class="max-w-4xl mx-auto p-4">
    <!-- 初期ローディングメッセージ -->
    <div id="loading-message" class="text-center py-20 text-gray-600 dark:text-gray-400">
        <i class="fas fa-spinner fa-spin text-4xl text-blue-500 dark:text-blue-400"></i>
        <p class="mt-4">予定を読み込んでいます...</p>
    </div>
    <!-- カレンダー本体（データ読み込み後に表示） -->
    <div id="calendar-wrapper" class="hidden">
        <!-- Header: Month Navigation -->
        <div class="flex items-center justify-between mb-4">
            <button id="prev-month" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-chevron-left w-6 h-6 text-gray-600 dark:text-gray-400"></i>
            </button>
            <h2 id="month-year" class="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100"></h2>
            <button id="next-month" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-chevron-right w-6 h-6 text-gray-600 dark:text-gray-400"></i>
            </button>
        </div>
        <!-- Calendar Grid -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div class="grid grid-cols-7 bg-gray-100 dark:bg-gray-700 text-xs md:text-sm text-gray-600 dark:text-gray-300 font-bold">
                <div class="p-2 text-center border-r border-gray-200 dark:border-gray-600 text-red-500 dark:text-red-400">日</div>
                <div class="p-2 text-center border-r border-gray-200 dark:border-gray-600">月</div>
                <div class="p-2 text-center border-r border-gray-200 dark:border-gray-600">火</div>
                <div class="p-2 text-center border-r border-gray-200 dark:border-gray-600">水</div>
                <div class="p-2 text-center border-r border-gray-200 dark:border-gray-600">木</div>
                <div class="p-2 text-center border-r border-gray-200 dark:border-gray-600">金</div>
                <div class="p-2 text-center text-blue-500 dark:text-blue-400">土</div>
            </div>
            <div id="calendar-grid" class="calendar-grid"></div>
        </div>
        <!-- Legend -->
        <div id="legend" class="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow text-sm text-gray-700 dark:text-gray-300">
            <h3 class="font-bold mb-2">凡例</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div class="flex items-center"><i class="far fa-circle text-green-500 dark:text-green-400 w-5 text-center mr-2"></i><span>空き</span></div>
                <div class="flex items-center"><i class="fas fa-play text-yellow-500 dark:text-yellow-400 w-5 text-center mr-2" style="transform: rotate(-90deg);"></i><span>要相談</span></div>
                <div class="flex items-center"><i class="fas fa-times text-red-500 dark:text-red-400 w-5 text-center mr-2"></i><span>満枠</span></div>
                <div class="flex items-center"><span class="font-bold w-5 text-center mr-2">文字</span><span>その他(予定名表示)</span></div>
            </div>
        </div>
        <!-- Event List -->
        <div id="event-list-container" class="mt-8">
            <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">イベント参加予定</h2>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div id="event-table-wrapper"></div>
                <div id="no-events-message" class="hidden text-center text-gray-500 dark:text-gray-400 p-8">
                    現在参加予定のイベントはありません。
                </div>
            </div>
            <div id="pagination-controls" class="mt-4 flex justify-center items-center space-x-2 text-gray-600 dark:text-gray-400"></div>
        </div>
    </div>
    <!-- 詳細表示モーダル -->
    <div id="event-modal" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 hidden">
        <div id="modal-content" class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <!-- コンテンツはJSで生成 -->
        </div>
    </div>
    <style>
        /* Hugo Blowfishテーマに埋め込む場合、このスタイルはテーマのCSSに統合することも可能です */
        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
        }
        .modal-enter { opacity: 0; transform: scale(0.95); }
        .modal-enter-active { opacity: 1; transform: scale(1); transition: opacity 200ms, transform 200ms; }
        .modal-leave { opacity: 1; transform: scale(1); }
        .modal-leave-active { opacity: 0; transform: scale(0.95); transition: opacity 200ms, transform 200ms; }
    </style>
</div>

<script src="/show-event-cal.js"></script>


<span class="text-green-600 dark:text-green-400"></span>
<span class="text-yellow-600 dark:text-yellow-400"></span>
<span class="text-red-600 dark:text-red-400"></span>
<span class="text-gray-600 dark:text-gray-400"></span>
<span class="text-red-500 dark:text-red-400"></span>
<span class="text-blue-500 dark:text-blue-400"></span>
<span class="text-gray-700 dark:text-gray-300"></span>
<span class="text-gray-400 dark:text-gray-500"></span>
<span class="bg-gray-50 dark:bg-gray-800/50"></span>
<span class="bg-gray-100 dark:bg-gray-800"></span>

