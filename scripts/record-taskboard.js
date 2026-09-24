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

  // Navigate to board directly
  await p.goto('http://localhost:3001/northstar/board/8374bc21-220b-4bd1-a76d-3604870d2c88');
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

  let currentCursorX = 1450;
  let currentCursorY = 160;

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
    await p.waitForTimeout(90);
    await p.mouse.up();

    await p.evaluate(() => {
      const c = document.getElementById('virtual-cursor');
      if (c) c.classList.remove('clicking');
    });
    await p.waitForTimeout(50);
  }

  // --- Start choreographed actions ---
  // Initial steady frame
  await p.evaluate(({ x, y }) => {
    const c = document.getElementById('virtual-cursor');
    if (c) c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, { x: currentCursorX, y: currentCursorY });
  await p.waitForTimeout(500);

  // 1. Move to card in "Backlog" column
  const sourceTask = p.locator('[data-testid="kanban-task"]', { hasText: 'Split the workspace bundle by route' }).first();
  const sourceBox = await sourceTask.boundingBox();
  const sX = sourceBox ? sourceBox.x + sourceBox.width / 2 : 280;
  const sY = sourceBox ? sourceBox.y + sourceBox.height / 2 : 240;

  // Move to card in Backlog
  await moveCursor(sX, sY, 650);
  await p.waitForTimeout(150);

  // 2. Drag to "In Progress" column on top of "Typing indicator debounce is too eager"
  const targetTask = p.locator('[data-testid="kanban-task"]', { hasText: 'Typing indicator debounce is too eager' }).first();
  const targetBox = await targetTask.boundingBox();
  const tX = targetBox ? targetBox.x + targetBox.width / 2 : 700;
  const tY = targetBox ? targetBox.y + targetBox.height / 2 : 380;

  // Mouse down
  await p.evaluate(({ x, y }) => {
    const c = document.getElementById('virtual-cursor');
    if (c) c.classList.add('clicking');
  }, { x: currentCursorX, y: currentCursorY });
  await p.mouse.down();
  await p.waitForTimeout(100);

  // Move past distance constraint to start dnd-kit drag
  await p.mouse.move(sX + 12, sY + 8, { steps: 5 });
  await p.waitForTimeout(50);

  // Smooth drag across columns
  const dragSteps = 30;
  for (let i = 1; i <= dragSteps; i++) {
    const t = i / dragSteps;
    const curX = sX + (tX - sX) * easeInOutCubic(t);
    const curY = sY + (tY - sY) * easeInOutCubic(t);

    await p.evaluate(({ x, y }) => {
      const c = document.getElementById('virtual-cursor');
      if (c) c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }, { x: curX, y: curY });

    await p.mouse.move(curX, curY);
    await p.waitForTimeout(25);
  }
  currentCursorX = tX;
  currentCursorY = tY;

  await p.waitForTimeout(200);

  // Drop into In Progress column
  await p.mouse.up();
  await p.evaluate(() => {
    const c = document.getElementById('virtual-cursor');
    if (c) c.classList.remove('clicking');
  });
  await p.waitForTimeout(600);

  // 3. Move to another card to open TaskDetailModal
  const nextTask = p.locator('[data-testid="kanban-task"]', { hasText: 'Audit focus rings on the invite modal' }).first();
  const nextBox = await nextTask.boundingBox();
  const nX = nextBox ? nextBox.x + nextBox.width / 2 : 280;
  const nY = nextBox ? nextBox.y + nextBox.height / 2 : 380;

  await moveCursor(nX, nY, 600);
  await clickCursor();
  await nextTask.click();
  await p.waitForTimeout(800);

  // 4. Cursor inside modal
  await moveCursor(960, 420, 500);
  await p.waitForTimeout(350);
  await moveCursor(800, 540, 400);
  await p.waitForTimeout(350);

  // Close modal via Escape
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);

  // 5. Move to "List view" button
  const listViewBtn = p.locator('button[aria-label="List view"]').first();
  const listBtnBox = await listViewBtn.boundingBox();
  const listX = listBtnBox ? listBtnBox.x + listBtnBox.width / 2 : 1800;
  const listY = listBtnBox ? listBtnBox.y + listBtnBox.height / 2 : 88;

  await moveCursor(listX, listY, 600);
  await clickCursor();
  await listViewBtn.click();
  await p.waitForTimeout(1200);

  // Final hold shot
  await p.waitForTimeout(600);

  const videoObj = p.video();
  await p.close();
  await recordContext.close();

  const recordedPath = videoObj ? await videoObj.path() : null;
  return { recordedPath };
}