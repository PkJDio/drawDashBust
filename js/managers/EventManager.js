// managers/EventManager.js
export default class EventManager {
    constructor(scene) {
        this.scene = scene;
    }

    handleSpecialGridBonus(player, isBonus) {
        const gridId = player.position;
        const rand = Math.random();

        // 调试日志
        const pColor = this.scene.ui.colors.player[player.id];
        console.log(`[DEBUG] 触发幸运格: ${gridId}, 玩家ID: ${player.id}, 颜色值: ${pColor ? pColor.toString(16) : '未知'}`);

        if (gridId === 10) {
            if (rand < 0.2) this.executeEvent1(player, isBonus);
            else if (rand < 0.4) this.executeEvent2(player, isBonus);
            else if (rand < 0.6) this.executeEvent3(player, isBonus);
            else if (rand < 0.8) this.executeEvent4(player, isBonus);
            else this.executeEvent5(player, isBonus);
        } else if (gridId === 22) {
            if (rand < 0.3) this.executeEvent6(player, isBonus);
            else if (rand < 0.6) this.executeEvent7(player, isBonus);
            else if (rand < 0.9) this.executeEvent8(player, isBonus);
            else if (rand < 0.95) this.executeEvent9(player, isBonus);
            else this.executeEvent10(player, isBonus);
        }
    }

    executeEvent1(player, isBonus) {
        const specialCards = this.scene.cardManager.specialDeckCache;
        if (specialCards.length === 0) {
            this.scene.toast.show("特殊牌库已空，跳过奖励");
            this.scene.turnManager.finishAction(player, isBonus);
            return;
        }
        const cardIndex = Phaser.Math.RND.between(0, specialCards.length - 1);
        const bonusCard = specialCards.splice(cardIndex, 1)[0];

        this.scene.toast.show(`幸运！获得额外卡牌\n【${this.scene.getCardName(bonusCard.value)}】`, 2000);
        this.scene.ui.updateMidCard(bonusCard);
        this.scene.time.delayedCall(2500, () => this.scene.cardManager.handleCardEffect(player, bonusCard, isBonus, true));
    }

    executeEvent2(player, isBonus) {
        this.scene.toast.show(`${player.name} 获得额外回合！`, 2000);
        this.scene.time.delayedCall(1500, () => this.scene.turnManager.finishAction(player, true));
    }

    executeEvent3(player, isBonus) {
        this.scene.toast.show("获得免费预言机会！", 2000);
        this.scene.time.delayedCall(2000, () => {
            const bonusFlag = isBonus;
            this.scene.itemManager.handleItemEffect(player, 'prophecy', () => {
                console.log("[DEBUG] 预言结束，继续后续动作");
                this.scene.turnManager.finishAction(player, bonusFlag);
            });
        });
    }

    executeEvent4(player, isBonus) {
        this.scene.toast.show("触发：幸运跑马灯！", 1500);
        this.scene.time.delayedCall(1500, () => {
            const targetId = Phaser.Math.Between(1, 24);
            const pColor = this.scene.ui.colors.player[player.id];

            this.scene.ui.grid.runMarquee({
                startId: player.position, targetId: targetId,
                color: pColor, laps: 3
            }, (finalId) => {
                this.scene.ui.grid.blinkActiveLights(() => {
                    this.scene.betManager.resolveMultipleLandings(player, [finalId]);
                    this.scene.ui.refreshTopPanel(this.scene.players);
                    this.scene.time.delayedCall(800, () => this.scene.turnManager.finishAction(player, isBonus));
                });
            });
        });
    }

    executeEvent5(player, isBonus) {
        this.scene.toast.show("触发：双重跑马灯！", 1500);
        this.scene.time.delayedCall(1500, () => {
            const target1 = Phaser.Math.Between(1, 24);
            const pColor = this.scene.ui.colors.player[player.id];

            this.scene.ui.grid.runMarquee({
                startId: player.position, targetId: target1,
                color: pColor, laps: 3
            }, (finalId1) => {
                const steps = Phaser.Math.Between(2, 3);
                let target2 = finalId1 + steps;
                if (target2 > 24) target2 -= 24;

                this.scene.time.delayedCall(500, () => {
                    this.scene.ui.grid.runMarquee({
                        startId: finalId1,
                        targetId: target2,
                        color: pColor,
                        laps: 0,
                        speedSteps: [150, 200, 300]
                    }, (finalId2) => {
                        this.scene.ui.grid.blinkActiveLights(() => {
                            this.scene.betManager.resolveMultipleLandings(player, [finalId1, finalId2]);
                            this.scene.ui.refreshTopPanel(this.scene.players);
                            this.scene.time.delayedCall(800, () => this.scene.turnManager.finishAction(player, isBonus));
                        });
                    });
                });
            });
        });
    }

    executeEvent6(player, isBonus) {
        const highValuePool = ['mult_2', 'flash', 'second_chance'];
        const otherPlaying = this.scene.players.some(p => p.id !== player.id && p.state === 'playing');
        if (otherPlaying) highValuePool.push('freeze');

        for(let i=1; i<=9; i++) highValuePool.push(`score_${i}`);

        const cardValue = Phaser.Utils.Array.GetRandom(highValuePool);
        const bonusCard = { type: 'special', value: cardValue };

        this.scene.toast.show(`超级幸运！获得高级卡牌\n【${this.scene.getCardName(cardValue)}】`, 2500);
        this.scene.ui.updateMidCard(bonusCard);
        this.scene.time.delayedCall(2500, () => this.scene.cardManager.handleCardEffect(player, bonusCard, isBonus, true));
    }

    executeEvent7(player, isBonus) {
        this.scene.toast.show("触发：同图大奖！", 1500);
        this.scene.time.delayedCall(1500, () => {
            const firstTarget = Phaser.Math.Between(1, 24);
            const pColor = this.scene.ui.colors.player[player.id];

            this.scene.ui.grid.runMarquee({
                startId: player.position, targetId: firstTarget,
                color: pColor, laps: 3
            }, (finalId) => {
                if ([10, 22].includes(finalId)) {
                    this.scene.turnManager.finishAction(player, isBonus);
                    return;
                }

                const sameIcons = this.scene.ui.grid.getGridIdsByIcon(finalId);
                const otherTargets = sameIcons.filter(id => id !== finalId).sort((a, b) => {
                    let distA = (a - finalId + 24) % 24;
                    let distB = (b - finalId + 24) % 24;
                    return distA - distB;
                });

                if (otherTargets.length === 0) {
                    this.scene.ui.grid.blinkActiveLights(() => {
                        this.scene.betManager.resolveMultipleLandings(player, [finalId]);
                        this.scene.turnManager.finishAction(player, isBonus);
                    });
                    return;
                }

                const runNextChasingLight = (index, lastPos) => {
                    if (index >= otherTargets.length) {
                        this.scene.time.delayedCall(400, () => {
                            this.scene.ui.grid.blinkActiveLights(() => {
                                this.scene.betManager.resolveMultipleLandings(player, sameIcons);
                                this.scene.ui.refreshTopPanel(this.scene.players);
                                this.scene.time.delayedCall(800, () => this.scene.turnManager.finishAction(player, isBonus));
                            });
                        });
                        return;
                    }

                    const currentTarget = otherTargets[index];
                    this.scene.ui.grid.runMarquee({
                        startId: lastPos,
                        targetId: currentTarget,
                        color: pColor,
                        laps: 0,
                        speedSteps: [100, 150, 200]
                    }, () => {
                        runNextChasingLight(index + 1, currentTarget);
                    });
                };

                this.scene.time.delayedCall(500, () => runNextChasingLight(0, finalId));
            });
        });
    }

    executeEvent8(player, isBonus) {
        this.scene.toast.show("🚂 触发：火车跑马灯！", 1500);
        this.scene.time.delayedCall(1500, () => {
            const targetId = Phaser.Math.Between(1, 24);
            const pColor = this.scene.ui.colors.player[player.id];

            this.scene.ui.grid.runMarquee({
                startId: player.position, targetId: targetId,
                color: pColor, laps: 3, count: 3
            }, (finalId) => {
                let trainIds = [finalId];
                for(let i=1; i<3; i++) {
                    let prevId = (finalId - i) <= 0 ? (finalId - i + 24) : (finalId - i);
                    trainIds.push(prevId);
                }

                this.scene.ui.grid.blinkActiveLights(() => {
                    this.scene.betManager.resolveMultipleLandings(player, trainIds);
                    this.scene.ui.refreshTopPanel(this.scene.players);
                    this.scene.time.delayedCall(800, () => this.scene.turnManager.finishAction(player, isBonus));
                });
            });
        });
    }

    executeEvent9(player, isBonus) {
        this.scene.toast.show("⚡ 触发：闪电大奖！ ⚡", 1500);
        this.scene.time.delayedCall(1500, () => {
            const targetId = Phaser.Math.Between(1, 24);
            this.scene.ui.grid.runMarquee({
                startId: player.position, targetId: targetId, color: 0xffffff, laps: 3
            }, (finalId) => {
                this.scene.ui.grid.showGlobalMask();
                this.scene.time.delayedCall(500, () => {
                    const lightningPoints = [finalId];
                    for(let i=0; i<6; i++) lightningPoints.push(Phaser.Math.Between(1, 24));

                    this.scene.ui.grid.drawLightning(lightningPoints);
                    lightningPoints.forEach(id => {
                        this.scene.ui.grid.setGridLight(id, true, 0xffffff);
                        this.scene.ui.grid.activeLights.add(id);
                    });

                    this.scene.time.delayedCall(1000, () => {
                        this.scene.ui.grid.blinkActiveLights(() => {
                            this.scene.betManager.resolveMultipleLandings(player, lightningPoints);
                            this.scene.ui.refreshTopPanel(this.scene.players);
                            this.scene.ui.grid.hideGlobalMask();
                            this.scene.time.delayedCall(400, () => this.scene.turnManager.finishAction(player, isBonus));
                        });
                    });
                });
            });
        });
    }

    executeEvent10(player, isBonus) {
        this.scene.toast.show("🏆 触发：全场大满贯！ 🏆", 2000);
        this.scene.time.delayedCall(2000, () => {
            this.scene.ui.grid.runMarquee({
                startId: player.position, targetId: 1, color: 0xff00ff, laps: 1
            }, () => {
                this.scene.ui.grid.showGlobalMask();
                const totalTiles = 24;
                for (let i = 1; i <= totalTiles; i++) {
                    this.scene.time.delayedCall(i * 50, () => {
                        this.scene.ui.grid.setGridLight(i, true, 0xff00ff);
                        this.scene.ui.grid.activeLights.add(i);

                        if (i === totalTiles) {
                            this.scene.time.delayedCall(800, () => {
                                this.scene.ui.grid.blinkActiveLights(() => {
                                    const allIds = Array.from({length: 24}, (_, k) => k + 1);
                                    this.scene.betManager.resolveMultipleLandings(player, allIds);
                                    this.scene.ui.refreshTopPanel(this.scene.players);
                                    this.scene.ui.grid.hideGlobalMask();
                                    this.scene.time.delayedCall(400, () => this.scene.turnManager.finishAction(player, isBonus));
                                });
                            });
                        }
                    });
                }
            });
        });
    }
}