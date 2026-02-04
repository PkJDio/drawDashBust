import { FRUIT_TYPES, FRUIT_DATA } from '../ItemConfig.js';

export default class BetManager {
    constructor(scene) {
        this.scene = scene;
        this.currentOdds = {}; // 当前轮次各水果的倍率
        this.playerBets = {};  // 存储所有玩家的下注 { playerId: { apple: 10, sun: 0 ... } }
        this.minBet = 10;      // 最小注码单位
    }

    // --- 每轮开始时调用：生成动态倍率 ---
    generateRoundOdds() {
        this.currentOdds = {};
        const keys = Object.values(FRUIT_TYPES);

        // 简单的动态算法：
        // 牌库剩余卡牌虽然影响步数，但直接映射太复杂。
        // 这里采用“市场波动”模拟：在基础倍率上下浮动。

        keys.forEach(key => {
            const base = FRUIT_DATA[key].baseRate;
            let multiplier = 1;

            // 随机波动：-20% 到 +50%
            const fluctuation = Phaser.Math.FloatBetween(0.8, 1.5);

            // 大奖波动更剧烈
            if (base >= 20) {
                // 太阳/月亮：有时会变成超高倍率 (例如 100倍)
                if (Math.random() < 0.2) multiplier = 2.0;
            }

            let finalRate = Math.floor(base * fluctuation * multiplier);

            // 保证最小倍率不低于基础的 80% 且至少为 2
            finalRate = Math.max(2, finalRate);

            this.currentOdds[key] = finalRate;
        });

        // 重置玩家下注记录
        this.scene.players.forEach(p => {
            this.playerBets[p.id] = this.initEmptyBets();
            p.hasBetThisRound = false; // 标记本轮是否已进行过下注阶段
        });

        console.log("本轮水果倍率:", this.currentOdds);
    }

    initEmptyBets() {
        const bets = {};
        Object.values(FRUIT_TYPES).forEach(k => bets[k] = 0);
        return bets;
    }

    // --- 玩家操作：增加/减少注码 ---
    adjustBet(player, fruitType, delta) {
        if (player.state === 'bust' || player.state === 'frozen') return false;

        const currentBet = this.playerBets[player.id][fruitType];

        // 增加注码
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
        // 减少注码 (退回积分)
        else {
            if (currentBet + delta >= 0) {
                player.totalScore -= delta; // delta是负数，减负等于加
                this.playerBets[player.id][fruitType] += delta;
                return true;
            }
            return false;
        }
    }

    getOdds(fruitType) {
        return this.currentOdds[fruitType] || 0;
    }

    getPlayerBets(playerId) {
        return this.playerBets[playerId];
    }

    // --- 结算：当棋子停在某个格子上时 ---
    // gridFruitType: 棋盘格子对应的水果类型
    // return: 赢得的总积分
    resolveLanding(player, gridFruitType) {
        const bets = this.playerBets[player.id];
        if (!bets) return 0;

        const betAmount = bets[gridFruitType];
        if (betAmount > 0) {
            const odds = this.currentOdds[gridFruitType];
            const winScore = betAmount * odds;

            // 只有押中的才返还本金+奖励，还是只给奖励？通常是本金已消耗，只给 odds * amount
            // 这里设定为：下注已消耗，赢得 odds * amount
            player.totalScore += winScore;

            return winScore;
        }
        return 0;
    }

    // --- AI 下注逻辑 ---
    // 电脑每轮简单的随机下注
    performAIBetting(aiPlayer) {
        if (aiPlayer.totalScore < 10) return; // 没分不下注

        // AI 策略：随机选 1-3 个水果下注
        const keys = Object.values(FRUIT_TYPES);
        const betCount = Phaser.Math.Between(1, 3);

        for (let i = 0; i < betCount; i++) {
            if (aiPlayer.totalScore < 10) break;

            const randomFruit = Phaser.Utils.Array.GetRandom(keys);
            // 简单的注码：10 到 总分的 20%
            const maxBet = Math.floor(aiPlayer.totalScore * 0.2);
            const amount = Math.max(10, Math.min(maxBet, 50));

            // 调整为 10 的倍数
            const roundedAmount = Math.floor(amount / 10) * 10;

            if (roundedAmount > 0) {
                this.adjustBet(aiPlayer, randomFruit, roundedAmount);
            }
        }
    }
}