import { FRUIT_TYPES, FRUIT_DATA } from '../ItemConfig.js';

export default class UIBetting {
    constructor(scene, layout) {
        this.scene = scene;
        this.layout = layout;
        this.container = null;
        this.betTexts = {}; // 存储各水果的下注额文本对象
    }

    create() {
        const startY = this.layout.topHeight + this.layout.midHeight + 10; // 格子下方
        this.container = this.scene.add.container(360, startY);
        this.container.setVisible(false); // 默认隐藏，轮到玩家才显示

        // 背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x263238, 0.9); // 深色背景，突显数码管
        bg.fillRoundedRect(-340, 0, 680, 140, 10);
        this.container.add(bg);

        // 绘制 8 个水果下注列
        const fruits = Object.values(FRUIT_TYPES);
        const startX = -300;
        const gapX = 85;

        fruits.forEach((type, index) => {
            const x = startX + index * gapX;
            const data = FRUIT_DATA[type];

            // 1. 上层：下注数额 (数码管风格)
            // 背景黑条
            const numBg = this.scene.add.graphics();
            numBg.fillStyle(0x000000, 1);
            numBg.fillRect(x - 30, 15, 60, 25);
            this.container.add(numBg);

            const numText = this.scene.add.text(x, 27, "0", {
                fontSize: '18px', fontFamily: 'Courier', color: '#00e676', fontStyle: 'bold' // 绿色荧光字
            }).setOrigin(0.5);
            this.container.add(numText);
            this.betTexts[type] = numText;

            // 2. 中层：水果图标 (点击减少)
            const iconBtn = this.createBetButton(x, 65, data.emoji, 0xffffff, () => {
                this.scene.onAdjustBet(type, -10);
            });
            this.container.add(iconBtn);

            // 3. 下层：加号图标 (点击增加)
            const plusBtn = this.createBetButton(x, 110, "+", 0xffca28, () => {
                this.scene.onAdjustBet(type, 10);
            });
            this.container.add(plusBtn);
        });
    }

    createBetButton(x, y, text, color, callback) {
        const container = this.scene.add.container(x, y);

        const circle = this.scene.add.circle(0, 0, 18, color);
        // 如果是水果Emoji，不需要圆形背景色或改为白色；如果是加号，黄色
        if (text === "+") {
            circle.setStrokeStyle(2, 0xffffff);
        } else {
            circle.setFillStyle(0xffffff, 0.2); // 水果背景淡一点
        }

        const t = this.scene.add.text(0, 0, text, {
            fontSize: text === "+" ? '24px' : '22px',
            color: text === "+" ? '#5d4037' : '#ffffff'
        }).setOrigin(0.5);

        const zone = this.scene.add.zone(0, 0, 40, 40).setInteractive();
        zone.on('pointerdown', () => {
            this.scene.tweens.add({ targets: container, scaleX: 0.8, scaleY: 0.8, duration: 50, yoyo: true });
            callback();
        });

        container.add([circle, t, zone]);
        return container;
    }

    show(playerBets) {
        this.container.setVisible(true);
        this.updateBets(playerBets);
    }

    hide() {
        this.container.setVisible(false);
    }

    updateBets(playerBets) {
        if (!playerBets) return;
        for (let type in playerBets) {
            if (this.betTexts[type]) {
                this.betTexts[type].setText(`${playerBets[type]}`);
            }
        }
    }
}