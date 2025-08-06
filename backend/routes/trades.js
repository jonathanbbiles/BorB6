const express = require('express');
const { executeStrategy } = require('../services/trader');
const router = express.Router();

router.post('/run', async (req, res) => {
  try {
    const result = await executeStrategy();
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
