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
        // [核心修复] 如果已有弹窗，立即销毁
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        // 清除旧的定时器
        if (this.timer) {
            this.timer.remove();
            this.timer = null;
        }
        // 🟢 [新增 1] 标记弹窗处于激活状态
        this.scene.isToastActive = true;

        const { width, height } = this.scene.scale;

        // 显示遮罩
        this.mask.setVisible(true);

        // 创建容器
        this.container = this.scene.add.container(width / 2, height / 2).setDepth(3000);

        // --- 文本设置 ---
        const bgW = 480;
        const textStyle = {
            fontSize: '32px',
            color: '#000000',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: bgW - 60 },
            padding: { top: 15, bottom: 15 }
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

        // --- 按钮与倒计时逻辑 ---
        const btnW = 160; // 稍微加宽一点以容纳倒计时文字
        const btnH = 50;
        const btnY = (bgH / 2) - 50;

        const btnBg = this.scene.add.graphics();
        btnBg.fillStyle(0x000000, 1);
        btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 15);

        // 计算初始秒数
        let secondsLeft = Math.ceil(duration / 1000);

        // 初始文字：如果有倒计时显示秒数，否则只显示确认
        const initialText = duration > 0 ? `确认 (${secondsLeft}s)` : "确认";

        const btnText = this.scene.add.text(0, btnY, initialText, {
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

        // 🟢 [核心修改] 倒计时逻辑
        if (duration > 0) {
            // 使用 loop 定时器，每秒执行一次
            this.timer = this.scene.time.addEvent({
                delay: 1000, // 1秒一次
                callback: () => {
                    // 如果容器已经被销毁（比如用户手动点击了关闭），停止逻辑
                    if (!this.container || !this.container.active) {
                        if (this.timer) this.timer.remove();
                        return;
                    }

                    secondsLeft--;

                    if (secondsLeft > 0) {
                        // 更新文字
                        btnText.setText(`确认 (${secondsLeft}s)`);
                    } else {
                        // 时间到，关闭
                        this.hide();
                    }
                },
                loop: true
            });
        }
    }

    hide() {
        if (this.mask) this.mask.setVisible(false);

        if (this.timer) {
            this.timer.remove();
            this.timer = null;
        }

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

                    // 🟢 [新增 2] 标记弹窗结束，并广播事件
                    this.scene.isToastActive = false;
                    this.scene.events.emit('toast_closed');
                }
            });
        } else {
            // 如果容器本来就不存在（异常情况），也要确保状态复位
            this.scene.isToastActive = false;
            this.scene.events.emit('toast_closed');
        }
    }
}