// managers/SaveManager.js
export default class SaveManager {
    constructor(scene) {
        this.scene = scene;
        this.SAVE_KEY = 'ddb_save';
        this.STATS_KEY = 'ddb_global_stats';
    }

    /**
     * 🟢 [无敌版] 保存游戏
     * 无论玩家身上的数据是 null 还是 undefined，这里都绝对不会报错
     */
    saveGame() {
        // 如果场景还没准备好，或者玩家列表为空，直接不存，防止坏档
        if (!this.scene.players || this.scene.players.length === 0) return;

        try {
            // 1. 构建玩家数据
            const playersData = this.scene.players.map(p => ({
                id: p.id,
                name: p.name,
                isAI: p.isAI,
                totalScore: p.totalScore,
                roundScore: p.roundScore,
                position: p.position || 1,

                // 🔥 [修复核心] 防御性写法：
                // 如果 cards 是 undefined，就用空数组 []
                // 如果 card 是对象(Sprite)，只存 key；如果是字符串，直接存
                cards: (p.cards || []).map(c => (typeof c === 'object' ? c.key : c)),

                // 同上，防止 items 崩溃
                items: (p.items || []).map(i => i),

                state: p.state,
                hasProtection: p.hasProtection || false,
                upgradeBuyCount: p.upgradeBuyCount || 0
            }));

            // 2. 构建全局数据
            const saveData = {
                version: "1.2",
                aiCount: this.scene.aiCount,
                roundCount: this.scene.roundCount,
                currentPlayerIndex: this.scene.currentPlayerIndex,
                roundStartIndex: this.scene.roundStartIndex,

                players: playersData,

                // 牌库与棋盘
                // 同样加上 || [] 防止空指针
                mainDeckCache: this.scene.cardManager.mainDeckCache || [],
                specialDeckCache: this.scene.cardManager.specialDeckCache || [],
                gridData: this.scene.itemManager.gridData || [],
                currentOdds: this.scene.betManager.currentOdds || {}
            };

            const json = JSON.stringify(saveData);
            localStorage.setItem(this.SAVE_KEY, json);

        } catch (e) {
            // 这里只打印错误，绝不抛出异常打断游戏循环
            console.warn("[SaveManager] 存档跳过，原因:", e);
        }
    }

    /**
     * 🟢 [无敌版] 读取游戏
     * 确保读档后 UI 和 逻辑状态 绝对同步
     */
    loadGame() {
        const json = localStorage.getItem(this.SAVE_KEY);
        if (!json) return false;

        try {
            const data = JSON.parse(json);

            console.log("[SaveManager] 正在读取存档...", data);

            // 1. 恢复场景基础变量
            this.scene.aiCount = data.aiCount || 3;
            this.scene.roundCount = data.roundCount || 1;
            this.scene.currentPlayerIndex = data.currentPlayerIndex || 0;
            this.scene.roundStartIndex = data.roundStartIndex || 0;

            // 2. 重建玩家对象 (Phaser 层面)
            // 先使用标准方法创建干净的玩家对象
            this.scene.players = this.scene.createPlayers(this.scene.aiCount);

            // 3. 注入存档数据
            data.players.forEach((savedP, i) => {
                if (i < this.scene.players.length) {
                    const currentP = this.scene.players[i];

                    // 恢复数值
                    currentP.totalScore = savedP.totalScore;
                    currentP.roundScore = savedP.roundScore || 0;
                    currentP.upgradeBuyCount = savedP.upgradeBuyCount || 0;
                    currentP.position = savedP.position || 1;
                    currentP.state = savedP.state || 'waiting';
                    currentP.hasProtection = savedP.hasProtection || false;

                    // 恢复数组 (防御性深拷贝)
                    currentP.cards = Array.isArray(savedP.cards) ? [...savedP.cards] : [];
                    currentP.items = Array.isArray(savedP.items) ? [...savedP.items] : [];

                    // ⚠️ 强制重置临时状态 (这些不应该被保存)
                    currentP.prophecyGuess = null;
                    currentP.taxFreeActive = false;
                    currentP.hasSkippedItemPhase = false;
                }
            });

            // 4. 恢复牌库
            this.scene.cardManager.mainDeckCache = data.mainDeckCache || [];
            this.scene.cardManager.specialDeckCache = data.specialDeckCache || [];

            // 校验牌库合法性
            if (this.scene.cardManager.mainDeckCache.length === 0) {
                this.scene.cardManager.initializeDecks();
            }

            // 5. 恢复棋盘格
            if (data.gridData && data.gridData.length > 0) {
                this.scene.itemManager.gridData = data.gridData;
                // 必须重新绘制棋盘上的占领状态
                this.scene.itemManager.gridData.forEach(g => {
                    if (g.owner !== null && this.scene.ui && this.scene.ui.grid) {
                        this.scene.ui.grid.updateGridStatus(g.id, g.owner, g.level, false);
                    }
                });
            } else {
                this.scene.itemManager.initGrid();
            }

            // 6. 恢复赔率
            if (data.currentOdds) {
                this.scene.betManager.currentOdds = data.currentOdds;
            } else {
                this.scene.betManager.generateRoundOdds();
            }

            // 7. 🔥 [关键] 暴力重置 TurnManager 状态
            // 这是解决“读档后卡住”或“按钮消失”最重要的一步
            this.scene.specialGrids = [10, 22];
            this.scene.musouMode = false;
            this.scene.isDuelMode = false;
            this.scene.isWaitingForModal = false;

            if (this.scene.turnManager) {
                this.scene.turnManager.isRoundSettling = false;
                this.scene.turnManager.isBusy = false; // 解开锁
                this.scene.turnManager.forceDrawState = null;
                this.scene.turnManager.itemPhaseState = null;
                this.scene.turnManager.bettingPhaseState = null;

                // 清理可能存在的旧定时器
                if(this.scene.turnManager.timerEvent) {
                    this.scene.turnManager.timerEvent.remove();
                    this.scene.turnManager.timerEvent = null;
                }
            }

            // 8. 刷新所有 UI
            // 暴力清理旧 DOM
            if (this.scene.cleanupOldDOM) this.scene.cleanupOldDOM();

            this.scene.ui.refreshTopPanel(this.scene.players);
            this.scene.ui.updateBtmPanel(this.scene.players[0]);
            this.scene.players.forEach((p, i) => {
                this.scene.ui.drawPlayerAt(p.position, i, p.name);
            });
            this.scene.ui.resetMidInfo();
            this.scene.ui.updateDeckCount(this.scene.cardManager.mainDeckCache.length);

            // 9. 恢复游戏流程
            this.scene.toast.show("已恢复游戏进度", 2000);

            // 移动标记到当前行动者，然后开始回合
            this.scene.ui.animateActiveMarker(this.scene.currentPlayerIndex, () => {
                this.scene.turnManager.startTurn();
            });

            return true;

        } catch (e) {
            console.error("Load failed - 存档数据异常:", e);
            this.scene.toast.show("存档已损坏，开始新游戏", 2000);
            localStorage.removeItem(this.SAVE_KEY);
            // 只有在读档完全失败时才初始化新游戏
            this.scene.initGame(this.scene.aiCount || 3);
            return false;
        }
    }

    onHeartbeat() {
        // 简单的心跳统计
        let stats = { gamesCompleted: 0, wins: 0, totalSeconds: 0 };
        try {
            const data = localStorage.getItem(this.STATS_KEY);
            if (data) stats = JSON.parse(data);
        } catch (e) {}
        stats.totalSeconds++;
        localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));

        // 自动保存
        this.saveGame();
    }

    updateGameOverStats(isWin, totalPlayers) {
        let stats = { gamesCompleted: 0, wins: 0, totalSeconds: 0 };
        try {
            const data = localStorage.getItem(this.STATS_KEY);
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
        localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
        localStorage.removeItem(this.SAVE_KEY);
    }
}