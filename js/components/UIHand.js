import { ITEM_DATA } from '../ItemConfig.js';

export default class UIHand {
    constructor(scene, layout, colors, cardDrawer) {
        this.scene = scene;
        this.layout = layout;
        this.colors = colors;
        this.cardDrawer = cardDrawer;
        this.group = null;

        // 存储当前显示的道具对象，用于点击检测
        this.itemObjects = [];
        this.onItemClick = null;
    }

    create() {
        const startY = 1280 - this.layout.btmHeight;
        this.scene.add.text(20, startY + 15, "本轮手牌:", {
            fontSize: '22px', color: '#8d6e63', padding:{top:5, bottom:5}, fontStyle:'bold'
        });
        const itemY = startY + 110;
        this.scene.add.text(20, itemY + 10, "我的道具:", {
            fontSize: '22px', color: '#8d6e63', padding:{top:5, bottom:5}, fontStyle:'bold'
        });

        this.group = this.scene.add.group();
    }

    // 设置道具点击回调
    setOnItemClick(callback) {
        this.onItemClick = callback;
    }

    update(player) {
        this.group.clear(true, true);
        this.itemObjects = []; // 清空交互对象缓存

        if (!player) return;

        const startY = 1280 - this.layout.btmHeight;

        // --- 1. 绘制手牌 ---
        let cardX = 150;
        const cardY = startY + 40;
        const gap = 55;

        if (player.cards) {
            player.cards.forEach(cardVal => {
                const elems = this.cardDrawer.drawMedium(cardX, cardY, cardVal, false, null);
                if (elems) {
                    this.group.addMultiple(elems);
                }
                cardX += gap;
            });
        }

        // --- 2. 绘制道具 ---
        // 道具显示在下方
        let itemX = 150;
        const itemY = startY + 110 + 40; // 这里的 110 跟 create 里的文字位置对应，+40 是卡片偏移

        if (player.items) {
            player.items.forEach((itemType, index) => {
                const data = ITEM_DATA[itemType];
                if (data) {
                    // 判断是否被选中 (逻辑在外部控制，这里暂时都非选中)
                    // 实际交互时我们会重绘或者用 overlay，这里先画基础状态
                    const elems = this.cardDrawer.drawItem(itemX, itemY, data.name, null, false);
                    this.group.addMultiple(elems);

                    const bg = elems[0]; // 背景 Graphics

                    // 保存引用，并使其可交互 (为了后续的道具使用阶段)
                    // 注意：Phaser Graphics 默认不可点击，需要 setInteractive
                    // 为了精确点击，我们覆盖一个 Zone
                    const zone = this.scene.add.zone(itemX + 22, itemY + 25, 44, 50).setInteractive();
                    zone.on('pointerdown', () => {
                        if (this.onItemClick) this.onItemClick(itemType, index, itemX, itemY);
                    });
                    this.group.add(zone);

                    this.itemObjects.push({ type: itemType, index: index, x: itemX, y: itemY, bg: bg });
                }
                itemX += gap;
            });
        }
    }

    // 高亮指定道具 (用于选中状态)
    highlightItem(index) {
        // 简单实现：重绘所有道具，选中的那个传 isSelected=true
        // 或者简单地在上面画个框。为了视觉统一，这里留给 update 扩展，
        // 但为了性能，我们直接在当前对象上画框框比较好。
        // 这里暂时先不做复杂，等到 GameScene 需要高亮时再调用 update 即可，
        // 或者在 UI 层画一个选择框。
    }
}