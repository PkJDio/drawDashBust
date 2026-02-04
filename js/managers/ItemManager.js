import { ITEM_DATA } from '../ItemConfig.js';

export default class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.gridData = [];
    }

    initGrid() {
        this.gridData = Array(25).fill(null).map((_, i) => ({
            id: i,
            owner: null,
            level: 0,
            hasBlock: false
        }));
    }

    checkBlock(gridId) {
        if (this.gridData[gridId].hasBlock) {
            this.gridData[gridId].hasBlock = false;
            const grid = this.gridData[gridId];
            this.scene.ui.grid.updateGridStatus(gridId, grid.owner, grid.level, false);
            return true;
        }
        return false;
    }

    handleLandEffect(player) {
        const grid = this.gridData[player.position];
        if (grid.owner !== null && grid.owner !== player.id) {
            const owner = this.scene.players.find(p => p.id === grid.owner);
            if (owner) {
                let toll = 1 + grid.level;
                if (player.taxFreeActive) {
                    this.scene.toast.show(`${player.name} 【免税卡】生效，免除过路费`, 1000);
                    return;
                }
                owner.totalScore += toll;
                this.scene.toast.show(`踩到 ${owner.name} 的地，地主 +${toll} 分`, 1000);
                this.scene.ui.refreshTopPanel(this.scene.players);
            }
        }
    }

    // --- 修改：增加返回值 (true=成功消耗, false=失败不消耗) ---
    handleItemEffect(player, itemType) {
        const gridId = player.position;
        const grid = this.gridData[gridId];

        switch (itemType) {
            case 'land_deed': // 购地卡
                if (this.scene.specialGrids.includes(gridId) || gridId === 0) {
                    this.scene.toast.show("特殊格子无法购买！", 1500);
                    return false; // 失败
                } else if (grid.owner !== null) {
                    this.scene.toast.show("该地块已有主人！", 1500);
                    return false; // 失败
                } else {
                    grid.owner = player.id;
                    this.scene.ui.grid.updateGridStatus(gridId, player.id, grid.level, grid.hasBlock);
                    this.scene.toast.show("购地成功！", 1500);
                    return true; // 成功
                }
                break;

            case 'upgrade': // 升级卡
            {
                const targets = [];
                for (let i = -2; i <= 2; i++) {
                    let idx = gridId + i;
                    if (idx < 1) idx += 24;
                    if (idx > 24) idx -= 24;
                    if (this.gridData[idx].owner === player.id) targets.push(this.gridData[idx]);
                }
                if (targets.length === 0) {
                    this.scene.toast.show("附近没有你的地块！", 1500);
                    return false; // 失败，不消耗
                } else {
                    // 优先升级等级最低的
                    targets.sort((a, b) => a.level - b.level);
                    targets[0].level++;
                    this.scene.ui.grid.updateGridStatus(targets[0].id, player.id, targets[0].level, targets[0].hasBlock);
                    this.scene.toast.show("地块升级成功！", 1500);
                    return true;
                }
            }
                break;

            case 'block': // 拦截卡
                if (!grid.hasBlock) {
                    grid.hasBlock = true;
                    this.scene.ui.grid.updateGridStatus(gridId, grid.owner, grid.level, true);
                    this.scene.toast.show("拦截卡放置成功！", 1500);
                } else {
                    let nextId = gridId + 1; if (nextId > 24) nextId = 1;
                    this.gridData[nextId].hasBlock = true;
                    this.scene.ui.grid.updateGridStatus(nextId, this.gridData[nextId].owner, this.gridData[nextId].level, true);
                    this.scene.toast.show("拦截卡放置在前方！", 1500);
                }
                return true;

            case 'clear': // 破障卡
                let clearedCount = 0;
                for (let i = 1; i <= 5; i++) {
                    let idx = gridId + i;
                    if (idx > 24) idx -= 24;
                    if (this.gridData[idx].hasBlock) {
                        this.gridData[idx].hasBlock = false;
                        this.scene.ui.grid.updateGridStatus(idx, this.gridData[idx].owner, this.gridData[idx].level, false);
                        clearedCount++;
                    }
                }
                if (clearedCount === 0) {
                    this.scene.toast.show("附近没有障碍物", 1000);
                    // 也可以算消耗，或者不算，看设计。这里假设不算消耗比较友好
                    return false;
                }
                this.scene.toast.show(`清除了 ${clearedCount} 个障碍！`, 1500);
                return true;

            case 'leach':
                player.leachActive = true;
                if (player.isAI) {
                    const target = Phaser.Utils.Array.GetRandom(this.scene.players.filter(p => p.id !== player.id));
                    player.leachTarget = target.id;
                    this.scene.toast.show(`${player.name} 对 ${target.name} 使用了借势卡`, 1500);
                } else {
                    const target = [...this.scene.players].sort((a,b)=>b.totalScore - a.totalScore).find(p=>p.id!==player.id);
                    player.leachTarget = target.id;
                    this.scene.toast.show(`借势卡生效！目标: ${target.name}`, 1500);
                }
                return true;

            // case 'yield':
            //     player.yieldActive = true;
            //     this.scene.toast.show("礼让卡已激活！", 1500);
            //     return true;
            //
            // case 'modesty':
            //     player.roundScore += 3;
            //     player.modestyActive = true;
            //     this.scene.toast.show("谦虚卡：+3分", 1500);
            //     return true;

            case 'tax_free':
                player.taxFreeActive = true;
                this.scene.toast.show("本轮免税已激活！", 1500);
                return true;

            case 'orbit':
                player.orbitActive = true;
                player.orbitSteps = 0;
                this.scene.toast.show("环游卡已激活！", 1500);
                return true;
        }

        // 默认刷新UI
        this.scene.ui.refreshTopPanel(this.scene.players);
        // 只有非立即结束回合的道具才需要 readyForAction，这里由 GameScene 控制
        return true;
    }
}