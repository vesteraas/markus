const fs = require('fs');

exports.sleep = (delay) => {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    })
}

exports.getScriptTagWithUrls = async (page) => {
    const scripts = await page.evaluate(() => Array.from(document.getElementsByTagName('script'), e => e.innerText));

    for (const script of scripts) {
        if (script.indexOf('tileSources:') > -1) {
            return script;
        }
    }
}

exports.getUrls = async (page, script) => {
    let match = script.match(/\[(.*?)\]/s);

    let result = [];

    for (let untrimmedPart of match[1].trim().split("\n")) {
        let part = untrimmedPart.trim();
        result.push(part.replace(/"/g, '').replace(/,/g, ''));
    }

    return result;
}

exports.getCanvasAsBase64 = async (page) => {
    return await page.evaluate(() => {
        const canvas = document.getElementById('rendering-canvas');
        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl.replace(/^data:image\/png;base64,/, '');
    });
}

exports.saveBase64 = async (filename, base64Data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, base64Data, 'base64', function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
