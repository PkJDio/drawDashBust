export default class UICard {
    constructor(scene, colors) {
        this.scene = scene;
        this.colors = colors;

        // 🟢 定义哪些特殊卡是有背景图的
        this.specialImgKeys = ['freeze', 'second_chance', 'flip_3', 'flash', 'dare', 'feast'];
    }

    // --- 通用获取图片Key的方法 ---
    getTextureKey(value) {
        if (typeof value === 'number') {
            return `card_${value}`;
        } else if (this.specialImgKeys.includes(value)) {
            return `card_${value}`;
        }
        return null;
    }

    // 绘制小号卡牌
    drawSmall(x, y, value, isGray, group) {
        const w = 30; const h = 34;
        return this._drawCardBase(x, y, w, h, value, isGray, group, 16, 4);
    }

    // 绘制中号卡牌
    drawMedium(x, y, value, isGray, group) {
        const w = 44; const h = 50;
        return this._drawCardBase(x, y, w, h, value, isGray, group, 20, 6);
    }

    // 绘制大号卡牌
    drawLarge(x, y, value, group) {
        const w = 90; const h = 110;
        // 大卡牌多画一层阴影，稍微特殊一点，但核心逻辑复用
        const bgShadow = this.scene.add.graphics();
        bgShadow.fillStyle(0x000000, 0.2);
        bgShadow.fillRoundedRect(x + 4, y + 4, w, h, 12);

        const elems = this._drawCardBase(x, y, w, h, value, false, null, 42, 10);

        // 把阴影加进去
        elems.unshift(bgShadow);

        if (group) { group.addMultiple(elems); } else { return elems; }
    }

    // 🟢 [核心私有方法] 统一绘制逻辑，避免重复代码
    _drawCardBase(x, y, w, h, value, isGray, group, fontSize, radius) {
        const bg = this.scene.add.graphics();
        let cardColor = 0xffffff; let textColor = '#5d4037'; let displayText = value;

        // 1. 设置底色和文字颜色
        if (typeof value === 'string') {
            if (value === 'freeze') { cardColor = 0xbbdefb; displayText = "冻"; textColor='#1565c0'; }
            else if (value === 'second_chance') { cardColor = 0xf8bbd0; displayText = "复"; textColor='#c2185b'; }
            else if (value === 'flip_3') { cardColor = 0xffcc80; displayText = "三"; textColor='#e65100'; }
            else if (value === 'flash') { cardColor = 0xcfd8dc; displayText = "闪"; textColor='#455a64'; }
            else if (value === 'dare') { cardColor = 0xef9a9a; displayText = "胆"; textColor='#b71c1c'; }
            else if (value === 'feast') { cardColor = 0xd7ccc8; displayText = "双"; textColor='#5d4037'; }
            else if (value.startsWith('score_')) { cardColor = 0xfff176; displayText = "+" + value.split('_')[1]; textColor='#f57f17'; }
            else if (value === 'mult_2') { cardColor = 0xe1bee7; displayText = "x2"; textColor='#7b1fa2'; }

            // 如果是大卡牌且文字太长，缩小字体
            if (w > 60 && displayText.length > 2) fontSize = 32;
        }

        // 2. 灰色状态覆盖
        if (isGray) { cardColor = 0xe0e0e0; textColor = 0x9e9e9e; }

        // 🟢 3. 针对 Joker (0 和 14) 的特殊处理：不显示文字
        if (value === 0 || value === 14) {
            displayText = "";
        }

        // 绘制背景
        bg.fillStyle(cardColor, 1);
        bg.fillRoundedRect(x, y, w, h, radius);
        bg.lineStyle(typeof value === 'string' ? 2 : 1, 0x000000, 0.1); // 特殊牌边框稍微粗一点点
        bg.strokeRoundedRect(x, y, w, h, radius);

        // 🟢 4. 绘制图案 (数字牌 + 特殊牌)
        let img = null;
        if (!isGray) {
            const key = this.getTextureKey(value); // 获取对应的图片key
            if (key && this.scene.textures.exists(key)) {
                img = this.scene.add.image(x + w/2, y + h/2, key);

                // 设置图片大小 (留出边距)
                const padding = w > 60 ? 10 : 4;
                img.setDisplaySize(w - padding, h - padding);

                // 设置透明度
                // 如果是 Joker (0/14) 或 特殊牌，图片通常本身就好看，透明度可以高一点或者不透明
                // 这里统一设为 0.5 作为背景，如果您希望 Joker 清晰，可以单独判断
                if (value === 0 || value === 14) {
                    img.setAlpha(0.8); // Joker 稍微清晰点
                } else {
                    img.setAlpha(0.5); // 其他作为背景
                }
            }
        }

        // 绘制文字
        const t = this.scene.add.text(x + w/2, y + h/2, displayText, {
            fontSize: `${fontSize}px`, color: textColor, fontStyle: 'bold', padding: { top:2, bottom:2 }
        }).setOrigin(0.5);

        // 组合
        const elements = [bg];
        if (img) elements.push(img);
        elements.push(t);

        if (group) { group.addMultiple(elements); } else { return elements; }
    }

    /**
     * 绘制道具卡
     */
    drawItem(x, y, itemName, group, isSelected = false) {
        const w = 60; const h = 100;
        const bg = this.scene.add.graphics();

        const color = isSelected ? 0xff7043 : 0x7e57c2;
        const strokeColor = isSelected ? 0xffeb3b : 0x000000;
        const strokeAlpha = isSelected ? 1 : 0.2;
        const strokeWidth = isSelected ? 4 : 2;

        bg.fillStyle(color, 1);
        bg.fillRoundedRect(x, y, w, h, 10);
        bg.lineStyle(strokeWidth, strokeColor, strokeAlpha);
        bg.strokeRoundedRect(x, y, w, h, 10);

        const verticalText = itemName ? itemName.split('').join('\n') : "?";

        const t = this.scene.add.text(x + w/2, y + h/2, verticalText, {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            lineSpacing: 5
        }).setOrigin(0.5);

        const elems = [bg, t];
        if (group) { group.addMultiple(elems); }
        return elems;
    }
}