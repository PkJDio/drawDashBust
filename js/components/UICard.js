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
     * 绘制中号卡牌 (手牌、竞速用)
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

    /**
     * 绘制大号卡牌 (中间展示区专用)
     */
    drawLarge(x, y, value, group) {
        const w = 90; const h = 110;
        const bg = this.scene.add.graphics();
        let cardColor = 0xffffff; let textColor = '#5d4037'; let displayText = value;
        let fontSize = '42px';

        if (typeof value === 'string') {
            if (value === 'freeze') { cardColor = 0xbbdefb; displayText = "冻"; textColor='#1565c0'; }
            else if (value === 'second_chance') { cardColor = 0xf8bbd0; displayText = "复"; textColor='#c2185b'; }
            else if (value === 'flip_3') { cardColor = 0xffcc80; displayText = "三"; textColor='#e65100'; }
            else if (value === 'flash') { cardColor = 0xcfd8dc; displayText = "闪"; textColor='#455a64'; }
            else if (value === 'dare') { cardColor = 0xef9a9a; displayText = "胆"; textColor='#b71c1c'; }
            else if (value === 'feast') { cardColor = 0xd7ccc8; displayText = "双"; textColor='#5d4037'; }
            else if (value.startsWith('score_')) { cardColor = 0xfff176; displayText = "+" + value.split('_')[1]; textColor='#f57f17'; }
            else if (value === 'mult_2') { cardColor = 0xe1bee7; displayText = "x2"; textColor='#7b1fa2'; }

            if (displayText.length > 2) fontSize = '32px';
        }

        bg.fillStyle(0x000000, 0.2);
        bg.fillRoundedRect(x + 4, y + 4, w, h, 12);

        bg.fillStyle(cardColor, 1);
        bg.fillRoundedRect(x, y, w, h, 12);
        bg.lineStyle(3, 0x000000, 0.1);
        bg.strokeRoundedRect(x, y, w, h, 12);

        const t = this.scene.add.text(x + w/2, y + h/2, displayText, {
            fontSize: fontSize, color: textColor, fontStyle: 'bold', padding: { top:5, bottom:5 }
        }).setOrigin(0.5);

        const elements = [bg, t];
        if (group) { group.addMultiple(elements); } else { return elements; }
    }

    /**
     * 绘制道具卡 (新增)
     */
    drawItem(x, y, itemName, group, isSelected = false) {
        const w = 44; const h = 50;
        const bg = this.scene.add.graphics();

        // 选中时亮橙色，未选中深紫色
        const color = isSelected ? 0xff7043 : 0x7e57c2;

        bg.fillStyle(color, 1);
        bg.fillRoundedRect(x, y, w, h, 8);
        bg.lineStyle(2, 0x000000, 0.2);
        bg.strokeRoundedRect(x, y, w, h, 8);

        // 取首字作为图标 (例如: "购", "升")
        const shortName = itemName ? itemName.substring(0, 1) : "?";

        const t = this.scene.add.text(x + w/2, y + h/2, shortName, {
            fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 道具需要返回 bg 对象以便绑定点击事件
        const elems = [bg, t];
        if (group) { group.addMultiple(elems); }
        return elems;
    }
}