export const ITEM_TYPES = {
    LAND: 'land_deed',     // 购地卡
    UPGRADE: 'upgrade',    // 升级卡
    BLOCK: 'block',        // 拦截卡
    CLEAR: 'clear',        // 破障卡
    LEACH: 'leach',        // 借势卡
    YIELD: 'yield',        // 礼让卡
    MODESTY: 'modesty',    // 谦虚卡
    TAXFREE: 'tax_free',   // 免税卡
    ORBIT: 'orbit'         // 环游卡
};

// 升级卡的价格表：第1-2张5元，3-4张6元... 上限10元
// 索引0对应第1张
export const UPGRADE_PRICES = [5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10];

export const ITEM_DATA = {
    [ITEM_TYPES.LAND]: {
        name: "购地卡",
        baseCost: 5,
        desc: "花费5积分。获取当前无主格子的所属权(特殊格除外)。\n他人踩到时你得1分(安全分)，他人不移动。"
    },
    [ITEM_TYPES.UPGRADE]: {
        name: "升级卡",
        baseCost: 5, // 注意：实际价格需根据玩家购买数量计算
        desc: "花费动态积分。升级前后2格内属于你的格子。\n升级后，他人踩到时你的得分+1。"
    },
    [ITEM_TYPES.BLOCK]: {
        name: "拦截卡",
        baseCost: 2,
        desc: "花费2积分。在当前或下一格放置拦截。\n拦下第一个经过此格的玩家停止移动。"
    },
    [ITEM_TYPES.CLEAR]: {
        name: "破障卡",
        baseCost: 1,
        desc: "花费1积分。清除前方5格内的所有拦截卡效果。"
    },
    [ITEM_TYPES.LEACH]: {
        name: "借势卡",
        baseCost: 6,
        desc: "花费6积分。本轮指定一玩家，当其超过你时，\n你跟随移动并获得差额积分(安全分)。"
    },
    [ITEM_TYPES.YIELD]: {
        name: "礼让卡",
        baseCost: 2,
        desc: "花费2积分。本轮若有玩家停在你位置，\n该玩家前移1格，你获得4积分。"
    },
    [ITEM_TYPES.MODESTY]: {
        name: "谦虚卡",
        baseCost: 1,
        desc: "花费1积分。立即+3分，本轮最后行动。\n若多人使用，积分低者后手。"
    },
    [ITEM_TYPES.TAXFREE]: {
        name: "免税卡",
        baseCost: 1,
        desc: "花费1积分。本轮踩到他人领地时，\n无需让对方获得积分。"
    },
    [ITEM_TYPES.ORBIT]: {
        name: "环游卡",
        baseCost: 3,
        desc: "花费3积分。本轮结算时，\n若移动总步数>=24格，额外获得6分。"
    }
};