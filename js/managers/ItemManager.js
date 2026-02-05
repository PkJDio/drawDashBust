import { ITEM_DATA } from '../ItemConfig.js';

export default class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.gridData = [];

        this.selectionMode = null;
        this.currentUser = null;
        this.pendingExchangeGrid = null;
    }

    initGrid() {
        this.gridData = Array(25).fill(null).map((_, i) => ({
            id: i,
            owner: null,
            level: 0,
        }));

        for (let i = 1; i <= 24; i++) {
            this.scene.ui.grid.updateGridStatus(i, null, 0, false);
        }
    }

    handleItemEffect(player, itemType, onComplete = null) {
        const gridId = player.position;
        const grid = this.gridData[gridId];

        switch (itemType) {
            case 'land':
                return this.handleLandCard(player, grid);

            case 'upgrade':
                return this.startUpgradeSelection(player);

            case 'exchange':
                return this.startExchangeSelection(player);

            case 'prophecy':
                // 🟢 传入回调函数
                return this.startProphecy(player, onComplete);

            case 'protection':
                player.hasProtection = true;
                this.scene.toast.show("🔰 保护卡生效！本轮抵消一次爆牌。", 2000);
                return true;

            case 'tax_free':
                player.taxFreeActive = true;
                this.scene.toast.show("🛡️ 免税卡生效，本轮免交过路费！", 1500);
                return true;


            default:
                console.warn("未知道具类型:", itemType);
                return false;
        }
    }

    handleLandCard(player, grid) {
        if (this.scene.specialGrids.includes(grid.id) || grid.id === 0) {
            this.scene.toast.show("特殊格子无法购买！", 1500);
            return false;
        }

        if (grid.owner === null) {
            grid.owner = player.id;
            grid.level = 1;
            this.scene.ui.grid.updateGridStatus(grid.id, player.id, 1, false);
            this.scene.toast.show("购地成功！", 1500);
            return true;
        }
        else if (grid.owner === player.id) {
            if (grid.level >= 3) {
                this.scene.toast.show("该地块已达最高等级！", 1500);
                return false;
            }
            grid.level++;
            this.scene.ui.grid.updateGridStatus(grid.id, player.id, grid.level, false);
            this.scene.toast.show("升级成功！", 1500);
            return true;
        }
        else {
            this.scene.toast.show("这是别人的领地，无法操作！", 1500);
            return false;
        }
    }

    startUpgradeSelection(player) {
        const hasLand = this.gridData.some(g => g.owner === player.id && g.level < 3);
        if (!hasLand) {
            this.scene.toast.show("你没有可升级的地块！", 1500);
            return false;
        }

        this.scene.toast.show("请点击选择一个属于你的地块升级", 2000);
        this.selectionMode = 'upgrade';
        this.currentUser = player;
        return false;
    }

    startExchangeSelection(player) {
        this.scene.toast.show("请选择第一个要交换的地块", 2000);
        this.selectionMode = 'exchange_1';
        this.currentUser = player;
        this.pendingExchangeGrid = null;
        return false;
    }

    startProphecy(player) {
        this.createProphecyUI(player);
        return false;
    }

    createProphecyUI(player) {
        const x = 360, y = 640;
        const container = this.scene.add.container(x, y).setDepth(1000);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0xfff8e1, 1);
        bg.lineStyle(4, 0x5d4037);
        bg.fillRoundedRect(-200, -120, 400, 240, 20);
        bg.strokeRoundedRect(-200, -120, 400, 240, 20);

        // 🟢 修复点：背景要先添加到 container，否则会挡住按钮
        container.add(bg);

        const title = this.scene.add.text(0, -70, "🔮 预言卡：猜大小", { fontSize: '32px', color: '#5d4037', fontStyle: 'bold' }).setOrigin(0.5);
        const desc = this.scene.add.text(0, -20, "猜测下一张数字牌的点数范围", { fontSize: '20px', color: '#8d6e63' }).setOrigin(0.5);

        container.add([title, desc]);

        const createBtn = (bx, by, label, color, guessVal) => {
            const btnBg = this.scene.add.graphics();
            btnBg.fillStyle(color, 1);
            btnBg.fillRoundedRect(bx - 70, by - 30, 140, 60, 10);

            const btnText = this.scene.add.text(bx, by, label, { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

            const zone = this.scene.add.zone(bx, by, 140, 60).setInteractive();
            zone.on('pointerdown', () => {
                container.destroy();
                this.resolveProphecy(player, guessVal);
            });
            container.add([btnBg, btnText, zone]);
        };

        createBtn(-100, 60, "小 (0-6)", 0x4db6ac, 'small');
        createBtn(100, 60, "大 (7-13)", 0xff7043, 'big');
    }

    resolveProphecy(player, guess) {
        player.prophecyGuess = guess;
        this.scene.toast.show(`已预测：${guess === 'small' ? '小' : '大'}。请抽牌！`, 2000);
        this.consumeItem(player, 'prophecy');
        this.scene.readyForAction(player);
    }

    onGridClick(gridId) {
        if (!this.selectionMode || !this.currentUser) return;

        if (this.scene.specialGrids.includes(gridId) || gridId === 0) {
            this.scene.toast.show("特殊格子无法操作！");
            return;
        }

        if (this.selectionMode === 'upgrade') {
            this.processUpgradeSelect(gridId);
        }
        else if (this.selectionMode === 'exchange_1') {
            this.pendingExchangeGrid = gridId;
            this.selectionMode = 'exchange_2';
            this.scene.toast.show("已选定第一个。请选择第二个地块。");
        }
        else if (this.selectionMode === 'exchange_2') {
            this.processExchange(this.pendingExchangeGrid, gridId);
        }
    }

    processUpgradeSelect(gridId) {
        const grid = this.gridData[gridId];

        if (grid.owner !== this.currentUser.id) {
            this.scene.toast.show("只能升级属于你的地块！");
            return;
        }
        if (grid.level >= 3) {
            this.scene.toast.show("该地块已满级！");
            return;
        }

        grid.level++;
        this.scene.ui.grid.updateGridStatus(gridId, grid.owner, grid.level, false);
        this.scene.toast.show("升级成功！", 1500);

        this.completeSelection('upgrade');
    }

    processExchange(id1, id2) {
        if (id1 === id2) {
            this.scene.toast.show("不能选择相同的地块！请重新选择第二个。");
            return;
        }

        const g1 = this.gridData[id1];
        const g2 = this.gridData[id2];

        const tempOwner = g1.owner;
        const tempLevel = g1.level;

        g1.owner = g2.owner;
        g1.level = g2.level;

        g2.owner = tempOwner;
        g2.level = tempLevel;

        this.scene.ui.grid.updateGridStatus(id1, g1.owner, g1.level, false);
        this.scene.ui.grid.updateGridStatus(id2, g2.owner, g2.level, false);

        this.scene.toast.show("✨ 地块交换成功！", 2000);
        this.completeSelection('exchange');
    }

    completeSelection(itemKey) {
        this.consumeItem(this.currentUser, itemKey);
        this.selectionMode = null;
        this.currentUser = null;
        this.pendingExchangeGrid = null;

        this.scene.readyForAction(this.scene.players[this.scene.currentPlayerIndex]);
    }

    consumeItem(player, itemKey) {
        const idx = player.items.indexOf(itemKey);
        if (idx !== -1) {
            player.items.splice(idx, 1);
        }
        player.hasSkippedItemPhase = true;
        this.scene.ui.updateBtmPanel(player);
        this.scene.ui.hideItemDescription();
        this.scene.ui.hideItemUsageMode();
    }

    handleLandEffect(player) {
        const grid = this.gridData[player.position];

        if (grid.owner !== null && grid.owner !== player.id) {
            if (player.taxFreeActive) {
                this.scene.toast.show("🛡️ 免税卡生效，免交过路费！", 1500);
                // 免税卡持续本轮，不在这里移除状态
                return;
            }

            const owner = this.scene.players.find(p => p.id === grid.owner);
            if (!owner) return;

            const toll = 2 * Math.pow(2, grid.level - 1);

            if (player.totalScore >= toll) {
                player.totalScore -= toll;
                owner.totalScore += toll;
                this.scene.toast.show(`缴纳过路费 ${toll} 分`, 1000);
            } else {
                const actual = player.totalScore;
                player.totalScore = 0;
                owner.totalScore += actual;
                this.scene.toast.show(`缴纳过路费 ${actual} 分 (已破产)`, 1000);
            }

            this.scene.ui.refreshTopPanel(this.scene.players);
        }
    }

    checkBlock(gridId) { return false; }
}