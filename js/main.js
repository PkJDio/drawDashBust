import GameScene from './GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    backgroundColor: '#ffffff',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    parent: 'game-container',
    scene: [GameScene]
};

let game;

// 导出启动函数
export function launchGame(aiCount, isContinue) {
    // 1. 获取所有界面元素
    const startScreen = document.getElementById('start-screen');
    const setupScreen = document.getElementById('setup-screen'); // 🟢 新增

    // 2. 强制隐藏它们
    if (startScreen) {
        startScreen.style.display = 'none';
        startScreen.classList.add('hidden'); // 确保CSS类也被添加
    }
    if (setupScreen) {
        setupScreen.style.display = 'none'; // 🟢 新增：隐藏设置界面
        setupScreen.classList.add('hidden'); // 🟢 新增
    }

    // 3. 销毁旧游戏实例（防止重复创建）
    if (game) {
        game.destroy(true);
        game = null;
    }

    // 4. 启动新游戏
    game = new Phaser.Game(config);
    game.registry.set('aiCount', aiCount);
    game.registry.set('isContinue', isContinue);
}

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
    } catch (e) { return defaultStats; }
}