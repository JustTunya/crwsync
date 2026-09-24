async (page) => {
  const outputDir = 'C:/crwsync/recordings_temp';
  const browser = page.context().browser();

  // Phase 1: Authentication & Session setup
  const authContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark'
  });
  const authPage = await authContext.newPage();
  await authPage.goto('http://localhost:3000');
  await authPage.waitForLoadState('networkidle');

  const demoBtn = authPage.locator('button', { hasText: 'Try Live Demo' }).first();
  await demoBtn.waitFor({ state: 'visible' });
  await demoBtn.click();
  await authPage.waitForURL(/localhost:3001/, { timeout: 15000 });
  await authPage.waitForLoadState('networkidle');

  await authPage.getByText('design-sync').first().click();
  await authPage.waitForURL(/\/chat\//);
  const chatUrl = authPage.url();

  await authPage.evaluate(() => {
    localStorage.setItem('l-sidebar-state', JSON.stringify({ state: { open: false }, version: 0 }));
    localStorage.setItem('r-sidebar-state', JSON.stringify({ state: { open: false, view: 'MEMBERS' }, version: 0 }));
    localStorage.setItem('theme', 'dark');
  });

  const storageState = await authContext.storageState();
  await authContext.close();

  // Phase 2: Dedicated Recording Context
  const recordContext = await browser.newContext({
    storageState,
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark',
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const p = await recordContext.newPage();

  // Navigate to Chat room directly
  await p.goto(chatUrl);
  await p.waitForLoadState('networkidle');

  // Set dark theme & closed sidebars
  await p.evaluate(() => {
    localStorage.setItem('l-sidebar-state', JSON.stringify({ state: { open: false }, version: 0 }));
    localStorage.setItem('r-sidebar-state', JSON.stringify({ state: { open: false, view: 'MEMBERS' }, version: 0 }));
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  });

  // Inject CSS: hide scrollbars, devtools, style virtual cursor
  await p.addStyleTag({
    content: `
      *, *::before, *::after {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      button[aria-label*="Tanstack"], button[aria-label*="devtools"], .tsquery-devtools {
        display: none !important;
      }
      .message-highlight-target { user-select: none !important; }
      #virtual-cursor {
        position: fixed;
        top: 0;
        left: 0;
        width: 28px;
        height: 28px;
        pointer-events: none;
        z-index: 99999999;
        transform: translate3d(-100px, -100px, 0);
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));
      }
      #virtual-cursor svg {
        width: 28px;
        height: 28px;
        transform-origin: 2px 2px;
        transition: transform 0.08s ease;
      }
      #virtual-cursor.clicking svg {
        transform: scale(0.82);
      }
      .click-ripple {
        position: fixed;
        width: 36px;
        height: 36px;
        margin-left: -18px;
        margin-top: -18px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.9);
        pointer-events: none;
        z-index: 99999998;
        animation: rippleAnim 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      }
      @keyframes rippleAnim {
        0% { transform: scale(0.2); opacity: 1; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    `
  });

  // Inject cursor element
  await p.evaluate(() => {
    if (!document.getElementById('virtual-cursor')) {
      const cursor = document.createElement('div');
      cursor.id = 'virtual-cursor';
      cursor.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L5.85 2.35c-.32-.32-.85-.1-.85.36z" fill="#09090b" stroke="#ffffff" stroke-width="1.75" stroke-linejoin="round"/>
        </svg>
      `;
      document.body.appendChild(cursor);
    }
  });

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  let currentCursorX = 1350;
  let currentCursorY = 180;

  async function moveCursor(endX, endY, durationMs = 600) {
    const steps = Math.max(12, Math.floor((durationMs / 1000) * 60));
    const interval = durationMs / steps;
    const startX = currentCursorX;
    const startY = currentCursorY;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const eased = easeInOutCubic(t);
      const x = startX + (endX - startX) * eased;
      const y = startY + (endY - startY) * eased;

      await p.evaluate(({ x, y }) => {
        const c = document.getElementById('virtual-cursor');
        if (c) c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }, { x, y });

      await p.mouse.move(x, y);
      await p.waitForTimeout(interval);
    }
    currentCursorX = endX;
    currentCursorY = endY;
  }

  async function clickCursor() {
    await p.evaluate(({ x, y }) => {
      const c = document.getElementById('virtual-cursor');
      if (c) c.classList.add('clicking');
      const rip = document.createElement('div');
      rip.className = 'click-ripple';
      rip.style.left = `${x}px`;
      rip.style.top = `${y}px`;
      document.body.appendChild(rip);
      setTimeout(() => rip.remove(), 450);
    }, { x: currentCursorX, y: currentCursorY });

    await p.mouse.down();
    await p.waitForTimeout(80);
    await p.mouse.up();

    await p.evaluate(() => {
      const c = document.getElementById('virtual-cursor');
      if (c) c.classList.remove('clicking');
    });
    await p.waitForTimeout(50);
  }

  // Initial steady frame
  await p.evaluate(({ x, y }) => {
    const c = document.getElementById('virtual-cursor');
    if (c) c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, { x: currentCursorX, y: currentCursorY });
  await p.waitForTimeout(500);

  const incoming = p.locator('.group\\/bubble.items-start');

  // 1. Double-click an incoming message without reactions to heart it
  const heartTarget = incoming.nth(0).locator('.message-highlight-target');
  const hb = await heartTarget.boundingBox();
  await moveCursor(hb.x + hb.width / 2, hb.y + hb.height / 2, 600);
  await p.mouse.dblclick(currentCursorX, currentCursorY);
  await p.waitForTimeout(1200);

  // 2. Write a message
  const inputEl = p.locator('textarea, input[placeholder*="message" i], [contenteditable="true"]').first();
  const inputBox = await inputEl.boundingBox();
  await moveCursor(inputBox.x + 120, inputBox.y + inputBox.height / 2, 600);
  await clickCursor();
  for (const char of "Great work, thanks team!") {
    await p.keyboard.type(char, { delay: 30 });
  }
  await p.waitForTimeout(300);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);

  // Hold beauty finish shot
  await p.waitForTimeout(600);

  const videoObj = p.video();
  await p.close();
  await recordContext.close();

  const recordedPath = videoObj ? await videoObj.path() : null;
  return { recordedPath };
}