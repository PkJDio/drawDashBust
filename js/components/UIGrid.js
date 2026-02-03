export default class UIGrid {
    constructor(scene, layout, colors) {
        this.scene = scene;
        this.layout = layout;
        this.colors = colors;

        this.coordinates = {}; // 存储格子坐标
        this.gridGroups = {};  // 存储格子可视对象，以便更新 { bg, text, border, levelText, blockIcon }
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

        // 起点 (0号格)
        let zeroPx = startX + 6 * (size + gap);
        let zeroPy = startY + 7 * (size + gap);
        this.drawSingleGrid(zeroPx, zeroPy, 0, true, true);
        this.coordinates[0] = {x: zeroPx, y: zeroPy};
    }

    drawSingleGrid(x, y, text, isSpecial, isStart = false) {
        const size = this.layout.gridSize;

        // 我们需要把格子的各个部分存起来，方便后续更新
        // 使用 Container 或 Group 也可以，这里为了简单直接存引用

        // 1. 背景
        const bg = this.scene.add.graphics();
        const defaultColor = isSpecial ? this.colors.specialGrid : this.colors.grid;
        bg.fillStyle(defaultColor, 1);
        bg.fillRoundedRect(x, y, size, size, 12);

        // 2. 边框 (初始淡色，被占领后变色)
        const border = this.scene.add.graphics();
        border.lineStyle(3, this.colors.gridBorder, 0.3);
        border.strokeRoundedRect(x, y, size, size, 12);

        // 3. 数字文本
        const t = this.scene.add.text(x + size/2, y + size/2, text === 0 ? "起" : text, {
            fontSize: '28px', color: '#5d4037', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 4. 等级文本 (初始隐藏)
        const levelText = this.scene.add.text(x + size - 5, y + size - 5, "", {
            fontSize: '16px', color: '#e65100', fontStyle: 'bold'
        }).setOrigin(1, 1);

        // 5. 障碍物图标 (初始隐藏)
        const blockIcon = this.scene.add.text(x + 5, y + 5, "🚫", {
            fontSize: '20px'
        }).setOrigin(0, 0).setVisible(false);

        // 如果是起点，可能要特殊处理隐藏逻辑，但这里先存着
        this.gridGroups[text] = {
            x, y, size,
            bg, border, text: t, levelText, blockIcon,
            defaultColor, isSpecial
        };

        if (isStart) {
            // 起点逻辑稍有不同，这里暂时保留你之前的 hideStartGrid 接口
            this.startGridElements = [bg, border, t];
        }
    }

    hideStartGrid() {
        if (this.startGridElements) {
            this.startGridElements.forEach(el => el.setVisible(false));
        }
    }

    getCoordinates() {
        return this.coordinates;
    }

    // --- 新增：更新格子状态 ---
    /**
     * @param {number} gridId 格子ID
     * @param {number|null} ownerId 拥有者ID，null表示无主
     * @param {number} level 等级 (0为默认)
     * @param {boolean} hasBlock 是否有路障
     */
    updateGridStatus(gridId, ownerId, level, hasBlock) {
        const grid = this.gridGroups[gridId];
        if (!grid) return;

        // 1. 更新归属权 (改变边框颜色和背景微调)
        grid.border.clear();
        if (ownerId !== null && this.colors.player[ownerId]) {
            // 有主：粗边框，颜色为玩家色
            const pColor = this.colors.player[ownerId];
            grid.border.lineStyle(6, pColor, 1);
            grid.border.strokeRoundedRect(grid.x, grid.y, grid.size, grid.size, 12);

            // 背景也可以稍微带点玩家色调 (可选，这里先只改边框)
        } else {
            // 无主：恢复默认
            grid.border.lineStyle(3, this.colors.gridBorder, 0.3);
            grid.border.strokeRoundedRect(grid.x, grid.y, grid.size, grid.size, 12);
        }

        // 2. 更新等级
        if (level > 0) {
            grid.levelText.setText(`Lv${level}`);
            grid.levelText.setVisible(true);
        } else {
            grid.levelText.setVisible(false);
        }

        // 3. 更新障碍物
        grid.blockIcon.setVisible(hasBlock);
    }
}