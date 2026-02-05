// js/managers/CardManager.js

export default class CardManager {
    constructor(scene) {
        this.scene = scene;
        this.deckConfig = {
            numbers: { 0:1, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12,13:13 },
            specials: {
                'freeze':3, 'second_chance':3, 'flip_3':3, 'flash':2, 'dare':2, 'feast':2,
                'score_1':1, 'score_2':1, 'score_3':1, 'score_4':1, 'score_5':1,
                'score_6':1, 'score_7':1, 'score_8':1, 'score_9':1,
                'mult_2':1
            }
        };
        this.mainDeckCache = [];
        this.specialDeckCache = [];
        this.duelState = null;
    }

    initializeDecks() {
        this.specialDeckCache = [];
        for (let k in this.deckConfig.specials) {
            for (let i=0; i<this.deckConfig.specials[k]; i++) this.specialDeckCache.push({type:'special', value:k});
        }
        let normalDeck = [];
        for (let k in this.deckConfig.numbers) {
            for (let i=0; i<this.deckConfig.numbers[k]; i++) normalDeck.push({type:'number', value:parseInt(k)});
        }
        this.mainDeckCache = [...normalDeck, ...this.specialDeckCache];
        Phaser.Utils.Array.Shuffle(this.mainDeckCache);
    }

    reshuffleDecks() {
        this.initializeDecks();
        const cardsInPlay = [];
        this.scene.players.forEach(p => {
            if (p.cards && p.cards.length > 0) cardsInPlay.push(...p.cards);
        });

        for (const val of cardsInPlay) {
            const idx = this.mainDeckCache.findIndex(c => c.value === val);
            if (idx !== -1) this.mainDeckCache.splice(idx, 1);
        }

        this.scene.toast.show("牌库已重洗");
        this.scene.ui.updateDeckCount(this.mainDeckCache.length);
    }

    drawNumberCard() {
        for (let i = this.mainDeckCache.length - 1; i >= 0; i--) {
            if (this.mainDeckCache[i].type === 'number') {
                return this.mainDeckCache.splice(i, 1)[0];
            }
        }
        this.reshuffleDecks();
        for (let i = this.mainDeckCache.length - 1; i >= 0; i--) {
            if (this.mainDeckCache[i].type === 'number') {
                return this.mainDeckCache.splice(i, 1)[0];
            }
        }
        return null;
    }

    handleDrawClick() {
        if (this.scene.ui && this.scene.ui.grid) {
            this.scene.ui.grid.clearAllLights();
        }

        this.scene.forceClearOverlays();
        if (this.scene.isWaitingForModal) return;

        const player = this.scene.players[this.scene.currentPlayerIndex];

        if (this.scene.musouMode) {
            this.scene.startForceDraw(player, 2, () => this.scene.finishAction(player, false));
            return;
        }

        if (this.mainDeckCache.length === 0) this.reshuffleDecks();
        if (this.mainDeckCache.length === 0) { this.scene.onGiveUp(); return; }

        const card = this.mainDeckCache.pop();
        if (card.type === 'special') {
            const sIndex = this.specialDeckCache.findIndex(c => c.value === card.value);
            if (sIndex !== -1) this.specialDeckCache.splice(sIndex, 1);
        }

        this.scene.ui.updateDeckCount(this.mainDeckCache.length);
        this.scene.ui.showActionButtons(false);

        this.scene.audioManager.playSfx('sfx_draw');

        this.scene.ui.playDrawAnimation(() => {
            this.scene.ui.updateMidCard(card);
            this.handleCardEffect(player, card, false, true);
        });
    }

    handleCardEffect(player, card, isBonusOrForced, shouldMove) {
        if (player.prophecyGuess) {
            let win = false;
            let partial = false;
            if (card.type === 'number') {
                const v = card.value;
                if (player.prophecyGuess === 'small' && v >= 0 && v <= 6) win = true;
                if (player.prophecyGuess === 'big' && v >= 7 && v <= 13) win = true;
            } else {
                partial = true;
            }

            if (win) {
                player.totalScore += 10;
                this.scene.toast.show("🔮 预言正确！+10分");
            } else if (partial) {
                player.totalScore += 5;
                this.scene.toast.show("🔮 抽到特殊卡！+5分");
            } else {
                this.scene.toast.show("🔮 预言失败");
            }
            player.prophecyGuess = null;
            this.scene.ui.refreshTopPanel(this.scene.players);
        }

        player.cards.push(card.value);
        if (player.id === 0) this.scene.ui.updateBtmPanel(player);

        if (this.scene.isDuelMode) {
            const ds = this.duelState;
            if (ds && (player.id === ds.challenger.id || player.id === ds.target.id)) {
                ds.cards[player.id].push(card);
                this.scene.ui.updateDuelPanel(ds.challenger, ds.target, ds.pool, ds.cards[ds.challenger.id], ds.cards[ds.target.id]);
            }
        }

        if (card.type === 'number') {
            const count = player.cards.filter(v => v === card.value).length;
            if (count > 1) {
                this.handlePotentialBust(player, card);
            } else {
                if (shouldMove) {
                    this.scene.movePlayer(player, card.value, isBonusOrForced);
                } else {
                    this.scene.finishAction(player, isBonusOrForced);
                }
            }
        } else {
            this.handleSpecialCardLogic(player, card, isBonusOrForced);
        }
    }

    handlePotentialBust(player, conflictCard) {
        if (player.hasProtection) {
            player.hasProtection = false;
            player.cards.pop();

            this.scene.toast.show("🔰 保护卡生效！\n已抵消本次爆牌。", 2000);
            if(player.id === 0) this.scene.ui.updateBtmPanel(player);

            this.scene.time.delayedCall(2000, () => {
                this.scene.finishAction(player, true);
            });
            return;
        }

        const reviveIndex = player.cards.findIndex(v => v === 'second_chance');

        if (reviveIndex !== -1) {
            player.cards.splice(reviveIndex, 1);
            player.cards.pop();

            this.scene.toast.show(`${player.name} 复活！\n消耗【第二次机会】抵消 ${conflictCard.value}`, 2000);
            if(player.id===0) this.scene.ui.updateBtmPanel(player);

            this.scene.time.delayedCall(2000, () => {
                this.scene.finishAction(player, false);
            });

        } else {
            this.scene.audioManager.playSfx('sfx_bust', true);
            this.scene.toast.show(`💥 ${player.name} 爆牌！\n重复点数 ${conflictCard.value}`, 2000);

            player.roundScore = 0;
            player.state = 'bust'; // 标记状态

            if(player.id===0) this.scene.ui.updateBtmPanel(player);
            this.scene.ui.refreshTopPanel(this.scene.players);
            if (this.scene.forceDrawState) this.scene.forceDrawState = null;

            if (this.scene.isDuelMode) {
                // 🟢 试胆竞速中爆牌，稍微快一点进入结算
                this.scene.time.delayedCall(2000, () => this.onDuelGiveUp());
            } else {
                this.scene.time.delayedCall(2500, () => this.scene.nextTurn());
            }
        }
    }

    handleSpecialCardLogic(player, card, isBonus) {
        const type = card.value;
        this.scene.calculateRoundScore(player);
        this.scene.ui.refreshTopPanel(this.scene.players);

        let msg = "";
        let delayTime = 1500;

        if (type.startsWith('score_')) this.scene.audioManager.playSfx('sfx_score');
        else if (type === 'mult_2' || type === 'feast') this.scene.audioManager.playSfx('sfx_win');
        else if (type === 'freeze') this.scene.audioManager.playSfx('sfx_select');


        if (type.startsWith('score_')) msg = `${player.name} 获得【+${type.split('_')[1]}分】！`;
        else if (type === 'mult_2') msg = `${player.name} 获得【分数翻倍】！`;
        else if (type === 'second_chance') msg = `${player.name} 获得【第二次机会】！\n爆牌时自动消耗`;
        else if (type === 'flash') msg = `${player.name} 获得【快闪】！\n抵消负面效果`;
        else if (type === 'feast') { this.scene.musouMode = true; msg = `${player.name} 发动【无双】！\n后续抽牌每次2张`; }
        else if (type === 'freeze') msg = `${player.name} 抽到了【冻结】\n请选择目标...`;
        else if (type === 'flip_3') msg = `${player.name} 抽到了【连抽3张】\n请选择目标...`;
        else if (type === 'dare') msg = `${player.name} 抽到了【试胆竞速】\n请选择对手...`;

        this.scene.toast.show(msg, delayTime);

        this.scene.time.delayedCall(delayTime + 500, () => {
            const instantCards = ['score', 'mult', 'second', 'flash', 'feast'];
            if (instantCards.some(k => type.startsWith(k))) {
                this.scene.finishAction(player, isBonus);
                return;
            }

            let validTargets = this.scene.players.filter(p => (p.state === 'playing' || p.state === 'waiting'));
            if (type === 'dare') validTargets = validTargets.filter(p => p.id !== player.id);

            if (validTargets.length === 0 && type === 'dare') {
                this.scene.toast.show("无对手可用，试胆失效", 1000);
                this.scene.time.delayedCall(1500, () => this.scene.finishAction(player, isBonus));
                return;
            }

            if (player.isAI) {
                const target = Phaser.Utils.Array.GetRandom(validTargets) || player;
                this.scene.time.delayedCall(500, () => this.applyTargetEffect(player, target, type, isBonus));
            } else {
                this.scene.isWaitingForModal = true;
                this.scene.modal.showTargetSelection(`选择【${this.getCardName(type)}】目标`, validTargets, (target) => {
                    this.scene.isWaitingForModal = false;
                    this.applyTargetEffect(player, target, type, isBonus);
                });
            }
        });
    }

    applyTargetEffect(source, target, type, isBonus) {
        const flashIdx = target.cards.indexOf('flash');
        if (flashIdx !== -1 && source.id !== target.id) {
            target.cards.splice(flashIdx, 1);
            if (target.id === 0) this.scene.ui.updateBtmPanel(target);
            this.scene.toast.show(`${target.name} 使用【快闪】抵消效果`, 1500);
            this.scene.time.delayedCall(2000, () => this.scene.finishAction(source, isBonus));
            return;
        }

        if (type === 'freeze') {
            this.scene.audioManager.playSfx('sfx_freeze', true);
            target.state = 'frozen';
            this.scene.toast.show(`${target.name} 被冻结！`, 1500);
            this.scene.ui.refreshTopPanel(this.scene.players);
            this.scene.time.delayedCall(2000, () => this.scene.finishAction(source, isBonus));
        }
        else if (type === 'flip_3') {
            this.scene.toast.show(`${target.name} 开始连抽3张！`, 1500);
            this.scene.time.delayedCall(2000, () => {
                let count = 0;
                const max = 3;
                const runFlip = () => {
                    if (count >= max || target.state === 'bust') {
                        this.scene.finishAction(source, isBonus);
                        return;
                    }
                    count++;
                    this.scene.audioManager.playSfx('sfx_draw');
                    const card = this.drawNumberCard();
                    if (!card) {
                        this.scene.finishAction(source, isBonus);
                        return;
                    }
                    this.scene.ui.updateDeckCount(this.mainDeckCache.length);
                    this.scene.ui.playDrawAnimation(() => {
                        this.scene.ui.updateMidCard(card);
                        this.handleCardEffect(target, card, true, false);
                        this.scene.time.delayedCall(800, runFlip);
                    });
                };
                runFlip();
            });
        }
        else if (type === 'dare') {
            this.startDuel(source, target, isBonus);
        }
    }

    // ================= 🟢 试胆竞速 (Duel) 核心逻辑修改 =================

    startDuel(challenger, target, isBonusFrom) {
        this.scene.isDuelMode = true;
        this.scene.audioManager.playBgm('bgm_duel');

        // 🟢 1. 规则设置：共6张牌 (Pool=6)，被挑战者(Target)先手
        this.duelState = {
            challenger: challenger,
            target: target,
            pool: 6, // 总牌池限制
            cards: { [challenger.id]: [], [target.id]: [] },
            current: target, // 被挑战者先行动
            returnTo: isBonusFrom
        };

        this.scene.toast.show(`⚔️ 试胆竞速开始！\n被挑战者 ${target.name} 先手`, 2000);
        this.scene.ui.showActionButtons(false);
        this.scene.time.delayedCall(2100, () => this.updateDuelUI());
    }

    updateDuelUI() {
        const ds = this.duelState;
        this.scene.ui.updateDuelPanel(ds.challenger, ds.target, ds.pool, ds.cards[ds.challenger.id], ds.cards[ds.target.id]);

        // 🟢 2. 检查单人手牌上限 (3张)
        // 如果当前玩家已经抽了3张，他必须停止，这会触发比拼结束逻辑
        if (ds.cards[ds.current.id].length >= 3) {
            this.scene.toast.show(`${ds.current.name} 已达3张上限，强制停止`);
            this.scene.time.delayedCall(1500, () => this.onDuelGiveUp());
            return;
        }

        // 🟢 3. 检查总牌池 (防止溢出)
        if (ds.pool <= 0) {
            this.onDuelGiveUp(); // 视为结束
            return;
        }

        // 轮到谁操作
        if (ds.current.isAI) {
            this.scene.ui.showActionButtons(false);
            this.scene.time.delayedCall(1500, () => {
                // AI 逻辑：只要不到 3 张且分数不太高，就抽
                // 简单点：不到 15 分就抽
                const myScore = this.calcDuelScore(ds.cards[ds.current.id]);
                if (myScore < 15) {
                    this.onDuelDraw();
                } else {
                    this.onDuelGiveUp();
                }
            });
        } else {
            // 玩家操作：显示抽牌/放弃
            this.scene.ui.showActionButtons(true);
        }
    }

    onDuelDraw() {
        const ds = this.duelState;
        this.scene.forceClearOverlays();
        this.scene.ui.showActionButtons(false);
        this.scene.audioManager.playSfx('sfx_draw');

        const card = this.drawNumberCard();
        if (!card) return;

        // 扣减公共牌池
        ds.pool--;
        this.scene.ui.updateDeckCount(this.mainDeckCache.length);

        this.scene.ui.playDrawAnimation(() => {
            this.scene.ui.updateMidCard(card);

            // 将牌加入当前玩家的临时区域
            ds.cards[ds.current.id].push(card);

            // 检查是否爆牌 (handleCardEffect 会调用 handlePotentialBust 并修改 player.state)
            // 但为了逻辑清晰，我们这里复用 handleCardEffect，让它处理 UI 和 逻辑
            // 注意：handleCardEffect 会把牌加入 player.cards，这里其实重复加了一次 logic，但为了判定 bust 必须走流程
            // 修正：handleCardEffect 里的 push 会导致 double add，我们只利用它的 bust 判定

            // 最好的办法：手动判定 Bust，不走 handleCardEffect，以免污染主手牌逻辑太深
            // 但题目要求“爆牌者本轮0分”，这正是 handlePotentialBust 做的事

            this.handleCardEffect(ds.current, card, true, false);
            // handleCardEffect -> handlePotentialBust -> onDuelGiveUp (delayed)

            // 如果没爆牌，切换回合
            // 注意：如果爆牌了，handlePotentialBust 会设置 state='bust' 并延迟调用 onDuelGiveUp
            // 所以这里只需要处理没爆牌的情况
            if (ds.current.state !== 'bust') {
                this.scene.time.delayedCall(1000, () => {
                    // 没爆牌，切换到对手
                    ds.current = (ds.current === ds.challenger) ? ds.target : ds.challenger;
                    this.updateDuelUI();
                });
            }
        });
    }

    onDuelGiveUp() {
        // 🟢 4. 任意一方“放弃”或“爆牌”，试胆竞速立即结束
        const ds = this.duelState;
        this.scene.ui.showActionButtons(false);

        // 这里的 GiveUp 意味着“比拼结算”
        // 如果是因为爆牌进来的，state 已经是 bust 了
        // 如果是主动放弃进来的，state 还是 playing

        this.resolveDuelWinner();
    }

    resolveDuelWinner() {
        const ds = this.duelState;

        let cScore = this.calcDuelScore(ds.cards[ds.challenger.id]);
        let tScore = this.calcDuelScore(ds.cards[ds.target.id]);

        // 🟢 5. 判定胜负逻辑

        // A. 爆牌判定
        if (ds.challenger.state === 'bust') {
            cScore = -1; // 标记为爆牌
        }
        if (ds.target.state === 'bust') {
            tScore = -1;
        }

        let winner = null;
        let msg = "";

        if (cScore === -1) {
            winner = ds.target;
            msg = `${ds.challenger.name} 爆牌！\n${ds.target.name} 获胜 (总分+5)`;
        } else if (tScore === -1) {
            winner = ds.challenger;
            msg = `${ds.target.name} 爆牌！\n${ds.challenger.name} 获胜 (总分+5)`;
        } else {
            // 正常比拼
            if (cScore > tScore) {
                winner = ds.challenger;
                msg = `${ds.challenger.name} 点数大！\n获胜 (总分+5)`;
            } else if (tScore > cScore) {
                winner = ds.target;
                msg = `${ds.target.name} 点数大！\n获胜 (总分+5)`;
            } else {
                winner = 'tie';
                msg = `双方平局！\n(双方总分+5)`;
            }
        }

        this.scene.toast.show(msg, 3000);
        this.scene.time.delayedCall(3000, () => this.endDuel(winner));
    }

    endDuel(winner) {
        const ds = this.duelState;
        this.scene.isDuelMode = false;
        this.scene.ui.clearDuelPanel();
        this.scene.audioManager.playBgm('bgm_game');

        // 🟢 6. 奖励分配与行动权控制

        // 奖励：总积分 +5 (totalScore)
        if (winner === 'tie') {
            ds.challenger.totalScore += 5;
            ds.target.totalScore += 5;
        } else if (winner) {
            winner.totalScore += 5;
        }
        this.scene.ui.refreshTopPanel(this.scene.players);

        // 行动权：
        // 规则：输家本轮行动直接结束。
        // 规则：平局双方都可正常行动 (发起者继续)。
        // 规则：赢家...通常赢家是没爆牌的，或者点数大的。如果发起者赢了，继续行动？

        // 逻辑推导：
        // 如果 challenger 输了 -> nextTurn
        // 如果 challenger 赢了 -> readyForAction
        // 如果 tie -> readyForAction

        const challengerLost = (winner === ds.target); // 发起者输了

        // 特殊情况：如果发起者自己爆牌了，handlePotentialBust 已经把分归零了
        // 这里只需要处理流程流转

        if (challengerLost) {
            // 发起者输了，结束行动
            this.scene.time.delayedCall(1000, () => this.scene.nextTurn());
        } else {
            // 发起者赢了或平局，继续行动
            // 如果发起者此时已经满了7张或者之前状态不对，readyForAction 会处理
            this.scene.readyForAction(ds.challenger);
        }
    }

    calcDuelScore(cards) {
        let sum = 0;
        cards.forEach(c => { if(c.type==='number') sum += c.value; });
        return sum;
    }

    validateAndFixDecks(players) {
        const LIMITS = {
            'freeze': 3, 'second_chance': 3, 'flip_3': 3, 'flash': 2, 'dare': 2, 'feast': 2, 'mult_2': 1
        };
        const activeCounts = {};
        players.forEach(p => {
            p.cards.forEach(cardVal => {
                if (typeof cardVal === 'string') {
                    let key = cardVal;
                    if (cardVal.startsWith('score_')) key = 'score_';
                    activeCounts[key] = (activeCounts[key] || 0) + 1;
                }
            });
        });

        const validSpecialDeck = [];
        const currentDeckCounts = {};

        this.specialDeckCache.forEach(card => {
            let key = card.value;
            if (key.startsWith('score_')) key = 'score_';
            const limit = LIMITS[key];
            if (limit !== undefined) {
                const alreadyActive = activeCounts[key] || 0;
                const inDeck = currentDeckCounts[key] || 0;
                if (alreadyActive + inDeck < limit) {
                    validSpecialDeck.push(card);
                    currentDeckCounts[key] = inDeck + 1;
                }
            } else {
                if (key.startsWith('score_')) {
                    const specificActive = players.some(p => p.cards.includes(card.value));
                    const specificInDeck = validSpecialDeck.some(c => c.value === card.value);
                    if (!specificActive && !specificInDeck) validSpecialDeck.push(card);
                } else {
                    validSpecialDeck.push(card);
                }
            }
        });

        this.specialDeckCache = validSpecialDeck;
        this.mainDeckCache = this.mainDeckCache.filter(c => {
            if (c.type === 'number') return true;
            return true;
        });
        const numberCards = this.mainDeckCache.filter(c => c.type === 'number');
        this.mainDeckCache = [...numberCards, ...this.specialDeckCache];
        Phaser.Utils.Array.Shuffle(this.mainDeckCache);
        this.scene.ui.updateDeckCount(this.mainDeckCache.length);
    }

    getCardName(val) {
        if (typeof val !== 'string') return val;
        if (val.startsWith('score_')) return `+${val.split('_')[1]}分`;
        if (val === 'mult_2') return '分数翻倍';
        const map = {
            'freeze': '冻结', 'second_chance': '第二次机会', 'flip_3': '连抽3张', 'flash': '快闪', 'dare': '试胆竞速', 'feast': '无双'
        };
        return map[val] || val;
    }
}