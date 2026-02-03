export default class UIHand {
    constructor(scene, layout, colors, cardDrawer) {
        this.scene = scene;
        this.layout = layout;
        this.colors = colors;
        this.cardDrawer = cardDrawer;
        this.group = null;
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

    update(player) {
        this.group.clear(true, true);
        if (!player || !player.cards) return;

        const startY = 1280 - this.layout.btmHeight;
        let cardX = 150;
        const cardY = startY + 40;
        const gap = 55;

        player.cards.forEach(cardVal => {
            // 调用 CardDrawer
            const elems = this.cardDrawer.drawMedium(cardX, cardY, cardVal, false, null);
            if (elems) {
                this.group.addMultiple(elems);
            }
            cardX += gap;
        });
    }
}