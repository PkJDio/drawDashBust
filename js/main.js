import GameScene from './GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    backgroundColor: '#2d2d2d', // 深灰色背景，保护眼睛且高对比
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [GameScene] // 加载主场景
};

const game = new Phaser.Game(config);