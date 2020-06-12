#!/usr/bin/env node

const fs = require('fs');
const puppeteer = require('puppeteer');
const cliProgress = require('cli-progress');
const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const path = require('path');
const {program} = require('commander');

program.version('0.0.1');

program
    .requiredOption('-u, --url <url>', 'url of album')
    .option('-o, --output <pdf>', 'output PDF file', 'output.pdf')
    .option('-d, --delay <ms>', 'delay between each page in album', '10000')
    .option('-n, --no-compress', 'no PDF compression', false)
    .option('-m, --media-dir <folder>', 'folder to store single images and pdfs', undefined)
    .option('-s, --start <index>', 'start index', "-1")
    .option('-e, --end <index>', 'end index', "-1");

program.parse(process.argv);

const zUrl = 'lmth.yfimoozed/yfimoozed/ved.rihpo.yfimoozed//:sptth'.split('').reverse().join('');

const util = require('./util');

(async () => {
    let browser;

    try {
        const tempDir = await util.createTempDir();

        let mediaDir;

        if (!program.mediaDir) {
            mediaDir = tempDir.path;
        } else {
            mediaDir = path.join(__dirname, program.mediaDir);
            if (!fs.existsSync(mediaDir)) {
                fs.mkdirSync(mediaDir);
            }
        }

        browser = await puppeteer.launch({defaultViewport: null});
        let page = await browser.newPage();

        await page.goto(program.url);

        const script = await util.getScriptTagWithUrls(page);

        if (!script) {
            console.error('Invalid album page');
            process.exit(1);
        }

        const pages = util.pageSlice(await util.getPages(page, script), program.start, program.end);

        await browser.close();

        browser = await puppeteer.launch({defaultViewport: null, args: ['--disable-web-security']});
        page = await browser.newPage();

        const pdfFiles = [];

        let iterations = pages.length;

        for (let _page of pages) {
            console.log(`Downloading image ${_page.page} of ${pages.length}.`);

            await page.goto(zUrl);
            await page.waitFor('input[type=url]');
            await page.$eval('input[type=url]', (el, value) => el.value = value, _page.url);
            await page.click('input[type="submit"]');

            bar.start(100, 0);

            while (true) {
                let progress = parseInt(await page.evaluate('document.querySelector("#progressbar").getAttribute("aria-valuenow")'));
                let hidden = await page.evaluate('document.querySelector("#error").getAttribute("hidden")');

                bar.update(progress);

                if (progress === 100 || hidden === null) {
                    bar.update(100);

                    await util.sleep(1000);
                    break;
                }
            }

            bar.stop();

            const pngFile = path.join(mediaDir, `image_${_page.page}.png`);
            const pdfFile = path.join(mediaDir, `image_${_page.page}.pdf`);

            console.log('Saving canvas...');
            const base64Data = await util.getCanvasAsBase64(page);
            await util.saveBase64(pngFile, base64Data);

            console.log('Creating PDF file...');
            await util.createPDF(pngFile, pdfFile);

            pdfFiles.push(pdfFile);

            if (--iterations) {
                console.log(`Sleeping for ${program.delay}ms...`);
                await util.sleep(parseInt(program.delay));
            }
        }

        let outputFile = program.output;

        if (!outputFile.toLowerCase().endsWith('.pdf')) {
            outputFile += '.pdf';
        }

        const unCompressedPdf = path.join(tempDir.path, `${outputFile}`);

        if (!program.compress) {
            console.log('Merging PDF files...');
            await util.mergePDF(pdfFiles, `${outputFile}`);
        } else {
            console.log('Merging PDF files...');
            await util.mergePDF(pdfFiles, unCompressedPdf);
            console.log('Compressing PDF file...');
            await util.compressPDF(unCompressedPdf, `${outputFile}`);
        }

        if (!program.mediaDir) {
            console.log('Cleaning up...');
            tempDir.cleanupCallback();
        }

        console.log('Done!');
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
})();
