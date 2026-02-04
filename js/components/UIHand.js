import { ITEM_DATA } from '../ItemConfig.js';

export default class UIHand {
    constructor(scene, layout, colors, cardDrawer) {
        this.scene = scene;
        this.layout = layout;
        this.colors = colors;
        this.cardDrawer = cardDrawer;
        this.group = null;

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

    setOnItemClick(callback) {
        this.onItemClick = callback;
    }

    update(player) {
        this.group.clear(true, true);
        this.itemObjects = [];

        if (!player) return;

        const startY = 1280 - this.layout.btmHeight;

        // 1. 手牌
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

        // 2. 道具 (修改：适应大卡片布局)
        let itemX = 150;
        // 道具卡高100，这里让它向下一点，避免和文字重叠
        const itemY = startY + 110 + 25;
        const itemGap = 75; // 加大间距 (60宽 + 15空隙)

        if (player.items) {
            player.items.forEach((itemType, index) => {
                const data = ITEM_DATA[itemType];
                if (data) {
                    // 外部很难直接控制重绘选中态，这里简单根据 GameScene 状态不太好传
                    // 我们依赖点击后的 UI 覆盖框或者重绘。
                    // 暂时先绘制普通状态。
                    const elems = this.cardDrawer.drawItem(itemX, itemY, data.name, null, false);
                    this.group.addMultiple(elems);

                    // 交互区域扩大
                    const zone = this.scene.add.zone(itemX + 30, itemY + 50, 60, 100).setInteractive();
                    zone.on('pointerdown', () => {
                        // 传递 itemX, itemY 给上层，用于定位按钮
                        if (this.onItemClick) this.onItemClick(itemType, index, itemX, itemY);
                    });
                    this.group.add(zone);

                    this.itemObjects.push({ type: itemType, index: index, x: itemX, y: itemY });
                }
                itemX += itemGap;
            });
        }
    }
}