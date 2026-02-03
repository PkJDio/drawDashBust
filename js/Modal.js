export default class Modal {
    constructor(scene) {
        this.scene = scene;
        this.container = null;

        // [核心修改] 构造时就创建好遮罩，不再反复销毁创建
        // 先尝试清理场景中可能残留的同名遮罩（防止热重载或重复初始化导致的残留）
        const oldOverlays = this.scene.children.getAll('name', 'global_modal_overlay');
        oldOverlays.forEach(o => o.destroy());

        const { width, height } = this.scene.scale;

        // 创建一个常驻的全屏遮罩
        this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.6)
            .setOrigin(0, 0)       // 确保从左上角开始
            .setDepth(2999)        // 高层级
            .setName('global_modal_overlay') // 命名以便查找
            .setVisible(false)     // 默认隐藏
            .setInteractive();     // 阻挡点击
    }

    /**
     * 通用：显示目标选择弹窗
     */
    showTargetSelection(title, targets, onSelect) {
        this.createBaseModal(title, 0xffe082);

        let startY = -60;
        targets.forEach((p, index) => {
            const y = startY + index * 60;
            const isMe = !p.isAI;
            const nameColor = isMe ? 0x1565c0 : 0x5d4037;
            const btnColor = isMe ? 0xbbdefb : 0xd7ccc8;

            this.createButton(0, y, p.name, btnColor, () => {
                onSelect(p);
            }, nameColor);
        });

        this.animateIn();
    }

    /**
     * 结算：显示每轮结算
     */
    showRoundResult(roundNum, players, onNextRound) {
        this.createBaseModal(`第 ${roundNum} 轮 结算`);

        let startY = -80;
        this.addTextRow(0, startY, "玩家", "本轮得分", "总分", true);
        startY += 50;

        players.forEach((p, index) => {
            const y = startY + index * 40;
            const scoreStr = p.state === 'bust' ? "爆牌" : `+${p.roundScore}`;
            const color = p.state === 'bust' ? '#e53935' : '#43a047';
            this.addTextRow(0, y, p.name, scoreStr, p.totalScore, false, color);
        });

        this.createButton(0, 200, "开始下一轮", 0x4db6ac, onNextRound);
        this.animateIn();
    }

    /**
     * 结算：显示游戏结果
     */
    showGameResult(players, onRestart) {
        const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
        const winner = sortedPlayers[0];

        this.createBaseModal("🏆 游戏结束 🏆", 0xffecb3);

        const winnerText = this.scene.add.text(0, -100, `冠军: ${winner.name}`, {
            fontSize: '36px', color: '#ff6f00', fontStyle: 'bold', padding: { top:10, bottom:10 }
        }).setOrigin(0.5);
        this.container.add(winnerText);

        let startY = -40;
        sortedPlayers.forEach((p, index) => {
            const y = startY + index * 45;
            const rankStr = index === 0 ? "👑" : `${index + 1}.`;
            const color = !p.isAI ? '#1565c0' : '#5d4037';
            this.addTextRow(0, y, `${rankStr} ${p.name}`, "", p.totalScore, false, color);
        });

        this.createButton(0, 200, "回到主菜单", 0xff7043, onRestart);
        this.animateIn();
    }

    // --- 内部辅助 ---

    createBaseModal(title, headerColor = 0xb2dfdb) {
        // 先清理可能存在的旧内容容器（但不销毁遮罩，只销毁内容）
        this.destroyContent();

        // 1. 显示遮罩
        this.overlay.setVisible(true);
        // 重新确保它在最上层 (防止被 Toast 盖住又盖住新 Toast)
        this.overlay.setDepth(2999);

        // 2. 创建弹窗容器
        const centerX = this.scene.scale.width / 2;
        const centerY = this.scene.scale.height / 2;
        this.container = this.scene.add.container(centerX, centerY).setDepth(3000);
        this.container.setName('modal_container');

        const bg = this.scene.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-300, -250, 600, 500, 20);
        bg.lineStyle(4, 0x8d6e63, 1);
        bg.strokeRoundedRect(-300, -250, 600, 500, 20);

        const titleBg = this.scene.add.graphics();
        titleBg.fillStyle(headerColor, 1);
        titleBg.fillRoundedRect(-298, -248, 596, 70, {tl:18, tr:18, bl:0, br:0});

        const titleText = this.scene.add.text(0, -213, title, {
            fontSize: '32px', color: '#004d40', fontStyle: 'bold', padding: { top:10, bottom:10 }
        }).setOrigin(0.5);

        this.container.add([bg, titleBg, titleText]);
    }

    addTextRow(x, y, col1, col2, col3, isHeader, color = '#5d4037') {
        const style = {
            fontSize: isHeader ? '24px' : '22px',
            color: isHeader ? '#00796b' : color,
            fontStyle: isHeader ? 'bold' : 'normal',
            padding: { top: 5, bottom: 5 }
        };
        const t1 = this.scene.add.text(x - 250, y, col1, style).setOrigin(0, 0.5);
        const t2 = this.scene.add.text(x, y, col2, style).setOrigin(0.5);
        const t3 = this.scene.add.text(x + 250, y, col3, style).setOrigin(1, 0.5);
        this.container.add([t1, t2, t3]);
    }

    createButton(x, y, label, color, callback, textColor = 0xffffff) {
        const w = 220; const h = 50;
        const bg = this.scene.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(x - w/2, y - h/2, w, h, 25);

        const textStyle = { fontSize: '24px', fontStyle: 'bold', padding: { top:5, bottom:5 } };
        const text = this.scene.add.text(x, y, label, textStyle).setOrigin(0.5);
        text.setColor(typeof textColor === 'number' ? '#' + textColor.toString(16) : textColor);

        const zone = this.scene.add.zone(x, y, w, h).setInteractive();
        zone.on('pointerdown', () => {
            this.destroy(); // 这里调用 destroy 实际上是隐藏遮罩 + 销毁内容
            callback();
        });
        this.container.add([bg, text, zone]);
    }

    animateIn() {
        if (!this.container) return;
        this.container.setScale(0);
        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            duration: 300,
            ease: 'Back.out'
        });
    }

    // 只销毁内容容器
    destroyContent() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        // 额外保险：清理场景中任何残留的 modal_container
        const oldContainers = this.scene.children.getAll('name', 'modal_container');
        oldContainers.forEach(c => c.destroy());
    }

    // [核心修复] 关闭弹窗 = 隐藏遮罩 + 销毁内容
    destroy() {
        // 1. 隐藏遮罩 (不销毁，留着下次用)
        if (this.overlay) {
            this.overlay.setVisible(false);
        }

        // 2. 销毁内容
        this.destroyContent();
    }
}