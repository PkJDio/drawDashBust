export default class CardManager {
    constructor(scene) {
        this.scene = scene;
        this.deckConfig = {
            numbers: { 0:1, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12 },
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
                if (player.prophecyGuess === 'small' && v >= 0 && v <= 5) win = true;
                if (player.prophecyGuess === 'big' && v >= 6 && v <= 12) win = true;
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
            this.scene.toast.show(`💥 ${player.name} 爆牌！\n重复点数 ${conflictCard.value}`, 2000);
            player.roundScore = 0;
            player.state = 'bust';

            if(player.id===0) this.scene.ui.updateBtmPanel(player);
            this.scene.ui.refreshTopPanel(this.scene.players);
            if (this.scene.forceDrawState) this.scene.forceDrawState = null;

            if (this.scene.isDuelMode) {
                this.scene.time.delayedCall(2500, () => this.onDuelGiveUp());
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
                this.scene.modal.showTargetSelection(`选择【${this.scene.getCardName(type)}】目标`, validTargets, (target) => {
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
            target.state = 'frozen';
            this.scene.toast.show(`${target.name} 被冻结！`, 1500);
            this.scene.ui.refreshTopPanel(this.scene.players);
            this.scene.time.delayedCall(2000, () => this.scene.finishAction(source, isBonus));
        }
        else if (type === 'flip_3') {
            this.scene.toast.show(`${target.name} 开始连抽3张！`, 1500);
            this.scene.time.delayedCall(2000, () => {
                this.scene.startForceDraw(target, 3, () => this.scene.finishAction(source, isBonus));
            });
        }
        else if (type === 'dare') {
            this.startDuel(source, target, isBonus);
        }
    }

    startDuel(challenger, target, isBonusFrom) {
        this.scene.isDuelMode = true;
        this.duelState = {
            challenger: challenger, target: target, pool: 6,
            cards: { [challenger.id]: [], [target.id]: [] },
            current: target, returnTo: isBonusFrom
        };
        this.scene.toast.show(`⚔️ 试胆竞速开始！\n${target.name} 先手`, 1500);
        this.scene.ui.showActionButtons(false);
        this.scene.time.delayedCall(1600, () => this.updateDuelUI());
    }

    updateDuelUI() {
        const ds = this.duelState;
        this.scene.ui.updateDuelPanel(ds.challenger, ds.target, ds.pool, ds.cards[ds.challenger.id], ds.cards[ds.target.id]);

        if (ds.current.isAI) {
            this.scene.ui.showActionButtons(false);
            this.scene.time.delayedCall(1500, () => {
                if (ds.pool > 0 && Math.random() > 0.1) this.onDuelDraw();
                else this.onDuelGiveUp();
            });
        } else {
            this.scene.ui.showActionButtons(true);
        }
    }

    onDuelDraw() {
        this.scene.forceClearOverlays();
        const ds = this.duelState;
        this.scene.ui.showActionButtons(false);

        const card = this.drawNumberCard();
        if (!card) return;

        this.scene.ui.updateDeckCount(this.mainDeckCache.length);

        this.scene.ui.playDrawAnimation(() => {
            this.scene.ui.updateMidCard(card);
            this.handleCardEffect(ds.current, card, true, false);
            ds.pool--;
        });
    }

    onDuelGiveUp() {
        const ds = this.duelState;
        this.scene.ui.showActionButtons(false);
        this.scene.toast.show(`${ds.current.name} 放弃竞速`, 1000);

        // 🟢 修改点：如果已经爆牌(bust)，不要覆盖为 done
        if (ds.current.state !== 'bust') {
            ds.current.state = 'done';
        }

        this.scene.time.delayedCall(1100, () => this.endDuel(ds.current === ds.challenger ? ds.target : ds.challenger));
    }

    resolveDuelWinner() {
        const ds = this.duelState;
        const cScore = this.calcDuelScore(ds.cards[ds.challenger.id]);
        const tScore = this.calcDuelScore(ds.cards[ds.target.id]);
        let winner = null;
        if (cScore > tScore) winner = ds.challenger;
        else if (tScore > cScore) winner = ds.target;
        else winner = 'tie';

        this.scene.toast.show(`竞速结束！\n${ds.challenger.name}: ${cScore} vs ${ds.target.name}: ${tScore}`, 2000);
        this.scene.time.delayedCall(2100, () => this.endDuel(winner));
    }

    endDuel(winner) {
        const ds = this.duelState;
        this.scene.isDuelMode = false;
        this.scene.ui.clearDuelPanel();

        if (winner === 'tie') { ds.challenger.roundScore += 6; ds.target.roundScore += 6; }
        else if (winner) { winner.roundScore += 6; }

        this.scene.calculateRoundScore(ds.challenger);
        this.scene.calculateRoundScore(ds.target);
        this.scene.ui.refreshTopPanel(this.scene.players);

        const challengerWon = (winner === ds.challenger || winner === 'tie');

        if (challengerWon) {
            this.scene.readyForAction(ds.challenger);
        } else {
            this.scene.time.delayedCall(1500, () => this.scene.nextTurn());
        }
    }

    calcDuelScore(cards) {
        let sum = 0;
        cards.forEach(c => { if(c.type==='number') sum += c.value; });
        return sum;
    }
}