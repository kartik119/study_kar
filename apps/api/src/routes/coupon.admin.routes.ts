import { Router } from 'express';
import { CouponAdminService } from '../services/coupon.admin.service';

const router: import('express').Router = Router();

router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await CouponAdminService.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await CouponAdminService.getCoupons(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const coupon = await CouponAdminService.getCouponById(req.params.id);
    res.json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const coupon = await CouponAdminService.createCoupon(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const coupon = await CouponAdminService.updateCoupon(req.params.id, req.body);
    res.json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await CouponAdminService.deleteCoupon(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
