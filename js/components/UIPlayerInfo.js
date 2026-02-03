export default class UIPlayerInfo {
    constructor(scene, layout, colors, cardDrawer) {
        this.scene = scene;
        this.layout = layout;
        this.colors = colors;
        this.cardDrawer = cardDrawer; // 引用 UICard 实例
        this.group = null;
    }

    create(players) {
        if (this.group) this.group.destroy(true);
        this.group = this.scene.add.group();

        const count = players.length;
        let cols = 3, rows = 2;
        if (count <= 2) { cols = 2; rows = 1; }
        else if (count <= 4) { cols = 2; rows = 2; }
        else { cols = 3; rows = 2; }

        const colWidth = 720 / cols;
        const rowHeight = this.layout.topHeight / rows;

        players.forEach((p, index) => {
            const colIndex = index % cols;
            const rowIndex = Math.floor(index / cols);
            const baseX = colIndex * colWidth;
            const baseY = rowIndex * rowHeight;

            // 背景
            const cardBg = this.scene.add.graphics();
            cardBg.fillStyle(0xffffff, 0.5);
            cardBg.fillRoundedRect(baseX + 5, baseY + 5, colWidth - 10, rowHeight - 10, 10);
            this.group.add(cardBg);

            // 图标
            const iconX = baseX + 25; const iconY = baseY + 25;
            const icon = this.scene.add.circle(iconX, iconY, 10, this.colors.player[index]);
            icon.setStrokeStyle(2, 0xffffff);
            this.group.add(icon);

            // 名字
            const nameColor = p.state === 'playing' ? this.colors.textNormal : this.colors.textGray;
            const nameText = this.scene.add.text(baseX + 40, baseY + 12, p.name, {
                fontSize: '22px', color: nameColor, padding: { top:4, bottom:4 }, fontStyle: 'bold'
            });
            this.group.add(nameText);

            // 总分
            const scoreText = this.scene.add.text(baseX + colWidth - 10, baseY + 12, `总:${p.totalScore}`, {
                fontSize: '20px', color: this.colors.textHighlight, fontStyle:'bold', padding: { top:4, bottom:4 }
            }).setOrigin(1, 0);
            this.group.add(scoreText);

            // 卡牌显示
            let cardStartX = baseX + 15;
            let cardStartY = baseY + 55;
            if (rows === 1) cardStartY = baseY + 70;

            const cardGap = 34;
            const maxW = colWidth - 80;
            let isGray = (p.state === 'done' || p.state === 'bust' || p.state === 'frozen');

            if (p.cards) {
                p.cards.forEach((num) => {
                    if ((cardStartX - baseX) > maxW) {
                        cardStartX = baseX + 15;
                        cardStartY += 38;
                    }
                    // 调用 CardDrawer
                    this.cardDrawer.drawSmall(cardStartX, cardStartY, num, isGray, this.group);
                    cardStartX += cardGap;
                });
            }

            // 状态文字
            const statusY = baseY + 55;
            if (p.state === 'bust') {
                const bustText = this.scene.add.text(baseX + colWidth - 10, statusY + 12, "已爆", {
                    fontSize: '20px', color: this.colors.textBust, fontStyle:'bold', padding: { top: 2, bottom: 2 }
                }).setOrigin(1, 0.5);
                this.group.add(bustText);
            } else if (p.state === 'frozen') {
                const freezeText = this.scene.add.text(baseX + colWidth - 10, statusY + 12, "冻结", {
                    fontSize: '20px', color: '#42a5f5', fontStyle:'bold', padding: { top: 2, bottom: 2 }
                }).setOrigin(1, 0.5);
                this.group.add(freezeText);
            } else if ((p.cards && p.cards.length > 0) || p.state === 'playing' || p.state === 'done') {
                const roundScoreText = this.scene.add.text(baseX + colWidth - 10, statusY + 12, `本轮:${p.roundScore}`, {
                    fontSize: '18px', color: '#4caf50', fontStyle:'bold', padding: { top: 2, bottom: 2 }
                }).setOrigin(1, 0.5);
                this.group.add(roundScoreText);
            }
        });
    }

    refresh(players) {
        this.create(players);
    }
}