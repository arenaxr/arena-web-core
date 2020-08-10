const config = require('./config.json');
const express = require('express')
const https = require('https')
const fs = require('fs')
const jose = require('jose')
const {JWK, JWT, errors} = jose
const app = express()
const port = 8888

const key = fs.readFileSync(config.keypath);
const cert = fs.readFileSync(config.certpath);

const server = https.createServer({key: key, cert: cert }, app);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', (req, res) => {
    switch(req.query.username) {
    case 'conix':
        var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25peCIsImlhdCI6MTU5Njg3NDA4OCwiZXhwIjoxNjI4NDEwMDg4fQ.6Z_zmxmQDw7WTdtXa6MtHa7isMlJ1YOyIv_nwpmfRO4';
        res.json({username: req.query.username, token: token});
        break;
    default:
        res.json({username: req.query.username, token: null});
        break;
    }
});

server.listen(port, () => {
    console.log(`Auth test app listening at https://xr.andrew.cmu.edu:${port}`)
});


