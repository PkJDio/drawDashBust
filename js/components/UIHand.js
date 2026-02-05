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

        // 🟢 用于绘制选中高亮的图形对象
        this.selectionGraphics = null;

        // 🟢 新增：记录当前选中的道具索引 (-1 表示未选中)
        this.selectedIndex = -1;
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

        // 初始化选中框图形 (层级要高一点，防止被遮挡)
        this.selectionGraphics = this.scene.add.graphics().setDepth(100);
        this.group.add(this.selectionGraphics);
    }

    setOnItemClick(callback) {
        this.onItemClick = callback;
    }

    // 🟢 修改：清除选中的同时，必须重置索引状态
    clearSelection() {
        if (this.selectionGraphics) {
            this.selectionGraphics.clear();
        }
        this.selectedIndex = -1; // 重置状态，防止下一次点击判断错误
    }

    // 内部方法，绘制选中框
    drawSelection(x, y, width, height) {
        this.selectionGraphics.clear();
        // 绘制黄色发光边框
        this.selectionGraphics.lineStyle(4, 0xffeb3b, 1); // 黄色，4px宽
        this.selectionGraphics.strokeRoundedRect(x - 4, y - 4, width + 8, height + 8, 12);
    }

    update(player) {
        this.group.clear(true, true);

        // 重新创建 selectionGraphics (因为 clear 把它销毁了)
        this.selectionGraphics = this.scene.add.graphics().setDepth(100);
        this.group.add(this.selectionGraphics);

        // 🟢 重置选中状态
        this.selectedIndex = -1;
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

        // 2. 道具
        let itemX = 150;
        const itemY = startY + 110 + 25;
        const itemGap = 75;

        if (player.items) {
            player.items.forEach((itemType, index) => {
                const data = ITEM_DATA[itemType];
                if (data) {
                    // 🔒 闭包变量锁定：锁住当前循环的坐标
                    const currentItemX = itemX;
                    const currentItemY = itemY;

                    const elems = this.cardDrawer.drawItem(currentItemX, currentItemY, data.name, null, false);
                    this.group.addMultiple(elems);

                    const itemW = 60;
                    const itemH = 100;

                    // 交互区域
                    const zone = this.scene.add.zone(currentItemX + 30, currentItemY + 50, itemW, itemH).setInteractive();

                    // 🟢 核心交互逻辑修改
                    zone.on('pointerdown', () => {
                        // 🟢 [新增] 播放点击音效
                        this.scene.audioManager.playSfx('sfx_select');

                        // 判断：如果点击的是当前已经选中的道具
                        if (this.selectedIndex === index) {
                            // 逻辑 A: 取消选中
                            this.clearSelection(); // 清除黄框和重置索引

                            // 触发回调，传 null 表示取消
                            if (this.onItemClick) this.onItemClick(null);
                        } else {
                            // 逻辑 B: 选中新的 (或者从 A 切换到 B)
                            this.selectedIndex = index; // 更新索引
                            this.drawSelection(currentItemX, currentItemY, itemW, itemH); // 绘制黄框

                            // 触发回调，传具体道具信息
                            if (this.onItemClick) this.onItemClick(itemType, index, currentItemX, currentItemY);
                        }
                    });
                    this.group.add(zone);

                    this.itemObjects.push({ type: itemType, index: index, x: currentItemX, y: currentItemY });
                }
                itemX += itemGap; // 坐标递增
            });
        }
    }
}