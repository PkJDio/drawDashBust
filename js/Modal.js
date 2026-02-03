export default class Modal {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.overlay = null;
    }

    createOverlay() {
        if (this.overlay) return;
        this.overlay = this.scene.add.graphics();
        this.overlay.fillStyle(0x000000, 0.6);
        this.overlay.fillRect(0, 0, 720, 1280);
        this.overlay.setDepth(1000);
        this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 720, 1280), Phaser.Geom.Rectangle.Contains);
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        if (this.overlay) {
            this.overlay.clear();
            this.overlay.destroy();
            this.overlay = null;
        }
    }

    // --- 通用窗口组件 ---
    createWindow(height, title) {
        this.createOverlay();
        const y = (1280 - height) / 2;

        this.container = this.scene.add.container(0, 0).setDepth(1001);

        // 1. 窗口投影
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(40 + 6, y + 6, 640, height, 24);
        this.container.add(shadow);

        // 2. 窗口背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xfff8e1, 1);
        bg.fillRoundedRect(40, y, 640, height, 20);
        bg.lineStyle(4, 0x8d6e63, 1);
        bg.strokeRoundedRect(40, y, 640, height, 20);
        this.container.add(bg);

        // 3. 标题背景条
        const titleBg = this.scene.add.graphics();
        titleBg.fillStyle(0xffcc80, 1);
        titleBg.fillRoundedRect(160, y - 30, 400, 70, 35); // 加高一点
        titleBg.lineStyle(3, 0xffffff, 1);
        titleBg.strokeRoundedRect(160, y - 30, 400, 70, 35);
        this.container.add(titleBg);

        // 4. 标题文字 (关键：增加 padding 防止被削)
        const titleText = this.scene.add.text(360, y + 5, title, {
            fontSize: '32px',
            color: '#5d4037',
            fontStyle: 'bold',
            padding: { top: 10, bottom: 10, left: 10, right: 10 } // 防止削顶
        }).setOrigin(0.5);
        this.container.add(titleText);

        return { startY: y + 80, contentWidth: 600, baseX: 60 };
    }

    // --- 按钮组件 ---
    createButton(x, y, text, color, callback) {
        const w = 180; const h = 65;
        const container = this.scene.add.container(x, y);

        const bg = this.scene.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 16);
        bg.lineStyle(2, 0xffffff, 0.4);
        bg.strokeRoundedRect(-w/2 + 2, -h/2 + 2, w - 4, h - 4, 16);

        // 按钮文字 padding
        const t = this.scene.add.text(0, 0, text, {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold',
            padding: { top: 5, bottom: 5 }
        }).setOrigin(0.5);

        const zone = this.scene.add.zone(0, 0, w, h).setInteractive();
        zone.on('pointerdown', () => {
            this.scene.tweens.add({ targets: container, scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true });
            callback();
        });

        container.add([bg, t, zone]);
        this.container.add(container);

        return { container, bg, text: t, zone };
    }

    // --- 1. 目标选择弹窗 ---
    showTargetSelection(title, targets, onSelect) {
        this.destroy();
        const height = 180 + Math.ceil(targets.length / 2) * 100; // 增加高度适应 padding
        const layout = this.createWindow(height, title);

        targets.forEach((p, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = layout.baseX + 150 + col * 260;
            const y = layout.startY + 30 + row * 100; // 增加垂直间距
            this.createButton(x, y, p.name, 0xffca28, () => {
                this.destroy(); onSelect(p);
            });
        });
    }

    // --- 2. 每轮结算弹窗 ---
    showRoundResult(round, players, onConfirm) {
        this.destroy();
        const height = 700; // 增加总高度
        const layout = this.createWindow(height, `第 ${round} 轮结束`);
        const startY = layout.startY + 10;
        const baseX = layout.baseX;

        // 表头背景条
        const headerBg = this.scene.add.graphics();
        headerBg.fillStyle(0xffe0b2, 0.4);
        headerBg.fillRoundedRect(baseX + 20, startY - 25, 560, 50, 8); // 调高高度
        this.container.add(headerBg);

        const headers = [
            { text: "玩家", x: baseX + 60, align: 0 },
            { text: "本轮", x: baseX + 300, align: 0.5 },
            { text: "总分", x: baseX + 500, align: 0.5 }
        ];
        headers.forEach(h => {
            const t = this.scene.add.text(h.x, startY, h.text, {
                fontSize: '26px',
                color: '#8d6e63',
                fontStyle: 'bold',
                padding: { top: 5, bottom: 5 } // 增加 padding
            }).setOrigin(h.align, 0.5);
            this.container.add(t);
        });

        const rowStartY = startY + 60; // 增加表头与内容的间距
        const rowHeight = 70; // 增加行高

        players.forEach((p, i) => {
            const rowY = rowStartY + i * rowHeight;
            const isSelf = (p.id === 0);

            if (i % 2 === 0) {
                const rowBg = this.scene.add.graphics();
                rowBg.fillStyle(0xffffff, 0.3);
                rowBg.fillRoundedRect(baseX + 20, rowY - 30, 560, 60, 8);
                this.container.add(rowBg);
            }

            const nameColor = isSelf ? '#e65100' : '#5d4037';
            // 名字
            this.container.add(this.scene.add.text(baseX + 60, rowY, p.name, {
                fontSize: '24px',
                color: nameColor,
                fontStyle: isSelf?'bold':'normal',
                padding: { top: 5, bottom: 5 }
            }).setOrigin(0, 0.5));

            // 本轮分
            const rScoreStr = p.roundScore > 0 ? `+${p.roundScore}` : `${p.roundScore}`;
            const rScoreColor = p.roundScore > 0 ? '#388e3c' : '#5d4037';
            this.container.add(this.scene.add.text(baseX + 300, rowY, rScoreStr, {
                fontSize: '26px',
                color: rScoreColor,
                fontStyle: 'bold',
                padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5));

            // 总分
            this.container.add(this.scene.add.text(baseX + 500, rowY, `${p.totalScore}`, {
                fontSize: '26px',
                color: '#f57f17',
                fontStyle: 'bold',
                padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5));
        });

        const btnY = rowStartY + players.length * rowHeight + 40;
        this.createButton(360, btnY, "进入商店", 0x66bb6a, () => {
            this.destroy(); onConfirm();
        });
    }

    // --- 3. 商店弹窗 ---
    showShop(player, shopInventory, onComplete) {
        this.destroy();
        const h = 880;
        const layout = this.createWindow(h, "道具商店");

        // 玩家信息
        const infoBg = this.scene.add.graphics();
        infoBg.fillStyle(0xffe0b2, 0.5);
        infoBg.fillRoundedRect(layout.baseX + 20, layout.startY, 600 - 40, 50, 10);
        this.container.add(infoBg);

        const infoText = this.scene.add.text(360, layout.startY + 25,
            `${player.name}  |  持有积分: ${player.totalScore}`, {
                fontSize: '22px',
                color: '#e65100',
                fontStyle: 'bold',
                padding: { top: 8, bottom: 8 }
            }).setOrigin(0.5);
        this.container.add(infoText);

        // 商品网格
        const gridStartY = layout.startY + 70;
        const itemW = 160;
        const itemH = 170;
        const gapX = 40;
        const gapY = 25; // 增加垂直间距

        let descTitle, descText, btnBuy;
        let selectedItem = null;
        let selectionGraphics = [];

        shopInventory.forEach((item, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const x = layout.baseX + 30 + col * (itemW + gapX);
            const y = gridStartY + row * (itemH + gapY);

            const itemGroup = this.scene.add.container(x, y);

            const bg = this.scene.add.graphics();
            const canAfford = player.totalScore >= item.cost;
            const bgColor = canAfford ? 0xffffff : 0xeeeeee;

            bg.fillStyle(0x000000, 0.1); bg.fillRoundedRect(4, 4, itemW, itemH, 12);
            bg.fillStyle(bgColor, 1); bg.fillRoundedRect(0, 0, itemW, itemH, 12);
            bg.lineStyle(1, 0xbdbdbd, 1); bg.strokeRoundedRect(0, 0, itemW, itemH, 12);

            const selectBorder = this.scene.add.graphics();
            selectBorder.lineStyle(5, 0x29b6f6, 1);
            selectBorder.strokeRoundedRect(-2, -2, itemW + 4, itemH + 4, 14);
            selectBorder.setVisible(false);
            selectionGraphics.push(selectBorder);

            // 道具名 (加 padding)
            const name = this.scene.add.text(itemW/2, 35, item.name, {
                fontSize: '22px',
                color: canAfford ? '#5d4037' : '#9e9e9e',
                fontStyle: 'bold',
                padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5);

            const iconBg = this.scene.add.circle(itemW/2, 90, 30, canAfford ? 0xffcc80 : 0xe0e0e0);
            const iconText = this.scene.add.text(itemW/2, 90, item.name[0], {
                fontSize: '32px',
                color: '#ffffff',
                fontStyle: 'bold',
                padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5);

            // 价格 (加 padding)
            const costColor = canAfford ? '#f57f17' : '#9e9e9e';
            const cost = this.scene.add.text(itemW/2, 145, `${item.cost}分`, {
                fontSize: '26px',
                color: costColor,
                fontStyle: 'bold',
                padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5);

            itemGroup.add([bg, iconBg, iconText, selectBorder, name, cost]);
            this.container.add(itemGroup);

            const zone = this.scene.add.zone(0, 0, itemW, itemH).setInteractive().setOrigin(0);
            itemGroup.add(zone);

            zone.on('pointerdown', () => {
                selectionGraphics.forEach(g => g.setVisible(false));
                selectBorder.setVisible(true);
                selectedItem = item;
                descTitle.setText(item.name);
                descText.setText(item.desc);
                updateBuyButton();
            });
        });

        // 描述区域
        const descY = gridStartY + 2 * (itemH + gapY) + 30; // 调整位置
        const descH = 140;

        const descBg = this.scene.add.graphics();
        descBg.fillStyle(0xffecb3, 0.6);
        descBg.fillRoundedRect(layout.baseX + 20, descY, 600 - 40, descH, 16);
        this.container.add(descBg);

        descTitle = this.scene.add.text(360, descY + 25, "请选择一个道具", {
            fontSize: '24px',
            color: '#8d6e63',
            fontStyle: 'bold',
            padding: { top: 5, bottom: 5 }
        }).setOrigin(0.5);
        this.container.add(descTitle);

        descText = this.scene.add.text(360, descY + 60, "点击上方卡片查看详细效果", {
            fontSize: '20px',
            color: '#5d4037',
            align: 'center',
            wordWrap: { width: 520 },
            lineSpacing: 6,
            padding: { top: 5, bottom: 5 }
        }).setOrigin(0.5, 0);
        this.container.add(descText);

        const btnY = descY + descH + 45;

        btnBuy = this.createButton(240, btnY, "购买", 0xcccccc, () => {
            if (selectedItem && player.totalScore >= selectedItem.cost) {
                this.destroy();
                onComplete({ action: 'buy', item: selectedItem });
            }
        });

        this.createButton(480, btnY, "放弃 (+1分)", 0x81c784, () => {
            this.destroy();
            onComplete({ action: 'pass' });
        });

        const updateBuyButton = () => {
            if (!selectedItem) {
                this.updateButtonStyle(btnBuy, 0xcccccc, "购买");
                return;
            }
            if (player.totalScore < selectedItem.cost) {
                this.updateButtonStyle(btnBuy, 0xef5350, "积分不足");
            } else {
                this.updateButtonStyle(btnBuy, 0xffca28, `购买 (-${selectedItem.cost})`);
            }
        };
    }

    updateButtonStyle(btnObj, color, textStr) {
        btnObj.bg.clear();
        btnObj.bg.fillStyle(color, 1);
        btnObj.bg.fillRoundedRect(-90, -32.5, 180, 65, 16);
        btnObj.bg.lineStyle(2, 0xffffff, 0.4);
        btnObj.bg.strokeRoundedRect(-88, -30.5, 176, 61, 16);
        btnObj.text.setText(textStr);
    }

    // --- 4. 游戏结束弹窗 ---
    showGameResult(players, onRestart) {
        this.destroy();
        players.sort((a, b) => b.totalScore - a.totalScore);
        const layout = this.createWindow(600, "🏆 游戏结束 🏆");
        const winner = players[0];

        this.container.add(this.scene.add.text(360, layout.startY + 20, `冠军: ${winner.name}`, {
            fontSize: '36px',
            color: '#d84315',
            fontStyle:'bold',
            padding: { top: 10, bottom: 10 }
        }).setOrigin(0.5));

        players.forEach((p, i) => {
            const rowY = layout.startY + 100 + i * 60;
            this.container.add(this.scene.add.text(layout.baseX + 100, rowY, `第${i+1}名`, {
                fontSize: '24px', color: '#8d6e63', padding: { top: 5, bottom: 5 }
            }).setOrigin(0, 0.5));
            this.container.add(this.scene.add.text(layout.baseX + 250, rowY, p.name, {
                fontSize: '24px', color: '#5d4037', padding: { top: 5, bottom: 5 }
            }).setOrigin(0, 0.5));
            this.container.add(this.scene.add.text(layout.baseX + 450, rowY, p.totalScore, {
                fontSize: '24px', color: '#f57f17', fontStyle:'bold', padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5));
        });

        this.createButton(360, layout.startY + 400, "再来一局", 0x42a5f5, () => {
            this.destroy(); onRestart();
        });
    }
}