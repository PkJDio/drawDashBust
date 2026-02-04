// 水果机图标映射 (1-24格)
// 固定配置：
// 3:小月亮🌙, 4:大月亮🌕, 10:三叶草☘️, 15:小太阳🌤️, 16:大太阳☀️, 22:四叶草🍀
// 其余填充：苹果🍎, 西瓜🍉, 木瓜🥭, 橙子🍊, 铃铛🔔, 双星🌟
const GRID_ICONS = [
    null, // 0号占位符
    '🍊', '🍎', '🌙', '🌙', '🍉', '🥭', // 3(小月), 4(大月)
    '🔔', '🍎', '🌟', '☘️', '🍊', '🥭', // 7-12 (10 固定)
    '🍎', '🔔', '☀️', '☀️', '🍉', '🥭', // 13-18 (15小阳, 16大阳)
    '🍊', '🍎', '🌟', '🍀', '🔔', '🍉'  // 19-24 (22 固定)
];

export default class UIGrid {
    constructor(scene, layout, colors) {
        this.scene = scene;
        this.layout = layout;
        this.colors = colors;
        this.coordinates = {};
        this.gridGroups = {};
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
        // 动态计算水平居中
        const totalWidth = (7 * this.layout.gridSize) + (6 * this.layout.gridGap);
        const startX = (720 - totalWidth) / 2;
        const startY = this.layout.topHeight + 15;
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
            let isSpecial = [10, 22].includes(gridIndex);
            this.drawSingleGrid(px, py, gridIndex, isSpecial);
            this.coordinates[gridIndex] = {x: px, y: py};
        });
    }

    drawSingleGrid(x, y, text, isSpecial, isStart = false) {
        const size = this.layout.gridSize;

        // 1. 背景
        const bg = this.scene.add.graphics();
        const defaultColor = isSpecial ? this.colors.specialGrid : this.colors.grid;
        bg.fillStyle(defaultColor, 1);
        bg.fillRoundedRect(x, y, size, size, 12);

        // --- 🟢 关键修改1：新增高亮层 (highlight) ---
        // 放在背景之上，Emoji之下，用于跑马灯闪烁
        const highlight = this.scene.add.graphics();
        highlight.fillStyle(0xffffff, 1); // 颜色后续由代码动态控制
        highlight.fillRoundedRect(x, y, size, size, 12);
        highlight.setAlpha(0); // 默认完全透明隐藏
        // ------------------------------------------

        // 2. Emoji 图标
        let iconTextObj = null;
        if (text >= 1 && text <= 24) {
            const emoji = GRID_ICONS[text];
            if (emoji) {
                let dynamicFontSize = '44px';
                
                iconTextObj = this.scene.add.text(x + size / 2, y + size / 2, emoji, {
                    fontSize: dynamicFontSize,
                    color: '#000000',
                    align: 'center',
                    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                    padding: { top: 10, bottom: 10 }
                }).setOrigin(0.5);
                iconTextObj.setAlpha(0.6);
            }
        }

        // 3. 边框
        const border = this.scene.add.graphics();
        border.lineStyle(3, this.colors.gridBorder, 0.3);
        border.strokeRoundedRect(x, y, size, size, 12);

        // 4. 文字
        const t = this.scene.add.text(x + 5, y + 2, text === 0 ? "起" : text, {
            fontSize: '18px', color: '#5d4037', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(0, 0);

        const levelText = this.scene.add.text(x + size - 4, y + size - 4, "", {
            fontSize: '14px', color: '#e65100', fontStyle: 'bold'
        }).setOrigin(1, 1);

        const blockIcon = this.scene.add.text(x + size - 5, y + 5, "🚫", {
            fontSize: '16px'
        }).setOrigin(1, 0).setVisible(false);

        // 存储对象 (注意这里存入了 highlight)
        this.gridGroups[text] = {
            x, y, size,
            bg, highlight, border, text: t, levelText, blockIcon, icon: iconTextObj,
            defaultColor, isSpecial
        };

        if (isStart) this.startGridElements = [bg, border, t];
    }

    hideStartGrid() {
        if (this.startGridElements) this.startGridElements.forEach(el => el.setVisible(false));
    }
    getCoordinates() { return this.coordinates; }

    updateGridStatus(gridId, ownerId, level, hasBlock) {
        const grid = this.gridGroups[gridId];
        if (!grid) return;
        grid.border.clear();
        if (ownerId !== null && this.colors.player[ownerId]) {
            const pColor = this.colors.player[ownerId];
            grid.border.lineStyle(6, pColor, 1);
            grid.border.strokeRoundedRect(grid.x, grid.y, grid.size, grid.size, 12);
        } else {
            grid.border.lineStyle(3, this.colors.gridBorder, 0.3);
            grid.border.strokeRoundedRect(grid.x, grid.y, grid.size, grid.size, 12);
        }
        if (level > 0) {
            grid.levelText.setText(`Lv${level}`);
            grid.levelText.setVisible(true);
        } else {
            grid.levelText.setVisible(false);
        }
        grid.blockIcon.setVisible(hasBlock);
    }

    // --- 🟢 关键修改2：新增 flashGrid 方法 ---
    // 这个方法被 ui.js 调用，缺少它就会报错
    flashGrid(gridId, color) {
        const grid = this.gridGroups[gridId];
        // 0号起点和不存在的格子不闪
        if (!grid || !grid.highlight) return;

        // 1. 设置高亮颜色
        grid.highlight.clear();
        grid.highlight.fillStyle(color, 1);
        grid.highlight.fillRoundedRect(grid.x, grid.y, grid.size, grid.size, 12);

        // 2. 动画：瞬间设为半透明 -> 慢慢淡出
        grid.highlight.setAlpha(0.5); // 0.5的不透明度叠加在白色背景上，形成浅色光效

        this.scene.tweens.add({
            targets: grid.highlight,
            alpha: 0,
            duration: 400, // 闪烁持续时间
            ease: 'Quad.out'
        });
    }
}