const express = require('express');
const { getProductInvento } = require('../../../../lib/http/invento');

const router = express.Router();

router.get('/product', async (req, res,) => {
  try {
    let ret = await getProductInvento();

    res.status(200).json(ret);
  } catch (err) {
    res.status(err && !err.auth ? 400 : 401).json();
  }

});

module.exports = app => app.use('/v1/front/invento', router);