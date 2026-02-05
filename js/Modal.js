export default class Modal {
    constructor(scene) {
        this.scene = scene;
        this.overlay = null;
        this.container = null;

        this.styles = {
            windowBg: 0xfff8e1,
            windowBorder: 0x8d6e63,
            textTitle: '#5d4037',
            textNormal: '#333333',
            textLight: '#757575',
            btnText: '#ffffff'
        };
    }

    createOverlay(alpha = 0.6) {
        if (this.overlay) this.overlay.destroy();
        this.overlay = this.scene.add.graphics();
        this.overlay.fillStyle(0x000000, alpha);
        this.overlay.fillRect(0, 0, 720, 1280);
        this.overlay.setDepth(2900);
        this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 720, 1280), Phaser.Geom.Rectangle.Contains);

        // 🟢 弹窗打开时，隐藏主界面 HTML 菜单按钮
        const htmlMenuBtn = document.getElementById('html-menu-btn');
        if (htmlMenuBtn) {
            htmlMenuBtn.classList.add('hidden');
        }
    }

    createWindowBase(height) {
        if (this.container) this.container.destroy();
        this.container = this.scene.add.container(360, 640).setDepth(3000);

        const width = 620;
        const halfW = width / 2;
        const halfH = height / 2;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.2);
        bg.fillRoundedRect(-halfW + 8, -halfH + 8, width, height, 24);
        bg.fillStyle(this.styles.windowBg, 1);
        bg.fillRoundedRect(-halfW, -halfH, width, height, 20);
        bg.lineStyle(4, this.styles.windowBorder, 1);
        bg.strokeRoundedRect(-halfW, -halfH, width, height, 20);

        this.container.add(bg);
        return { topY: -halfH, bottomY: halfH, width: width };
    }

    createBtn(x, y, width, height, text, color, callback) {
        const btnContainer = this.scene.add.container(x, y);
        const bg = this.scene.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);

        // 🟢 核心修复：增加 Padding 防止削顶，增加行间距防止换行重叠
        const t = this.scene.add.text(0, 0, text, {
            fontSize: '26px',
            color: this.styles.btnText,
            fontStyle: 'bold',
            fontFamily: 'Arial',
            align: 'center',
            padding: { top: 10, bottom: 10, left: 10, right: 10 } // 加大 padding
        }).setOrigin(0.5);

        // 🟢 如果文字太长，自动缩小字体
        if (t.width > width - 20) {
            t.setFontSize(20);
        }

        const zone = this.scene.add.zone(0, 0, width, height).setInteractive();
        zone.on('pointerdown', () => {
            this.scene.tweens.add({
                targets: btnContainer, scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true,
                onComplete: () => { this.destroy(); if (callback) callback(); }
            });
        });
        btnContainer.add([bg, t, zone]);
        this.container.add(btnContainer);
        return btnContainer;
    }

    createTitle(y, text) {
        // 🟢 核心修复：增加 Title 的 Padding
        const t = this.scene.add.text(0, y, text, {
            fontSize: '36px',
            color: this.styles.textTitle,
            fontStyle: 'bold',
            align: 'center',
            padding: { top: 15, bottom: 15, left: 10, right: 10 }
        }).setOrigin(0.5);
        this.container.add(t);
    }

    // =========================================
    // 道具商店
    // =========================================
    showShop(player, items, onBuyCallback) {
        this.createOverlay();

        const headerH = 160;
        const footerH = 100;
        const itemH = 100;
        const totalHeight = headerH + (items.length * (itemH + 10)) + footerH;

        const layout = this.createWindowBase(totalHeight);

        this.createTitle(layout.topY + 50, "道具商店");

        const scoreText = this.scene.add.text(0, layout.topY + 110, `持有积分: ${player.totalScore}`, {
            fontSize: '28px', color: '#e65100', fontStyle: 'bold', padding: { top: 5, bottom: 5 }
        }).setOrigin(0.5);
        this.container.add(scoreText);

        let currentY = layout.topY + headerH + (itemH / 2);

        items.forEach((item) => {
            const itemGroup = this.scene.add.container(0, currentY);
            const itemBg = this.scene.add.graphics();
            itemBg.fillStyle(0xffffff, 1);
            itemBg.fillRoundedRect(-280, -itemH/2, 560, itemH, 15);
            itemGroup.add(itemBg);

            const emoji = this.scene.add.text(-230, 0, item.emoji, {
                fontSize: '48px', color: '#333333', padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5);

            const infoX = -180;
            const name = this.scene.add.text(infoX, -15, item.name, {
                fontSize: '24px', color: '#333', fontStyle: 'bold', padding: { top: 5, bottom: 5 }
            }).setOrigin(0, 0.5);

            const desc = this.scene.add.text(infoX, 18, item.desc, {
                fontSize: '16px', color: '#757575', padding: { top: 5, bottom: 5 }
            }).setOrigin(0, 0.5);

            const isFull = player.items.length >= 5;
            const canAfford = player.totalScore >= item.cost;
            let btnColor = 0x66bb6a;
            let btnText = `${item.cost} 积分`;

            if (isFull) { btnColor = 0xbdbdbd; btnText = "已满"; }
            else if (!canAfford) { btnColor = 0xbdbdbd; }

            const btnBg = this.scene.add.graphics();
            btnBg.fillStyle(btnColor, 1);
            btnBg.fillRoundedRect(140, -30, 120, 60, 10);

            const price = this.scene.add.text(200, 0, btnText, {
                fontSize: '20px', color: '#fff', fontStyle: 'bold', padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5);

            const zone = this.scene.add.zone(200, 0, 120, 60).setInteractive();
            zone.on('pointerdown', () => {
                if (canAfford && !isFull) {
                    this.destroy();
                    onBuyCallback({ action: 'buy', item: item });
                }
            });

            itemGroup.add([itemBg, emoji, name, desc, btnBg, price, zone]);
            this.container.add(itemGroup);
            currentY += (itemH + 10);
        });

        const footerY = layout.bottomY - 50;
        this.createBtn(0, footerY, 240, 60, "不购买 (+1分)", 0xef5350, () => {
            onBuyCallback({ action: 'pass' });
        });
    }

    // =========================================
    // 回合结算
    // =========================================
    showRoundResult(round, players, onContinue) {
        this.createOverlay();
        const layout = this.createWindowBase(600);
        this.createTitle(layout.topY + 60, `第 ${round} 轮结束`);
        const sorted = [...players].sort((a,b) => b.roundScore - a.roundScore);
        let startY = layout.topY + 140;
        sorted.forEach((p, i) => {
            const y = startY + i * 65;
            const name = this.scene.add.text(-220, y, `${i+1}. ${p.name}`, {
                fontSize: '24px', color: '#333', padding: { top: 5, bottom: 5 }
            });
            const score = this.scene.add.text(80, y, `+${p.roundScore}`, {
                fontSize: '28px', color: '#2e7d32', fontStyle:'bold', padding: { top: 5, bottom: 5 }
            });
            const total = this.scene.add.text(180, y+4, `(总:${p.totalScore})`, {
                fontSize: '18px', color: '#757575', padding: { top: 5, bottom: 5 }
            });
            this.container.add([name, score, total]);
        });
        this.createBtn(0, layout.bottomY - 70, 220, 60, "进入商店", 0x42a5f5, onContinue);
    }

    // =========================================
    // 最终游戏结果
    // =========================================
    showGameResult(sortedPlayers, onRestart, onHome) {
        this.createOverlay();
        const listHeight = sortedPlayers.length * 60;
        const baseHeight = 350;
        const height = Math.min(baseHeight + listHeight, 1000);

        const layout = this.createWindowBase(height);
        this.createTitle(layout.topY + 60, "🏆 最终战报 🏆");

        let startY = layout.topY + 130;
        const gapY = 60;

        sortedPlayers.forEach((p, index) => {
            const rankStr = ["第一名", "第二名", "第三名", "第四名", "第五名", "第六名"][index] || `第${index+1}名`;
            let color = '#5d4037';
            let fontStyle = 'bold';
            if (index === 0) color = '#ff7043';
            else if (p.id === 0) color = '#4db6ac';

            const rowText = this.scene.add.text(0, startY, `${rankStr}   ${p.name}   ${p.totalScore}分`, {
                fontSize: '28px', color: color, fontStyle: fontStyle, padding: { top: 5, bottom: 5 }
            }).setOrigin(0.5);

            this.container.add(rowText);
            startY += gapY;
        });

        const btnY = layout.bottomY - 80;
        this.createBtn(-140, btnY, 200, 70, "返回主页", 0x90a4ae, onHome);
        this.createBtn(140, btnY, 200, 70, "再来一局", 0x66bb6a, onRestart);
    }

    // =========================================
    // 确认框
    // =========================================
    showConfirmation(text, onConfirm, onCancel) {
        this.createOverlay(0.6);
        const height = 420;
        const layout = this.createWindowBase(height);
        this.createTitle(layout.topY + 60, "提示");
        const msg = this.scene.add.text(0, layout.topY + 140, text, {
            fontSize: '26px', color: '#333', align: 'center', wordWrap: { width: 450 }, padding: { top: 10, bottom: 10 }
        }).setOrigin(0.5);
        this.container.add(msg);
        const btnY = layout.bottomY - 70;
        this.createBtn(-130, btnY, 200, 60, "取消", 0x90a4ae, onCancel || (() => {}));
        this.createBtn(130, btnY, 200, 60, "确定", 0xff7043, onConfirm);
    }

    // 🟢 [核心修复] 给标题和按钮增加 Padding，支持换行
    showTargetSelection(titleText, targets, onSelect) {
        this.createOverlay();
        const contentH = targets.length * 80 + 150;
        const height = Math.max(400, contentH);
        const layout = this.createWindowBase(height);

        // 这里的 titleText 可能是 "请选择【预言卡】目标"
        this.createTitle(layout.topY + 60, titleText);

        let startY = layout.topY + 140;
        targets.forEach((p, i) => {
            const y = startY + i * 80;
            // 如果 targets 传进来的是对象数组 {name: '小', value: 'small'}
            // 则显示 name，否则显示 p 本身
            const label = p.name ? p.name : p;

            this.createBtn(0, y, 280, 60, label, 0x7e57c2, () => { onSelect(p); });
        });
    }

    // 🟢 [新增] 专门的预言选择界面 (如果需要的话可以调用这个)
    showProphecySelection(onSelect) {
        this.createOverlay();
        const layout = this.createWindowBase(450);
        this.createTitle(layout.topY + 60, "🔮 预言下一张牌");

        const startY = layout.topY + 160;

        this.createBtn(0, startY, 280, 70, "小 (0-6)", 0x4db6ac, () => { onSelect('small'); });
        this.createBtn(0, startY + 90, 280, 70, "大 (7-13)", 0xff7043, () => { onSelect('big'); });
    }

    destroy() {
        if (this.overlay) this.overlay.destroy();
        if (this.container) this.container.destroy();

        // 🟢 弹窗关闭时，恢复主界面 HTML 菜单按钮
        const htmlMenuBtn = document.getElementById('html-menu-btn');
        if (htmlMenuBtn) {
            htmlMenuBtn.classList.remove('hidden');
        }
    }
}