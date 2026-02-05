// managers/DebugManager.js
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

        menuBtn.onclick = () => {
            this.scene.scene.pause();
            overlay.classList.remove('hidden');
            menuBtn.classList.add('hidden');
        };

        btnResume.onclick = () => {
            overlay.classList.add('hidden');
            menuBtn.classList.remove('hidden');
            this.scene.scene.resume();
        };

        btnRestart.onclick = () => {
            localStorage.removeItem('ddb_save');
            this.scene.scene.resume();
            this.scene.scene.restart({ aiCount: this.scene.aiCount });
            overlay.classList.add('hidden');
        };

        btnSurrender.onclick = () => {
            localStorage.removeItem('ddb_save');
            window.location.reload();
        };

        btnHome.onclick = () => {
            window.location.reload();
        };
    }

    update() {
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
                    this.scene.players.forEach(p => {
                        if (p.isAI) {
                            p.state = 'frozen';
                            this.scene.toast.show(`调试：${p.name} 已被冻结`);
                        }
                    });
                    this.scene.ui.refreshTopPanel(this.scene.players);
                    break;

                case 'GIVE_SHIELD':
                    player.hasProtection = true;
                    this.scene.toast.show("调试：获得保护卡状态 (🔰)");
                    this.scene.ui.refreshTopPanel(this.scene.players);
                    break;
            }
        }
    }
}