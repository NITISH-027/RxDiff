import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const SCREENSHOTS_DIR = path.resolve('docs/screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = path.resolve(process.env.TEMP || 'C:\\temp', 'rxdiff_cdp_' + Date.now());

  console.log('Launching headless Chrome with debugging port 9222...');
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${tempDir}`,
    '--remote-debugging-port=9222',
    '--window-size=1440,960',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    // Wait for Chrome CDP port
    let wsUrl = '';
    for (let i = 0; i < 20; i++) {
      await delay(500);
      try {
        const res = await fetch('http://localhost:9222/json/version');
        if (res.ok) {
          const data = await res.json();
          wsUrl = data.webSocketDebuggerUrl;
          console.log('Connected to CDP:', wsUrl);
          break;
        }
      } catch {
        // Retry
      }
    }

    if (!wsUrl) {
      throw new Error('Failed to connect to Chrome DevTools port 9222');
    }

    // Connect WebSocket
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let id = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    // Get targets list to find the page ws url
    const targetsRes = await fetch('http://localhost:9222/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    if (!pageTarget) throw new Error('No page target found');

    const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      pageWs.onopen = res;
      pageWs.onerror = rej;
    });

    let pageMsgId = 1;
    const pagePending = new Map();
    pageWs.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pagePending.has(m.id)) {
        const { resolve, reject } = pagePending.get(m.id);
        pagePending.delete(m.id);
        if (m.error) reject(new Error(m.error.message));
        else resolve(m.result);
      }
    };

    function callPage(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = pageMsgId++;
        pagePending.set(msgId, { resolve, reject });
        pageWs.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await callPage('Page.enable');
    await callPage('Runtime.enable');
    await callPage('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating directly via page target...');
    await callPage('Page.navigate', { url: 'http://localhost:5173/' });
    await delay(3000); // Allow render & fonts

    // 1. Capture Story Intro
    console.log('Capturing 1: Story Intro...');
    const shot1 = await callPage('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(SCREENSHOTS_DIR, '01_story_intro.png'), Buffer.from(shot1.data, 'base64'));

    // 2. Scroll to #workspace
    console.log('Scrolling to workbench...');
    await callPage('Runtime.evaluate', {
      expression: `document.getElementById('workspace')?.scrollIntoView({ behavior: 'instant' });`
    });
    await delay(1200);

    // Capture Workbench in Demo Mode
    console.log('Capturing 2: Reconciliation Workbench...');
    const shot2 = await callPage('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(SCREENSHOTS_DIR, '02_reconciliation_workbench.png'), Buffer.from(shot2.data, 'base64'));

    // Click on the first "Review evidence & quotes" button
    console.log('Opening evidence review drawer...');
    await callPage('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Review evidence'));
        if (btn) btn.click();
      `
    });
    await delay(1000);
    console.log('Capturing 3: Evidence Inspection...');
    const shot3 = await callPage('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(SCREENSHOTS_DIR, '03_evidence_inspection.png'), Buffer.from(shot3.data, 'base64'));

    // Close modal if open or switch to "Analyze images" (Upload Mode)
    console.log('Switching to Analyze images mode...');
    await callPage('Runtime.evaluate', {
      expression: `
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Close') || b.getAttribute('aria-label')?.includes('Close'));
        if (closeBtn) closeBtn.click();
        const uploadBtn = document.querySelector('button[aria-label="Analyze images"]');
        if (uploadBtn) uploadBtn.click();
      `
    });
    await delay(1200);

    // Capture Upload Studio
    console.log('Capturing 4: Live Prescription Upload Studio...');
    const shot4 = await callPage('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(SCREENSHOTS_DIR, '04_live_upload_studio.png'), Buffer.from(shot4.data, 'base64'));

    console.log('All 4 high-res screenshots captured successfully into docs/screenshots/!');

    pageWs.close();
    ws.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
