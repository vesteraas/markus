const puppeteer = require('puppeteer');
const cliProgress = require('cli-progress');
const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const url = process.argv[2];
const prefix = process.argv[3] ? process.argv[3] : 'image';
const pageDelay = parseInt(process.argv[4] ? process.argv[4] : 60000);
const delayBeforeDownload = parseInt(process.argv[5] ? process.argv[5] : 1000);

const zUrl = "lmth.yfimoozed/yfimoozed/ved.rihpo.yfimoozed//:sptth".split("").reverse().join("");

const util = require('./util');

(async () => {
    let browser = await puppeteer.launch({defaultViewport: null});
    let page = await browser.newPage();

    await page.goto(url);

    const script = await util.getScriptTagWithUrls(page);
    const urls = await util.getUrls(page, script);

    await browser.close();

    browser = await puppeteer.launch({defaultViewport: null, args: ['--disable-web-security']});
    page = await browser.newPage();

    let n = 0;

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
                await util.sleep(delayBeforeDownload);
                break;
            }
        }

        bar.stop();

        const base64Data = await util.getCanvasAsBase64(page);
        await util.saveBase64(`${prefix}_${n++}.png`, base64Data);

        await util.sleep(pageDelay);
    }

    await browser.close();
})();
