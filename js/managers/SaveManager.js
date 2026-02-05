// managers/SaveManager.js
export default class SaveManager {
    constructor(scene) {
        this.scene = scene;
    }

    saveGame() {
        const saveData = {
            roundCount: this.scene.roundCount,
            players: this.scene.players.map(p => ({
                id: p.id,
                name: p.name,
                isAI: p.isAI,
                totalScore: p.totalScore,
                items: p.items,
                upgradeBuyCount: p.upgradeBuyCount,
                position: p.position
            })),
            gridData: this.scene.itemManager.gridData,
            mainDeckCache: this.scene.cardManager.mainDeckCache,
            specialDeckCache: this.scene.cardManager.specialDeckCache,
            aiCount: this.scene.aiCount
        };
        localStorage.setItem('ddb_save', JSON.stringify(saveData));
    }

    loadGame() {
        try {
            const data = JSON.parse(localStorage.getItem('ddb_save'));
            this.scene.roundCount = data.roundCount;
            this.scene.aiCount = data.aiCount || 3;

            this.scene.players = this.scene.createPlayers(this.scene.aiCount);

            data.players.forEach((savedP, i) => {
                if (i < this.scene.players.length) {
                    const currentP = this.scene.players[i];
                    currentP.totalScore = savedP.totalScore;
                    currentP.items = savedP.items || [];
                    currentP.upgradeBuyCount = savedP.upgradeBuyCount || 0;
                    currentP.position = savedP.position || 1;
                    currentP.roundScore = 0;
                    currentP.cards = [];
                    currentP.state = (i === 0) ? 'playing' : 'waiting';
                }
            });

            this.scene.cardManager.mainDeckCache = data.mainDeckCache || [];
            this.scene.cardManager.specialDeckCache = data.specialDeckCache || [];

            if (data.gridData) {
                this.scene.itemManager.gridData = data.gridData;
                this.scene.itemManager.gridData.forEach(g => {
                    this.scene.ui.grid.updateGridStatus(g.id, g.owner, g.level, false);
                });
            } else {
                this.scene.itemManager.initGrid();
            }

            this.scene.specialGrids = [10, 22];
            this.scene.musouMode = false;
            this.scene.isDuelMode = false;
            this.scene.isWaitingForModal = false;
            this.scene.turnManager.isRoundSettling = false;

            this.scene.roundStartIndex = Phaser.Math.Between(0, this.scene.players.length - 1);
            this.scene.currentPlayerIndex = this.scene.roundStartIndex;

            this.scene.ui.refreshTopPanel(this.scene.players);
            this.scene.ui.updateBtmPanel(this.scene.players[0]);
            this.scene.players.forEach((p, i) => {
                this.scene.ui.drawPlayerAt(p.position, i, p.name);
            });
            this.scene.ui.resetMidInfo();
            this.scene.ui.updateDeckCount(this.scene.cardManager.mainDeckCache.length);

            if (!this.scene.betManager.currentOdds || Object.keys(this.scene.betManager.currentOdds).length === 0) {
                this.scene.betManager.generateRoundOdds();
            }

            // 核心修复：加载后校验牌库
            this.scene.cardManager.validateAndFixDecks(this.scene.players);

            // 🟢 核心修改：检查轮次，如果是第1轮，直接开始行动，不走下注流程
            if (this.scene.roundCount === 1) {
                // 直接进入游戏回合，跳过下注倒计时和“下注结束”弹窗
                this.scene.turnManager.startTurn();
            } else {
                // 如果是后续轮次，依旧保留下注阶段
                this.scene.startGlobalBettingPhase();
            }
            this.scene.toast.show("已恢复游戏进度", 2000);

        } catch (e) {
            console.error("Load failed", e);
            this.scene.toast.show("存档损坏，重新开始", 2000);
            this.scene.initGame(this.scene.aiCount);
        }
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
}