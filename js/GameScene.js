import GameUI from './ui.js';
import Toast from './Toast.js';
import Modal from './Modal.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    create() {
        this.ui = new GameUI(this);
        this.ui.init();
        this.toast = new Toast(this);
        this.modal = new Modal(this);

        this.ui.setButtonHandlers(
            () => {
                if (this.isDuelMode) this.onDuelDraw();
                else this.onDrawCard();
            },
            () => {
                if (this.isDuelMode) this.onDuelGiveUp();
                else this.onGiveUp();
            }
        );

        const aiCount = this.registry.get('aiCount') || 3;
        this.initGame(aiCount);
    }

    forceClearOverlays() {
        if (this.toast) this.toast.hide();
        if (this.modal) this.modal.destroy();
    }

    initGame(aiCount) {
        this.players = this.createPlayers(aiCount);
        this.deckConfig = {
            numbers: { 0:1, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12 },
            specials: {
                'freeze':3, 'second_chance':3, 'flip_3':3, 'flash':2, 'dare':2, 'feast':2,
                'score_1':1, 'score_2':1, 'score_3':1, 'score_4':1, 'score_5':1,
                'score_6':1, 'score_7':1, 'score_8':1, 'score_9':1,
                'mult_2':1
            }
        };

        this.initializeDecks();
        this.currentPlayerIndex = 0;
        this.roundCount = 1;
        this.specialGrids = [1, 6, 12, 18];
        this.musouMode = false;

        this.isDuelMode = false;
        this.duelState = null;
        this.forceDrawState = null;

        this.isRoundSettling = false;
        this.isWaitingForModal = false;

        this.ui.refreshTopPanel(this.players);
        this.ui.updateBtmPanel(this.players[0]);
        this.players.forEach((p, i) => { p.position = 0; this.ui.drawPlayerAt(0, i, p.name); });
        this.ui.resetMidInfo();
        this.ui.updateDeckCount(this.mainDeckCache.length);

        this.ui.animateActiveMarker(0, () => {
            this.startTurn();
        });
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
        this.toast.show("牌库已重洗");
        this.ui.updateDeckCount(this.mainDeckCache.length);
    }

    createPlayers(aiCount) {
        const p = [{ id:0, name:"我 (P1)", isAI:false, totalScore:0, roundScore:0, position:0, cards:[], items:[], state:'playing' }];
        for(let i=0; i<aiCount; i++) p.push({ id:i+1, name:`电脑${String.fromCharCode(65+i)}`, isAI:true, totalScore:0, roundScore:0, position:0, cards:[], items:[], state:'waiting' });
        return p;
    }

    startTurn() {
        this.forceClearOverlays();
        if (this.isRoundSettling) return;
        if (this.checkRoundOver()) { this.handleRoundOver(); return; }

        const player = this.players[this.currentPlayerIndex];

        if (player.state === 'bust' || player.state === 'done' || player.state === 'frozen') {
            this.nextTurn();
            return;
        }

        if (player.state === 'waiting') player.state = 'playing';

        this.ui.updateCurrentPlayerName(player.name);
        this.ui.refreshTopPanel(this.players);

        if (this.players.every(p => p.position !== 0)) this.ui.hideStartGrid();

        this.readyForAction(player);
    }

    readyForAction(player) {
        if (this.isWaitingForModal) return;

        if (!player.isAI) {
            this.ui.showActionButtons(true);
        } else {
            this.ui.showActionButtons(false);
            this.time.delayedCall(1000, () => {
                if (this.isWaitingForModal) return;
                if (player.roundScore >= 15) this.onGiveUp();
                else this.onDrawCard();
            });
        }
    }

    finishAction(player, isBonus) {
        this.calculateRoundScore(player);
        this.ui.refreshTopPanel(this.players);

        if (this.forceDrawState && this.forceDrawState.count > 0) {
            if (player.state === 'bust' || player.state === 'done' || player.state === 'frozen') {
                this.forceDrawState = null;
                if (this.isDuelMode) this.time.delayedCall(1500, () => this.updateDuelUI());
                else this.time.delayedCall(1500, () => this.nextTurn());
                return;
            }
            this.time.delayedCall(1500, () => this.processForceDraw());
            return;
        }
        else if (this.forceDrawState && this.forceDrawState.count <= 0) {
            const callback = this.forceDrawState.callback;
            this.forceDrawState = null;
            if (callback) callback();
            return;
        }

        if (this.isDuelMode) {
            const ds = this.duelState;
            ds.current = (ds.current === ds.challenger) ? ds.target : ds.challenger;
            this.time.delayedCall(1000, () => this.updateDuelUI());
            return;
        }

        if (isBonus) {
            this.readyForAction(player);
        } else {
            this.time.delayedCall(500, () => this.nextTurn());
        }
    }

    startForceDraw(player, count, onComplete) {
        this.forceDrawState = { target: player, count: count, callback: onComplete };
        this.ui.showActionButtons(false);
        this.toast.show(`${player.name} 开始连抽 ${count} 张！`, 1500);
        this.time.delayedCall(2000, () => this.processForceDraw());
    }

    processForceDraw() {
        if (!this.forceDrawState || this.forceDrawState.count <= 0) return;
        const player = this.forceDrawState.target;
        this.forceDrawState.count--;

        if (this.mainDeckCache.length === 0) this.reshuffleDecks();
        const card = this.mainDeckCache.pop();
        this.ui.updateMidCard(card);

        let shouldMove = (!this.isDuelMode && player.id === this.players[this.currentPlayerIndex].id);
        this.handleCardEffect(player, card, true, shouldMove);
    }

    handleSpecialGridBonus(player, isBonus) {
        if (this.specialDeckCache.length === 0) {
            this.toast.show("特殊牌库已空，无奖励");
            this.finishAction(player, isBonus);
            return;
        }

        const cardIndex = Phaser.Math.RND.between(0, this.specialDeckCache.length - 1);
        const bonusCard = this.specialDeckCache.splice(cardIndex, 1)[0];
        const mIndex = this.mainDeckCache.findIndex(c => c.value === bonusCard.value && c.type === 'special');
        if (mIndex !== -1) this.mainDeckCache.splice(mIndex, 1);

        this.toast.show(`${player.name} 获得特殊奖励！\n【${this.getCardName(bonusCard.value)}】`, 2000);
        this.ui.updateMidCard(bonusCard);

        this.time.delayedCall(2500, () => {
            this.handleCardEffect(player, bonusCard, isBonus, true);
        });
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.ui.animateActiveMarker(this.currentPlayerIndex, () => {
            this.startTurn();
        });
    }

    onDrawCard() {
        this.forceClearOverlays();
        if (this.isWaitingForModal) return;

        const player = this.players[this.currentPlayerIndex];

        if (this.musouMode) {
            this.startForceDraw(player, 2, () => this.finishAction(player, false));
            return;
        }

        if (this.mainDeckCache.length === 0) this.reshuffleDecks();
        if (this.mainDeckCache.length === 0) { this.onGiveUp(); return; }

        const card = this.mainDeckCache.pop();
        if (card.type === 'special') {
            const sIndex = this.specialDeckCache.findIndex(c => c.value === card.value);
            if (sIndex !== -1) this.specialDeckCache.splice(sIndex, 1);
        }

        this.ui.updateMidCard(card);
        this.ui.updateDeckCount(this.mainDeckCache.length);
        this.handleCardEffect(player, card, false, true);
    }

    // --- 竞速相关 (这里补全了之前缺失的方法) ---
    startDuel(challenger, target, isBonusFrom) {
        this.isDuelMode = true;
        this.duelState = {
            challenger: challenger,
            target: target,
            pool: 6,
            cards: { [challenger.id]: [], [target.id]: [] },
            current: target,
            returnTo: isBonusFrom
        };
        this.toast.show(`⚔️ 试胆竞速开始！\n${target.name} 先手`, 1500);
        this.ui.showActionButtons(false);
        this.time.delayedCall(1600, () => {
            this.updateDuelUI();
        });
    }

    updateDuelUI() {
        const ds = this.duelState;
        this.ui.updateDuelPanel(ds.challenger, ds.target, ds.pool, ds.cards[ds.challenger.id], ds.cards[ds.target.id]);

        if (ds.current.isAI) {
            this.ui.showActionButtons(false);
            this.time.delayedCall(1000, () => {
                if (ds.pool > 0 && Math.random() > 0.1) this.onDuelDraw();
                else this.onDuelGiveUp();
            });
        } else {
            this.ui.showActionButtons(true);
        }
    }

    onDuelDraw() {
        this.forceClearOverlays();
        const ds = this.duelState;

        if (this.mainDeckCache.length === 0) this.reshuffleDecks();
        const card = this.mainDeckCache.pop();
        // 竞速中不显示大卡，只更新下方列表 (由updateDuelUI负责)

        if (card.value === 'flip_3') {
            this.toast.show(`${ds.current.name} 触发【翻3张】！\n(不计入竞速池)`, 1500);
            ds.pool--;

            this.time.delayedCall(2000, () => {
                this.startForceDraw(ds.current, 3, () => {
                    if (ds.pool <= 0) this.resolveDuelWinner();
                    else {
                        ds.current = (ds.current === ds.challenger) ? ds.target : ds.challenger;
                        this.updateDuelUI();
                    }
                });
            });
            return;
        }

        if (card.value === 'dare') {
            this.toast.show(`${ds.current.name} 抽到【试胆】\n无效，直接丢弃`, 1500);
            ds.pool--;

            this.time.delayedCall(2000, () => {
                if (ds.pool <= 0) this.resolveDuelWinner();
                else this.finishAction(ds.current, false);
            });
            return;
        }

        ds.cards[ds.current.id].push(card);
        this.updateDuelUI(); // 立即刷新

        if (card.type === 'number') {
            const val = card.value;
            const allCards = [...ds.current.cards, ...ds.cards[ds.current.id].map(c=>c.value)];
            const count = allCards.filter(c => c === val).length;
            if (count > 1) {
                this.toast.show(`竞速中 ${ds.current.name} 爆牌！`, 2000);
                ds.current.state = 'bust';
                ds.current.roundScore = 0;
                this.ui.refreshTopPanel(this.players);

                this.time.delayedCall(2500, () => {
                    this.endDuel(ds.current === ds.challenger ? ds.target : ds.challenger);
                });
                return;
            }
        } else {
            this.handleCardEffect(ds.current, card, true, false);
            ds.pool--;
            return;
        }

        ds.pool--;
        if (ds.pool <= 0) {
            this.resolveDuelWinner();
        } else {
            this.finishAction(ds.current, false);
        }
    }

    onDuelGiveUp() {
        const ds = this.duelState;
        this.toast.show(`${ds.current.name} 放弃竞速`, 1000);
        ds.current.state = 'done';
        this.time.delayedCall(1100, () => {
            this.endDuel(ds.current === ds.challenger ? ds.target : ds.challenger);
        });
    }

    resolveDuelWinner() {
        const ds = this.duelState;
        const cScore = this.calcDuelScore(ds.cards[ds.challenger.id]);
        const tScore = this.calcDuelScore(ds.cards[ds.target.id]);
        let winner = null;
        if (cScore > tScore) winner = ds.challenger;
        else if (tScore > cScore) winner = ds.target;
        else winner = 'tie';

        let msg = `竞速结束！\n${ds.challenger.name}: ${cScore} vs ${ds.target.name}: ${tScore}`;
        this.toast.show(msg, 2000);
        this.time.delayedCall(2100, () => {
            this.endDuel(winner);
        });
    }

    endDuel(winner) {
        const ds = this.duelState;
        this.isDuelMode = false;

        this.ui.clearDuelPanel();

        [ds.challenger, ds.target].forEach(p => {
            if (p.state !== 'bust' && p.state !== 'done' && p.state !== 'frozen') {
                ds.cards[p.id].forEach(c => {
                    p.cards.push(c.value);
                });
            }
        });

        if (winner === 'tie') { ds.challenger.roundScore += 6; ds.target.roundScore += 6; }
        else if (winner) { winner.roundScore += 6; }

        this.calculateRoundScore(ds.challenger);
        this.calculateRoundScore(ds.target);
        this.ui.refreshTopPanel(this.players);

        if (ds.returnTo) { this.readyForAction(ds.challenger); }
        else { this.time.delayedCall(1500, () => this.nextTurn()); }
    }

    calcDuelScore(cards) {
        let sum = 0;
        cards.forEach(c => { if(c.type==='number') sum += c.value; });
        return sum;
    }

    handleCardEffect(player, card, isBonusOrForced = false, shouldMove = true) {
        player.cards.push(card.value);
        if (player.id === 0) this.ui.updateBtmPanel(player);

        if (card.type === 'number') {
            const count = player.cards.filter(v => v === card.value).length;
            if (count > 1) {
                this.handlePotentialBust(player, card);
            } else {
                if (shouldMove) {
                    this.movePlayer(player, card.value, isBonusOrForced);
                } else {
                    this.finishAction(player, isBonusOrForced);
                }
            }
        } else {
            this.handleSpecialCardLogic(player, card, isBonusOrForced);
        }
    }

    handleSpecialCardLogic(player, card, isBonus) {
        const type = card.value;
        this.calculateRoundScore(player);
        this.ui.refreshTopPanel(this.players);

        let msg = "";
        let delayTime = 1500;

        if (type.startsWith('score_')) {
            msg = `${player.name} 获得【+${type.split('_')[1]}分】！`;
        } else if (type === 'mult_2') {
            msg = `${player.name} 获得【分数翻倍】！`;
        } else if (type === 'second_chance') {
            msg = `${player.name} 获得【第二次机会】！\n爆牌时自动消耗`;
        } else if (type === 'flash') {
            msg = `${player.name} 获得【快闪】！\n抵消负面效果`;
        } else if (type === 'feast') {
            this.musouMode = true;
            msg = `${player.name} 发动【无双】！\n后续抽牌每次2张`;
        } else if (type === 'freeze') {
            msg = `${player.name} 抽到了【冻结】\n请选择目标...`;
        } else if (type === 'flip_3') {
            msg = `${player.name} 抽到了【连抽3张】\n请选择目标...`;
        } else if (type === 'dare') {
            msg = `${player.name} 抽到了【试胆竞速】\n请选择对手...`;
        }

        this.toast.show(msg, delayTime);

        this.time.delayedCall(delayTime + 500, () => {
            if (type.startsWith('score_') || type === 'mult_2' || type === 'second_chance' || type === 'flash' || type === 'feast') {
                this.finishAction(player, isBonus);
                return;
            }

            let validTargets = this.players.filter(p => (p.state === 'playing' || p.state === 'waiting'));
            if (type === 'dare') validTargets = validTargets.filter(p => p.id !== player.id);

            if (validTargets.length === 0 && type === 'dare') {
                this.toast.show("无对手可用，试胆失效", 1000);
                this.time.delayedCall(1500, () => this.finishAction(player, isBonus));
                return;
            }

            if (player.isAI) {
                const target = Phaser.Utils.Array.GetRandom(validTargets) || player;
                this.time.delayedCall(500, () => {
                    this.applyTargetEffect(player, target, type, isBonus);
                });
            } else {
                this.isWaitingForModal = true;
                this.modal.showTargetSelection(`选择【${this.getCardName(type)}】目标`, validTargets, (target) => {
                    this.isWaitingForModal = false;
                    this.applyTargetEffect(player, target, type, isBonus);
                });
            }
        });
    }

    applyTargetEffect(source, target, type, isBonus) {
        const flashIdx = target.cards.indexOf('flash');
        if (flashIdx !== -1 && source.id !== target.id) {
            target.cards.splice(flashIdx, 1);
            if (target.id === 0) this.ui.updateBtmPanel(target);
            this.toast.show(`${target.name} 使用【快闪】抵消效果`, 1500);
            this.time.delayedCall(2000, () => this.finishAction(source, isBonus));
            return;
        }

        if (type === 'freeze') {
            target.state = 'frozen';
            this.toast.show(`${target.name} 被冻结！`, 1500);
            this.ui.refreshTopPanel(this.players);
            this.time.delayedCall(2000, () => this.finishAction(source, isBonus));
        }
        else if (type === 'flip_3') {
            this.toast.show(`${target.name} 开始连抽3张！`, 1500);
            this.time.delayedCall(2000, () => {
                this.startForceDraw(target, 3, () => {
                    this.finishAction(source, isBonus);
                });
            });
        }
        else if (type === 'dare') {
            this.startDuel(source, target, isBonus);
        }
    }

    movePlayer(player, steps, isBonus) {
        const path = [];
        let tempPos = player.position;
        for (let i=0; i<steps; i++) {
            tempPos++; if (tempPos>24) tempPos=1; path.push(tempPos);
        }
        player.position = tempPos;
        this.ui.showActionButtons(false);
        this.ui.animatePlayerMove(player.id, path, () => {
            if (this.specialGrids.includes(player.position)) {
                this.handleSpecialGridBonus(player, isBonus);
            } else {
                this.finishAction(player, isBonus);
            }
        });
    }

    handlePotentialBust(player, conflictCard) {
        const reviveIndex = player.cards.findIndex(v => v === 'second_chance');
        if (reviveIndex !== -1) {
            player.cards.splice(reviveIndex, 1); player.cards.pop();
            this.toast.show(`${player.name} 复活！\n消耗【第二次机会】抵消 ${conflictCard.value}`, 2000);
            if(player.id===0) this.ui.updateBtmPanel(player);
            player.state = 'done';

            if (this.forceDrawState) this.forceDrawState = null;

            if (this.isDuelMode) {
                this.time.delayedCall(2500, () => this.onDuelGiveUp());
                return;
            }

            this.time.delayedCall(2500, () => this.nextTurn());
        } else {
            this.toast.show(`💥 ${player.name} 爆牌！\n重复点数 ${conflictCard.value}`, 2000);
            player.roundScore = 0; player.state = 'bust';
            if(player.id===0) this.ui.updateBtmPanel(player);
            this.ui.refreshTopPanel(this.players);

            if (this.forceDrawState) this.forceDrawState = null;

            if (this.isDuelMode) {
                this.time.delayedCall(2500, () => {
                    this.endDuel(this.duelState.current === this.duelState.challenger ? this.duelState.target : this.duelState.challenger);
                });
            } else {
                this.time.delayedCall(2500, () => this.nextTurn());
            }
        }
    }

    calculateRoundScore(player) {
        let sum = 0; let mult = 1;
        player.cards.forEach(val => {
            if (typeof val === 'number') sum += val;
            else if (typeof val === 'string') {
                if (val.startsWith('score_')) sum += parseInt(val.split('_')[1]);
                else if (val === 'mult_2') mult *= 2;
            }
        });
        player.roundScore = sum * mult;
        this.ui.updateMidScore(player.roundScore);
    }

    checkRoundOver() {
        return !this.players.find(p => p.state === 'playing' || p.state === 'waiting');
    }

    handleRoundOver() {
        if (this.isRoundSettling) return;
        this.isRoundSettling = true;
        this.musouMode = false;
        this.players.forEach(p => {
            if (p.state === 'done' || p.state === 'frozen') p.totalScore += p.roundScore;
        });
        this.ui.refreshTopPanel(this.players);
        this.time.delayedCall(500, () => {
            this.modal.showRoundResult(this.roundCount, this.players, () => {
                this.isRoundSettling = false;
                this.startNextRound();
            });
        });
    }

    startNextRound() {
        this.roundCount++;
        const winner = this.players.find(p => p.totalScore >= 200);
        if (winner) { this.modal.showGameResult(this.players, () => this.scene.restart()); return; }
        this.players.forEach(p => { p.state = 'waiting'; p.roundScore = 0; p.cards = []; });
        this.currentPlayerIndex = 0;
        this.ui.resetMidInfo(); this.ui.refreshTopPanel(this.players); this.ui.updateBtmPanel(this.players[0]);
        this.ui.animateActiveMarker(0, () => this.startTurn());
    }

    onGiveUp() {
        this.players[this.currentPlayerIndex].state = 'done';
        this.ui.refreshTopPanel(this.players);
        this.nextTurn();
    }

    getCardName(val) {
        if (val.startsWith('score_')) return `+${val.split('_')[1]}分`;
        if (val === 'mult_2') return '分数翻倍';
        const map = { 'freeze':'冻结', 'second_chance':'第二次机会', 'flip_3':'翻3张', 'flash':'快闪', 'dare':'试胆竞速', 'feast':'无双' };
        return map[val] || val;
    }
}