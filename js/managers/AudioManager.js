// managers/AudioManager.js

export default class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.currentBgm = null;
        this.currentBgmKey = null;

        this.volumes = {
            bgm: 0.3,
            sfx: 0.6,
            notify: 0.8
        };
    }

    playBgm(key) {
        if (this.currentBgmKey === key) return;
        const fadeDuration = 1000;

        if (this.currentBgm) {
            const oldBgm = this.currentBgm;
            this.scene.tweens.add({
                targets: oldBgm, volume: 0, duration: fadeDuration,
                onComplete: () => { oldBgm.stop(); oldBgm.destroy(); }
            });
        }

        this.currentBgmKey = key;
        this.currentBgm = this.scene.sound.add(key, { loop: true, volume: 0 });
        this.currentBgm.play();

        this.scene.tweens.add({
            targets: this.currentBgm, volume: this.volumes.bgm, duration: fadeDuration
        });
    }

    /**
     * 🟢 [修改] 修复后的播放音效方法
     * 去掉了错误的 sound.get() 检查，直接检查缓存并播放
     */
    playSfx(key, isImportant = false) {
        // 1. 检查缓存里有没有这个文件 (防止文件名写错报错)
        if (!this.scene.cache.audio.exists(key)) {
            console.warn(`[AudioManager] 音效文件未找到: ${key}`);
            return;
        }

        // 2. 直接播放
        const vol = isImportant ? this.volumes.notify : this.volumes.sfx;
        this.scene.sound.play(key, { volume: vol });
    }

    stopAll() {
        this.scene.sound.stopAll();
        this.currentBgm = null;
        this.currentBgmKey = null;
    }
}