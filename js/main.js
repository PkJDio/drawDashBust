import GameScene from './GameScene.js';

export function launchGame(aiCount) {
    const config = {
        type: Phaser.AUTO,
        width: 720,
        height: 1280,
        backgroundColor: '#faf8ef', // 修改：由深灰改为米白/淡黄
        parent: 'game-container',
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [GameScene]
    };

    const game = new Phaser.Game(config);
    game.registry.set('aiCount', aiCount);
}