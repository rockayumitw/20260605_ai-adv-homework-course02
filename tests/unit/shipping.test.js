const { calculateShipping } = require('../../src/utils/shipping');

describe('Shipping 運費計算', () => {
  it('宅配基本運費 120 元', () => {
    const r = calculateShipping({ subtotal: 1000, method: 'home' });
    expect(r.baseFee).toBe(120);
    expect(r.shippingFee).toBe(120);
  });

  it('超商取貨費用 60 元', () => {
    const r = calculateShipping({ subtotal: 1000, method: 'convenience' });
    expect(r.baseFee).toBe(60);
    expect(r.shippingFee).toBe(60);
  });

  it('商品小計 1,499 元仍須收基本運費', () => {
    expect(calculateShipping({ subtotal: 1499, method: 'home' }).shippingFee).toBe(120);
    expect(calculateShipping({ subtotal: 1499, method: 'convenience' }).shippingFee).toBe(60);
  });

  it('商品小計 1,500 元免基本運費', () => {
    expect(calculateShipping({ subtotal: 1500, method: 'home' }).shippingFee).toBe(0);
    expect(calculateShipping({ subtotal: 1500, method: 'convenience' }).shippingFee).toBe(0);
  });

  it('偏遠地區加收 200 元', () => {
    const r = calculateShipping({ subtotal: 1000, method: 'home', isRemote: true });
    expect(r.remoteFee).toBe(200);
    expect(r.shippingFee).toBe(320);
  });

  it('當日急件加收 250 元', () => {
    const r = calculateShipping({ subtotal: 1000, method: 'home', isSameDay: true });
    expect(r.sameDayFee).toBe(250);
    expect(r.shippingFee).toBe(370);
  });

  it('偏遠地區與當日急件同時成立', () => {
    const r = calculateShipping({ subtotal: 1000, method: 'home', isRemote: true, isSameDay: true });
    expect(r.shippingFee).toBe(120 + 200 + 250);
  });

  it('滿額免運與附加費同時成立：只免基本運費，附加費照收', () => {
    const r = calculateShipping({ subtotal: 1500, method: 'home', isRemote: true, isSameDay: true });
    expect(r.baseFee).toBe(0);
    expect(r.shippingFee).toBe(450);
  });

  it('不合法的參數應擲出 VALIDATION_ERROR', () => {
    expect(() => calculateShipping({ subtotal: 1000, method: 'drone' })).toThrow(/配送方式/);
    expect(() => calculateShipping({ subtotal: -1, method: 'home' })).toThrow(/小計/);
    expect(() => calculateShipping({ subtotal: 10.5, method: 'home' })).toThrow(/小計/);
    expect(() => calculateShipping({ subtotal: 1000, method: 'home', isRemote: 'yes' })).toThrow(/布林/);
    try {
      calculateShipping({ subtotal: 1000, method: 'x' });
    } catch (e) {
      expect(e.code).toBe('VALIDATION_ERROR');
    }
  });
});
