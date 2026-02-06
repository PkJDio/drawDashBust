// managers/TurnManager.js
import { ITEM_DATA } from '../ItemConfig.js';

export default class TurnManager {
    constructor(scene) {
        this.scene = scene;
        this.forceDrawState = null;
        this.isRoundSettling = false;
        this.bettingPhaseState = null;
        this.itemPhaseState = null;
        this.aiTimer = null;

        // 🟢 [核心新增] 全局忙碌锁
        // true = 正在移动、正在播放动画、AI正在思考
        // false = 等待玩家操作
        this.isBusy = false;
    }

    /**
     * 开始某个人的回合
     */
    startTurn() {
        // 1. 弹窗检查
        if (this.scene.isToastActive) {
            console.log("[TurnManager] 等待弹窗关闭...");
            this.scene.events.once('toast_closed', () => this.startTurn());
            return;
        }

        this.scene.forceClearOverlays();
        this.scene.isWaitingForModal = false;
        if (this.isRoundSettling) return;

        // 2. 检查本轮是否结束
        if (this.checkRoundOver()) {
            this.handleRoundOver();
            return;
        }

        const player = this.scene.players[this.scene.currentPlayerIndex];
        console.log(`[TurnManager] 回合开始: ${player.name}`);

        // 3. UI 更新
        this.scene.ui.updateCurrentPlayerName(player.name);
        this.scene.ui.updateMidScore(player.roundScore);
        this.scene.ui.refreshTopPanel(this.scene.players);
        this.scene.ui.showActionButtons(false); // 先隐藏所有按钮
        if (this.scene.players.every(p => p.position !== 0)) this.scene.ui.hideStartGrid();

        // 4. 状态检查 (爆牌/结束/冻结)
        // 🟢 [核心修复]：一旦检测到需要跳过状态，处理后必须立即 return，阻断后续逻辑执行
        if (['bust', 'done', 'frozen'].includes(player.state)) {
            if (player.state === 'frozen') {
                player.state = 'waiting'; // 解冻
                this.scene.toast.show(`❄️ ${player.name} 被冻结，跳过本回合`, 2000);
            } else {
                // bust 或 done 的人逻辑保持不变
            }

            // 延迟一点直接下一位
            this.scene.time.delayedCall(1500, () => this.nextTurn());
            return; // 🛑 必须阻断，否则后面会继续执行 AI 决策
        }

        // 5. 设置为行动中
        if (player.state === 'waiting') player.state = 'playing';

        // 🟢 [核心] 初始化锁状态
        if (player.isAI) {
            this.isBusy = true; // AI回合，全程锁定
        } else {
            this.isBusy = false; // 玩家回合，解锁等待操作
        }

        // 6. 检查是否可以用道具
        const canUseItem = (this.scene.roundCount > 1) && (player.items.length > 0) && (!player.hasSkippedItemPhase);

        if (canUseItem) {
            this.startItemPhase(player);
        } else {
            this.readyForAction(player);
        }
    }

    /**
     * 准备好进行 抽牌/放弃 操作
     */
    readyForAction(player) {
        if (this.scene.isToastActive) {
            this.scene.events.once('toast_closed', () => this.readyForAction(player));
            return;
        }

        if (this.scene.isWaitingForModal) return;

        // 检查手牌上限
        const numberCardsCount = player.cards.filter(c => typeof c === 'number').length;
        if (numberCardsCount >= 7) {
            this.scene.toast.show(`${player.name} 手牌已满，强制结束`, 2000);
            this.scene.time.delayedCall(2000, () => this.onGiveUp());
            return;
        }

        // 分流处理
        if (player.isAI) {
            this.isBusy = true; // 确保锁定
            this.scene.ui.showActionButtons(false);

            // 🟢 AI 思考时间 2-3秒
            this.scene.time.delayedCall(2000, () => {
                this.executeAIAction(player);
            });
        } else {
            this.isBusy = false; // 解锁
            this.scene.ui.showActionButtons(true);
            this.scene.toast.show("轮到你了", 1000);
        }
    }

    /**
     * 🟢 [新增] AI 决策逻辑
     */
    executeAIAction(player) {
        // 防止意外触发
        if (this.scene.currentPlayerIndex !== this.scene.players.indexOf(player)) return;

        // 简单策略：如果分数 >= 15 就放弃，否则抽牌
        if (player.roundScore >= 15) {
            this.onGiveUp();
        } else {
            this.scene.cardManager.handleDrawClick();
        }
    }

    /**
     * 玩家移动逻辑
     */
    movePlayer(player, steps, isBonus) {
        this.isBusy = true; // 移动中锁定，防止连点
        this.scene.ui.showActionButtons(false);

        // Debug 逻辑
        if (typeof window !== 'undefined' && window.__DEBUG_NEXT_MOVE__) {
            const targetGridId = window.__DEBUG_NEXT_MOVE__;
            let forcedSteps = (targetGridId - player.position + 24) % 24;
            if (forcedSteps === 0 && targetGridId === player.position) forcedSteps = 0;
            steps = forcedSteps;
            window.__DEBUG_NEXT_MOVE__ = null;
        }

        // 音效逻辑
        if (steps > 0) {
            this.scene.audioManager.playSfx('sfx_move');
            if (steps > 1) {
                this.scene.time.addEvent({
                    delay: 200,
                    repeat: steps - 1,
                    callback: () => this.scene.audioManager.playSfx('sfx_move')
                });
            }
        }

        // 计算路径
        const path = [];
        let tempPos = player.position;
        const startGridId = player.position;

        for (let i = 0; i < steps; i++) {
            tempPos++;
            if (tempPos > 24) tempPos = 1;
            path.push(tempPos);
        }
        player.position = tempPos;
        this.scene.ui.updateGridTokens(startGridId);

        // 执行动画
        this.scene.ui.animatePlayerMove(player.id, path, () => {
            this.scene.ui.updateGridTokens(player.position);

            // 落地效果
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

    /**
     * 动作结算
     * @param {boolean} isBonus 如果为 true，表示这是一个奖励行动（如无双），不切换回合
     */
    finishAction(player, isBonus) {
        this.calculateRoundScore(player);
        this.scene.ui.refreshTopPanel(this.scene.players);

        // 1. 优先处理连抽 (Force Draw)
        if (this.forceDrawState && this.forceDrawState.count > 0) {
            // 如果连抽过程中爆牌了，停止
            if (['bust', 'done', 'frozen'].includes(player.state)) {
                this.forceDrawState = null;
                this.scene.time.delayedCall(1500, () => {
                    if (this.scene.isDuelMode) this.scene.cardManager.updateDuelUI();
                    else this.nextTurn();
                });
                return;
            }
            // 继续抽下一张
            this.scene.time.delayedCall(1000, () => this.processForceDraw());
            return;
        }
        else if (this.forceDrawState && this.forceDrawState.count <= 0) {
            // 连抽结束的回调
            const callback = this.forceDrawState.callback;
            this.forceDrawState = null;
            if (callback) callback();
            return;
        }

        // 2. 决斗模式处理
        if (this.scene.isDuelMode) {
            const ds = this.scene.cardManager.duelState;
            // 切换到对手
            ds.current = (ds.current === ds.challenger) ? ds.target : ds.challenger;
            this.scene.time.delayedCall(1000, () => this.scene.cardManager.updateDuelUI());
            return;
        }

        // 3. 普通模式处理
        if (isBonus) {
            // 如果是奖励行动（例如无双），继续让当前玩家操作
            console.log("奖励行动，继续当前回合");
            this.readyForAction(player);
        } else {
            // 正常操作结束，切换下一位
            // 🟢 延迟一下，让玩家看清结果
            this.scene.time.delayedCall(800, () => this.nextTurn());
        }
    }

    /**
     * 切换到下一位玩家
     */
    nextTurn() {
        // 🟢 [核心] 切换期间锁定一切
        this.isBusy = true;
        this.scene.ui.showActionButtons(false);

        // 1. 寻找下一个有效玩家
        let nextIndex = (this.scene.currentPlayerIndex + 1) % this.scene.players.length;
        let loopCount = 0;

        // 跳过 bust 和 done 的玩家
        while (['bust', 'done'].includes(this.scene.players[nextIndex].state)) {
            nextIndex = (nextIndex + 1) % this.scene.players.length;
            loopCount++;
            if (loopCount > this.scene.players.length) {
                // 所有人都结束了
                this.handleRoundOver();
                return;
            }
        }

        // 2. 移动标记
        this.scene.currentPlayerIndex = nextIndex;

        // 🟢 [核心] 等待标记移动动画完成后，才真正 StartTurn
        this.scene.ui.animateActiveMarker(nextIndex, () => {
            this.startTurn();
        });

        // 自动保存
        this.scene.saveManager.saveGame();
    }

    /**
     * 放弃/结束回合
     */
    onGiveUp() {
        // 防止连点
        if (this.isBusy && !this.scene.players[this.scene.currentPlayerIndex].isAI) return;
        this.isBusy = true;

        const player = this.scene.players[this.scene.currentPlayerIndex];

        // 结算
        player.totalScore += player.roundScore;
        player.state = 'done';

        this.scene.ui.updateBtmPanel(player);
        this.scene.ui.refreshTopPanel(this.scene.players);
        this.scene.audioManager.playSfx('sfx_score');

        this.scene.toast.show(`${player.name} 结束回合 (+${player.roundScore}分)`);

        this.scene.time.delayedCall(1000, () => this.nextTurn());
    }

    // --- 连抽逻辑 ---

    startForceDraw(player, count, onComplete) {
        this.forceDrawState = { target: player, count: count, callback: onComplete };
        this.scene.ui.showActionButtons(false);
        this.scene.toast.show(`${player.name} 触发连抽 ${count} 张！`, 1500);
        this.scene.time.delayedCall(1500, () => this.processForceDraw());
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
            // 连抽时，始终设为 isBonus=true，防止中途切人
            let shouldMove = (!this.scene.isDuelMode && player.id === this.scene.players[this.scene.currentPlayerIndex].id);
            this.scene.cardManager.handleCardEffect(player, card, true, shouldMove);
        });
    }

    // --- 辅助计算 ---

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

        // 结算分数
        this.scene.players.forEach(p => {
            if (p.state === 'done' || p.state === 'frozen') {
                // roundScore 已经在 onGiveUp 加过了，这里防止重复加
                // 但如果是因为所有人都爆牌了导致的结束，这里需要重新检查
                // 现在的逻辑是实时加总分，所以这里主要是展示
            }
        });

        this.scene.saveManager.saveGame();

        const hasWinner = this.scene.players.some(p => p.totalScore >= 200);
        this.scene.time.delayedCall(1000, () => {
            this.scene.modal.showRoundResult(this.scene.roundCount, this.scene.players, () => {
                this.isRoundSettling = false;
                if (hasWinner) this.scene.handleGameEnd();
                else this.scene.shopManager.startShopPhase();
            });
        });
    }

    // --- 道具阶段 ---

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
            // AI 暂时不使用道具，直接跳过
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
// --- 道具点击触发 ---
    onItemClick(itemType, index, x, y) {
        // 1. 基本检查：如果是AI或者忙碌中，忽略
        if (this.isBusy || this.scene.players[this.scene.currentPlayerIndex].isAI) return;

        // 2. 取消选择逻辑
        if (this.itemPhaseState && this.itemPhaseState.selectedItemIndex === index) {
            this.scene.ui.hideItemDescription(); // 关闭描述框
            this.itemPhaseState.selectedItemIndex = -1; // 重置选中索引
            return;
        }

        // 3. 🟢 [核心修复] 保存状态，而不是覆盖状态
        // 我们必须保留之前的 timeLeft 和 timerEvent，否则倒计时会消失或重置
        const existingTimer = this.itemPhaseState ? this.itemPhaseState.timerEvent : null;
        const existingTimeLeft = this.itemPhaseState ? this.itemPhaseState.timeLeft : 20;

        this.itemPhaseState = {
            timeLeft: existingTimeLeft,
            timerEvent: existingTimer, // 👈 关键：继承定时器
            selectedItemIndex: index,
            itemType: itemType
        };

        // 4. 获取道具数据 (名字/描述)
        const itemData = ITEM_DATA[itemType] || { name: "未知", desc: "暂无描述" };

        // 5. 🟢 [核心修复] 调用正确的 UI 函数
        // 之前你调用的是 showItemUsageMode(x,y)，那是错的！
        // 应该调用 showItemDescription 来显示“使用”按钮和道具介绍
        this.scene.ui.showItemDescription(itemData, x, y);
    }
}