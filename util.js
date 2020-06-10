const tmp = require('tmp');
const fs = require('fs');
const {createCanvas, loadImage} = require('canvas');
const PDFMerge = require('pdfmerge');
const { exec } = require('child_process');

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

    for (let untrimmedPart of match[1].trim().split('\n')) {
        let part = untrimmedPart.trim();
        result.push(part.replace(/"/g, '').replace(/,/g, ''));
    }

    return result;
}

exports.getCanvasAsBase64 = (page) => {
    return page.evaluate(() => {
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

exports.createTempDir = () => {
    return new Promise((resolve, reject) => {
        tmp.dir({unsafeCleanup: true}, (err, path, cleanupCallback) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    path: path,
                    cleanupCallback: cleanupCallback
                });
            }
        });
    });
};

exports.createPDF = (input, output) => {
    return new Promise((resolve, reject) => {
        loadImage(input).then((image) => {
            const pdfCanvas = createCanvas(image.width, image.height, 'pdf');
            const pdfContext = pdfCanvas.getContext('2d');

            pdfContext.drawImage(image, 0, 0);

            const stream = pdfCanvas.createPDFStream();
            const out = fs.createWriteStream(output);
            stream.pipe(out);

            out.on('finish', () => {
                resolve();
            });

            out.on('error', (err) => {
                reject(err);
            });
        });
    })
}

exports.mergePDF = async (files, output) => {
    await PDFMerge(files, output);
};

exports.compressPDF = (source, destination) => {
    return new Promise((resolve, reject) => {
        exec(`qpdf --optimize-images '${source}' '${destination}'`, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

exports.urlSubsection = (urls, _startPage, _endPage) => {
    let startPage;
    if (parseInt(_startPage) === -1) {
        startPage = 0;
    } else {
        startPage = parseInt(_startPage) - 1;
    }

    let endPage;
    if (parseInt(_endPage) === -1) {
        endPage = urls.length;
    } else {
        endPage = parseInt(_endPage);
    }

    return urls.slice(startPage, endPage);
};
