import UICard from './components/UICard.js';
import UIGrid from './components/UIGrid.js';
import UIPlayerInfo from './components/UIPlayerInfo.js';
import UIHand from './components/UIHand.js';
import UIBetting from './components/UIBetting.js';

export default class GameUI {
    constructor(scene) {
        this.scene = scene;
        this.layout = {
            topHeight: 1280 * 0.22,
            midHeight: 1280 * 0.58,
            btmHeight: 1280 * 0.2,
            gridSize: 85, gridGap: 6
        };

        // 🟢 [配色方案调整]：晨曦微光 + 抹茶饼干
        this.colors = {
            // 棋盘格：纯白
            grid: 0xffffff,

            // 格子边框：柔和的浅棕灰
            gridBorder: 0xd7ccc8,

            // 🟢 修改点1：特殊格 (10/22) -> 浅绿色 (清新幸运草)
            specialGrid: 0xc8e6c9,

            // 文字颜色
            textNormal: '#5d4037',
            textGray: '#b0bec5',
            textHighlight: '#ff7043',
            textBust: '#e53935',

            // 背景色
            bgZone: 0xfff8e1, // 米色
            bgBoard: 0xe0f2f1, // 淡青色

            // 🟢 修改点2：卡背颜色 -> 浅棕色系 (牛奶饼干风格)
            cardBackBase: 0xd7ccc8,   // 浅棕 (饼干面)
            cardBackBorder: 0x8d6e63, // 深棕 (烤焦边)
            cardBackSide: 0xbcaaa4,   // 中棕 (阴影)

            // 玩家颜色：莫兰迪色系
            player: [
                0x4db6ac, // P1: 青瓷绿
                0xffb74d, // P2: 杏黄
                0x9575cd, // P3: 香芋紫
                0x4fc3f7, // P4: 天空蓝
                0xf06292, // P5: 樱花粉
                0xaed581  // P6: 抹茶绿
            ]
        };

        this.cardDrawer = new UICard(scene, this.colors);
        this.grid = new UIGrid(scene, this.layout, this.colors);
        this.playerInfo = new UIPlayerInfo(scene, this.layout, this.colors, this.cardDrawer);
        this.hand = new UIHand(scene, this.layout, this.colors, this.cardDrawer);
        this.bettingPanel = new UIBetting(scene, this.layout);

        this.playerTokens = {};
        this.activeMarker = null;
        this.onDrawClick = null; this.onGiveUpClick = null; this.onUseItemClick = null; this.onSkipItemClick = null;
        this.onConfirmBetClick = null;

        this.midCardsGroup = null; this.deckPileGroup = null; this.duelGroup = null;
        this.deckPos = { x: 0, y: 0 }; this.midCardPos = { x: 0, y: 0 };
        this.skipBtnPos = { x: 0, y: 0 };
    }

    init() {
        this.grid.drawZones(); this.grid.drawBoard(); this.gridCoordinates = this.grid.getCoordinates();
        this.hand.create();
        this.bettingPanel.create();
        this.createMidInfo();
        this.createActiveMarker();
        // 🟢 已移除 createMenuButton
    }

    // 🟢 已移除 toggleMenuButton

    setButtonHandlers(onDraw, onGiveUp, onUseItem, onSkipItem) {
        this.onDrawClick = onDraw; this.onGiveUpClick = onGiveUp;
        this.onUseItemClick = onUseItem; this.onSkipItemClick = onSkipItem;
    }

    setBetButtonHandler(callback) { this.onConfirmBetClick = callback; }

    // 🟢 已移除 setMenuButtonHandler

    refreshTopPanel(players) { this.playerInfo.refresh(players); }
    updateBtmPanel(player) { this.hand.update(player); }
    hideStartGrid() { this.grid.hideStartGrid(); }

    drawPlayerAt(gridId, playerIndex, fullPlayerName = "") {
        const targetPos = this.calculateTokenPos(gridId, playerIndex);
        if (this.playerTokens[playerIndex]) {
            this.playerTokens[playerIndex].setPosition(targetPos.x, targetPos.y);
            this.scene.children.bringToTop(this.playerTokens[playerIndex]);
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
        const halfSize = this.layout.gridSize / 2;
        const centerX = pos.x + halfSize;
        const centerY = pos.y + halfSize;
        const playersOnGrid = this.scene.players.filter(p => p.position === gridId).sort((a,b) => a.id - b.id);
        const count = playersOnGrid.length;
        const indexInGroup = playersOnGrid.findIndex(p => p.id === playerIndex);
        if (indexInGroup === -1) return { x: centerX, y: centerY };
        const R = 22; let offsetX = 0; let offsetY = 0;
        switch (count) {
            case 1: offsetX = 0; offsetY = 0; break;
            case 2: offsetX = (indexInGroup === 0) ? -R + 5 : R - 5; break;
            case 3: if (indexInGroup === 0) { offsetX = 0; offsetY = -R; } else if (indexInGroup === 1) { offsetX = -R; offsetY = R * 0.8; } else { offsetX = R; offsetY = R * 0.8; } break;
            case 4: const d = R * 0.7; if (indexInGroup === 0) { offsetX = -d; offsetY = -d; } else if (indexInGroup === 1) { offsetX = d; offsetY = -d; } else if (indexInGroup === 2) { offsetX = -d; offsetY = d; } else { offsetX = d; offsetY = d; } break;
            case 5: const angle5 = -90 + (indexInGroup * 72); const rad5 = Phaser.Math.DegToRad(angle5); offsetX = Math.cos(rad5) * R; offsetY = Math.sin(rad5) * R; break;
            case 6: if (indexInGroup === 0) { offsetX = 0; offsetY = 0; } else { const angle6 = -90 + ((indexInGroup - 1) * 72); const rad6 = Phaser.Math.DegToRad(angle6); offsetX = Math.cos(rad6) * (R + 4); offsetY = Math.sin(rad6) * (R + 4); } break;
            default: offsetX = (indexInGroup % 3 - 1) * 10; offsetY = (Math.floor(indexInGroup / 3) - 1) * 10; break;
        }
        return { x: centerX + offsetX, y: centerY + offsetY };
    }

    updateGridTokens(gridId) {
        const playersOnGrid = this.scene.players.filter(p => p.position === gridId);
        playersOnGrid.forEach(p => {
            const targetPos = this.calculateTokenPos(gridId, p.id);
            const token = this.playerTokens[p.id];
            if (token) this.scene.tweens.add({ targets: token, x: targetPos.x, y: targetPos.y, duration: 200, ease: 'Power2' });
        });
    }

    animatePlayerMove(playerIndex, pathArray, onComplete) {
        const token = this.playerTokens[playerIndex];
        if (!token) { if (onComplete) onComplete(); return; }
        const playerColor = this.colors.player[playerIndex] || 0xffffff;
        const tweens = pathArray.map(gridId => {
            const target = this.calculateTokenPos(gridId, playerIndex);
            return { targets: token, x: target.x, y: target.y, duration: 200, ease: 'Cubic.out', onStart: () => { this.grid.flashGrid(gridId, playerColor); } };
        });
        if (tweens.length === 0) { this.scene.time.delayedCall(300, () => { if (onComplete) onComplete(); }); return; }
        this.scene.tweens.chain({ tweens: tweens, onComplete: onComplete });
    }

    createActiveMarker() {
        this.activeMarker = this.scene.add.container(-200, -200).setDepth(200);
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xff5252, 1); bg.fillRoundedRect(0, 0, 70, 26, 6); bg.fillTriangle(35, 26, 30, 20, 40, 20);
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
        this.scene.tweens.add({ targets: this.activeMarker, x: targetX, y: targetY, duration: 600, ease: 'Power2', onComplete: () => { if (onComplete) onComplete(); } });
    }

    createMidInfo() {
        const centerX = 720 / 2;
        const centerY = this.layout.topHeight + (this.layout.midHeight / 2) - 30;

        this.midScoreText = this.scene.add.text(centerX, centerY - 100, "+0", { fontSize: '80px', color: '#4caf50', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4, padding: { top: 40, bottom: 40 } }).setOrigin(0.5);
        this.midLabelText = this.scene.add.text(centerX, centerY - 160, "本轮预计", { fontSize: '24px', color: '#8d6e63', padding: { top: 10, bottom: 10 } }).setOrigin(0.5);
        this.midPlayerText = this.scene.add.text(centerX, centerY - 20, "当前: -", { fontSize: '36px', color: '#5d4037', fontStyle: 'bold', padding: { top: 10, bottom: 10 }, align: 'center', wordWrap: { width: 500 } }).setOrigin(0.5);

        this.midCardsGroup = this.scene.add.group();
        this.duelGroup = this.scene.add.group();
        this.deckPileGroup = this.scene.add.group();

        const cardY = centerY + 110;
        this.midCardPos = { x: centerX, y: cardY };
        this.deckPos = { x: centerX - 130, y: cardY };

        this.deckCountText = this.scene.add.text(this.deckPos.x, this.deckPos.y + 80, "牌库: --", { fontSize: '24px', color: '#8d6e63', fontStyle: 'bold', padding: { top: 5, bottom: 5 } }).setOrigin(0.5);

        const btmY = 1280 - this.layout.btmHeight;
        const controlY = btmY - 50;
        this.actionButtonGroup = this.scene.add.group();
        this.btnDraw = this.createButton(centerX - 80, controlY, "抽牌", 0x66bb6a, () => { if (this.onDrawClick) this.onDrawClick(); });
        this.btnGiveUp = this.createButton(centerX + 80, controlY, "放弃", 0xef5350, () => { if (this.onGiveUpClick) this.onGiveUpClick(); });

        this.btnConfirmBet = this.createButton(centerX, controlY, "确认结束", 0xfbc02d, () => {
            if (this.onConfirmBetClick) this.onConfirmBetClick();
        });
        this.btnConfirmBet.container.setVisible(false);

        this.actionButtonGroup.addMultiple([this.btnDraw.container, this.btnGiveUp.container]);

        this.timerText = this.scene.add.text(centerX, centerY + 20, "", { fontSize: '60px', color: '#d84315', fontStyle: 'bold' }).setOrigin(0.5).setVisible(false);

        this.bettingTipsText = this.scene.add.text(centerX, centerY + 90, "点击下方图标下注 竞猜本轮停留位置\n猜中即可获得 对应倍率积分奖励", {
            fontSize: '22px',
            color: '#8d6e63',
            align: 'center',
            fontStyle: 'bold',
            lineSpacing: 8,
            padding: { top: 10, bottom: 10 }
        }).setOrigin(0.5).setVisible(false);

        // 放弃(跳过道具)按钮
        this.btnSkipItem = this.createButton(0, 0, "不使用", 0x90a4ae, () => {
            if (this.onSkipItemClick) this.onSkipItemClick();
        }, 100, 50);

        // 道具描述和使用按钮容器
        this.itemDescGroup = this.scene.add.container(centerX, controlY);
        this.itemDescGroup.setVisible(false);
        this.itemDescText = this.scene.add.text(0, 0, "", {
            fontSize: '22px',
            color: '#5d4037',
            align: 'center',
            wordWrap: { width: 500 },
            padding: { top: 10, bottom: 10 }
        }).setOrigin(0.5);
        this.itemDescGroup.add(this.itemDescText);

        this.btnUseItem = this.createButton(0, 0, "使用", 0xff7043, () => {
            if (this.onUseItemClick) this.onUseItemClick();
        }, 80, 50);

        this.showActionButtons(false);
    }

    // 🟢 已移除 createMenuButton

    createButton(x, y, label, color, callback, width = 140, height = 60) {
        const w = width;
        const h = height;
        const container = this.scene.add.container(x, y);

        // 初始背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(color, 1); bg.fillRoundedRect(-w/2, -h/2, w, h, 15);

        // 阴影
        bg.fillStyle(0x000000, 0.2); bg.fillRoundedRect(-w/2, -h/2 + 4, w, h, 15);

        const text = this.scene.add.text(0, 0, label, {
            fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
            padding: { top: 10, bottom: 10, left: 5, right: 5 }
        }).setOrigin(0.5);

        const zone = this.scene.add.zone(0, 0, w, h).setInteractive();

        zone.on('pointerdown', () => {
            bg.clear();
            bg.fillStyle(0x000000, 0.2); bg.fillRoundedRect(-w/2, -h/2 + 4, w, h, 15);
            bg.fillStyle(color, 1); bg.fillRoundedRect(-w/2, -h/2 + 2, w, h, 15);

            this.scene.time.delayedCall(100, () => {
                bg.clear();
                bg.fillStyle(color, 1); bg.fillRoundedRect(-w/2, -h/2, w, h, 15);
                bg.fillStyle(0x000000, 0.2); bg.fillRoundedRect(-w/2, -h/2 + 4, w, h, 15);
            });

            callback();
        });

        container.add([bg, text, zone]);
        return { container, bg, text, zone };
    }

    updateMidCard(card) {
        this.midCardsGroup.clear(true, true);
        const w = 90; const h = 110;
        const drawX = this.midCardPos.x - w/2;
        const drawY = this.midCardPos.y - h/2;
        const elems = this.cardDrawer.drawLarge(drawX, drawY, card.value, null);
        if (elems) {
            this.midCardsGroup.addMultiple(elems);
            this.midCardsGroup.scaleX = 0;
            this.scene.tweens.add({ targets: this.midCardsGroup, scaleX: 1, duration: 150, ease: 'Quad.easeOut' });
        }
    }

    updateMidScore(score) { this.midScoreText.setText(`+${score}`); }
    updateCurrentPlayerName(name) { if (this.midPlayerText) this.midPlayerText.setText(`当前: ${name}`); }

    resetMidInfo() {
        this.midCardsGroup.clear(true, true);
        this.midScoreText.setText("+0");
        this.hideItemUsageMode();
    }
    /**
     * 清理所有特殊事件产生的灯光、遮罩和特效
     * 在玩家点击“抽牌”、“放弃”或回合结束时调用
     */
    clearSpecialEffects() {

        // 增加一个安全检查，防止在初始化完成前被调用
        if (this.grid && typeof this.grid.clearAllLights === 'function') {
            this.grid.clearAllLights();
        }
    }

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
        topCard.lineStyle(2, 0xffffff, 0.4);
        topCard.strokeRoundedRect(topX - w/2 + 10, topY - h/2 + 10, w - 20, h - 20, 4);
        topCard.beginPath();
        topCard.moveTo(topX - 15, topY - 15); topCard.lineTo(topX + 15, topY + 15);
        topCard.moveTo(topX + 15, topY - 15); topCard.lineTo(topX - 15, topY + 15);
        topCard.strokePath();
        this.deckPileGroup.add(topCard);
    }

    playDrawAnimation(onComplete) {
        const w = 90; const h = 110;
        const tempCard = this.scene.add.container(this.deckPos.x, this.deckPos.y).setDepth(2000);
        const bg = this.scene.add.graphics();
        bg.fillStyle(this.colors.cardBackBase, 1);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 8);
        bg.lineStyle(3, this.colors.cardBackBorder, 1);
        bg.strokeRoundedRect(-w/2, -h/2, w, h, 8);
        bg.lineStyle(2, 0xffffff, 0.4);
        bg.strokeRoundedRect(-w/2 + 10, -h/2 + 10, w - 20, h - 20, 4);
        tempCard.add(bg);
        this.scene.tweens.add({
            targets: tempCard,
            x: this.midCardPos.x, y: this.midCardPos.y,
            scaleX: 1, scaleY: 1, angle: 360, duration: 400, ease: 'Cubic.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: tempCard, scaleX: 0, duration: 100,
                    onComplete: () => { tempCard.destroy(); if (onComplete) onComplete(); }
                });
            }
        });
    }

    showActionButtons(visible) {
        this.actionButtonGroup.setVisible(visible);
        if (visible) {
            this.itemDescGroup.setVisible(false);
            this.btnDraw.zone.setInteractive();
            this.btnGiveUp.zone.setInteractive();
            this.btnUseItem.container.setVisible(false);

            this.btnConfirmBet.container.setVisible(false);
            this.btnConfirmBet.zone.disableInteractive();
        } else {
            this.btnDraw.zone.disableInteractive();
            this.btnGiveUp.zone.disableInteractive();
        }
    }

    showBettingMode(playerBets, timeLeft) {
        this.hand.group.setVisible(false);
        this.bettingPanel.show(playerBets);

        this.actionButtonGroup.setVisible(false);
        this.btnConfirmBet.container.setVisible(true);
        this.btnConfirmBet.zone.setInteractive();

        this.timerText.setVisible(true).setText(timeLeft);

        this.midPlayerText.setText("猜猜猜时间");
        this.midPlayerText.setVisible(true);

        if(this.bettingTipsText) this.bettingTipsText.setVisible(true);

        this.midLabelText.setVisible(false);
        this.midScoreText.setVisible(false);
        this.deckCountText.setVisible(false);
        this.deckPileGroup.setVisible(false);
        // 🟢 已移除 this.btnMenu.container.setVisible(false);
    }

    hideBettingMode() {
        this.hand.group.setVisible(true);
        this.bettingPanel.hide();

        this.btnConfirmBet.container.setVisible(false);
        this.btnConfirmBet.zone.disableInteractive();

        this.actionButtonGroup.setVisible(false);

        this.timerText.setVisible(false);

        if(this.bettingTipsText) this.bettingTipsText.setVisible(false);

        this.midLabelText.setVisible(true);
        this.midScoreText.setVisible(true);
        this.deckCountText.setVisible(true);
        this.deckPileGroup.setVisible(true);
        // 🟢 已移除 this.btnMenu.container.setVisible(true);
    }

    updateBettingPanel(playerBets) {
        this.bettingPanel.updateBets(playerBets);
    }

    showItemUsageMode(timeLeft, player) {
        this.midLabelText.setVisible(false);
        this.deckCountText.setVisible(false);
        this.deckPileGroup.setVisible(false);
        this.midScoreText.setVisible(false);
        this.timerText.setVisible(true).setText(timeLeft);

        if (player && player.id === 0 && player.items && player.items.length > 0) {
            const count = player.items.length;
            const itemGap = 80;

            const startX = 180;
            const lastItemX = startX + (count - 1) * itemGap;
            const btnX = lastItemX + 30 + 10 + 50;
            const btnY = 1280 - this.layout.btmHeight + 135 + 50;

            this.btnSkipItem.container.setPosition(btnX, btnY);
            this.btnSkipItem.container.setVisible(true);
            this.btnSkipItem.zone.setInteractive();

            this.skipBtnPos = { x: btnX, y: btnY };

        } else {
            this.btnSkipItem.container.setVisible(false);
        }
    }

    hideItemUsageMode() {
        this.midLabelText.setVisible(true);
        this.deckCountText.setVisible(true);
        this.deckPileGroup.setVisible(true);
        this.midScoreText.setVisible(true);
        this.timerText.setVisible(false);
        if (this.hand) {
            this.hand.clearSelection();
        }
        this.btnSkipItem.container.setVisible(false);
        this.btnSkipItem.zone.disableInteractive();
        this.itemDescGroup.setVisible(false);
        this.btnUseItem.container.setVisible(false);
    }

    updateTimer(timeLeft) {
        if (this.timerText.visible) this.timerText.setText(timeLeft);
    }

    showItemDescription(itemData, itemX, itemY) {
        this.actionButtonGroup.setVisible(false);
        this.itemDescGroup.setVisible(true);
        this.itemDescText.setText(`${itemData.name}:\n${itemData.desc}`);

        if (this.skipBtnPos && this.skipBtnPos.x > 0) {
            this.btnUseItem.container.setPosition(this.skipBtnPos.x + 100, this.skipBtnPos.y);
            this.btnUseItem.container.setVisible(true);
            this.btnUseItem.zone.setInteractive();
        }
    }

    hideItemDescription(isItemPhase) {
        this.itemDescGroup.setVisible(false);
        this.btnUseItem.container.setVisible(false);
    }

    updateDuelPanel(challenger, target, pool, challengerCards, targetCards) {
        this.midScoreText.setVisible(false); this.midLabelText.setVisible(false); this.midPlayerText.setVisible(false);
        this.midCardsGroup.setVisible(false); this.duelGroup.clear(true, true);
        const centerX = 720 / 2; const startY = this.layout.topHeight + (this.layout.midHeight / 2) - 150;
        this.duelGroup.add(this.scene.add.text(centerX, startY, "⚔️ 试胆竞速 ⚔️", { fontSize:'36px', color:'#ef5350', fontStyle:'bold', padding: { top: 10, bottom: 10 } }).setOrigin(0.5));
        const nameY = startY + 50;

        const leftNameX = centerX - 110;
        const rightNameX = centerX + 110;

        this.duelGroup.add(this.scene.add.text(leftNameX, nameY, challenger.name, { fontSize:'24px', color:'#5d4037', fontStyle:'bold', padding: { top: 5, bottom: 5 } }).setOrigin(0.5));
        this.duelGroup.add(this.scene.add.text(rightNameX, nameY, target.name, { fontSize:'24px', color:'#5d4037', fontStyle:'bold', padding: { top: 5, bottom: 5 } }).setOrigin(0.5));
        this.duelGroup.add(this.scene.add.text(centerX, nameY, "VS", { fontSize:'32px', color:'#ffa726', fontStyle:'bold', padding: { top: 10, bottom: 10 } }).setOrigin(0.5));

        const cardStartY = nameY + 60;
        const cardGap = 52;
        const rowHeight = 60;
        const leftBaseX = leftNameX - 74;
        const rightBaseX = rightNameX - 74;

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