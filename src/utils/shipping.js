// 配送費用計算模組：所有運費規則集中於此，與 Express / DB 無關，可獨立測試。

const SHIPPING_METHODS = {
  home: { label: '宅配', baseFee: 120 },
  convenience: { label: '超商取貨', baseFee: 60 },
};

const FREE_SHIPPING_THRESHOLD = 1500; // 商品小計滿此金額免基本運費
const REMOTE_SURCHARGE = 200; // 偏遠地區附加費
const SAME_DAY_SURCHARGE = 250; // 當日急件附加費

function validationError(message) {
  const err = new Error(message);
  err.code = 'VALIDATION_ERROR';
  return err;
}

function isValidMethod(method) {
  return Object.prototype.hasOwnProperty.call(SHIPPING_METHODS, method);
}

/**
 * 計算運費。
 * @param {object} options
 * @param {number} options.subtotal 商品小計（非負整數）
 * @param {string} options.method 配送方式：'home' | 'convenience'
 * @param {boolean} [options.isRemote=false] 是否偏遠地區
 * @param {boolean} [options.isSameDay=false] 是否當日急件
 * @returns {{ method: string, baseFee: number, remoteFee: number, sameDayFee: number, shippingFee: number }}
 * @throws 參數不合法時擲出 code 為 VALIDATION_ERROR 的 Error
 */
function calculateShipping({ subtotal, method, isRemote = false, isSameDay = false } = {}) {
  if (!Number.isInteger(subtotal) || subtotal < 0) {
    throw validationError('商品小計必須為非負整數');
  }
  if (!isValidMethod(method)) {
    throw validationError('配送方式必須為 home 或 convenience');
  }
  if (typeof isRemote !== 'boolean' || typeof isSameDay !== 'boolean') {
    throw validationError('isRemote 與 isSameDay 必須為布林值');
  }

  const baseFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_METHODS[method].baseFee;
  const remoteFee = isRemote ? REMOTE_SURCHARGE : 0;
  const sameDayFee = isSameDay ? SAME_DAY_SURCHARGE : 0;

  return {
    method,
    baseFee,
    remoteFee,
    sameDayFee,
    shippingFee: baseFee + remoteFee + sameDayFee,
  };
}

module.exports = {
  SHIPPING_METHODS,
  FREE_SHIPPING_THRESHOLD,
  REMOTE_SURCHARGE,
  SAME_DAY_SURCHARGE,
  isValidMethod,
  calculateShipping,
};
