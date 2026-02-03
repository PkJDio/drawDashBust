export default class Toast {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.timer = null;

        // 初始化全屏遮罩 (单例，默认隐藏)
        const { width, height } = this.scene.scale;
        this.mask = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.4)
            .setOrigin(0, 0)
            .setDepth(2999)
            .setVisible(false)
            .setInteractive();

        this.mask.on('pointerdown', () => {
            this.hide();
        });
    }

    show(message, duration = 2000) {
        // [核心修复] 如果已有弹窗，立即销毁，不要播放退出动画，防止重叠
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        if (this.timer) {
            this.timer.remove();
            this.timer = null;
        }

        const { width, height } = this.scene.scale;

        // 显示遮罩
        this.mask.setVisible(true);

        // 创建容器
        this.container = this.scene.add.container(width / 2, height / 2).setDepth(3000);

        // 文本设置 (增加宽度和Padding防止削顶)
        const bgW = 480;
        const textStyle = {
            fontSize: '32px',
            color: '#000000',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: bgW - 60 },
            padding: { top: 15, bottom: 15 } // 增加 Padding 防止文字削顶
        };

        const text = this.scene.add.text(0, 0, message, textStyle).setOrigin(0.5);

        // 动态高度计算
        const textH = text.height;
        const btnAreaH = 80;
        const padding = 50;
        const bgH = textH + btnAreaH + padding;

        text.y = -(btnAreaH / 2);

        // 背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 20);
        bg.lineStyle(4, 0x000000, 1);
        bg.strokeRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 20);

        // 按钮
        const btnW = 140;
        const btnH = 50;
        const btnY = (bgH / 2) - 50;

        const btnBg = this.scene.add.graphics();
        btnBg.fillStyle(0x000000, 1);
        btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 15);

        const btnText = this.scene.add.text(0, btnY, "确认", {
            fontSize: '24px', color: '#ffffff', fontStyle: 'bold', padding: { top: 5, bottom: 5 }
        }).setOrigin(0.5);

        const btnZone = this.scene.add.zone(0, btnY, btnW, btnH).setInteractive();
        btnZone.on('pointerdown', () => {
            this.hide();
        });

        this.container.add([bg, text, btnBg, btnText, btnZone]);

        // 入场动画
        this.container.setScale(0);
        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            duration: 300,
            ease: 'Back.out'
        });

        // 自动消失
        if (duration > 0) {
            this.timer = this.scene.time.delayedCall(duration, () => {
                this.hide();
            });
        }
    }

    hide() {
        if (this.mask) this.mask.setVisible(false);

        if (this.container) {
            // 退出动画
            this.scene.tweens.add({
                targets: this.container,
                alpha: 0,
                scale: 0.8,
                duration: 150,
                onComplete: () => {
                    if (this.container) this.container.destroy();
                    this.container = null;
                }
            });
        }
        if (this.timer) {
            this.timer.remove();
            this.timer = null;
        }
    }
}