import { ITEM_TYPES, ITEM_DATA, UPGRADE_PRICES } from '../ItemConfig.js';

export default class ShopManager {
    constructor(scene) {
        this.scene = scene;
        this.shopInventory = [];
        this.shopQueue = [];
    }

    startShopPhase() {
        const shopSize = this.scene.players.length + 2;
        this.shopInventory = [];
        const keys = Object.values(ITEM_TYPES);

        for(let i=0; i<shopSize; i++) {
            const randomType = Phaser.Utils.Array.GetRandom(keys);
            const item = { ...ITEM_DATA[randomType], type: randomType, id: i };
            this.shopInventory.push(item);
        }

        this.shopQueue = [...this.scene.players].sort((a, b) => {
            if (a.roundScore !== b.roundScore) return a.roundScore - b.roundScore;
            if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
            return Math.random() - 0.5;
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
        const currentInventoryView = this.updateShopInventoryPrices(shopper);

        if (shopper.isAI) {
            this.aiShopAction(shopper, currentInventoryView);
        } else {
            this.scene.modal.showShop(shopper, currentInventoryView, (result) => {
                this.resolveShopAction(shopper, result);
            });
        }
    }

    updateShopInventoryPrices(player) {
        return this.shopInventory.map(item => {
            let finalCost = item.baseCost;
            if (item.type === ITEM_TYPES.UPGRADE) {
                const priceIdx = Math.min(player.upgradeCount, UPGRADE_PRICES.length - 1);
                finalCost = UPGRADE_PRICES[priceIdx];
            }
            return { ...item, cost: finalCost };
        });
    }

    aiShopAction(player, inventory) {
        let affordable = inventory.filter(i => player.totalScore >= i.cost);
        if (player.items.length >= 5) affordable = [];

        let choice = null;
        if (affordable.length > 0) {
            affordable.sort((a, b) => b.cost - a.cost);
            const rand = Math.random();
            if (rand < 0.5) choice = affordable[0];
            else if (rand < 0.8) choice = Phaser.Utils.Array.GetRandom(affordable);
        }

        this.scene.time.delayedCall(1000, () => {
            if (choice) this.resolveShopAction(player, { action: 'buy', item: choice });
            else this.resolveShopAction(player, { action: 'pass' });
        });
    }

    resolveShopAction(player, result) {
        if (result.action === 'buy') {
            const item = result.item;
            player.totalScore -= item.cost;
            player.items.push(item.type);
            if (item.type === ITEM_TYPES.UPGRADE) player.upgradeCount++;

            const idx = this.shopInventory.findIndex(i => i.id === item.id);
            if (idx !== -1) this.shopInventory.splice(idx, 1);

            this.scene.toast.show(`${player.name} 购买了 【${item.name}】`, 1500);
            if (player.id === 0) this.scene.ui.updateBtmPanel(player);

        } else {
            player.totalScore += 1;
            this.scene.toast.show(`${player.name} 放弃购买 (+1分)`, 1000);
        }

        this.scene.ui.refreshTopPanel(this.scene.players);
        this.scene.time.delayedCall(1600, () => this.processShopTurn());
    }
}