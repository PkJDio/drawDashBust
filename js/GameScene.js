import GameUI from './ui.js';
import Toast from './Toast.js';
import Modal from './Modal.js';
import { ITEM_DATA } from './ItemConfig.js';
import CardManager from './managers/CardManager.js';
import ShopManager from './managers/ShopManager.js';
import ItemManager from './managers/ItemManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    create() {
        this.ui = new GameUI(this);
        this.ui.init();
        this.toast = new Toast(this);
        this.modal = new Modal(this);

        // 初始化管理器
        this.cardManager = new CardManager(this);
        this.shopManager = new ShopManager(this);
        this.itemManager = new ItemManager(this);

        this.ui.setButtonHandlers(
            () => {
                if (this.isDuelMode) this.cardManager.onDuelDraw();
                else this.cardManager.handleDrawClick();
            },
            () => {
                if (this.isDuelMode) this.cardManager.onDuelGiveUp();
                else this.onGiveUp();
            },
            () => {
                this.onUseItem();
            },
            () => {
                this.onSkipItemPhase(); // 绑定跳过/放弃回调
            }
        );

        this.ui.hand.setOnItemClick((itemType, index, x, y) => {
            this.onItemClick(itemType, index);
        });

        const aiCount = this.registry.get('aiCount') || 3;
        this.initGame(aiCount);
    }

    forceClearOverlays() {
        if (this.toast) this.toast.hide();
        if (this.modal) this.modal.destroy();
    }

    initGame(aiCount) {
        this.players = this.createPlayers(aiCount);
        this.cardManager.initializeDecks();
        this.itemManager.initGrid(); // 初始化地图数据

        this.roundStartIndex = Phaser.Math.Between(0, this.players.length - 1);
        this.currentPlayerIndex = this.roundStartIndex;

        this.roundCount = 1;
        this.specialGrids = [1, 6, 12, 18];
        this.musouMode = false;

        this.isDuelMode = false;
        this.forceDrawState = null;
        this.itemPhaseState = null;

        this.isRoundSettling = false;
        this.isWaitingForModal = false;

        this.ui.refreshTopPanel(this.players);
        this.ui.updateBtmPanel(this.players[0]);
        this.players.forEach((p, i) => { p.position = 0; this.ui.drawPlayerAt(0, i, p.name); });
        this.ui.resetMidInfo();
        this.ui.updateDeckCount(this.cardManager.mainDeckCache.length);

        this.ui.animateActiveMarker(this.currentPlayerIndex, () => {
            this.startTurn();
        });
    }

    createPlayers(aiCount) {
        // 新增 hasSkippedItemPhase 标记
        const p = [{
            id:0, name:"我 (P1)", isAI:false,
            totalScore:0, roundScore:0, position:0,
            cards:[], items:[], upgradeCount:0,
            state:'playing',
            hasSkippedItemPhase: false
        }];
        for(let i=0; i<aiCount; i++) p.push({
            id:i+1, name:`电脑${String.fromCharCode(65+i)}`, isAI:true,
            totalScore:0, roundScore:0, position:0,
            cards:[], items:[], upgradeCount:0,
            state:'waiting',
            hasSkippedItemPhase: false
        });
        return p;
    }

    startTurn() {
        this.forceClearOverlays();
        if (this.isRoundSettling) return;
        if (this.checkRoundOver()) { this.handleRoundOver(); return; }

        const player = this.players[this.currentPlayerIndex];
        if (player.state === 'bust' || player.state === 'done' || player.state === 'frozen') {
            this.nextTurn();
            return;
        }

        if (player.state === 'waiting') player.state = 'playing';
        this.ui.updateCurrentPlayerName(player.name);
        this.ui.refreshTopPanel(this.players);

        if (this.players.every(p => p.position !== 0)) this.ui.hideStartGrid();

        // --- 修改：判断是否进入道具阶段 ---
        // 条件：第2轮及以后 + 有道具 + 本轮尚未跳过/使用过
        const canUseItem = (this.roundCount > 1) && (player.items.length > 0) && (!player.hasSkippedItemPhase);

        if (canUseItem) {
            this.startItemPhase(player);
        } else {
            this.readyForAction(player);
        }
    }

    readyForAction(player) {
        if (this.isWaitingForModal) return;
        if (!player.isAI) {
            this.ui.showActionButtons(true);
        } else {
            this.ui.showActionButtons(false);
            this.time.delayedCall(1000, () => {
                if (this.isWaitingForModal) return;
                if (player.roundScore >= 15) this.onGiveUp();
                else this.cardManager.handleDrawClick();
            });
        }
    }

    movePlayer(player, steps, isBonus) {
        const path = [];
        let tempPos = player.position;

        for (let i = 0; i < steps; i++) {
            tempPos++;
            if (tempPos > 24) tempPos = 1;
            path.push(tempPos);

            // 检查拦截卡
            if (this.itemManager.checkBlock(tempPos)) {
                this.toast.show("🚫 遇到拦截卡，停止移动！", 1500);
                break;
            }
        }

        player.position = tempPos;
        this.ui.showActionButtons(false);

        this.ui.animatePlayerMove(player.id, path, () => {
            if (player.orbitActive) player.orbitSteps += path.length;

            // 礼让卡检测
            const yielder = this.players.find(p => p.id !== player.id && p.position === player.position && p.yieldActive);
            if (yielder) {
                this.toast.show(`触发 ${yielder.name} 的【礼让卡】！`, 1500);
                yielder.totalScore += 4;
                let newPos = yielder.position + 1; if (newPos > 24) newPos = 1;
                yielder.position = newPos;
                this.ui.drawPlayerAt(newPos, yielder.id, yielder.name);
                this.ui.refreshTopPanel(this.players);
            }

            this.itemManager.handleLandEffect(player);

            if (this.specialGrids.includes(player.position)) {
                this.handleSpecialGridBonus(player, isBonus);
            } else {
                this.finishAction(player, isBonus);
            }
        });
    }

    finishAction(player, isBonus) {
        this.calculateRoundScore(player);
        this.ui.refreshTopPanel(this.players);

        if (this.forceDrawState && this.forceDrawState.count > 0) {
            if (player.state === 'bust' || player.state === 'done' || player.state === 'frozen') {
                this.forceDrawState = null;
                if (this.isDuelMode) this.time.delayedCall(1500, () => this.cardManager.updateDuelUI());
                else this.time.delayedCall(1500, () => this.nextTurn());
                return;
            }
            this.time.delayedCall(1500, () => this.processForceDraw());
            return;
        }
        else if (this.forceDrawState && this.forceDrawState.count <= 0) {
            const callback = this.forceDrawState.callback;
            this.forceDrawState = null;
            if (callback) callback();
            return;
        }

        if (this.isDuelMode) {
            const ds = this.cardManager.duelState;
            ds.current = (ds.current === ds.challenger) ? ds.target : ds.challenger;
            this.time.delayedCall(1000, () => this.cardManager.updateDuelUI());
            return;
        }

        if (isBonus) {
            this.readyForAction(player);
        } else {
            this.time.delayedCall(500, () => this.nextTurn());
        }
    }

    startForceDraw(player, count, onComplete) {
        this.forceDrawState = { target: player, count: count, callback: onComplete };
        this.ui.showActionButtons(false);
        this.toast.show(`${player.name} 开始连抽 ${count} 张！`, 1500);
        this.time.delayedCall(2000, () => this.processForceDraw());
    }

    processForceDraw() {
        if (!this.forceDrawState || this.forceDrawState.count <= 0) return;
        const player = this.forceDrawState.target;
        this.forceDrawState.count--;

        if (this.cardManager.mainDeckCache.length === 0) this.cardManager.reshuffleDecks();
        const card = this.cardManager.mainDeckCache.pop();

        this.ui.updateMidCard(card);
        this.ui.updateDeckCount(this.cardManager.mainDeckCache.length);

        let shouldMove = (!this.isDuelMode && player.id === this.players[this.currentPlayerIndex].id);
        this.cardManager.handleCardEffect(player, card, true, shouldMove);
    }

    handleSpecialGridBonus(player, isBonus) {
        if (this.cardManager.specialDeckCache.length === 0) {
            this.toast.show("特殊牌库已空，无奖励");
            this.finishAction(player, isBonus);
            return;
        }
        const cardIndex = Phaser.Math.RND.between(0, this.cardManager.specialDeckCache.length - 1);
        const bonusCard = this.cardManager.specialDeckCache.splice(cardIndex, 1)[0];
        const mIndex = this.cardManager.mainDeckCache.findIndex(c => c.value === bonusCard.value && c.type === 'special');
        if (mIndex !== -1) this.cardManager.mainDeckCache.splice(mIndex, 1);

        this.toast.show(`${player.name} 获得特殊奖励！\n【${this.getCardName(bonusCard.value)}】`, 2000);
        this.ui.updateMidCard(bonusCard);
        this.time.delayedCall(2500, () => {
            this.cardManager.handleCardEffect(player, bonusCard, isBonus, true);
        });
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.ui.animateActiveMarker(this.currentPlayerIndex, () => {
            this.startTurn();
        });
    }

    // --- 道具阶段 ---
    startItemPhase(player) {
        if (player.items.length === 0) {
            this.readyForAction(player);
            return;
        }
        // 初始化状态
        this.itemPhaseState = { timeLeft: 20, selectedItemIndex: -1, timerEvent: null };
        this.ui.showItemUsageMode(this.itemPhaseState.timeLeft);
        this.ui.showActionButtons(false); // 确保隐藏抽卡按钮

        this.itemPhaseState.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.itemPhaseState) return;
                this.itemPhaseState.timeLeft--;
                this.ui.updateTimer(this.itemPhaseState.timeLeft);
                if (this.itemPhaseState.timeLeft <= 0) {
                    // 倒计时结束，自动放弃
                    this.onSkipItemPhase();
                }
            },
            repeat: 19
        });

        // AI 逻辑：简单模拟，1.5秒后自动放弃使用道具
        if (player.isAI) {
            this.time.delayedCall(1500, () => this.onSkipItemPhase());
        }
    }

    // 新增：玩家点击“不使用道具”或倒计时结束
    onSkipItemPhase() {
        const player = this.players[this.currentPlayerIndex];

        // 标记本轮不再询问
        player.hasSkippedItemPhase = true;

        this.endItemPhase(player);
    }

    endItemPhase(player) {
        if (this.itemPhaseState && this.itemPhaseState.timerEvent) this.itemPhaseState.timerEvent.remove();
        this.itemPhaseState = null;
        this.ui.hideItemUsageMode();
        this.readyForAction(player);
    }

    onItemClick(itemType, index) {
        if (!this.itemPhaseState || this.players[this.currentPlayerIndex].isAI) return;
        if (this.players[this.currentPlayerIndex].id !== 0) return;

        if (this.itemPhaseState.selectedItemIndex === index) {
            this.itemPhaseState.selectedItemIndex = -1;
            this.ui.hideItemDescription();
            this.ui.timerText.setVisible(true);
        } else {
            this.itemPhaseState.selectedItemIndex = index;
            const data = ITEM_DATA[itemType];
            this.ui.showItemDescription(data);
            this.ui.timerText.setVisible(false);
        }
    }

    onUseItem() {
        if (!this.itemPhaseState || this.itemPhaseState.selectedItemIndex === -1) return;
        const player = this.players[this.currentPlayerIndex];
        const index = this.itemPhaseState.selectedItemIndex;
        const itemType = player.items[index];

        // 标记：本轮已操作过，后续不再进入道具阶段
        player.hasSkippedItemPhase = true;

        player.items.splice(index, 1);
        this.ui.updateBtmPanel(player);
        this.ui.hideItemDescription();
        this.toast.show(`${player.name} 使用了 【${ITEM_DATA[itemType].name}】`, 1500);

        if (this.itemPhaseState.timerEvent) this.itemPhaseState.timerEvent.remove();
        this.itemPhaseState = null;
        this.ui.hideItemUsageMode();

        this.itemManager.handleItemEffect(player, itemType);
    }

    // --- 结算与通用 ---
    calculateRoundScore(player) {
        let sum = 0; let mult = 1;
        player.cards.forEach(val => {
            if (typeof val === 'number') sum += val;
            else if (typeof val === 'string') {
                if (val.startsWith('score_')) sum += parseInt(val.split('_')[1]);
                else if (val === 'mult_2') mult *= 2;
            }
        });
        player.roundScore = sum * mult;
        this.ui.updateMidScore(player.roundScore);
    }

    checkRoundOver() {
        return !this.players.find(p => p.state === 'playing' || p.state === 'waiting');
    }

    handleRoundOver() {
        if (this.isRoundSettling) return;
        this.isRoundSettling = true;
        this.musouMode = false;
        this.players.forEach(p => {
            if (p.state === 'done' || p.state === 'frozen') p.totalScore += p.roundScore;
        });
        this.ui.refreshTopPanel(this.players);
        this.time.delayedCall(500, () => {
            this.modal.showRoundResult(this.roundCount, this.players, () => {
                this.isRoundSettling = false;
                this.shopManager.startShopPhase();
            });
        });
    }

    startNextRound() {
        this.roundCount++;
        const winner = this.players.find(p => p.totalScore >= 200);
        if (winner) { this.modal.showGameResult(this.players, () => this.scene.restart()); return; }

        this.players.forEach(p => {
            p.state = 'waiting'; p.roundScore = 0; p.cards = [];
            p.leachActive = false; p.yieldActive = false; p.modestyActive = false;
            p.taxFreeActive = false; p.orbitActive = false; p.orbitSteps = 0;
            // 重置道具阶段标记
            p.hasSkippedItemPhase = false;
        });

        this.roundStartIndex = (this.roundStartIndex + 1) % this.players.length;
        this.currentPlayerIndex = this.roundStartIndex;

        this.ui.resetMidInfo();
        this.ui.refreshTopPanel(this.players);
        this.ui.updateBtmPanel(this.players[0]);

        this.ui.animateActiveMarker(this.currentPlayerIndex, () => this.startTurn());
    }

    onGiveUp() {
        this.players[this.currentPlayerIndex].state = 'done';
        this.ui.refreshTopPanel(this.players);
        this.nextTurn();
    }

    getCardName(val) {
        if (val.startsWith('score_')) return `+${val.split('_')[1]}分`;
        if (val === 'mult_2') return '分数翻倍';
        const map = { 'freeze':'冻结', 'second_chance':'第二次机会', 'flip_3':'翻3张', 'flash':'快闪', 'dare':'试胆竞速', 'feast':'无双' };
        return map[val] || val;
    }
}