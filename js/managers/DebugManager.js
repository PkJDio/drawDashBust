// js/managers/DebugManager.js

export default class DebugManager {
    constructor(scene) {
        this.scene = scene;
    }

    setupHtmlMenu() {
        const menuBtn = document.getElementById('html-menu-btn');
        const overlay = document.getElementById('html-menu-overlay');
        const btnResume = document.getElementById('btn-resume');
        const btnRestart = document.getElementById('btn-restart');
        const btnSurrender = document.getElementById('btn-surrender');
        const btnHome = document.getElementById('btn-home');

        if (menuBtn) menuBtn.classList.remove('hidden');

        // 打开菜单
        menuBtn.onclick = () => {
            this.scene.scene.pause();
            if (overlay) overlay.classList.remove('hidden');
            menuBtn.classList.add('hidden');
        };

        // 继续游戏
        btnResume.onclick = () => {
            if (overlay) overlay.classList.add('hidden');
            menuBtn.classList.remove('hidden');
            this.scene.scene.resume();
        };

        // 重新开始 (快速重开)
        btnRestart.onclick = () => {
            localStorage.removeItem('ddb_save');
            if (overlay) overlay.classList.add('hidden');
            this.scene.scene.resume();

            // 调用场景的重开逻辑
            if (this.scene.restartGame) {
                this.scene.restartGame(this.scene.aiCount);
            }
        };

        // 🟢 [修正] 放弃本局：删除存档 -> 回首页
        btnSurrender.onclick = () => {
            localStorage.removeItem('ddb_save'); // 1. 删档
            if (overlay) overlay.classList.add('hidden');
            this.scene.scene.resume();

            // 2. 调用回首页逻辑 (传入 true 表示要把回到游戏按钮删掉)
            if (this.scene.backToHome) {
                this.scene.backToHome();
            }
        };

        // 🟢 [修正] 回到首页：保留存档 -> 回首页
        btnHome.onclick = () => {
            if (overlay) overlay.classList.add('hidden');
            this.scene.scene.resume();

            // 调用回首页逻辑
            if (this.scene.backToHome) {
                this.scene.backToHome();
            }
        };
    }

    update() {
        // ... (保持原有的 update 调试逻辑不变，为了节省篇幅这里省略，请保留原来的代码) ...
        if (typeof window !== 'undefined' && window.__DEBUG_CMD__) {
            const cmd = window.__DEBUG_CMD__;
            window.__DEBUG_CMD__ = null;
            const player = this.scene.players[0];
            switch (cmd.type) {
                case 'ADD_SCORE':
                    player.totalScore = Math.max(0, player.totalScore + cmd.value);
                    this.scene.ui.refreshTopPanel(this.scene.players);
                    this.scene.toast.show(`调试：总积分已修改为 ${player.totalScore}`);
                    break;
                case 'FREEZE_AI':
                    this.scene.players.forEach(p => { if (p.isAI) p.state = 'frozen'; });
                    this.scene.toast.show(`调试：所有电脑已冻结`);
                    break;
                case 'GIVE_SHIELD':
                    player.hasProtection = true;
                    this.scene.ui.refreshTopPanel(this.scene.players);
                    this.scene.toast.show("调试：获得保护卡");
                    break;
            }
        }
    }
}