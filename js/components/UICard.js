export default class UICard {
    constructor(scene, colors) {
        this.scene = scene;
        this.colors = colors;
    }

    // ... (drawSmall, drawMedium, drawLarge 保持不变) ...
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
     * 绘制道具卡 (修改：加大尺寸，竖排文字)
     */
    drawItem(x, y, itemName, group, isSelected = false) {
        // 修改：尺寸变大 (60x100)
        const w = 60; const h = 100;
        const bg = this.scene.add.graphics();

        // 选中时亮橙色，未选中深紫色
        // 增加选中时的边框厚度
        const color = isSelected ? 0xff7043 : 0x7e57c2;
        const strokeColor = isSelected ? 0xffeb3b : 0x000000;
        const strokeAlpha = isSelected ? 1 : 0.2;
        const strokeWidth = isSelected ? 4 : 2;

        bg.fillStyle(color, 1);
        bg.fillRoundedRect(x, y, w, h, 10);
        bg.lineStyle(strokeWidth, strokeColor, strokeAlpha);
        bg.strokeRoundedRect(x, y, w, h, 10);

        // 修改：竖排文字
        // "购地卡" -> "购\n地\n卡"
        const verticalText = itemName ? itemName.split('').join('\n') : "?";

        const t = this.scene.add.text(x + w/2, y + h/2, verticalText, {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            lineSpacing: 5 // 增加字间距
        }).setOrigin(0.5);

        const elems = [bg, t];
        if (group) { group.addMultiple(elems); }
        return elems;
    }
}