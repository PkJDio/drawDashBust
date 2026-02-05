// 水果机图标映射 (1-24格)
const GRID_ICONS = [
    null, '🍊', '🍎', '🌙', '🌙', '🍉', '🥭',
    '🔔', '🍎', '🌟', '☘️', '🍊', '🥭',
    '🍎', '🔔', '☀️', '☀️', '🍉', '🥭',
    '🍊', '🍎', '🌟', '🍀', '🔔', '🍉'
];

export default class UIGrid {
    constructor(scene, layout, colors) {
        this.scene = scene;
        this.layout = layout;
        this.colors = colors;
        this.coordinates = {};
        this.gridGroups = {};
        this.activeLights = new Set(); // 记录当前常亮的格子ID（由幸运事件触发）
        this.overlayMask = null;       // 全局半透明遮罩
        this.lightningLayer = null;    // 闪电层
    }

    drawZones() {
        const graphics = this.scene.add.graphics();

        // 1. 绘制顶部和底部 (Top/Bottom) - 米色背景
        graphics.fillStyle(this.colors.bgZone, 1);
        graphics.fillRect(0, 0, 720, this.layout.topHeight);

        const btmY = 1280 - this.layout.btmHeight;
        graphics.fillRect(0, btmY, 720, this.layout.btmHeight);

        // 🟢 [核心修改] 2. 绘制中间棋盘区域背景 (Board Area) - 淡青色
        // 这里填充中间原本留白的部分，形成颜色区分
        const midHeight = 1280 - this.layout.topHeight - this.layout.btmHeight;
        // 如果 ui.js 里没有定义 bgBoard，就默认用一个淡青色
        const boardColor = this.colors.bgBoard || 0xe0f2f1;

        graphics.fillStyle(boardColor, 1);
        graphics.fillRect(0, this.layout.topHeight, 720, midHeight);

        // 分割线：改为柔和的白色半透明线条，代替生硬的实线
        graphics.lineStyle(4, 0xffffff, 0.6);
        graphics.lineBetween(0, this.layout.topHeight, 720, this.layout.topHeight);
        graphics.lineBetween(0, btmY, 720, btmY);
    }

    drawBoard() {
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

        this.createGlobalMask();
    }

    drawSingleGrid(x, y, text, isSpecial) {
        const size = this.layout.gridSize;

        // 1. 背景层
        const bg = this.scene.add.graphics();
        // 🟢 [核心修改] 使用 ui.js 定义的颜色
        // 普通格使用 this.colors.grid (通常是纯白)
        // 特殊格使用 this.colors.specialGrid (通常是淡粉/淡黄)
        const defaultColor = isSpecial ? this.colors.specialGrid : this.colors.grid;

        bg.fillStyle(defaultColor, 1);
        bg.fillRoundedRect(x, y, size, size, 12);

        // 2. 高亮层 (用于闪烁、跑马灯和常亮)
        const highlight = this.scene.add.graphics();
        highlight.setAlpha(0);
        highlight.setDepth(5); // 确保灯光在背景之上

        // 3. Emoji 图标
        let iconTextObj = null;
        if (text >= 1 && text <= 24) {
            const emoji = GRID_ICONS[text];
            if (emoji) {
                iconTextObj = this.scene.add.text(x + size / 2, y + size / 2, emoji, {
                    fontSize: '44px',
                    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                    padding: { top: 10, bottom: 10, left: 0, right: 0 } // 🟢 修复Emoji被削顶
                }).setOrigin(0.5).setAlpha(0.85).setDepth(6); // 稍微提高不透明度，让图标更清晰
            }
        }

        // 4. 边框
        const border = this.scene.add.graphics();
        // 🟢 [样式微调] 边框颜色变淡，线条变细，更精致
        border.lineStyle(2, this.colors.gridBorder, 0.5);
        border.strokeRoundedRect(x, y, size, size, 12);
        border.setDepth(7);

        // 5. 格子编号文字
        const t = this.scene.add.text(x + 6, y + 4, text === 0 ? "起" : text, {
            fontSize: '16px', color: '#8d6e63', fontStyle: 'bold' // 颜色改用柔和的深棕色
        }).setDepth(8).setAlpha(0.6);

        // 6. 等级与禁止标志
        const levelText = this.scene.add.text(x + size - 4, y + size - 4, "", {
            fontSize: '14px', color: '#ff7043', fontStyle: 'bold' // 升级文字用暖橙色
        }).setOrigin(1, 1).setDepth(8);

        const blockIcon = this.scene.add.text(x + size - 5, y + 5, "🚫", { fontSize: '16px' }).setOrigin(1, 0).setVisible(false).setDepth(8);

        // 存储对象
        this.gridGroups[text] = {
            x, y, size, bg, highlight, border, text: t, levelText, blockIcon, icon: iconTextObj,
            defaultColor, isSpecial
        };
    }

    // --- 🟢 基础接口 ---

    hideStartGrid() {
        // 不需要执行任何操作
    }

    getCoordinates() {
        return this.coordinates;
    }

    updateGridStatus(gridId, ownerId, level, hasBlock) {
        const grid = this.gridGroups[gridId];
        if (!grid) return;

        grid.border.clear();
        if (ownerId !== null && this.colors.player[ownerId]) {
            const pColor = this.colors.player[ownerId];
            // 占领状态：边框加粗，颜色鲜艳
            grid.border.lineStyle(5, pColor, 1);
            grid.border.strokeRoundedRect(grid.x, grid.y, grid.size, grid.size, 12);
        } else {
            // 未占领：恢复默认柔和边框
            grid.border.lineStyle(2, this.colors.gridBorder, 0.5);
            grid.border.strokeRoundedRect(grid.x, grid.y, grid.size, grid.size, 12);
        }

        if (level > 0) {
            grid.levelText.setText(`Lv${level}`).setVisible(true);
        } else {
            grid.levelText.setVisible(false);
        }
        grid.blockIcon.setVisible(hasBlock);
    }

    // --- 🟢 跑马灯核心功能 ---

    runMarquee(options, onComplete) {
        // laps 建议传 3 或 4，确保前期冲刺时间够长
        const { startId = 1, laps = 3, targetId, color = 0xffffff, count = 1 } = options;

        let currentId = startId;
        let finalDistance = (targetId >= startId ? targetId - startId : 24 - (startId - targetId));
        let totalSteps = (laps * 24) + finalDistance;
        let stepCount = 0;

        const moveStep = () => {
            // 1. 熄灭旧灯 (逻辑保持不变)
            for(let i = 0; i < count; i++) {
                let oldId = (currentId - i) <= 0 ? (currentId - i + 24) : (currentId - i);
                if (!this.activeLights.has(oldId)) this.setGridLight(oldId, false);
            }

            currentId = currentId >= 24 ? 1 : currentId + 1;
            stepCount++;

            // 🟢 [新增] 播放跑马灯音效
            // 只有当速度够快时才播放，或者始终播放（因为你已经剪辑得很短了，直接播放即可）
            if (this.scene.audioManager) {
                this.scene.audioManager.playSfx('sfx_marquee');
            }

            // 2. 点亮当前灯
            for(let i = 0; i < count; i++) {
                let headId = (currentId - i) <= 0 ? (currentId - i + 24) : (currentId - i);
                this.setGridLight(headId, true, color);
            }

            if (stepCount < totalSteps) {
                let delay;
                let remainingSteps = totalSteps - stepCount;

                // 🟢 极速与极慢的切换逻辑
                if (remainingSteps > 5) {
                    // 第一阶段：超级快
                    // 只要不在最后5格，始终保持最高速 30ms
                    delay = 30;
                } else {
                    // 第二阶段：最后5格急刹车
                    const slowBase = [900, 600, 400, 250, 150];
                    delay = slowBase[remainingSteps - 1] || 150;
                }

                this.scene.time.delayedCall(delay, moveStep);
            } else {
                // 3. 结束后处理常亮逻辑
                for(let i = 0; i < count; i++) {
                    let finalId = (currentId - i) <= 0 ? (currentId - i + 24) : (currentId - i);
                    this.activeLights.add(finalId);
                }
                if (onComplete) onComplete(currentId);
            }
        };
        moveStep();
    }

    setGridLight(gridId, isActive, color = 0xffffff, alpha = 0.7) {
        const grid = this.gridGroups[gridId];
        if (!grid) return;

        // 强制转换颜色值为数字，防止字符串导致的渲染错误
        const numericColor = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;

        if (isActive) {
            grid.highlight.clear();
            // 🟢 增强灯光感：外围光晕 + 中心强光
            grid.highlight.fillStyle(numericColor, 0.35);
            grid.highlight.fillRoundedRect(grid.x - 6, grid.y - 6, grid.size + 12, grid.size + 12, 16);
            grid.highlight.fillStyle(numericColor, 0.8);
            grid.highlight.fillRoundedRect(grid.x, grid.y, grid.size, grid.size, 12);
            grid.highlight.setAlpha(alpha);
        } else {
            grid.highlight.setAlpha(0);
        }
    }

    clearAllLights() {
        this.activeLights.forEach(id => this.setGridLight(id, false));
        this.activeLights.clear();
        this.hideGlobalMask();
    }

    // --- 🟢 特殊效果渲染 ---

    createGlobalMask() {
        this.overlayMask = this.scene.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, 720, 1280).setDepth(2000).setVisible(false);
        this.lightningLayer = this.scene.add.graphics().setDepth(2001);
    }

    showGlobalMask(duration = 500) {
        this.overlayMask.setVisible(true).setAlpha(0);
        this.scene.tweens.add({ targets: this.overlayMask, alpha: 1, duration: duration });
    }

    hideGlobalMask() {
        if (!this.overlayMask) return;
        this.scene.tweens.add({
            targets: this.overlayMask, alpha: 0, duration: 300,
            onComplete: () => { this.overlayMask.setVisible(false); this.lightningLayer.clear(); }
        });
    }

    drawLightning(points) {
        this.lightningLayer.clear().lineStyle(6, 0xffffff, 1).beginPath();
        points.forEach((p, i) => {
            const coord = this.coordinates[p];
            if (i === 0) this.lightningLayer.moveTo(coord.x + 40, coord.y + 40);
            else this.lightningLayer.lineTo(coord.x + 40, coord.y + 40);
        });
        this.lightningLayer.strokePath();
        this.scene.tweens.add({ targets: this.lightningLayer, alpha: 0.2, yoyo: true, repeat: 3, duration: 50 });
    }

    getGridIdsByIcon(targetId) {
        const targetIcon = GRID_ICONS[targetId];
        const ids = [];
        GRID_ICONS.forEach((icon, id) => { if (icon === targetIcon) ids.push(id); });
        return ids;
    }

    // 棋子移动时的瞬间闪烁特效
    flashGrid(gridId, color) {
        const grid = this.gridGroups[gridId];
        if (!grid) return;

        this.setGridLight(gridId, true, color, 0.5);

        // 100ms后熄灭。如果这个格子此时被幸运事件标记为“常亮”，则不熄灭
        this.scene.time.delayedCall(100, () => {
            if (!this.activeLights.has(gridId)) {
                this.setGridLight(gridId, false);
            }
        });
    }

    /**
     * 让当前所有亮着的跑马灯闪烁
     * @param {Function} onComplete 闪烁完成后的回调
     */
    blinkActiveLights(onComplete) {
        if (this.activeLights.size === 0) {
            if (onComplete) onComplete();
            return;
        }

        const targets = [];
        this.activeLights.forEach(id => {
            const grid = this.gridGroups[id];
            if (grid && grid.highlight) targets.push(grid.highlight);
        });

        // 执行两次闪烁动画
        this.scene.tweens.add({
            targets: targets,
            alpha: 0,           // 变透明
            duration: 150,      // 闪烁速度
            yoyo: true,         // 往返（再变亮）
            repeat: 1,          // 重复1次，总共闪2下
            onComplete: () => {
                // 确保动画结束后灯光是亮着的
                targets.forEach(t => t.setAlpha(0.7));
                if (onComplete) onComplete();
            }
        });
    }
}