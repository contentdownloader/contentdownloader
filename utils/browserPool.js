import puppeteer from 'puppeteer';

const MAX_BROWSERS = 2; // Limit concurrent browser instances to save resources
const browserPool = [];
const browserQueue = []; // For requests waiting for a browser

async function launchNewBrowser() {
    console.log('Launching new Puppeteer browser instance...');
    return await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    });
}

export async function getBrowser() {
    if (browserPool.length > 0) {
        console.log('Reusing browser from pool.');
        return browserPool.pop(); // Reuse an existing browser
    }

    if (browserQueue.length >= MAX_BROWSERS) {
        // All browsers are in use, and new ones are being launched/maxed out
        return new Promise(resolve => {
            browserQueue.push(resolve); // Add request to queue
        });
    }

    // Launch a new browser if below max and none available
    const browser = await launchNewBrowser();
    return browser;
}

export function releaseBrowser(browser) {
    if (browser) {
        if (browserQueue.length > 0) {
            const nextRequester = browserQueue.shift();
            nextRequester(browser); // Give browser to next waiting request
        } else {
            browserPool.push(browser); // Add back to pool
        }
    }
}

export async function closeAllBrowsers() {
    console.log('Closing all browsers in pool...');
    while (browserPool.length > 0) {
        const browser = browserPool.pop();
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }
    // Also close any browsers that might be temporarily checked out
    // (This is a simplified pool. For very robust handling, track all active browsers)
    console.log('All browsers closed.');
}

// Ensure browsers are closed on process exit
process.on('exit', closeAllBrowsers);
process.on('SIGINT', async () => { // Ctrl+C
    await closeAllBrowsers();
    process.exit(0);
});
process.on('SIGTERM', async () => { // Docker stop
    await closeAllBrowsers();
    process.exit(0);
});
