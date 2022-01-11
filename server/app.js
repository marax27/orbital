const express = require('express');

const port = 8100;

const app = express();
app.use(express.static('../orbital/dist'));
app.listen(port, () => console.log(`Listening on port ${port}.`));
