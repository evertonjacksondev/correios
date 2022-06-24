
const fs = require('fs');
const path = require('path');

module.exports = app => {
    fs
        .readdirSync(__dirname)
        .filter(file => ((file.indexOf('.')) !== -1 && (file !== 'index.js') ))
        .forEach(file => require(path.resolve(__dirname, file))(app));

    fs
        .readdirSync(__dirname + '/front') 
        .filter(file => ((file.indexOf('.')) !== -1 && (file !== 'index.js') ))
        .forEach(file => require(path.resolve(__dirname + '/front', file))(app));
};