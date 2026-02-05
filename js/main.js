import GameScene from './GameScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 720,
    height: 1280,
    // 🟢 保持米白色背景，与网页融合
    backgroundColor: '#fdfbf7',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280
    },
    scene: [GameScene],
    // 开启抗锯齿，保证图片边缘清晰
    antialias: true,
    // 🟢 [可选] 解决音频自动播放限制的配置
    audio: {
        disableWebAudio: false
    }
};

// 定义全局游戏实例
let game;

/**
 * 🟢 阶段一：仅启动游戏引擎
 * 作用：初始化 Phaser，开始 Preload 加载资源，显示进度条。
 * 调用时机：页面加载完毕时 (DOMContentLoaded)。
 */
export function initGameEngine() {
    // 防止重复初始化
    if (game) return;
    game = new Phaser.Game(config);
}

/**
 * 🟢 阶段二：正式开始对局
 * 作用：通知 GameScene 场景进入游戏状态。
 * 调用时机：玩家点击 HTML 上的“进入游戏”或“回到游戏”按钮时。
 */
export function startGameLogic(aiCount, isContinue) {
    if (!game) return;

    // 显示游戏内的 HTML 菜单按钮 (左下角/右下角的那个汉堡菜单)
    const menuBtn = document.getElementById('html-menu-btn');
    if (menuBtn) menuBtn.classList.remove('hidden');

    // 获取当前运行的场景
    const scene = game.scene.getScene('GameScene');

    if (scene) {
        // 调用 GameScene 中新写的 startGame 方法
        // 注意：我们需要去 GameScene.js 里实现这个方法
        scene.startGame(aiCount, isContinue);
    }
}

/**
 * 获取本地统计数据 (保持不变)
 */
export function getGlobalStats() {
    const defaultStats = {
        gamesCompleted: 0,
        wins: 0,
        totalSeconds: 0,
        wins_2p: 0, wins_3p: 0, wins_4p: 0, wins_5p: 0, wins_6p: 0
    };
    try {
        const data = localStorage.getItem('ddb_global_stats');
        return data ? { ...defaultStats, ...JSON.parse(data) } : defaultStats;
    } catch (e) {
        return defaultStats;
    }
}