// managers/TurnManager.js
export default class TurnManager {
    constructor(scene) {
        this.scene = scene;
        this.forceDrawState = null;
        this.isRoundSettling = false;
        this.bettingPhaseState = null;
        this.itemPhaseState = null;
        this.aiTimer = null;
    }

    startTurn() {

        // 🟢 [核心修改] 如果有弹窗正在显示，暂停执行，等待关闭后再重试
        if (this.scene.isToastActive) {
            console.log("[TurnManager] 等待弹窗关闭...");
            this.scene.events.once('toast_closed', () => this.startTurn());
            return;
        }


        this.scene.forceClearOverlays();
        this.scene.isWaitingForModal = false;
        if (this.isRoundSettling) return;
        if (this.checkRoundOver()) { this.handleRoundOver(); return; }

        const player = this.scene.players[this.scene.currentPlayerIndex];
        if (['bust', 'done', 'frozen'].includes(player.state)) {
            this.nextTurn();
            return;
        }

        if (player.state === 'waiting') player.state = 'playing';
        this.scene.ui.updateCurrentPlayerName(player.name);
        this.scene.ui.updateMidScore(player.roundScore);
        this.scene.ui.refreshTopPanel(this.scene.players);

        if (this.scene.players.every(p => p.position !== 0)) this.scene.ui.hideStartGrid();

        const canUseItem = (this.scene.roundCount > 1) && (player.items.length > 0) && (!player.hasSkippedItemPhase);
        if (canUseItem) this.startItemPhase(player);
        else this.readyForAction(player);
    }

    readyForAction(player) {

        // 🟢 [核心修改] 行动前也要检查弹窗（防止连抽等情况下的冲突）
        if (this.scene.isToastActive) {
            console.log("[TurnManager] 动作挂起，等待弹窗关闭...");
            this.scene.events.once('toast_closed', () => this.readyForAction(player));
            return;
        }

        if (this.scene.isWaitingForModal) return;
        const numberCardsCount = player.cards.filter(c => typeof c === 'number').length;
        if (numberCardsCount >= 7) {
            this.scene.toast.show(`${player.name} 已集齐7张数字牌，行动结束！`, 2000);
            this.scene.ui.showActionButtons(false);
            this.scene.time.delayedCall(2000, () => this.scene.onGiveUp());
            return;
        }

        if (!player.isAI) {
            this.scene.ui.showActionButtons(true);
        } else {
            this.scene.ui.showActionButtons(false);
            this.aiTimer = this.scene.time.delayedCall(1000, () => {
                if (this.scene.isWaitingForModal) return;
                if (player.roundScore >= 15) this.scene.onGiveUp();
                else this.scene.cardManager.handleDrawClick();
            });
        }
    }

    movePlayer(player, steps, isBonus) {
        // Debug 逻辑移交给 DebugManager 处理，这里只处理移动
        if (typeof window !== 'undefined' && window.__DEBUG_NEXT_MOVE__) {
            const targetGridId = window.__DEBUG_NEXT_MOVE__;
            let forcedSteps = (targetGridId - player.position + 24) % 24;
            if (forcedSteps === 0 && targetGridId === player.position) forcedSteps = 0;
            console.log(`[DEBUG] 强制移动：从 ${player.position} 到 ${targetGridId}，步数修改为: ${forcedSteps}`);
            steps = forcedSteps;
            window.__DEBUG_NEXT_MOVE__ = null;
        }

        const path = [];
        let tempPos = player.position;
        const startGridId = player.position;

        for (let i = 0; i < steps; i++) {
            tempPos++;
            if (tempPos > 24) tempPos = 1;
            path.push(tempPos);
        }
        player.position = tempPos;
        this.scene.ui.showActionButtons(false);
        this.scene.ui.updateGridTokens(startGridId);

        this.scene.ui.animatePlayerMove(player.id, path, () => {
            this.scene.ui.updateGridTokens(player.position);
            this.scene.itemManager.handleLandEffect(player);
            const fruitType = this.scene.getFruitTypeByGridId(player.position);
            if (fruitType) {
                this.scene.betManager.resolveLanding(player, fruitType);
                this.scene.ui.refreshTopPanel(this.scene.players);
            }
            if (this.scene.specialGrids.includes(player.position)) {
                this.scene.eventManager.handleSpecialGridBonus(player, isBonus);
            } else {
                this.finishAction(player, isBonus);
            }
        });
    }

    finishAction(player, isBonus) {
        this.calculateRoundScore(player);
        this.scene.ui.refreshTopPanel(this.scene.players);

        if (this.forceDrawState && this.forceDrawState.count > 0) {
            if (['bust', 'done', 'frozen'].includes(player.state)) {
                this.forceDrawState = null;
                this.scene.time.delayedCall(1500, () => {
                    if (this.scene.isDuelMode) this.scene.cardManager.updateDuelUI();
                    else this.nextTurn();
                });
                return;
            }
            this.scene.time.delayedCall(1500, () => this.processForceDraw());
            return;
        }
        else if (this.forceDrawState && this.forceDrawState.count <= 0) {
            const callback = this.forceDrawState.callback;
            this.forceDrawState = null;
            if (callback) callback();
            return;
        }

        if (this.scene.isDuelMode) {
            const ds = this.scene.cardManager.duelState;
            ds.current = (ds.current === ds.challenger) ? ds.target : ds.challenger;
            this.scene.time.delayedCall(1000, () => this.scene.cardManager.updateDuelUI());
            return;
        }

        if (isBonus) this.readyForAction(player);
        else this.scene.time.delayedCall(500, () => this.nextTurn());
    }

    nextTurn() {
        this.scene.currentPlayerIndex = (this.scene.currentPlayerIndex + 1) % this.scene.players.length;
        this.scene.ui.animateActiveMarker(this.scene.currentPlayerIndex, () => this.startTurn());
    }

    startForceDraw(player, count, onComplete) {
        this.forceDrawState = { target: player, count: count, callback: onComplete };
        this.scene.ui.showActionButtons(false);
        this.scene.toast.show(`${player.name} 开始连抽 ${count} 张！`, 1500);
        this.scene.time.delayedCall(2000, () => this.processForceDraw());
    }

    processForceDraw() {
        if (!this.forceDrawState || this.forceDrawState.count <= 0) return;
        const player = this.forceDrawState.target;
        this.forceDrawState.count--;
        if (this.scene.cardManager.mainDeckCache.length === 0) this.scene.cardManager.reshuffleDecks();
        const card = this.scene.cardManager.mainDeckCache.pop();
        this.scene.ui.updateDeckCount(this.scene.cardManager.mainDeckCache.length);
        this.scene.ui.playDrawAnimation(() => {
            this.scene.ui.updateMidCard(card);
            let shouldMove = (!this.scene.isDuelMode && player.id === this.scene.players[this.scene.currentPlayerIndex].id);
            this.scene.cardManager.handleCardEffect(player, card, true, shouldMove);
        });
    }

    calculateRoundScore(player) {
        if (player.state === 'bust') {
            player.roundScore = 0;
            this.scene.ui.updateMidScore(0);
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
        this.scene.ui.updateMidScore(player.roundScore);
    }

    checkRoundOver() {
        return !this.scene.players.find(p => p.state === 'playing' || p.state === 'waiting');
    }

    handleRoundOver() {
        if (this.isRoundSettling) return;
        this.isRoundSettling = true;
        this.scene.musouMode = false;
        this.scene.ui.showActionButtons(false);

        this.scene.players.forEach(p => { if (p.state === 'done' || p.state === 'frozen') p.totalScore += p.roundScore; });
        this.scene.ui.refreshTopPanel(this.scene.players);
        this.scene.saveManager.saveGame();

        const hasWinner = this.scene.players.some(p => p.totalScore >= 200);
        this.scene.time.delayedCall(500, () => {
            this.scene.modal.showRoundResult(this.scene.roundCount, this.scene.players, () => {
                this.isRoundSettling = false;
                if (hasWinner) this.scene.handleGameEnd();
                else this.scene.shopManager.startShopPhase();
            });
        });
    }

    startItemPhase(player) {
        if (player.items.length === 0) { this.readyForAction(player); return; }
        this.itemPhaseState = { timeLeft: 20, selectedItemIndex: -1, timerEvent: null };
        this.scene.ui.showItemUsageMode(this.itemPhaseState.timeLeft, player);
        this.scene.ui.showActionButtons(false);

        this.itemPhaseState.timerEvent = this.scene.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.itemPhaseState) return;
                this.itemPhaseState.timeLeft--;
                this.scene.ui.updateTimer(this.itemPhaseState.timeLeft);
                if (this.itemPhaseState.timeLeft <= 0) this.onSkipItemPhase();
            },
            repeat: 19
        });

        if (player.isAI) {
            this.aiTimer = this.scene.time.delayedCall(1500, () => this.onSkipItemPhase());
        }
    }

    onSkipItemPhase() {
        const player = this.scene.players[this.scene.currentPlayerIndex];
        player.hasSkippedItemPhase = true;
        this.endItemPhase(player);
    }

    endItemPhase(player) {
        if (this.itemPhaseState && this.itemPhaseState.timerEvent) this.itemPhaseState.timerEvent.remove();
        this.itemPhaseState = null;
        this.scene.ui.hideItemUsageMode();
        this.readyForAction(player);
    }
}