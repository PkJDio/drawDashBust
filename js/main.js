import GameScene from './GameScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 720,
    height: 1280,
    // 🟢 将内部背景设置为透明或米白色，这样能和网页背景融合
    backgroundColor: '#fdfbf7',
    scale: {
        // 🟢 修改为 FIT：保持比例缩放，不足的地方留出 body 的背景
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280
    },
    scene: [GameScene],
    // 提高手机端的抗锯齿表现
    antialias: true
};

let game;

export function launchGame(aiCount, isContinue) {
    const startScreen = document.getElementById('start-screen');
    const setupScreen = document.getElementById('setup-screen');
    const menuBtn = document.getElementById('html-menu-btn');

    if (startScreen) startScreen.classList.add('hidden');
    if (setupScreen) setupScreen.classList.add('hidden');
    if (menuBtn) menuBtn.classList.remove('hidden');

    if (game) {
        game.destroy(true);
        game = null;
    }

    game = new Phaser.Game(config);
    game.registry.set('aiCount', aiCount);
    game.registry.set('isContinue', isContinue);
}

/**
 * 获取本地统计数据
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