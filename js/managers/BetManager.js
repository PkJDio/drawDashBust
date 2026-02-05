import { FRUIT_TYPES } from '../ItemConfig.js';

export default class BetManager {
    constructor(scene) {
        this.scene = scene;
        this.currentOdds = {};
        this.playerBets = {};
        this.minBet = 10;

        // 设定固定倍率配置
        this.fixedOdds = {
            'apple': 2,       // 苹果 (4个)
            'watermelon': 3,  // 西瓜 (3个)
            'papaya': 3,      // 木瓜 (3个)
            'orange': 3,      // 橙子 (3个)
            'bell': 3,        // 铃铛 (3个)
            'star': 4,        // 双星 (2个)
            'moon': 4,        // 月亮 (2个)
            'sun': 4          // 太阳 (2个)
        };
    }

    // --- 初始化：设置固定倍率 ---
    generateRoundOdds() {
        // 直接使用固定倍率，不再随机
        this.currentOdds = { ...this.fixedOdds };

        // 重置玩家下注记录
        this.scene.players.forEach(p => {
            if (!this.playerBets[p.id]) {
                this.playerBets[p.id] = this.initEmptyBets();
            } else {
                // 清空上一轮的下注
                const bets = this.playerBets[p.id];
                for (let k in bets) bets[k] = 0;
            }
            p.hasBetThisRound = false;
        });

        console.log("本轮倍率已重置:", this.currentOdds);
    }

    initEmptyBets() {
        const bets = {};
        // 假设 FRUIT_TYPES 的值就是 'apple', 'sun' 等 key
        for (let key in this.fixedOdds) {
            bets[key] = 0;
        }
        return bets;
    }

    // --- 玩家操作：增加/减少注码 ---
    adjustBet(player, fruitType, delta) {
        if (player.state === 'bust' || player.state === 'frozen') return false;

        // 确保初始化
        if (!this.playerBets[player.id]) this.playerBets[player.id] = this.initEmptyBets();

        const currentBet = this.playerBets[player.id][fruitType];

        // 增加注码 (投入积分)
        if (delta > 0) {
            if (player.totalScore >= delta) {
                player.totalScore -= delta;
                this.playerBets[player.id][fruitType] += delta;
                return true;
            } else {
                this.scene.toast.show("积分不足！");
                return false;
            }
        }
        // 减少注码 (撤回积分)
        else {
            if (currentBet + delta >= 0) {
                player.totalScore -= delta; // 负负得正，返还积分
                this.playerBets[player.id][fruitType] += delta;
                return true;
            }
            return false;
        }
    }

    getOdds(fruitType) {
        return this.currentOdds[fruitType] || 2;
    }

    getPlayerBets(playerId) {
        return this.playerBets[playerId];
    }

    // --- 结算：当棋子停在某个格子上时 ---
    resolveLanding(player, gridFruitType) {
        const bets = this.playerBets[player.id];
        if (!bets) return 0;

        const betAmount = bets[gridFruitType];
        if (betAmount > 0) {
            const odds = this.currentOdds[gridFruitType];
            const winScore = betAmount * odds;

            this.scene.toast.show(`✨ 押中！获得 ${winScore} 分！`, 1500);
            player.totalScore += winScore;

            // 可以在这里加个简单的特效调用，比如飘分

            return winScore;
        }
        return 0;
    }
    /**
     * 🟢 新增：多重结算接口 (用于跑马灯事件)
     * @param {Object} player 当前触发事件的玩家
     * @param {Array} gridIds 跑马灯点亮的所有格子ID数组
     */
    resolveMultipleLandings(player, gridIds) {
        const bets = this.playerBets[player.id];
        if (!bets) return 0;

        let totalWin = 0;
        let hits = [];

        gridIds.forEach(id => {
            // 获取格子对应的水果类型 (调用 GameScene 的方法)
            const fruitType = this.scene.getFruitTypeByGridId(id);
            if (fruitType && bets[fruitType] > 0) {
                const odds = this.currentOdds[fruitType];
                const win = bets[fruitType] * odds;
                totalWin += win;
                hits.push(fruitType);
            }
        });

        if (totalWin > 0) {
            player.totalScore += totalWin;
            this.scene.toast.show(`🎰 跑马灯大奖！获得 ${totalWin} 分！`, 2000);
            return totalWin;
        }
        return 0;
    }

    // --- AI 下注逻辑 ---
    performAIBetting(aiPlayer) {
        if (aiPlayer.totalScore < 10) return;

        // AI 简单策略：随机选 1-2 个倍率高的或者数量多的
        // 这里简单实现：随机投
        const keys = Object.keys(this.fixedOdds);
        const betCount = Phaser.Math.Between(1, 2);

        for (let i = 0; i < betCount; i++) {
            if (aiPlayer.totalScore < 10) break;
            const randomFruit = Phaser.Utils.Array.GetRandom(keys);
            const maxBet = Math.floor(aiPlayer.totalScore * 0.3); // 最多投30%
            const amount = Math.max(10, Math.min(maxBet, 30));
            const roundedAmount = Math.floor(amount / 10) * 10;

            if (roundedAmount > 0) {
                this.adjustBet(aiPlayer, randomFruit, roundedAmount);
            }
        }
    }
}