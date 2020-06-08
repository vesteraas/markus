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
    .option('-n, --no-compress', 'no PDF compression', false);

program.parse(process.argv);

const zUrl = 'lmth.yfimoozed/yfimoozed/ved.rihpo.yfimoozed//:sptth'.split('').reverse().join('');

const util = require('./util');

(async () => {
    try {
        const temp = await util.createTempDir();

        let browser = await puppeteer.launch({defaultViewport: null});
        let page = await browser.newPage();

        await page.goto(program.url);

        const script = await util.getScriptTagWithUrls(page);

        if (!script) {
            console.error('Invalid album page');
            process.exit(1);
        }

        const urls = await util.getUrls(page, script);

        await browser.close();

        browser = await puppeteer.launch({defaultViewport: null, args: ['--disable-web-security']});
        page = await browser.newPage();

        let n = 0;

        const pdfFiles = [];

        let iterations = urls.length;

        for (let url of urls) {
            console.log(`Downloading image ${n + 1} of ${urls.length}.`);

            await page.goto(zUrl);
            await page.waitFor('input[type=url]');
            await page.$eval('input[type=url]', (el, value) => el.value = value, url);
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

            const pngFile = path.join(temp.path, `image_${n}.png`);
            const pdfFile = path.join(temp.path, `image_${n}.pdf`);

            console.log('Saving canvas...');
            const base64Data = await util.getCanvasAsBase64(page);
            await util.saveBase64(pngFile, base64Data);

            console.log('Creating PDF file...');
            await util.createPDF(pngFile, pdfFile);

            pdfFiles.push(pdfFile);

            n++;

            if (--iterations) {
                console.log(`Sleeping for ${program.delay}ms...`);
                await util.sleep(parseInt(program.delay));
            }
        }

        const unCompressedPdf = path.join(temp.path, `${program.output}_compressed`);

        if (!program.compress) {
            console.log('Merging PDF files...');
            await util.mergePDF(pdfFiles, `${program.output}`);
        } else {
            console.log('Merging PDF files...');
            await util.mergePDF(pdfFiles, unCompressedPdf);
            console.log('Compressing PDF file...');
            await util.compressPDF(unCompressedPdf, `${program.output}`);
        }

        console.log('Cleaning up...')
        temp.cleanupCallback();

        await browser.close();
        console.log('Done!');
    } catch (err) {
        console.error(err);
    }
})();
