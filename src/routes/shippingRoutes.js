const express = require('express');
const { calculateShipping, isValidMethod, SHIPPING_METHODS } = require('../utils/shipping');

const router = express.Router();

/**
 * @openapi
 * /api/shipping/quote:
 *   post:
 *     summary: 試算運費（公開，供結帳頁即時顯示）
 *     tags: [Shipping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subtotal]
 *             properties:
 *               subtotal:
 *                 type: integer
 *                 description: 商品小計
 *               shippingMethod:
 *                 type: string
 *                 enum: [home, convenience]
 *                 default: home
 *               isRemote:
 *                 type: boolean
 *                 default: false
 *               isSameDay:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: 試算成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     method:
 *                       type: string
 *                     baseFee:
 *                       type: integer
 *                     remoteFee:
 *                       type: integer
 *                     sameDayFee:
 *                       type: integer
 *                     shippingFee:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                       description: subtotal + shippingFee
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: 參數不合法
 */
router.post('/quote', (req, res) => {
  const { subtotal } = req.body;
  const shippingMethod = req.body.shippingMethod === undefined ? 'home' : req.body.shippingMethod;
  const isRemote = req.body.isRemote === undefined ? false : req.body.isRemote;
  const isSameDay = req.body.isSameDay === undefined ? false : req.body.isSameDay;

  if (!isValidMethod(shippingMethod)) {
    return res.status(400).json({
      data: null,
      error: 'VALIDATION_ERROR',
      message: `配送方式必須為 ${Object.keys(SHIPPING_METHODS).join(' 或 ')}`
    });
  }

  try {
    const result = calculateShipping({ subtotal, method: shippingMethod, isRemote, isSameDay });
    res.json({
      data: { ...result, total: subtotal + result.shippingFee },
      error: null,
      message: '成功'
    });
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', message: err.message });
    }
    throw err;
  }
});

module.exports = router;
