const express = require('express');
const compression = require('compression');

const port = 8100;

const app = express();
app.use(compression({ filter: shouldCompress }))

app.use(express.static('../orbital/dist'));
app.listen(port, () => console.log(`Listening on port ${port}.`));

function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
        return false;
    }

    return compression.filter(req, res);
}
