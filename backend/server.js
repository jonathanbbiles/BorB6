require('dotenv').config();
const express = require('express');
const trades = require('./routes/trades');

const app = express();
app.use(express.json());
app.use('/api/trades', trades);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
