import { FRUIT_TYPES, FRUIT_DATA } from '../ItemConfig.js';

export default class UIBetting {
    constructor(scene, layout) {
        this.scene = scene;
        this.layout = layout;
        this.container = null;
        this.betTexts = {};
        this.oddsGroup = null; // 专门用来显示大号倍率的容器
    }

    create() {
        // 1. 下注操作面板 (位于底部手牌区)
        const btmY = 1280 - this.layout.btmHeight;
        const centerX = 720 / 2;

        this.container = this.scene.add.container(centerX, btmY + this.layout.btmHeight / 2);
        this.container.setVisible(false);

        // --- 风格修改：浅色系背景 ---
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xfff8e1, 1); // 浅米色背景
        bg.fillRoundedRect(-350, -120, 700, 240, 16);
        bg.lineStyle(4, 0x5d4037, 1); // 深棕色边框
        bg.strokeRoundedRect(-350, -120, 700, 240, 16);
        this.container.add(bg);

        // 提示文字 (调整大小和位置)
        const title = this.scene.add.text(0, -90, "点击图标减分 / 点击加号加分 (每次1分)", {
            fontSize: '24px', color: '#8d6e63', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        // 8个水果操作列
        const typeOrder = ['apple', 'watermelon', 'papaya', 'orange', 'bell', 'star', 'moon', 'sun'];
        const startX = -305;
        const gapX = 88;

        typeOrder.forEach((type, index) => {
            const x = startX + index * gapX;
            const data = FRUIT_DATA[type];

            // 1. 上层：下注数额
            const numBg = this.scene.add.graphics();
            numBg.fillStyle(0xffffff, 1);
            numBg.fillRoundedRect(x - 30, -55, 60, 24, 6);
            numBg.lineStyle(1, 0xbcaaa4, 1);
            numBg.strokeRoundedRect(x - 30, -55, 60, 24, 6);
            this.container.add(numBg);

            const numText = this.scene.add.text(x, -43, "0", {
                fontSize: '20px', color: '#e65100', fontStyle: 'bold', fontFamily: 'Arial'
            }).setOrigin(0.5);
            this.container.add(numText);
            this.betTexts[type] = numText;

            // 2. 中间：水果图标 (点击减少)
            const iconBtn = this.createBetButton(x, 10, data.emoji, 0xffecb3, () => {
                this.scene.onAdjustBet(type, -1); // -1 分
            });
            this.container.add(iconBtn);

            // 3. 底部：加号 (点击增加)
            const plusBtn = this.createBetButton(x, 70, "+", 0xffcc80, () => {
                this.scene.onAdjustBet(type, 1);  // +1 分
            });
            this.container.add(plusBtn);
        });

        // 2. 倍率展示容器 (位于按钮两侧)
        this.oddsGroup = this.scene.add.container(centerX, btmY - 50);
        this.oddsGroup.setVisible(false);
    }

    createBetButton(x, y, text, bgColor, callback) {
        const container = this.scene.add.container(x, y);

        const circle = this.scene.add.circle(0, 0, 28, bgColor);
        circle.setStrokeStyle(2, 0x8d6e63); // 棕色边圈

        const isEmoji = text !== "+";
        const t = this.scene.add.text(0, 0, text, {
            fontSize: isEmoji ? '32px' : '36px',
            color: '#5d4037', // 深棕色字
            fontFamily: isEmoji ? '"Segoe UI Emoji", "Apple Color Emoji", sans-serif' : 'Arial'
        }).setOrigin(0.5);
        if (isEmoji) t.setY(2);

        const zone = this.scene.add.zone(0, 0, 56, 56).setInteractive();
        zone.on('pointerdown', () => {
            this.scene.tweens.add({ targets: container, scaleX: 0.9, scaleY: 0.9, duration: 50, yoyo: true });
            callback();
        });

        container.add([circle, t, zone]);
        return container;
    }

    // 显示下注面板
    show(playerBets) {
        this.container.setVisible(true);
        this.oddsGroup.setVisible(true); // 显示大倍率
        this.updateBets(playerBets);
        this.updateOddsDisplay(); // 刷新倍率显示
    }

    hide() {
        this.container.setVisible(false);
        this.oddsGroup.setVisible(false);
    }

    updateBets(playerBets) {
        if (!playerBets) return;
        for (let type in playerBets) {
            if (this.betTexts[type]) {
                this.betTexts[type].setText(`${playerBets[type]}`);
            }
        }
    }

    // 在按钮两侧绘制大号倍率
    updateOddsDisplay() {
        this.oddsGroup.removeAll(true);

        const leftTypes = ['apple', 'watermelon', 'papaya', 'orange'];
        const rightTypes = ['bell', 'star', 'moon', 'sun'];

        // 绘制左侧 (从左到右分布在左侧区域)
        leftTypes.forEach((type, i) => {
            const x = -330 + i * 70;
            this.drawLargeOddItem(x, 0, type);
        });

        // 绘制右侧
        rightTypes.forEach((type, i) => {
            const x = 120 + i * 70;
            this.drawLargeOddItem(x, 0, type);
        });
    }

    drawLargeOddItem(x, y, type) {
        const data = FRUIT_DATA[type];
        const odds = this.scene.betManager.getOdds(type);

        // 图标
        const icon = this.scene.add.text(x, y - 10, data.emoji, {
            fontSize: '36px',
            fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif'
        }).setOrigin(0.5);

        // 🟢 修改点：倍率文字改为 "N倍"
        const text = this.scene.add.text(x, y + 25, `${odds}倍`, {
            fontSize: '24px',
            color: '#d84315', // 深橙色高亮
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.oddsGroup.add([icon, text]);
    }
}