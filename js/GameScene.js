import GameUI from './ui.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // 暂时不需要加载图片，我们全部用代码画
    }

    create() {
        // 1. 初始化UI系统
        this.ui = new GameUI(this);
        this.ui.init();

        // 2. 模拟放置几个玩家棋子 (测试用)
        // 假设玩家0在起点(0格)，玩家1在第5格，玩家2在第12格
        this.ui.drawPlayerAt(0, 0);
        this.ui.drawPlayerAt(5, 1);
        this.ui.drawPlayerAt(12, 2);
    }

    update() {
        // 游戏循环逻辑（暂时留空）
    }
}