export default class UIGrid {
    constructor(scene, layout, colors) {
        this.scene = scene;
        this.layout = layout;
        this.colors = colors;

        this.coordinates = {}; // 存储格子坐标
        this.startGridElements = []; // 起点格子元素(用于隐藏)
    }

    drawZones() {
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(this.colors.bgZone, 1);
        graphics.fillRect(0, 0, 720, this.layout.topHeight);

        const btmY = 1280 - this.layout.btmHeight;
        graphics.fillRect(0, btmY, 720, this.layout.btmHeight);

        graphics.lineStyle(4, 0xffffff, 1);
        graphics.lineBetween(0, this.layout.topHeight, 720, this.layout.topHeight);
        graphics.lineBetween(0, btmY, 720, btmY);
    }

    drawBoard() {
        const startX = 60;
        const startY = this.layout.topHeight + 10;
        const size = this.layout.gridSize;
        const gap = this.layout.gridGap;

        const path = [];
        for (let x = 6; x >= 0; x--) path.push({x: x, y: 6});
        for (let y = 5; y >= 0; y--) path.push({x: 0, y: y});
        for (let x = 1; x <= 6; x++) path.push({x: x, y: 0});
        for (let y = 1; y <= 5; y++) path.push({x: 6, y: y});

        path.forEach((pos, index) => {
            let gridIndex = index + 1;
            let px = startX + pos.x * (size + gap);
            let py = startY + pos.y * (size + gap);
            let isSpecial = [1, 6, 12, 18].includes(gridIndex);
            this.drawSingleGrid(px, py, gridIndex, isSpecial);
            this.coordinates[gridIndex] = {x: px, y: py};
        });

        let zeroPx = startX + 6 * (size + gap);
        let zeroPy = startY + 7 * (size + gap);
        this.drawSingleGrid(zeroPx, zeroPy, 0, true, true);
        this.coordinates[0] = {x: zeroPx, y: zeroPy};
    }

    drawSingleGrid(x, y, text, isSpecial, saveRef = false) {
        const g = this.scene.add.graphics();
        const size = this.layout.gridSize;
        g.fillStyle(isSpecial ? this.colors.specialGrid : this.colors.grid, 1);
        g.fillRoundedRect(x, y, size, size, 12);
        g.lineStyle(3, this.colors.gridBorder, 0.3);
        g.strokeRoundedRect(x, y, size, size, 12);

        const t = this.scene.add.text(x + size/2, y + size/2, text, {
            fontSize: '28px', color: '#5d4037', fontFamily: 'Arial', fontStyle: 'bold', padding: { top: 5, bottom: 5 }
        }).setOrigin(0.5);

        if (saveRef) {
            this.startGridElements.push(g);
            this.startGridElements.push(t);
        }
    }

    hideStartGrid() {
        this.startGridElements.forEach(el => el.setVisible(false));
    }

    getCoordinates() {
        return this.coordinates;
    }
}