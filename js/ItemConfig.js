// --- 道具类型保持不变 ---
export const ITEM_TYPES = {
    LAND_DEED: 'land_deed',
    UPGRADE: 'upgrade',
    BLOCK: 'block',
    CLEAR: 'clear',
    LEACH: 'leach',
    TAX_FREE: 'tax_free',
    ORBIT: 'orbit'
};

export const UPGRADE_PRICES = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10];

// --- 新增：水果机配置 ---

// 8种图标定义 (按倍率从低到高排序建议)
export const FRUIT_TYPES = {
    APPLE: 'apple',       // 🍎
    ORANGE: 'orange',     // 🍊
    PAPAYA: 'papaya',     // 🥭 (木瓜)
    WATERMELON: 'watermelon', // 🍉
    BELL: 'bell',         // 🔔
    STAR: 'star',         // ⭐ (双星)
    MOON: 'moon',         // 🌙 (原77)
    SUN: 'sun'            // ☀️ (原BAR)
};

export const FRUIT_DATA = {
    [FRUIT_TYPES.APPLE]:      { name: "苹果", emoji: "🍎", baseRate: 2,  color: 0xff5252 },
    [FRUIT_TYPES.ORANGE]:     { name: "橙子", emoji: "🍊", baseRate: 3,  color: 0xffa726 },
    [FRUIT_TYPES.PAPAYA]:     { name: "木瓜", emoji: "🥭", baseRate: 4,  color: 0xffd180 },
    [FRUIT_TYPES.WATERMELON]: { name: "西瓜", emoji: "🍉", baseRate: 5,  color: 0x66bb6a },
    [FRUIT_TYPES.BELL]:       { name: "铃铛", emoji: "🔔", baseRate: 10, color: 0xffeb3b },
    [FRUIT_TYPES.STAR]:       { name: "双星", emoji: "⭐", baseRate: 15, color: 0x29b6f6 },
    [FRUIT_TYPES.MOON]:       { name: "月亮", emoji: "🌙", baseRate: 25, color: 0xab47bc },
    [FRUIT_TYPES.SUN]:        { name: "太阳", emoji: "☀️", baseRate: 50, color: 0xe53935 }
};

// 棋盘布局：1-24号格子的水果分布 (移除0号起点)
// 设计思路：小奖多，大奖少
export const BOARD_LAYOUT = [
    FRUIT_TYPES.ORANGE,     // 1
    FRUIT_TYPES.APPLE,      // 2
    FRUIT_TYPES.BELL,       // 3
    FRUIT_TYPES.APPLE,      // 4
    FRUIT_TYPES.PAPAYA,     // 5
    FRUIT_TYPES.APPLE,      // 6
    FRUIT_TYPES.SUN,        // 7 (大奖)
    FRUIT_TYPES.APPLE,      // 8
    FRUIT_TYPES.WATERMELON, // 9
    FRUIT_TYPES.APPLE,      // 10
    FRUIT_TYPES.ORANGE,     // 11
    FRUIT_TYPES.STAR,       // 12
    FRUIT_TYPES.APPLE,      // 13
    FRUIT_TYPES.PAPAYA,     // 14
    FRUIT_TYPES.APPLE,      // 15
    FRUIT_TYPES.MOON,       // 16 (大奖)
    FRUIT_TYPES.APPLE,      // 17
    FRUIT_TYPES.WATERMELON, // 18
    FRUIT_TYPES.ORANGE,     // 19
    FRUIT_TYPES.APPLE,      // 20
    FRUIT_TYPES.BELL,       // 21
    FRUIT_TYPES.APPLE,      // 22
    FRUIT_TYPES.PAPAYA,     // 23
    FRUIT_TYPES.ORANGE      // 24
];

// 道具数据 (移除旧的文字描述，UI层会处理浮窗)
export const ITEM_DATA = {
    land_deed: { name: "购地卡", baseCost: 5, desc: "购买脚下地块(非特殊格)。" },
    upgrade:   { name: "升级卡", baseCost: 5, desc: "随机升级一块己方地块。" },
    block:     { name: "拦截卡", baseCost: 3, desc: "原地放置路障，强制经停。" },
    clear:     { name: "破障卡", baseCost: 2, desc: "清除前方5格内的路障。" },
    leach:     { name: "借势卡", baseCost: 4, desc: "本轮对手得分时，你分得50%。" },
    tax_free:  { name: "免税卡", baseCost: 3, desc: "本轮免除过路费。" },
    orbit:     { name: "环游卡", baseCost: 4, desc: "本轮每走1步+1分。" }
};