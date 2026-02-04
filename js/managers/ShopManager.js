import { ITEM_DATA } from '../ItemConfig.js';

export default class ShopManager {
    constructor(scene) {
        this.scene = scene;
        this.shopQueue = [];
    }

    startShopPhase() {
        console.log("=== 商店开启 ===");

        // 排序：分低的先买
        this.shopQueue = [...this.scene.players].sort((a, b) => {
            const scoreA = (a.state === 'bust' || a.state === 'frozen') ? 0 : a.roundScore;
            const scoreB = (b.state === 'bust' || b.state === 'frozen') ? 0 : b.roundScore;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.totalScore - b.totalScore;
        });

        this.scene.toast.show("🛍️ 商店开启！", 1500);
        this.scene.time.delayedCall(1600, () => {
            this.processShopTurn();
        });
    }

    processShopTurn() {
        if (this.shopQueue.length === 0) {
            this.scene.startNextRound();
            return;
        }

        const shopper = this.shopQueue.shift();

        // 🟢 修改点：生成随机商品列表 (数量 = 玩家人数 + 2)
        const randomItems = this.generateRandomShopItems(shopper);

        const delay = shopper.isAI ? 1000 : 500;

        this.scene.time.delayedCall(delay, () => {
            if (shopper.isAI) {
                this.aiShopAction(shopper, randomItems);
            } else {
                this.scene.modal.showShop(shopper, randomItems, (result) => {
                    this.resolveShopAction(shopper, result);
                });
            }
        });
    }

    // 🟢 新增：随机生成商品
    generateRandomShopItems(player) {
        const count = this.scene.players.length + 2; // 规则：人数+2
        const allKeys = Object.keys(ITEM_DATA);

        // 随机洗牌并取前 count 个
        const shuffledKeys = Phaser.Utils.Array.Shuffle([...allKeys]).slice(0, count);

        return shuffledKeys.map(key => {
            const baseData = ITEM_DATA[key];
            let finalPrice = baseData.price;

            // 升级卡动态价格
            if (key === 'upgrade') {
                const count = player.upgradeBuyCount || 0;
                finalPrice = 3 + Math.floor(count / 2);
                if (finalPrice > 10) finalPrice = 10;
            }

            return {
                type: key,
                name: baseData.name,
                desc: baseData.desc,
                emoji: baseData.emoji,
                cost: finalPrice
            };
        });
    }

    aiShopAction(player, inventory) {
        let affordable = inventory.filter(i => player.totalScore >= i.cost);
        if (player.items.length >= 5) affordable = [];

        let choice = null;
        if (affordable.length > 0) {
            choice = Phaser.Utils.Array.GetRandom(affordable);
        }

        if (choice) {
            this.resolveShopAction(player, { action: 'buy', item: choice });
        } else {
            this.resolveShopAction(player, { action: 'pass' });
        }
    }

    resolveShopAction(player, result) {
        if (result.action === 'buy') {
            const item = result.item;
            if (player.items.length >= 5) {
                this.scene.toast.show("道具栏已满！", 1500);
                this.scene.time.delayedCall(1000, () => this.processShopTurn());
                return;
            }

            player.totalScore -= item.cost;
            player.items.push(item.type);

            if (item.type === 'upgrade') {
                player.upgradeBuyCount = (player.upgradeBuyCount || 0) + 1;
            }

            this.scene.toast.show(`${player.name} 购买了 【${item.name}】`, 1500);
            if (player.id === 0) this.scene.ui.updateBtmPanel(player);

        } else {
            player.totalScore += 1;
            this.scene.toast.show(`${player.name} 放弃购买 (+1分)`, 1000);
        }

        this.scene.ui.refreshTopPanel(this.scene.players);
        this.scene.time.delayedCall(1500, () => this.processShopTurn());
    }
}