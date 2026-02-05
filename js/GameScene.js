// GameScene.js
import GameUI from './ui.js';
import Toast from './Toast.js';
import Modal from './Modal.js';
import CardManager from './managers/CardManager.js';
import ShopManager from './managers/ShopManager.js';
import ItemManager from './managers/ItemManager.js';
import BetManager from './managers/BetManager.js';
import EventManager from './managers/EventManager.js';
import TurnManager from './managers/TurnManager.js';
import DebugManager from './managers/DebugManager.js';
import SaveManager from './managers/SaveManager.js';
import AudioManager from './managers/AudioManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }
    preload() {
        // 1. 加载数字牌和王牌 (0-14)
        // 0=黑王, 1-13=数字, 14=红王
        for (let i = 0; i <= 14; i++) {
            this.load.image(`card_${i}`, `assets/cards/card_${i}.png`);
        }

        // 🟢 2. [新增] 加载特殊功能卡背景
        const specialCards = ['freeze', 'second_chance', 'flip_3', 'flash', 'dare', 'feast'];
        specialCards.forEach(key => {
            this.load.image(`card_${key}`, `assets/cards/card_${key}.png`);
        });

        // 🟢 2. 加载 BGM 资源
        this.load.audio('bgm_home', 'assets/audio/bgm_home.mp3');
        this.load.audio('bgm_game', 'assets/audio/bgm_game.mp3');
        this.load.audio('bgm_duel', 'assets/audio/bgm_duel.mp3');
    }

    create() {
        // 1. 初始化所有管理器
        this.ui = new GameUI(this);
        this.toast = new Toast(this);
        this.modal = new Modal(this);

        this.cardManager = new CardManager(this);
        this.shopManager = new ShopManager(this);
        this.itemManager = new ItemManager(this);
        this.betManager = new BetManager(this);
        this.eventManager = new EventManager(this);
        this.turnManager = new TurnManager(this);
        this.debugManager = new DebugManager(this);
        this.saveManager = new SaveManager(this);

        // 🟢 [新增] 初始化音频管理器
        this.audioManager = new AudioManager(this);

        // 2. UI 初始化
        this.ui.init();

        // 🟢 [新增] 刚进入场景先播放主页音乐 (作为默认背景)
        this.audioManager.playBgm('bgm_home');

        this.debugManager.setupHtmlMenu();

        this.heartbeatTimer = this.time.addEvent({
            delay: 1000,
            callback: () => this.saveManager.onHeartbeat(),
            loop: true
        });

        this.bindEvents();

        // 3. 游戏启动逻辑 (读档 vs 新游戏)
        this.aiCount = this.registry.get('aiCount') || 3;
        const isContinue = this.registry.get('isContinue');

        if (isContinue && localStorage.getItem('ddb_save')) {
            // --- 读档模式 ---
            const success = this.saveManager.loadGame();

            if (success) {
                // 🟢 [关键] 读档成功，说明进入了游戏状态，切换到游戏BGM
                this.audioManager.playBgm('bgm_game');
            } else {
                // 如果读档失败（比如存档损坏），回退到新游戏
                console.warn("读档失败，自动开始新游戏");
                this.initGame(this.aiCount);
            }
        } else {
            // --- 新游戏模式 ---
            this.initGame(this.aiCount);
            // 注意：请确保你的 initGame() 方法里也加了 this.audioManager.playBgm('bgm_game');
            // 如果 initGame 里没加，AudioManager 这里的 playBgm 有自动去重判断，
            // 所以你也可以在这里多写一句 this.audioManager.playBgm('bgm_game'); 以防万一
        }
    }

    update(time, delta) {
        this.debugManager.update();
    }

    bindEvents() {
        this.onAdjustBet = (type, delta) => {
            const p = this.players[0];
            if (this.betManager.adjustBet(p, type, delta)) {
                this.ui.updateBettingPanel(this.betManager.getPlayerBets(p.id));
                this.ui.refreshTopPanel(this.players);
            }
        };

        this.ui.setButtonHandlers(
            () => {
                this.ui.clearSpecialEffects();
                if (this.isDuelMode) this.cardManager.onDuelDraw();
                else this.cardManager.handleDrawClick();
            },
            () => {
                this.ui.clearSpecialEffects();
                if (this.isDuelMode) this.cardManager.onDuelGiveUp();
                else this.onGiveUp();
            },
            () => this.onUseItem(),
            () => this.onSkipItemPhase()
        );

        this.ui.setBetButtonHandler(() => this.endGlobalBettingPhase());

        this.ui.hand.setOnItemClick((itemType, index, x, y) => {
            this.turnManager.onItemClick(itemType, index, x, y);
        });

        this.input.on('pointerdown', (pointer) => {
            this.handleInputOnGrid(pointer.x, pointer.y);
        });
    }

    initGame(aiCount) {
        this.players = this.createPlayers(aiCount);
        this.cardManager.initializeDecks();
        this.itemManager.initGrid();
        this.betManager.generateRoundOdds();

        this.roundStartIndex = Phaser.Math.Between(0, this.players.length - 1);
        this.currentPlayerIndex = this.roundStartIndex;
        this.roundCount = 1;
        this.specialGrids = [10, 22];
        this.musouMode = false;
        this.isDuelMode = false;
        this.isWaitingForModal = false;
        this.turnManager.isRoundSettling = false;

        this.ui.refreshTopPanel(this.players);
        this.ui.updateBtmPanel(this.players[0]);
        this.players.forEach((p, i) => { p.position = 1; this.ui.drawPlayerAt(1, i, p.name); });
        this.ui.resetMidInfo();
        this.ui.updateDeckCount(this.cardManager.mainDeckCache.length);

        this.audioManager.playBgm('bgm_game');

        this.ui.animateActiveMarker(this.currentPlayerIndex, () => {
            this.turnManager.startTurn();
        });
        this.saveManager.saveGame();
    }

    createPlayers(aiCount) {
        const p = [{
            id:0, name:"我 (P1)", isAI:false,
            totalScore:0, roundScore:0, position: 1,
            cards:[], items:[], state:'playing',
            upgradeBuyCount: 0, hasProtection: false,
            prophecyGuess: null, taxFreeActive: false
        }];
        for(let i=0; i<aiCount; i++) p.push({
            id:i+1, name:`电脑${String.fromCharCode(65+i)}`, isAI:true,
            totalScore:0, roundScore:0, position: 1,
            cards:[], items:[], state:'waiting',
            upgradeBuyCount: 0, hasProtection: false,
            prophecyGuess: null, taxFreeActive: false
        });
        return p;
    }

    startNextRound() {
        this.roundCount++;
        this.saveManager.saveGame();

        this.players.forEach(p => {
            p.state = 'waiting'; p.roundScore = 0; p.cards = [];
            p.taxFreeActive = false; p.hasProtection = false; p.prophecyGuess = null; p.hasSkippedItemPhase = false;
        });

        this.betManager.generateRoundOdds();
        this.roundStartIndex = (this.roundStartIndex + 1) % this.players.length;
        this.currentPlayerIndex = this.roundStartIndex;

        this.ui.resetMidInfo();
        this.ui.refreshTopPanel(this.players);
        this.ui.updateBtmPanel(this.players[0]);
        this.startGlobalBettingPhase();
    }

    startGlobalBettingPhase() {
        this.players.forEach(p => { if (p.isAI) this.betManager.performAIBetting(p); });
        this.ui.refreshTopPanel(this.players);

        const human = this.players[0];
        if (human.totalScore <= 0) {
            this.toast.show("积分不足，跳过下注");
            this.time.delayedCall(1500, () => this.endGlobalBettingPhase());
            return;
        }

        this.turnManager.bettingPhaseState = { timeLeft: 30, timerEvent: null };
        const currentBets = this.betManager.getPlayerBets(human.id);
        this.ui.showBettingMode(currentBets, this.turnManager.bettingPhaseState.timeLeft);
        this.toast.show("下注阶段开始！(30秒)", 1500);

        this.turnManager.bettingPhaseState.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.turnManager.bettingPhaseState) return;
                this.turnManager.bettingPhaseState.timeLeft--;
                this.ui.updateTimer(this.turnManager.bettingPhaseState.timeLeft);
                if (this.turnManager.bettingPhaseState.timeLeft <= 0) this.endGlobalBettingPhase();
            },
            repeat: 29
        });
    }

    endGlobalBettingPhase() {
        if (this.turnManager.bettingPhaseState && this.turnManager.bettingPhaseState.timerEvent) {
            this.turnManager.bettingPhaseState.timerEvent.remove();
        }
        this.turnManager.bettingPhaseState = null;
        this.ui.hideBettingMode();
        this.toast.show("下注结束，回合开始！", 1500);
        this.ui.animateActiveMarker(this.currentPlayerIndex, () => this.turnManager.startTurn());
    }

    // 这些方法是简单的代理，因为UI或Manager可能会回调它们
    // 可以考虑进一步重构让Manager直接调用彼此，或使用事件系统
    // 代理方法
    onGiveUp() { this.turnManager.onGiveUp ? this.turnManager.onGiveUp() : this.defaultOnGiveUp(); }

    defaultOnGiveUp() {
        this.players[this.currentPlayerIndex].state = 'done';
        this.ui.refreshTopPanel(this.players);
        this.turnManager.nextTurn();
    }

    onUseItem() { this.turnManager.onUseItem ? this.turnManager.onUseItem() : this.defaultOnUseItem(); }
    defaultOnUseItem() {
        if (!this.turnManager.itemPhaseState || this.turnManager.itemPhaseState.selectedItemIndex === -1) return;
        const player = this.players[this.currentPlayerIndex];
        const index = this.turnManager.itemPhaseState.selectedItemIndex;
        const itemType = player.items[index];
        const success = this.itemManager.handleItemEffect(player, itemType);

        if (success) {
            player.items.splice(index, 1);
            player.hasSkippedItemPhase = true;
            this.ui.updateBtmPanel(player);
            this.ui.hideItemDescription();
            if (this.turnManager.itemPhaseState.timerEvent) this.turnManager.itemPhaseState.timerEvent.remove();
            this.turnManager.itemPhaseState = null;
            this.ui.hideItemUsageMode();
            this.time.delayedCall(1500, () => this.turnManager.readyForAction(player));
        }
    }

    onSkipItemPhase() { this.turnManager.onSkipItemPhase(); }

    handleInputOnGrid(x, y) {
        if (!this.itemManager.selectionMode) return;
        const coords = this.ui.grid.getCoordinates();
        const size = this.ui.layout.gridSize;
        for (let id in coords) {
            const pos = coords[id];
            if (x >= pos.x && x <= pos.x + size && y >= pos.y && y <= pos.y + size) {
                this.itemManager.onGridClick(parseInt(id));
                break;
            }
        }
    }

    // --- 🟢 补回缺失的辅助方法 ---

    forceClearOverlays() {
        if (this.toast) this.toast.hide();
        // 只有在场景未被手动 pause 时才尝试销毁 Modal
        if (this.modal && this.modal.overlay) {
            this.modal.destroy();
        }
    }

    getCardName(val) {
        // 如果 CardManager 有这个方法就用它的，否则使用默认映射
        if (this.cardManager.getCardName) return this.cardManager.getCardName(val);

        // 默认映射逻辑
        if (typeof val === 'string') {
            if (val.startsWith('score_')) return `+${val.split('_')[1]}分`;
            if (val === 'mult_2') return '分数翻倍';
            const map = { 'freeze':'冻结', 'second_chance':'第二次机会', 'flip_3':'翻3张', 'flash':'快闪', 'dare':'试胆竞速', 'feast':'无双' };
            return map[val] || val;
        }
        return val;
    }

    // 代理方法，方便其他Manager调用
    movePlayer(player, steps, isBonus) { this.turnManager.movePlayer(player, steps, isBonus); }
    finishAction(player, isBonus) { this.turnManager.finishAction(player, isBonus); }
    startForceDraw(player, count, onComplete) { this.turnManager.startForceDraw(player, count, onComplete); }
    calculateRoundScore(player) { this.turnManager.calculateRoundScore(player); }
    handleGameEnd() { this.saveManager.updateGameOverStats(...arguments); this.modal.showGameResult(...arguments); } // 简化代理
    getCardName(val) { return this.cardManager.getCardName ? this.cardManager.getCardName(val) : val; } // 假设cardManager有这个方法，或者保留在Scene里
    getFruitTypeByGridId(gridId) {
        const GRID_Keys = [null, 'orange', 'apple', 'moon', 'moon', 'watermelon', 'papaya', 'bell', 'star', 'apple', 'lucky', 'orange', 'papaya', 'apple', 'bell', 'sun', 'sun', 'watermelon', 'papaya', 'orange', 'apple', 'star', 'lucky', 'bell', 'watermelon'];
        return GRID_Keys[gridId];
    }

    // --- 🟢 补全 TurnManager 的代理方法 (修复 CardManager 报错) ---

    readyForAction(player) {
        this.turnManager.readyForAction(player);
    }

    nextTurn() {
        this.turnManager.nextTurn();
    }
}