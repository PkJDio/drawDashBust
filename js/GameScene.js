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
        super({ key: 'GameScene' });
    }

    preload() {
        // 智能跳过资源加载 (防止回首页时闪烁进度条)
        if (this.textures.exists('card_0')) {
            return;
        }

        this.load.on('progress', (value) => {
            const percent = Math.floor(value * 100);
            const progressBar = document.getElementById('progress-fill');
            const progressText = document.getElementById('loading-text');
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) progressText.innerText = `Loading... ${percent}%`;
        });

        this.load.on('fileprogress', (file) => {
            const detailText = document.getElementById('loading-detail');
            if (detailText) detailText.innerText = `正在加载: ${file.key}`;
        });

        // 加载资源清单
        this.load.image('bg_table', 'assets/images/bg_table.png');
        for (let i = 0; i <= 14; i++) {
            this.load.image(`card_${i}`, `assets/cards/card_${i}.png`);
        }
        const specialCards = ['freeze', 'second_chance', 'flip_3', 'flash', 'dare', 'feast'];
        specialCards.forEach(key => {
            this.load.image(`card_${key}`, `assets/cards/card_${key}.png`);
        });

        this.load.audio('bgm_home', 'assets/audio/bgm_home.mp3');
        this.load.audio('bgm_game', 'assets/audio/bgm_game.mp3');
        this.load.audio('bgm_duel', 'assets/audio/bgm_duel.mp3');
        this.load.audio('sfx_move', 'assets/audio/sfx_move.mp3');
        this.load.audio('sfx_draw', 'assets/audio/sfx_draw.mp3');
        this.load.audio('sfx_select', 'assets/audio/sfx_select.mp3');
        this.load.audio('sfx_score', 'assets/audio/sfx_score.mp3');
        this.load.audio('sfx_bust', 'assets/audio/sfx_bust.mp3');
        this.load.audio('sfx_freeze', 'assets/audio/sfx_freeze.mp3');
        this.load.audio('sfx_win', 'assets/audio/sfx_win.mp3');
        this.load.audio('sfx_marquee', 'assets/audio/sfx_marquee.mp3');
    }

    create(data) {
        // 1. 暴力清除旧 DOM (防止按钮重叠/卡死)
        this.cleanupOldDOM();

        // 2. 隐藏 Loading
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';

        // 3. 初始化管理器
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
        this.audioManager = new AudioManager(this);

        this.ui.init();
        this.debugManager.setupHtmlMenu();
        this.bindEvents();

        if (this.heartbeatTimer) this.heartbeatTimer.remove();
        this.heartbeatTimer = this.time.addEvent({
            delay: 1000,
            callback: () => this.saveManager.onHeartbeat(),
            loop: true
        });

        // 🟢 逻辑分支判断
        if (data && data.isRestart) {
            // --- 分支 A: 快速重启 (游戏内重开) ---
            console.log(`[GameScene] 快速重启`);

            // 隐藏 HTML 页面
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('setup-screen').classList.add('hidden');

            const menuBtn = document.getElementById('html-menu-btn');
            if (menuBtn) menuBtn.classList.remove('hidden');

            this.startGame(data.aiCount || 3, false);

        } else {
            // --- 分支 B: 首页模式 (冷启动 / 放弃本局 / 回到首页) ---
            console.log("进入首页模式...");

            // 1. 显示 Start Screen
            const startScreen = document.getElementById('start-screen');
            if (startScreen) startScreen.classList.remove('hidden');
            document.getElementById('setup-screen').classList.add('hidden');

            // 2. 隐藏游戏内菜单
            const menuBtn = document.getElementById('html-menu-btn');
            if (menuBtn) menuBtn.classList.add('hidden');

            // 3. 播放主页音乐
            this.audioManager.playBgm('bgm_home');

            // 4. 🟢 [核心] 动态管理“回到游戏”按钮
            // 因为没刷新网页，我们需要手动检查存档并添加/删除按钮
            this.updateContinueButton();

            // 5. iOS 音频解锁
            const unlockAudio = () => {
                if (this.sound.context.state === 'suspended') this.sound.context.resume();
                this.input.off('pointerdown', unlockAudio);
            };
            this.input.on('pointerdown', unlockAudio);
        }
    }

    /**
     * 🟢 [新增] 动态更新首页的“回到游戏”按钮
     */
    updateContinueButton() {
        const hasSave = localStorage.getItem('ddb_save');
        let btnContinue = document.getElementById('btn-continue');
        const menuButtonsDiv = document.querySelector('.menu-buttons');
        const btnStart = document.getElementById('btn-start');

        if (hasSave) {
            // 如果有存档，但按钮不存在，就创建一个
            if (!btnContinue && menuButtonsDiv) {
                btnContinue = document.createElement('button');
                btnContinue.innerText = "回到游戏";
                btnContinue.className = "menu-btn";
                btnContinue.style.backgroundColor = "#4caf50";
                btnContinue.style.marginBottom = "15px";
                btnContinue.id = "btn-continue";

                if (btnStart) menuButtonsDiv.insertBefore(btnContinue, btnStart);

                // 绑定点击事件
                btnContinue.onclick = () => {
                    document.getElementById('start-screen').classList.add('hidden');
                    this.startGame(3, true); // 读档开始
                };
            }
        } else {
            // 如果没存档 (比如放弃本局了)，但按钮还赖着不走，就删掉它
            if (btnContinue) {
                btnContinue.remove();
            }
        }
    }

    /**
     * 暴力清除游戏生成的 DOM
     */
    cleanupOldDOM() {
        if (this.ui && this.ui.destroy) this.ui.destroy();

        // 🔥 [增强] 增加更多可能残留的 ID，确保万无一失
        const idsToRemove = [
            'btn-draw', 'btn-giveup', 'btn-bet',
            'btn-use-item', 'btn-skip-item',
            'bet-panel', 'item-desc-panel',
            'btn-continue', // 如果有回到游戏按钮也清理
            'mid-overlay',  // 如果有中间遮罩
            'timer-container' // 假设倒计时的容器 ID
        ];
        idsToRemove.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // 也可以清理所有 class 为 temporary-ui 的元素（如果你有加这个类）
        document.querySelectorAll('.game-dynamic-ui').forEach(el => el.remove());

        this.sound.stopAll();
    }

    /**
     * 安全重启游戏
     */
    restartGame(aiCount) {
        this.cleanupOldDOM();
        this.scene.restart({ isRestart: true, aiCount: aiCount });
    }

    /**
     * 🟢 [修正] 回到首页
     * 清理 DOM -> 重启场景 (不带 isRestart 参数，自然进入首页分支)
     */
    backToHome() {
        this.cleanupOldDOM();
        // 关键：重启场景，参数为空，这样 create 就会走进“分支 B”
        this.scene.restart();
    }

    startGame(aiCount, isContinue) {
        console.log(`[GameScene] StartGame: ai=${aiCount}, continue=${isContinue}`);
        this.audioManager.playBgm('bgm_game');
        if (isContinue) {
            const success = this.saveManager.loadGame();
            if (!success) {
                this.toast.show("存档无效，新开一局");
                this.initGame(aiCount);
            }
        } else {
            this.initGame(aiCount);
        }
    }

    // --- 游戏逻辑核心 (保持不变) ---
    initGame(aiCount) {
        this.aiCount = aiCount;
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

        this.ui.animateActiveMarker(this.currentPlayerIndex, () => {
            this.turnManager.startTurn();
        });
        this.saveManager.saveGame();
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
        console.log("=== 开启下一轮 ===");
        this.roundCount++;

        // 1. 重置所有玩家的状态
        this.players.forEach(p => {
            p.state = 'waiting';
            p.roundScore = 0;
            p.cards = [];
            // 🟢 保留 items, totalScore
            // 重置状态位
            p.taxFreeActive = false;
            p.hasProtection = false;
            p.prophecyGuess = null;
            p.hasSkippedItemPhase = false;
        });

        // 🔥 [关键修复] 暴力清理上一轮残留的 DOM 元素
        // 防止 ID 冲突（比如上一轮的 btn-use-item 还在 DOM 树里，导致新一轮找不到正确的按钮）
        const domIdsToPurge = ['btn-use-item', 'btn-skip-item', 'item-desc-panel', 'timer-display'];
        domIdsToPurge.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // 🟢 2. [核心修复] 重置 TurnManager 的道具状态和定时器
        if (this.turnManager) {
            // 强制移除 TurnManager 可能持有的旧定时器
            if (this.turnManager.timerEvent) {
                this.turnManager.timerEvent.remove();
                this.turnManager.timerEvent = null;
            }
            // 如果 TurnManager 有 itemPhaseTimer (道具阶段定时器)，也移除
            if (this.turnManager.itemPhaseState && this.turnManager.itemPhaseState.timerEvent) {
                this.turnManager.itemPhaseState.timerEvent.remove();
            }

            // 彻底重置变量
            this.turnManager.itemPhaseState = null;
            this.turnManager.bettingPhaseState = null; // 确保下注状态也清空
            this.turnManager.isBusy = false;
            this.turnManager.isRoundSettling = false;
            this.turnManager.timeLeft = 0; // 防止闪烁旧数字
        }

        // 3. 重置 UI
        this.ui.resetMidInfo();
        this.ui.hideItemUsageMode();
        // 强制重置中间区域的提示文字，防止显示 "150" 这种奇怪的东西
        const midInfoText = document.getElementById('mid-info-text');
        if(midInfoText) midInfoText.innerText = "";

        // 4. 更换先手
        this.roundStartIndex = (this.roundStartIndex + 1) % this.players.length;
        this.currentPlayerIndex = this.roundStartIndex;

        // 5. 重新洗牌/生成赔率
        this.betManager.generateRoundOdds();
        this.cardManager.reshuffleDecks();

        // 6. UI 刷新
        this.ui.refreshTopPanel(this.players);
        this.ui.updateBtmPanel(this.players[0]);

        // 7. 进入下注阶段
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

    forceClearOverlays() {
        if (this.toast) this.toast.hide();
        if (this.modal && this.modal.overlay) this.modal.destroy();
    }
    getCardName(val) {
        if (this.cardManager && this.cardManager.getCardName) return this.cardManager.getCardName(val);
        if (typeof val === 'string') {
            if (val.startsWith('score_')) return `+${val.split('_')[1]}分`;
            if (val === 'mult_2') return '分数翻倍';
            const map = { 'freeze':'冻结', 'second_chance':'第二次机会', 'flip_3':'翻3张', 'flash':'快闪', 'dare':'试胆竞速', 'feast':'无双' };
            return map[val] || val;
        }
        return val;
    }
    getFruitTypeByGridId(gridId) {
        const GRID_Keys = [null, 'orange', 'apple', 'moon', 'moon', 'watermelon', 'papaya', 'bell', 'star', 'apple', 'lucky', 'orange', 'papaya', 'apple', 'bell', 'sun', 'sun', 'watermelon', 'papaya', 'orange', 'apple', 'star', 'lucky', 'bell', 'watermelon'];
        return GRID_Keys[gridId];
    }
    movePlayer(player, steps, isBonus) { this.turnManager.movePlayer(player, steps, isBonus); }
    finishAction(player, isBonus) { this.turnManager.finishAction(player, isBonus); }
    startForceDraw(player, count, onComplete) { this.turnManager.startForceDraw(player, count, onComplete); }
    calculateRoundScore(player) { this.turnManager.calculateRoundScore(player); }
    readyForAction(player) { this.turnManager.readyForAction(player); }
    nextTurn() { this.turnManager.nextTurn(); }
}