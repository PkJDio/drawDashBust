export default class UICard {
    constructor(scene, colors) {
        this.scene = scene;
        this.colors = colors;
    }

    /**
     * 绘制小号卡牌 (顶部玩家信息用)
     */
    drawSmall(x, y, value, isGray, group) {
        const w = 30; const h = 34;
        const bg = this.scene.add.graphics();
        let cardColor = 0xffffff; let textColor = '#5d4037'; let displayText = value;

        if (typeof value === 'string') {
            if (value === 'freeze') { cardColor = 0xbbdefb; displayText = "冻"; textColor='#1565c0'; }
            else if (value === 'second_chance') { cardColor = 0xf8bbd0; displayText = "复"; textColor='#c2185b'; }
            else if (value === 'flip_3') { cardColor = 0xffcc80; displayText = "三"; textColor='#e65100'; }
            else if (value === 'flash') { cardColor = 0xcfd8dc; displayText = "闪"; textColor='#455a64'; }
            else if (value === 'dare') { cardColor = 0xef9a9a; displayText = "胆"; textColor='#b71c1c'; }
            else if (value === 'feast') { cardColor = 0xd7ccc8; displayText = "双"; textColor='#5d4037'; }
            else if (value.startsWith('score_')) { cardColor = 0xfff176; displayText = "+" + value.split('_')[1]; textColor='#f57f17'; }
            else if (value === 'mult_2') { cardColor = 0xe1bee7; displayText = "x2"; textColor='#7b1fa2'; }
        }
        if (isGray) { cardColor = 0xe0e0e0; textColor = 0x9e9e9e; }

        bg.fillStyle(cardColor, 1);
        bg.fillRoundedRect(x, y, w, h, 6);
        bg.lineStyle(1, 0x000000, 0.1);
        bg.strokeRoundedRect(x, y, w, h, 6);
        const t = this.scene.add.text(x + w/2, y + h/2, displayText, {
            fontSize: '16px', color: textColor, fontStyle: 'bold', padding: { top:2, bottom:2 }
        }).setOrigin(0.5);

        if (group) { group.add(bg); group.add(t); } else { return [bg, t]; }
    }

    /**
     * 绘制中号卡牌 (手牌、竞速、中间显示用)
     */
    drawMedium(x, y, value, isGray, group) {
        const w = 44; const h = 50;
        const bg = this.scene.add.graphics();
        let cardColor = 0xffffff; let textColor = '#5d4037'; let displayText = value;

        if (typeof value === 'string') {
            if (value === 'freeze') { cardColor = 0xbbdefb; displayText = "冻"; textColor='#1565c0'; }
            else if (value === 'second_chance') { cardColor = 0xf8bbd0; displayText = "复"; textColor='#c2185b'; }
            else if (value === 'flip_3') { cardColor = 0xffcc80; displayText = "三"; textColor='#e65100'; }
            else if (value === 'flash') { cardColor = 0xcfd8dc; displayText = "闪"; textColor='#455a64'; }
            else if (value === 'dare') { cardColor = 0xef9a9a; displayText = "胆"; textColor='#b71c1c'; }
            else if (value === 'feast') { cardColor = 0xd7ccc8; displayText = "双"; textColor='#5d4037'; }
            else if (value.startsWith('score_')) { cardColor = 0xfff176; displayText = "+" + value.split('_')[1]; textColor='#f57f17'; }
            else if (value === 'mult_2') { cardColor = 0xe1bee7; displayText = "x2"; textColor='#7b1fa2'; }
        }
        if (isGray) { cardColor = 0xe0e0e0; textColor = 0x9e9e9e; }

        bg.fillStyle(cardColor, 1);
        bg.fillRoundedRect(x, y, w, h, 8);
        bg.lineStyle(2, 0x000000, 0.1);
        bg.strokeRoundedRect(x, y, w, h, 8);

        const t = this.scene.add.text(x + w/2, y + h/2, displayText, {
            fontSize: '20px', color: textColor, fontStyle: 'bold', padding: { top:2, bottom:2 }
        }).setOrigin(0.5);

        const elements = [bg, t];
        if (group) { group.addMultiple(elements); } else { return elements; }
    }
}