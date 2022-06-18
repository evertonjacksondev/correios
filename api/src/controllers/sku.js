const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

router.post('/', async (req, res) => {
  try {
    let db = req.mongoConnection;
    let {
      productId,
      sku,
      title,
      pricePer,
      priceOf,
      image,
      brand,
      category,
      subCategory
    } = req.body


    let insertId = await db.collection('sku').insertOne({
      productId,
      sku,
      title,
      pricePer,
      priceOf,
      image,
      brand,
      category,
      subCategory
    });
    res.status(200).json(insertId);
  } catch (error) {
    res.status(400).json(error);
  }
})


module.exports = app => app.use('/v1/sku', router);