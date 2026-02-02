export default class GameUI {
    constructor(scene) {
        this.scene = scene;

        // 区域划分配置
        this.layout = {
            topHeight: 1280 * 0.22,
            midHeight: 1280 * 0.58,
            btmHeight: 1280 * 0.2,
            gridSize: 85,
            gridGap: 2
        };

        // 颜色配置
        this.colors = {
            grid: 0xe0e0e0,
            gridBorder: 0x000000,
            specialGrid: 0xffd700,
            textNormal: '#ffffff',
            textGray: '#999999',
            textHighlight: '#ffd700',
            textBust: '#ff3333',
            bgZone: 0x222222,
            // 玩家颜色: 红, 绿, 蓝, 黄, 紫, 青
            player: [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff00ff, 0x00ffff]
        };

        this.gridCoordinates = {};
        this.startGridElements = [];

        // 预设6个不重叠的偏移位置 (2行3列)
        this.playerOffsets = [
            {x: -26, y: -20}, {x: 0, y: -20}, {x: 26, y: -20}, // 第一行
            {x: -26, y: 18},  {x: 0, y: 18},  {x: 26, y: 18}   // 第二行
        ];
    }

    init() {
        this.drawZones();
        this.drawBoard();
        this.createTopPanel();
        this.createMidInfo();
        this.createBtmPanel();
    }

    /** 1. 画背景区域 */
    drawZones() {
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(this.colors.bgZone, 1);
        graphics.fillRect(0, 0, 720, this.layout.topHeight);

        const btmY = 1280 - this.layout.btmHeight;
        graphics.fillRect(0, btmY, 720, this.layout.btmHeight);

        graphics.lineStyle(2, 0x000000, 1);
        graphics.lineBetween(0, this.layout.topHeight, 720, this.layout.topHeight);
        graphics.lineBetween(0, btmY, 720, btmY);
    }

    /** 2. 画棋盘 */
    drawBoard() {
        const startX = 60;
        const startY = this.layout.topHeight + 40;
        const size = this.layout.gridSize;
        const gap = this.layout.gridGap;

        const path = [];
        // 下、左、上、右 四个方向生成路径
        for (let x = 6; x >= 0; x--) path.push({x: x, y: 6});
        for (let y = 5; y >= 0; y--) path.push({x: 0, y: y});
        for (let x = 1; x <= 6; x++) path.push({x: x, y: 0});
        for (let y = 1; y <= 5; y++) path.push({x: 6, y: y});

        // 绘制 1-24
        path.forEach((pos, index) => {
            let gridIndex = index + 1;
            let px = startX + pos.x * (size + gap);
            let py = startY + pos.y * (size + gap);
            let isSpecial = [1, 6, 12, 18].includes(gridIndex);

            this.drawSingleGrid(px, py, gridIndex, isSpecial);
            this.gridCoordinates[gridIndex] = {x: px, y: py};
        });

        // 绘制 0号格 (在1号格正下方)
        let zeroPx = startX + 6 * (size + gap);
        let zeroPy = startY + 7 * (size + gap);
        this.drawSingleGrid(zeroPx, zeroPy, 0, true, true);
        this.gridCoordinates[0] = {x: zeroPx, y: zeroPy};
    }

    hideStartGrid() {
        this.startGridElements.forEach(el => el.setVisible(false));
    }

    drawSingleGrid(x, y, text, isSpecial, saveRef = false) {
        const g = this.scene.add.graphics();
        const size = this.layout.gridSize;

        g.fillStyle(isSpecial ? this.colors.specialGrid : this.colors.grid, 1);
        g.lineStyle(2, this.colors.gridBorder, 1);
        g.fillRect(x, y, size, size);
        g.strokeRect(x, y, size, size);

        const t = this.scene.add.text(x + size/2, y + size/2, text, {
            fontSize: '24px',
            color: '#000000',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            padding: { top: 5, bottom: 5 }
        }).setOrigin(0.5);

        if (saveRef) {
            this.startGridElements.push(g);
            this.startGridElements.push(t);
        }
    }

    /** 3. 顶部面板: 增加头像图标 */
    createTopPanel() {
        const mockPlayers = [
            { name: "我 (P1)", totalScore: 120, roundScore: 18, cards: [12, 6], state: 'playing' },
            { name: "电脑A", totalScore: 95, roundScore: 22, cards: [5, 5, 12], state: 'done' },
            { name: "电脑B", totalScore: 40, roundScore: 0,  cards: [12, 12], state: 'bust' },
            { name: "电脑C", totalScore: 88, roundScore: 1,  cards: [1], state: 'waiting' },
            { name: "电脑D", totalScore: 60, roundScore: 0,  cards: [], state: 'waiting' },
            { name: "电脑E", totalScore: 12, roundScore: 0,  cards: [], state: 'waiting' }
        ];

        const cols = 3;
        const colWidth = 720 / cols;
        const rowHeight = this.layout.topHeight / 2;

        mockPlayers.forEach((p, index) => {
            const colIndex = index % cols;
            const rowIndex = Math.floor(index / cols);
            const baseX = colIndex * colWidth;
            const baseY = rowIndex * rowHeight;

            // --- 新增：绘制玩家颜色图标 ---
            const iconX = baseX + 15;
            const iconY = baseY + 20;
            const iconG = this.scene.add.circle(iconX, iconY, 8, this.colors.player[index]);
            iconG.setStrokeStyle(1, 0xffffff);

            // 1. 名字 (向右偏移以避开图标)
            const nameColor = p.state === 'playing' ? '#ffffff' : '#aaaaaa';
            this.scene.add.text(baseX + 30, baseY + 8, p.name, {
                fontSize: '25px', color: nameColor, padding: { top:4, bottom:4 }
            });

            // 2. 总积分
            this.scene.add.text(baseX + colWidth - 8, baseY + 8, `总:${p.totalScore}`, {
                fontSize: '25px', color: '#ffd700', padding: { top:4, bottom:4 }
            }).setOrigin(1, 0);

            // 3. 卡牌展示
            let cardStartX = baseX + 8;
            let cardStartY = baseY + 50;
            const cardGap = 36;

            let isGray = (p.state === 'done' || p.state === 'bust');

            p.cards.forEach(num => {
                this.drawSmallCard(cardStartX, cardStartY, num, isGray);
                cardStartX += cardGap;
            });

            // 4. 状态/本轮积分
            if (p.state === 'bust') {
                this.scene.add.text(cardStartX, cardStartY + 16, "已爆", {
                    fontSize: '25px', color: this.colors.textBust, fontStyle:'bold', padding: { top: 5, bottom: 5 }
                }).setOrigin(0, 0.5);
            } else {
                if (p.cards.length > 0 || p.state === 'playing') {
                    this.scene.add.text(baseX + colWidth - 8, cardStartY + 16, `本轮:${p.roundScore}`, {
                        fontSize: '25px', color: '#88ff88', padding: { top: 5, bottom: 5 }
                    }).setOrigin(1, 0.5);
                }
            }
        });
    }

    drawSmallCard(x, y, num, isGray) {
        // [修复] 这里之前少写了 const
        const w = 34;
        const h = 32;

        const bg = this.scene.add.graphics();
        const bgColor = isGray ? 0x666666 : 0xffffff;
        const alpha = isGray ? 0.5 : 1;
        bg.fillStyle(bgColor, alpha);
        bg.fillRoundedRect(x, y, w, h, 4);

        const textColor = isGray ? '#aaaaaa' : '#000000';
        this.scene.add.text(x + w/2, y + h/2, num, {
            fontSize: '20px', color: textColor, fontStyle: 'bold', padding: { top:2, bottom:2 }
        }).setOrigin(0.5);
    }

    /** 4. 中间信息区 */
    createMidInfo() {
        const centerX = 720 / 2;
        const centerY = this.layout.topHeight + (this.layout.midHeight / 2) - 40;

        this.scene.add.text(centerX, centerY - 100, "本轮预计: +18", {
            fontSize: '56px', color: '#00ff00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4, padding: { top:10, bottom:10 }
        }).setOrigin(0.5);

        this.scene.add.text(centerX, centerY - 20, "当前行动: 玩家 (我)", {
            fontSize: '32px', color: '#ffffff', padding: { top:5, bottom:5 }
        }).setOrigin(0.5);

        this.scene.add.text(centerX, centerY + 50, "刚刚抽到", {
            fontSize: '20px', color: '#aaaaaa', padding: { top:5, bottom:5 }
        }).setOrigin(0.5);

        const drawnCards = [6, 12, "x2"];

        // [修复] 这里之前少写了 const
        const cardW = 60;
        const cardH = 80;
        const cardGap = 15;

        let startX = centerX - (drawnCards.length * cardW + (drawnCards.length - 1) * cardGap) / 2 + cardW / 2;
        const cardsY = centerY + 110;

        drawnCards.forEach(val => {
            const cardG = this.scene.add.graphics();
            cardG.fillStyle(0xffffff, 1);
            cardG.fillRoundedRect(startX - cardW/2, cardsY - cardH/2, cardW, cardH, 8);
            this.scene.add.text(startX, cardsY, val, {
                fontSize: '40px', color: '#000000', fontStyle: 'bold', padding: {top:5, bottom:5}
            }).setOrigin(0.5);
            startX += (cardW + cardGap);
        });

        this.scene.add.text(centerX, this.layout.topHeight + this.layout.midHeight - 40, "牌库剩余: 42", {
            fontSize: '24px', color: '#aaaaaa', padding: { top:5, bottom:5 }
        }).setOrigin(0.5);
    }

    /** 5. 底部面板 */
    createBtmPanel() {
        const startY = 1280 - this.layout.btmHeight;
        this.scene.add.text(20, startY + 15, "我的手牌:", { fontSize: '22px', color: '#aaaaaa', padding:{top:5, bottom:5} });

        const myHandCards = [12, 6, "x2"];
        let cardX = 140;
        myHandCards.forEach(val => {
            const g = this.scene.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.lineStyle(2, 0x000000, 1);
            g.fillRoundedRect(cardX, startY + 10, 50, 60, 5);
            g.strokeRoundedRect(cardX, startY + 10, 50, 60, 5);
            this.scene.add.text(cardX + 25, startY + 40, val, {
                fontSize: '28px', color: '#000000', fontStyle: 'bold', padding:{top:5, bottom:5}
            }).setOrigin(0.5);
            cardX += 65;
        });

        const itemY = startY + 110;
        this.scene.add.text(20, itemY + 10, "我的道具:", { fontSize: '22px', color: '#aaaaaa', padding:{top:5, bottom:5} });
        const myItems = ["购地卡", "免税卡", "拦截卡"];
        let itemX = 140;
        myItems.forEach(itemName => {
            const g = this.scene.add.graphics();
            g.fillStyle(0x4488ff, 1);
            g.lineStyle(2, 0xffffff, 1);
            g.fillRoundedRect(itemX, itemY, 100, 45, 10);
            g.strokeRoundedRect(itemX, itemY, 100, 45, 10);
            this.scene.add.text(itemX + 50, itemY + 22, itemName, {
                fontSize: '20px', color: '#ffffff', fontStyle: 'bold', padding:{top:5, bottom:5}
            }).setOrigin(0.5);
            itemX += 115;
        });
    }

    /**
     * 核心修改: 绘制带名字的棋子，自动处理重叠
     * @param {number} gridId 格子ID
     * @param {number} playerIndex 玩家序号(0-5)
     * @param {string} fullPlayerName 玩家全名，用于提取简称 (例如 "电脑A")
     */
    drawPlayerAt(gridId, playerIndex, fullPlayerName = "") {
        const pos = this.gridCoordinates[gridId];
        if (!pos) return;

        // 1. 获取预设的偏移坐标
        const offset = this.playerOffsets[playerIndex % 6];

        const centerX = pos.x + 42.5 + offset.x; // 42.5是格子中心
        const centerY = pos.y + 42.5 + offset.y;

        // 2. 绘制棋子 (圆形)
        const p = this.scene.add.circle(
            centerX,
            centerY,
            13,
            this.colors.player[playerIndex] || 0xffffff
        );
        p.setStrokeStyle(2, 0xffffff);

        // 3. 提取简称
        let shortName = "P" + (playerIndex + 1);
        if (fullPlayerName) {
            if (fullPlayerName.includes("电脑")) {
                shortName = fullPlayerName.replace("电脑", "").trim().charAt(0);
            } else if (fullPlayerName.includes("我")) {
                shortName = "我";
            } else {
                shortName = fullPlayerName.charAt(0).toUpperCase();
            }
        }

        // 4. 绘制名字
        this.scene.add.text(centerX, centerY, shortName, {
            fontSize: '14px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }
}