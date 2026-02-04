// --- 道具类型定义 ---
export const ITEM_TYPES = {
    LAND: 'land',
    UPGRADE: 'upgrade',
    TAX_FREE: 'tax_free',
    PROTECTION: 'protection',
    PROPHECY: 'prophecy',
    EXCHANGE: 'exchange'
};

// --- 水果机配置 ---
export const FRUIT_TYPES = {
    APPLE: 'apple', WATERMELON: 'watermelon', PAPAYA: 'papaya', ORANGE: 'orange',
    BELL: 'bell', STAR: 'star', MOON: 'moon', SUN: 'sun'
};

export const FRUIT_DATA = {
    [FRUIT_TYPES.APPLE]:      { name: "苹果", emoji: "🍎", baseRate: 2,  color: 0xff5252 },
    [FRUIT_TYPES.WATERMELON]: { name: "西瓜", emoji: "🍉", baseRate: 3,  color: 0x66bb6a },
    [FRUIT_TYPES.PAPAYA]:     { name: "木瓜", emoji: "🥭", baseRate: 3,  color: 0xffd180 },
    [FRUIT_TYPES.ORANGE]:     { name: "橙子", emoji: "🍊", baseRate: 3,  color: 0xffa726 },
    [FRUIT_TYPES.BELL]:       { name: "铃铛", emoji: "🔔", baseRate: 3,  color: 0xffeb3b },
    [FRUIT_TYPES.STAR]:       { name: "双星", emoji: "⭐", baseRate: 4,  color: 0x29b6f6 },
    [FRUIT_TYPES.MOON]:       { name: "月亮", emoji: "🌙", baseRate: 4,  color: 0xab47bc },
    [FRUIT_TYPES.SUN]:        { name: "太阳", emoji: "☀️", baseRate: 4,  color: 0xe53935 }
};

// --- 道具详细配置 ---
// 优化：单行描述，确保在商店UI中显示完美
export const ITEM_DATA = {
    land: {
        name: "购地卡",
        price: 5,
        desc: "购买脚下无主地块或升级己方地块",
        emoji: "🚩"
    },
    upgrade: {
        name: "升级卡",
        price: 3,
        desc: "升级己方任意地块(价格随购买递增)",
        emoji: "⏫"
    },
    tax_free: {
        name: "免税卡",
        price: 2,
        desc: "本轮经过他人领地免交一次过路费",
        emoji: "🛡️"
    },
    protection: {
        name: "保护卡",
        price: 10,
        desc: "本轮抵消一次爆牌(生效后道具消失)",
        emoji: "🔰"
    },
    prophecy: {
        name: "预言卡",
        price: 5,
        desc: "猜下张牌大小，猜对奖10特殊奖5",
        emoji: "🔮"
    },
    exchange: {
        name: "交换卡",
        price: 8,
        desc: "指定任意两块领地交换双方归属权",
        emoji: "⇄"
    }
};