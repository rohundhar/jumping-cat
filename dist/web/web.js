"use strict";
//@ts-nocheck
const express = require('express');
const app = express();
app.get('/auth', (req, res) => {
    const code = req.query.code;
    // Handle the authorization code here
    res.send('Authorization code received!');
});
app.listen(8080, () => {
    console.log('Server listening on port 8080');
});
