import UICard from './components/UICard.js';
import UIGrid from './components/UIGrid.js';
import UIPlayerInfo from './components/UIPlayerInfo.js';
import UIHand from './components/UIHand.js';

export default class GameUI {
    constructor(scene) {
        this.scene = scene;

        // 全局配置
        this.layout = {
            topHeight: 1280 * 0.22,
            midHeight: 1280 * 0.58,
            btmHeight: 1280 * 0.2,
            gridSize: 85,
            gridGap: 6
        };

        this.colors = {
            grid: 0xffffff,
            gridBorder: 0x8d6e63,
            specialGrid: 0xffecb3,
            textNormal: '#5d4037',
            textGray: '#b0bec5',
            textHighlight: '#ff7043',
            textBust: '#e53935',
            bgZone: 0xf0f4c3,
            // 休闲卡背配色
            cardBackBase: 0x64b5f6,
            cardBackBorder: 0x1565c0,
            cardBackSide: 0x42a5f5,
            player: [0xff7043, 0x4db6ac, 0x7986cb, 0xffca28, 0xba68c8, 0x4dd0e1]
        };

        // --- 初始化子模块 ---
        this.cardDrawer = new UICard(scene, this.colors);
        this.grid = new UIGrid(scene, this.layout, this.colors);
        this.playerInfo = new UIPlayerInfo(scene, this.layout, this.colors, this.cardDrawer);
        this.hand = new UIHand(scene, this.layout, this.colors, this.cardDrawer);

        // --- 主 UI 状态 ---
        this.playerTokens = {};
        this.activeMarker = null;
        this.onDrawClick = null;
        this.onGiveUpClick = null;

        // 中间区域相关
        this.midCardsGroup = null;
        this.deckPileGroup = null;
        this.duelGroup = null;
        this.deckPos = { x: 0, y: 0 };
        this.midCardPos = { x: 0, y: 0 };
    }

    init() {
        this.grid.drawZones();
        this.grid.drawBoard();
        // 代理 grid 的数据
        this.gridCoordinates = this.grid.getCoordinates();

        // 玩家面板初始化 (数据由外部传入 refreshTopPanel 时填充)
        // 手牌面板初始化
        this.hand.create();

        // 中间区域
        this.createMidInfo();
        this.createActiveMarker();
    }

    setButtonHandlers(onDraw, onGiveUp) {
        this.onDrawClick = onDraw;
        this.onGiveUpClick = onGiveUp;
    }

    // --- 代理子模块方法 ---
    refreshTopPanel(players) {
        this.playerInfo.refresh(players);
    }

    updateBtmPanel(player) {
        this.hand.update(player);
    }

    hideStartGrid() {
        this.grid.hideStartGrid();
    }

    // --- 3. 玩家棋子与动画 (保留在主控，因为涉及坐标交互) ---
    drawPlayerAt(gridId, playerIndex, fullPlayerName = "") {
        const targetPos = this.calculateTokenPos(gridId, playerIndex);
        if (this.playerTokens[playerIndex]) {
            this.playerTokens[playerIndex].setPosition(targetPos.x, targetPos.y);
            return;
        }
        const container = this.scene.add.container(targetPos.x, targetPos.y).setDepth(100);
        const circle = this.scene.add.circle(0, 0, 14, this.colors.player[playerIndex] || 0x000000).setStrokeStyle(3, 0xffffff);
        let shortName = "P" + (playerIndex + 1);
        if (fullPlayerName) {
            if (fullPlayerName.includes("电脑")) shortName = fullPlayerName.replace("电脑", "").trim().charAt(0);
            else if (fullPlayerName.includes("我")) shortName = "我";
            else shortName = fullPlayerName.charAt(0).toUpperCase();
        }
        const text = this.scene.add.text(0, 0, shortName, { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        container.add([circle, text]);
        this.playerTokens[playerIndex] = container;
    }

    calculateTokenPos(gridId, playerIndex) {
        const pos = this.gridCoordinates[gridId];
        if (!pos) return {x:0, y:0};
        const offsets = [
            {x: -26, y: -20}, {x: 0, y: -20}, {x: 26, y: -20},
            {x: -26, y: 18},  {x: 0, y: 18},  {x: 26, y: 18}
        ];
        const offset = offsets[playerIndex % 6];
        return { x: pos.x + 42.5 + offset.x, y: pos.y + 42.5 + offset.y };
    }

    animatePlayerMove(playerIndex, pathArray, onComplete) {
        const token = this.playerTokens[playerIndex];
        if (!token) { if (onComplete) onComplete(); return; }
        const tweens = pathArray.map(gridId => {
            const target = this.calculateTokenPos(gridId, playerIndex);
            return { targets: token, x: target.x, y: target.y, duration: 250, ease: 'Cubic.out' };
        });
        if (tweens.length === 0) { this.scene.time.delayedCall(300, () => { if (onComplete) onComplete(); }); return; }
        this.scene.tweens.chain({ tweens: tweens, onComplete: onComplete });
    }

    createActiveMarker() {
        this.activeMarker = this.scene.add.container(-200, -200).setDepth(200);
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xff5252, 1);
        bg.fillRoundedRect(0, 0, 70, 26, 6);
        bg.fillTriangle(35, 26, 30, 20, 40, 20);
        const text = this.scene.add.text(35, 13, "行动中", { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.activeMarker.add([bg, text]);
    }

    animateActiveMarker(playerIndex, onComplete) {
        const count = this.scene.players.length;
        let cols = 3, rows = 2;
        if (count <= 2) { cols = 2; rows = 1; } else if (count <= 4) { cols = 2; rows = 2; }
        const colWidth = 720 / cols; const rowHeight = this.layout.topHeight / rows;
        const colIndex = playerIndex % cols; const rowIndex = Math.floor(playerIndex / cols);
        const baseX = colIndex * colWidth; const baseY = rowIndex * rowHeight;
        const targetX = baseX + colWidth - 80; const targetY = baseY + rowHeight - 35;
        this.scene.tweens.add({
            targets: this.activeMarker, x: targetX, y: targetY, duration: 600, ease: 'Power2',
            onComplete: () => { if (onComplete) onComplete(); }
        });
    }

    // --- 5. 中间区域 (牌堆、信息、按钮) ---
    createMidInfo() {
        const centerX = 720 / 2; const centerY = this.layout.topHeight + (this.layout.midHeight / 2) - 30;
        this.midScoreText = this.scene.add.text(centerX, centerY - 100, "+0", {
            fontSize: '80px', color: '#4caf50', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4, padding: { top: 40, bottom: 40 }
        }).setOrigin(0.5);
        this.midLabelText = this.scene.add.text(centerX, centerY - 160, "本轮预计", { fontSize: '24px', color: '#8d6e63', padding: { top: 10, bottom: 10 } }).setOrigin(0.5);
        this.midPlayerText = this.scene.add.text(centerX, centerY - 20, "当前: -", {
            fontSize: '36px', color: '#5d4037', fontStyle: 'bold', padding: { top: 10, bottom: 10 }, align: 'center', wordWrap: { width: 500 }
        }).setOrigin(0.5);

        this.midCardsGroup = this.scene.add.group();
        this.duelGroup = this.scene.add.group();
        this.deckPileGroup = this.scene.add.group();

        const btmY = 1280 - this.layout.btmHeight;
        const controlY = btmY - 50;
        this.midCardPos = { x: centerX, y: centerY + 60 };
        this.deckPos = { x: 100, y: controlY };

        this.deckCountText = this.scene.add.text(this.deckPos.x, this.deckPos.y + 70, "牌库: --", {
            fontSize: '24px', color: '#8d6e63', fontStyle: 'bold', padding: { top: 5, bottom: 5 }
        }).setOrigin(0.5);

        this.actionButtonGroup = this.scene.add.group();
        this.btnDraw = this.createButton(centerX - 60, controlY, "抽牌", 0x66bb6a, () => { if (this.onDrawClick) this.onDrawClick(); });
        this.btnGiveUp = this.createButton(centerX + 100, controlY, "放弃", 0xef5350, () => { if (this.onGiveUpClick) this.onGiveUpClick(); });
        this.actionButtonGroup.addMultiple([this.btnDraw.bg, this.btnDraw.text, this.btnGiveUp.bg, this.btnGiveUp.text]);
        this.showActionButtons(false);
    }

    createButton(x, y, label, color, callback) {
        const w = 140; const h = 60; const bg = this.scene.add.graphics();
        bg.fillStyle(color, 1); bg.fillRoundedRect(x - w/2, y - h/2, w, h, 15);
        bg.fillStyle(0x000000, 0.2); bg.fillRoundedRect(x - w/2, y - h/2 + 4, w, h, 15);
        const text = this.scene.add.text(x, y, label, { fontSize: '28px', color: '#ffffff', fontStyle: 'bold', padding: { top: 10, bottom: 10 } }).setOrigin(0.5);
        const zone = this.scene.add.zone(x, y, w, h).setInteractive();
        zone.on('pointerdown', () => {
            bg.clear(); bg.fillStyle(color, 1); bg.fillRoundedRect(x - w/2, y - h/2 + 2, w, h, 15);
            this.scene.time.delayedCall(100, () => {
                bg.clear(); bg.fillStyle(color, 1); bg.fillRoundedRect(x - w/2, y - h/2, w, h, 15);
                bg.fillStyle(0x000000, 0.2); bg.fillRoundedRect(x - w/2, y - h/2 + 4, w, h, 15);
            });
            callback();
        });
        return { bg, text, zone };
    }

    updateMidCard(card) {
        this.midCardsGroup.clear(true, true);
        const bg = this.scene.add.graphics();
        const elems = this.cardDrawer.drawMedium(this.midCardPos.x, this.midCardPos.y + 50, card.value, false, null); // 位置微调
        if (elems) {
            // CardDrawer 返回的是数组 [bg, text]，我们需要加到 group
            this.midCardsGroup.addMultiple(elems);
            // 翻开动画
            this.midCardsGroup.scaleX = 0;
            this.scene.tweens.add({ targets: this.midCardsGroup, scaleX: 1, duration: 150, ease: 'Quad.easeOut' });
        }
    }

    updateMidScore(score) { this.midScoreText.setText(`+${score}`); }
    updateCurrentPlayerName(name) { if (this.midPlayerText) this.midPlayerText.setText(`当前: ${name}`); }
    resetMidInfo() { this.midCardsGroup.clear(true, true); this.midScoreText.setText("+0"); }

    updateDeckCount(count) {
        if (this.deckCountText) this.deckCountText.setText(`牌库: ${count}`);
        this.updateDeckPile(count);
    }

    updateDeckPile(count) {
        this.deckPileGroup.clear(true, true);
        if (count <= 0) return;
        const layers = Math.min(Math.ceil(count / 5), 6);
        const w = 90; const h = 110;
        for (let i = 0; i < layers; i++) {
            const offset = i * 2;
            const bg = this.scene.add.graphics();
            bg.fillStyle(this.colors.cardBackSide, 1);
            bg.fillRoundedRect(this.deckPos.x - w/2 - offset, this.deckPos.y - h/2 - offset, w, h, 8);
            bg.lineStyle(2, this.colors.cardBackBorder, 1);
            bg.strokeRoundedRect(this.deckPos.x - w/2 - offset, this.deckPos.y - h/2 - offset, w, h, 8);
            this.deckPileGroup.add(bg);
        }
        const topOffset = (layers - 1) * 2;
        const topX = this.deckPos.x - topOffset;
        const topY = this.deckPos.y - topOffset;
        const topCard = this.scene.add.graphics();
        topCard.fillStyle(this.colors.cardBackBase, 1);
        topCard.fillRoundedRect(topX - w/2, topY - h/2, w, h, 8);
        topCard.lineStyle(3, this.colors.cardBackBorder, 1);
        topCard.strokeRoundedRect(topX - w/2, topY - h/2, w, h, 8);
        topCard.lineStyle(2, 0xffffff, 0.5);
        topCard.strokeRoundedRect(topX - w/2 + 10, topY - h/2 + 10, w - 20, h - 20, 4);
        this.deckPileGroup.add(topCard);
    }

    playDrawAnimation(onComplete) {
        const w = 90; const h = 110;
        const tempCard = this.scene.add.container(this.deckPos.x, this.deckPos.y);
        const bg = this.scene.add.graphics();
        bg.fillStyle(this.colors.cardBackBase, 1);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 8);
        bg.lineStyle(3, this.colors.cardBackBorder, 1);
        bg.strokeRoundedRect(-w/2, -h/2, w, h, 8);
        bg.lineStyle(2, 0xffffff, 0.5);
        bg.strokeRoundedRect(-w/2 + 10, -h/2 + 10, w - 20, h - 20, 4);
        tempCard.add(bg);
        tempCard.setDepth(2000);
        this.scene.tweens.add({
            targets: tempCard,
            x: this.midCardPos.x,
            y: this.midCardPos.y + 50, // 与 updateMidCard 位置一致
            scaleX: 0,
            duration: 250,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                tempCard.destroy();
                if (onComplete) onComplete();
            }
        });
    }

    showActionButtons(visible) {
        this.actionButtonGroup.setVisible(visible);
        this.btnDraw.zone.disableInteractive(); this.btnGiveUp.zone.disableInteractive();
        if (visible) { this.btnDraw.zone.setInteractive(); this.btnGiveUp.zone.setInteractive(); }
    }

    updateDuelPanel(challenger, target, pool, challengerCards, targetCards) {
        this.midScoreText.setVisible(false); this.midLabelText.setVisible(false); this.midPlayerText.setVisible(false);
        this.midCardsGroup.setVisible(false); this.duelGroup.clear(true, true);
        const centerX = 720 / 2; const startY = this.layout.topHeight + (this.layout.midHeight / 2) - 150;
        this.duelGroup.add(this.scene.add.text(centerX, startY, "⚔️ 试胆竞速 ⚔️", { fontSize:'36px', color:'#ef5350', fontStyle:'bold', padding: { top: 10, bottom: 10 } }).setOrigin(0.5));
        const nameY = startY + 50;
        this.duelGroup.add(this.scene.add.text(centerX - 120, nameY, challenger.name, { fontSize:'24px', color:'#5d4037', fontStyle:'bold', padding: { top: 5, bottom: 5 } }).setOrigin(0.5));
        this.duelGroup.add(this.scene.add.text(centerX, nameY, "VS", { fontSize:'32px', color:'#ffa726', fontStyle:'bold', padding: { top: 10, bottom: 10 } }).setOrigin(0.5));
        this.duelGroup.add(this.scene.add.text(centerX + 120, nameY, target.name, { fontSize:'24px', color:'#5d4037', fontStyle:'bold', padding: { top: 5, bottom: 5 } }).setOrigin(0.5));

        const cardStartY = nameY + 60;
        const leftBaseX = centerX - 240; const rightBaseX = centerX + 60;
        const cardGap = 52; const rowHeight = 60;
        challengerCards.forEach((c, i) => { const col = i % 3; const row = Math.floor(i / 3); this.cardDrawer.drawMedium(leftBaseX + col * cardGap, cardStartY + row * rowHeight, c.value, false, this.duelGroup); });
        targetCards.forEach((c, i) => { const col = i % 3; const row = Math.floor(i / 3); this.cardDrawer.drawMedium(rightBaseX + col * cardGap, cardStartY + row * rowHeight, c.value, false, this.duelGroup); });
        const maxRows = Math.ceil(Math.max(challengerCards.length, targetCards.length, 1) / 3);
        const bottomY = cardStartY + maxRows * rowHeight + 40;
        this.duelGroup.add(this.scene.add.text(centerX, bottomY, `剩余: ${pool} 张`, { fontSize:'28px', color:'#8d6e63', padding: { top: 5, bottom: 5 } }).setOrigin(0.5));
    }

    clearDuelPanel() {
        this.duelGroup.clear(true, true);
        this.midScoreText.setVisible(true); this.midLabelText.setVisible(true); this.midPlayerText.setVisible(true); this.midCardsGroup.setVisible(true);
    }
}