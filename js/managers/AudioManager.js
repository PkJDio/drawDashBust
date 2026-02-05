// managers/AudioManager.js

export default class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.currentBgm = null; // 当前正在播放的 BGM 对象
        this.currentBgmKey = null; // 当前 BGM 的 key

        // 🟢 音量配置 (核心：BGM 压低，留空间给音效)
        this.volumes = {
            bgm: 0.3, // 背景音乐 30% 音量
            sfx: 0.6, // 音效 60% 音量
            notify: 0.8 // 重要提示 (如爆牌)
        };
    }

    /**
     * 播放或切换背景音乐 (带淡入淡出效果)
     * @param {string} key 音乐的 key (如 'bgm_home')
     */
    playBgm(key) {
        // 如果要播放的和当前的一样，就不折腾了
        if (this.currentBgmKey === key) return;

        const fadeDuration = 1000; // 1秒淡入淡出

        // 1. 如果当前有音乐在放，先淡出
        if (this.currentBgm) {
            const oldBgm = this.currentBgm;
            this.scene.tweens.add({
                targets: oldBgm,
                volume: 0,
                duration: fadeDuration,
                onComplete: () => {
                    oldBgm.stop();
                    oldBgm.destroy();
                }
            });
        }

        // 2. 开始播放新音乐 (从 0 音量开始淡入)
        this.currentBgmKey = key;
        this.currentBgm = this.scene.sound.add(key, {
            loop: true,
            volume: 0
        });
        this.currentBgm.play();

        this.scene.tweens.add({
            targets: this.currentBgm,
            volume: this.volumes.bgm, // 淡入到设定的 0.3 音量
            duration: fadeDuration
        });
    }

    /**
     * 播放音效 (暂留接口，之后加音效时用)
     * @param {string} key 音效 key
     * @param {boolean} isImportant 是否是重要音效(爆牌等)，音量会更大
     */
    playSfx(key, isImportant = false) {
        if (!this.scene.sound.get(key)) return; // 防止未加载报错

        const vol = isImportant ? this.volumes.notify : this.volumes.sfx;
        this.scene.sound.play(key, { volume: vol });
    }

    // 停止所有声音 (用于彻底重置或静音)
    stopAll() {
        this.scene.sound.stopAll();
        this.currentBgm = null;
        this.currentBgmKey = null;
    }
}