import GameUI from './ui.js';
import Toast from './Toast.js';
import Modal from './Modal.js';
import { ITEM_DATA } from './ItemConfig.js';
import CardManager from './managers/CardManager.js';
import ShopManager from './managers/ShopManager.js';
import ItemManager from './managers/ItemManager.js';
import BetManager from './managers/BetManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    create() {
        this.ui = new GameUI(this);
        this.toast = new Toast(this);
        this.modal = new Modal(this);

        this.cardManager = new CardManager(this);
        this.shopManager = new ShopManager(this);
        this.itemManager = new ItemManager(this);
        this.betManager = new BetManager(this);

        this.ui.init();

        // 🟢 1. 绑定 HTML 菜单逻辑 (替换原有的 Canvas 菜单逻辑)
        this.setupHtmlMenu();

        // 2. 启动心跳计时器 (统计总时间用，pause() 会自动暂停它)
        this.heartbeatTimer = this.time.addEvent({
            delay: 1000,
            callback: this.onHeartbeat,
            callbackScope: this,
            loop: true
        });

        this.onAdjustBet = (type, delta) => {
            const p = this.players[0];
            const success = this.betManager.adjustBet(p, type, delta);
            if (success) {
                this.ui.updateBettingPanel(this.betManager.getPlayerBets(p.id));
                this.ui.refreshTopPanel(this.players);
            }
        };

        this.ui.setButtonHandlers(
            () => {
                if (this.isDuelMode) this.cardManager.onDuelDraw();
                else this.cardManager.handleDrawClick();
            },
            () => {
                if (this.isDuelMode) this.cardManager.onDuelGiveUp();
                else this.onGiveUp();
            },
            () => { this.onUseItem(); },
            () => { this.onSkipItemPhase(); }
        );

        this.ui.setBetButtonHandler(() => {
            this.endGlobalBettingPhase();
        });

        this.ui.hand.setOnItemClick((itemType, index, x, y) => {
            this.onItemClick(itemType, index, x, y);
        });

        this.input.on('pointerdown', (pointer) => {
            this.handleInputOnGrid(pointer.x, pointer.y);
        });

        this.aiCount = this.registry.get('aiCount') || 3;
        const isContinue = this.registry.get('isContinue');

        if (isContinue && localStorage.getItem('ddb_save')) {
            this.loadGame();
        } else {
            this.initGame(this.aiCount);
        }
    }

    /**
     * 🟢 核心新增：配置 HTML DOM 菜单
     * 解决层级遮挡、暂停卡死和右下角定位问题
     */
    setupHtmlMenu() {
        const menuBtn = document.getElementById('html-menu-btn');
        const overlay = document.getElementById('html-menu-overlay');
        const btnResume = document.getElementById('btn-resume');
        const btnRestart = document.getElementById('btn-restart');
        const btnSurrender = document.getElementById('btn-surrender');
        const btnHome = document.getElementById('btn-home');

        // 进入游戏场景后显示右下角按钮
        if (menuBtn) menuBtn.classList.remove('hidden');

        // 点击 ☰ 按钮
        menuBtn.onclick = () => {
            // 🔥 使用 Phaser 原生场景暂停，冻结一切动画和定时器
            this.scene.pause();
            overlay.classList.remove('hidden');
            menuBtn.classList.add('hidden');
        };

        // 1. 回到游戏
        btnResume.onclick = () => {
            overlay.classList.add('hidden');
            menuBtn.classList.remove('hidden');
            // 🔥 完美恢复：所有逻辑从暂停点继续
            this.scene.resume();
        };

        // 2. 重新开始
        btnRestart.onclick = () => {
            localStorage.removeItem('ddb_save');
            // 重启前必须 resume，否则重启逻辑可能无法初始化
            this.scene.resume();
            this.scene.restart({ aiCount: this.aiCount });
            overlay.classList.add('hidden');
        };

        // 3. 放弃本局 (回到首页且无回到游戏按钮)
        btnSurrender.onclick = () => {
            localStorage.removeItem('ddb_save');
            window.location.reload();
        };

        // 4. 回到首页 (保留存档)
        btnHome.onclick = () => {
            window.location.reload();
        };
    }

    onHeartbeat() {
        let stats = { gamesCompleted: 0, wins: 0, totalSeconds: 0 };
        try {
            const data = localStorage.getItem('ddb_global_stats');
            if (data) stats = JSON.parse(data);
        } catch (e) {}
        stats.totalSeconds++;
        localStorage.setItem('ddb_global_stats', JSON.stringify(stats));
    }

    updateGameOverStats(isWin, totalPlayers) {
        let stats = { gamesCompleted: 0, wins: 0, totalSeconds: 0 };
        try {
            const data = localStorage.getItem('ddb_global_stats');
            if (data) stats = JSON.parse(data);
        } catch (e) {}

        stats.gamesCompleted++;
        if (isWin) {
            stats.wins++;
            if (totalPlayers) {
                const key = `wins_${totalPlayers}p`;
                stats[key] = (stats[key] || 0) + 1;
            }
        }
        localStorage.setItem('ddb_global_stats', JSON.stringify(stats));
    }

    forceClearOverlays() {
        if (this.toast) this.toast.hide();
        // 只有在场景未被手动 pause 时才尝试销毁 Modal
        if (this.modal && this.modal.overlay) {
            this.modal.destroy();
        }
    }

    saveGame() {
        const saveData = {
            roundCount: this.roundCount,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                isAI: p.isAI,
                totalScore: p.totalScore,
                items: p.items,
                upgradeBuyCount: p.upgradeBuyCount,
                position: p.position
            })),
            gridData: this.itemManager.gridData,
            mainDeckCache: this.cardManager.mainDeckCache,
            specialDeckCache: this.cardManager.specialDeckCache,
            aiCount: this.aiCount
        };
        localStorage.setItem('ddb_save', JSON.stringify(saveData));
    }

    loadGame() {
        try {
            const data = JSON.parse(localStorage.getItem('ddb_save'));
            this.roundCount = data.roundCount;
            this.aiCount = data.aiCount || 3;

            this.players = this.createPlayers(this.aiCount);

            data.players.forEach((savedP, i) => {
                if (i < this.players.length) {
                    const currentP = this.players[i];
                    currentP.totalScore = savedP.totalScore;
                    currentP.items = savedP.items || [];
                    currentP.upgradeBuyCount = savedP.upgradeBuyCount || 0;
                    currentP.position = savedP.position || 1;
                    currentP.roundScore = 0;
                    currentP.cards = [];
                    currentP.state = (i === 0) ? 'playing' : 'waiting';
                }
            });

            this.cardManager.mainDeckCache = data.mainDeckCache || [];
            this.cardManager.specialDeckCache = data.specialDeckCache || [];
            if (data.gridData) {
                this.itemManager.gridData = data.gridData;
                this.itemManager.gridData.forEach(g => {
                    this.ui.grid.updateGridStatus(g.id, g.owner, g.level, false);
                });
            } else {
                this.itemManager.initGrid();
            }

            this.specialGrids = [10, 22];
            this.musouMode = false;
            this.isDuelMode = false;
            this.isRoundSettling = false;
            this.isWaitingForModal = false;

            this.roundStartIndex = Phaser.Math.Between(0, this.players.length - 1);
            this.currentPlayerIndex = this.roundStartIndex;

            this.ui.refreshTopPanel(this.players);
            this.ui.updateBtmPanel(this.players[0]);
            this.players.forEach((p, i) => {
                this.ui.drawPlayerAt(p.position, i, p.name);
            });
            this.ui.resetMidInfo();
            this.ui.updateDeckCount(this.cardManager.mainDeckCache.length);

            if (!this.betManager.currentOdds || Object.keys(this.betManager.currentOdds).length === 0) {
                this.betManager.generateRoundOdds();
            }

            this.startGlobalBettingPhase();
            this.toast.show("已恢复游戏进度", 2000);

        } catch (e) {
            console.error("Load failed", e);
            this.toast.show("存档损坏，重新开始", 2000);
            this.initGame(this.aiCount);
        }
    }

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
        this.isRoundSettling = false;
        this.isWaitingForModal = false;

        this.ui.refreshTopPanel(this.players);
        this.ui.updateBtmPanel(this.players[0]);
        this.players.forEach((p, i) => { p.position = 1; this.ui.drawPlayerAt(1, i, p.name); });
        this.ui.resetMidInfo();
        this.ui.updateDeckCount(this.cardManager.mainDeckCache.length);

        this.ui.animateActiveMarker(this.currentPlayerIndex, () => {
            this.startTurn();
        });
        this.saveGame();
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
        this.saveGame();

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

        this.bettingPhaseState = { timeLeft: 30, timerEvent: null };
        const currentBets = this.betManager.getPlayerBets(human.id);
        this.ui.showBettingMode(currentBets, this.bettingPhaseState.timeLeft);
        this.toast.show("下注阶段开始！(30秒)", 1500);

        this.bettingPhaseState.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.bettingPhaseState) return;
                this.bettingPhaseState.timeLeft--;
                this.ui.updateTimer(this.bettingPhaseState.timeLeft);
                if (this.bettingPhaseState.timeLeft <= 0) this.endGlobalBettingPhase();
            },
            repeat: 29
        });
    }

    endGlobalBettingPhase() {
        if (this.bettingPhaseState && this.bettingPhaseState.timerEvent) this.bettingPhaseState.timerEvent.remove();
        this.bettingPhaseState = null;
        this.ui.hideBettingMode();
        this.toast.show("下注结束，回合开始！", 1500);
        this.ui.animateActiveMarker(this.currentPlayerIndex, () => this.startTurn());
    }

    startTurn() {
        this.forceClearOverlays();
        this.isWaitingForModal = false;
        if (this.isRoundSettling) return;
        if (this.checkRoundOver()) { this.handleRoundOver(); return; }

        const player = this.players[this.currentPlayerIndex];
        if (['bust', 'done', 'frozen'].includes(player.state)) {
            this.nextTurn();
            return;
        }

        if (player.state === 'waiting') player.state = 'playing';
        this.ui.updateCurrentPlayerName(player.name);
        this.ui.updateMidScore(player.roundScore);
        this.ui.refreshTopPanel(this.players);

        if (this.players.every(p => p.position !== 0)) this.ui.hideStartGrid();

        const canUseItem = (this.roundCount > 1) && (player.items.length > 0) && (!player.hasSkippedItemPhase);
        if (canUseItem) this.startItemPhase(player);
        else this.readyForAction(player);
    }

    readyForAction(player) {
        if (this.isWaitingForModal) return;
        const numberCardsCount = player.cards.filter(c => typeof c === 'number').length;
        if (numberCardsCount >= 7) {
            this.toast.show(`${player.name} 已集齐7张数字牌，行动结束！`, 2000);
            this.ui.showActionButtons(false);
            this.time.delayedCall(2000, () => this.onGiveUp());
            return;
        }

        if (!player.isAI) {
            this.ui.showActionButtons(true);
        } else {
            this.ui.showActionButtons(false);
            this.aiTimer = this.time.delayedCall(1000, () => {
                if (this.isWaitingForModal) return;
                if (player.roundScore >= 15) this.onGiveUp();
                else this.cardManager.handleDrawClick();
            });
        }
    }

    movePlayer(player, steps, isBonus) {
        const path = [];
        let tempPos = player.position;
        const startGridId = player.position;
        for (let i = 0; i < steps; i++) {
            tempPos++;
            if (tempPos > 24) tempPos = 1;
            path.push(tempPos);
        }
        player.position = tempPos;
        this.ui.showActionButtons(false);
        this.ui.updateGridTokens(startGridId);

        this.ui.animatePlayerMove(player.id, path, () => {
            this.ui.updateGridTokens(player.position);
            this.itemManager.handleLandEffect(player);
            const fruitType = this.getFruitTypeByGridId(player.position);
            if (fruitType) {
                this.betManager.resolveLanding(player, fruitType);
                this.ui.refreshTopPanel(this.players);
            }
            if (this.specialGrids.includes(player.position)) this.handleSpecialGridBonus(player, isBonus);
            else this.finishAction(player, isBonus);
        });
    }

    finishAction(player, isBonus) {
        this.calculateRoundScore(player);
        this.ui.refreshTopPanel(this.players);

        if (this.forceDrawState && this.forceDrawState.count > 0) {
            if (['bust', 'done', 'frozen'].includes(player.state)) {
                this.forceDrawState = null;
                this.time.delayedCall(1500, () => {
                    if (this.isDuelMode) this.cardManager.updateDuelUI();
                    else this.nextTurn();
                });
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

        if (isBonus) this.readyForAction(player);
        else this.time.delayedCall(500, () => this.nextTurn());
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
        this.ui.updateDeckCount(this.cardManager.mainDeckCache.length);
        this.ui.playDrawAnimation(() => {
            this.ui.updateMidCard(card);
            let shouldMove = (!this.isDuelMode && player.id === this.players[this.currentPlayerIndex].id);
            this.cardManager.handleCardEffect(player, card, true, shouldMove);
        });
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
        this.time.delayedCall(2500, () => this.cardManager.handleCardEffect(player, bonusCard, isBonus, true));
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.ui.animateActiveMarker(this.currentPlayerIndex, () => this.startTurn());
    }

    startItemPhase(player) {
        if (player.items.length === 0) { this.readyForAction(player); return; }
        this.itemPhaseState = { timeLeft: 20, selectedItemIndex: -1, timerEvent: null };
        this.ui.showItemUsageMode(this.itemPhaseState.timeLeft, player);
        this.ui.showActionButtons(false);

        this.itemPhaseState.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.itemPhaseState) return;
                this.itemPhaseState.timeLeft--;
                this.ui.updateTimer(this.itemPhaseState.timeLeft);
                if (this.itemPhaseState.timeLeft <= 0) this.onSkipItemPhase();
            },
            repeat: 19
        });

        if (player.isAI) {
            this.aiTimer = this.time.delayedCall(1500, () => this.onSkipItemPhase());
        }
    }

    onSkipItemPhase() {
        const player = this.players[this.currentPlayerIndex];
        player.hasSkippedItemPhase = true;
        this.endItemPhase(player);
    }

    endItemPhase(player) {
        if (this.itemPhaseState && this.itemPhaseState.timerEvent) this.itemPhaseState.timerEvent.remove();
        this.itemPhaseState = null;
        this.ui.hideItemUsageMode();
        this.readyForAction(player);
    }

    onItemClick(itemType, index, x, y) {
        if (!this.itemPhaseState || this.players[this.currentPlayerIndex].isAI) return;
        if (this.players[this.currentPlayerIndex].id !== 0) return;

        if (itemType === null) {
            this.itemPhaseState.selectedItemIndex = -1;
            this.ui.hideItemDescription();
        } else {
            this.itemPhaseState.selectedItemIndex = index;
            const data = ITEM_DATA[itemType];
            this.ui.showItemDescription(data, x, y);
        }
    }

    onUseItem() {
        if (!this.itemPhaseState || this.itemPhaseState.selectedItemIndex === -1) return;
        const player = this.players[this.currentPlayerIndex];
        const index = this.itemPhaseState.selectedItemIndex;
        const itemType = player.items[index];
        const success = this.itemManager.handleItemEffect(player, itemType);

        if (success) {
            player.items.splice(index, 1);
            player.hasSkippedItemPhase = true;
            this.ui.updateBtmPanel(player);
            this.ui.hideItemDescription();
            if (this.itemPhaseState.timerEvent) this.itemPhaseState.timerEvent.remove();
            this.itemPhaseState = null;
            this.ui.hideItemUsageMode();
            this.time.delayedCall(1500, () => this.readyForAction(player));
        }
    }

    calculateRoundScore(player) {
        if (player.state === 'bust') {
            player.roundScore = 0;
            this.ui.updateMidScore(0);
            return;
        }
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

    checkRoundOver() { return !this.players.find(p => p.state === 'playing' || p.state === 'waiting'); }

    handleRoundOver() {
        if (this.isRoundSettling) return;
        this.isRoundSettling = true;
        this.musouMode = false;
        this.ui.showActionButtons(false);

        this.players.forEach(p => { if (p.state === 'done' || p.state === 'frozen') p.totalScore += p.roundScore; });
        this.ui.refreshTopPanel(this.players);
        this.saveGame();

        const hasWinner = this.players.some(p => p.totalScore >= 200);
        this.time.delayedCall(500, () => {
            this.modal.showRoundResult(this.roundCount, this.players, () => {
                this.isRoundSettling = false;
                if (hasWinner) this.handleGameEnd();
                else this.shopManager.startShopPhase();
            });
        });
    }

    handleGameEnd() {
        localStorage.removeItem('ddb_save');
        const sortedPlayers = [...this.players].sort((a, b) => b.totalScore - a.totalScore);
        const isHumanWin = (sortedPlayers[0].id === 0);
        this.updateGameOverStats(isHumanWin, this.players.length);
        this.modal.showGameResult(sortedPlayers,
            () => this.scene.restart({ aiCount: this.aiCount }),
            () => window.location.reload()
        );
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

    getFruitTypeByGridId(gridId) {
        const GRID_Keys = [null, 'orange', 'apple', 'moon', 'moon', 'watermelon', 'papaya', 'bell', 'star', 'apple', 'lucky', 'orange', 'papaya', 'apple', 'bell', 'sun', 'sun', 'watermelon', 'papaya', 'orange', 'apple', 'star', 'lucky', 'bell', 'watermelon'];
        return GRID_Keys[gridId];
    }
}