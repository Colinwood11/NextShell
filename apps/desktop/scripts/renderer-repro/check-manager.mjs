// Run: node apps/desktop/scripts/renderer-repro/check-manager.mjs
// Real Chromium layout/input + in-memory IPC; never opens a saved connection.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import electron from "electron";

if (!process.versions.electron) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "nextshell-manager-"));
  try {
    execFileSync(
      path.resolve(import.meta.dirname, "../../node_modules/.bin/esbuild"),
      [
        path.join(import.meta.dirname, "manager-smoke.tsx"),
        "--bundle",
        `--outfile=${temporary}/smoke.js`,
        "--platform=browser",
        "--format=iife",
        "--jsx=automatic"
      ],
      { stdio: "inherit" }
    );
    fs.writeFileSync(
      path.join(temporary, "index.html"),
      '<link rel="stylesheet" href="smoke.css"><div id="root"></div><script src="smoke.js"></script>'
    );
    const result = spawnSync(electron, [import.meta.filename, temporary], { stdio: "inherit" });
    process.exitCode = result.status ?? 1;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
} else {
  const { app, BrowserWindow } = electron;
  app.setPath("userData", path.join(process.argv[2], "profile"));
  app
    .whenReady()
    .then(async () => {
      const win = new BrowserWindow({
        show: false,
        width: 1400,
        height: 1000,
        webPreferences: { backgroundThrottling: false }
      });
      const run = async (script) => {
        try {
          return await win.webContents.executeJavaScript(script);
        } catch (error) {
          throw new Error(`Renderer script failed: ${script}`, { cause: error });
        }
      };
      const pause = () => new Promise((resolve) => setTimeout(resolve, 150));
      const wait = async (script) => {
        for (let i = 0; i < 50; i++) {
          if (await run(script)) return;
          await pause();
        }
        throw new Error(`Timed out: ${script}`);
      };
      const click = async (selector, button = "left") => {
        await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
        const point = await run(
          `(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:"nearest"}); const r=e.getBoundingClientRect(); const x=r.x+r.width/2,y=r.y+r.height/2; return {x:Math.round(x),y:Math.round(y),hit:e.contains(document.elementFromPoint(x,y))}; })()`
        );
        assert.equal(point.hit, true, `Unclickable: ${selector}`);
        win.webContents.sendInputEvent({
          type: "mouseDown",
          x: point.x,
          y: point.y,
          button,
          clickCount: 1
        });
        win.webContents.sendInputEvent({
          type: "mouseUp",
          x: point.x,
          y: point.y,
          button,
          clickCount: 1
        });
        await pause();
      };
      const menu = async (id, label) => {
        await click(`[data-connection-id="${id}"]`, "right");
        await wait(
          `Array.from(document.querySelectorAll('.ant-dropdown-menu-item')).some(e => e.textContent === ${JSON.stringify(label)})`
        );
        await run(
          `Array.from(document.querySelectorAll('.ant-dropdown-menu-item')).find(e => e.textContent === ${JSON.stringify(label)}).setAttribute('data-smoke-command','true')`
        );
        await click('[data-smoke-command="true"]');
      };
      const button = async (text) => {
        await run(
          `Array.from(document.querySelectorAll('button')).find(e => e.textContent.replace(/\\s/g,'') === ${JSON.stringify(text)}).setAttribute('data-smoke-button','true')`
        );
        await click('[data-smoke-button="true"]');
        await run(
          `document.querySelector('[data-smoke-button="true"]')?.removeAttribute('data-smoke-button')`
        );
      };
      const fill = async (selector, value) => {
        await run(
          `document.querySelector(${JSON.stringify(selector)}).focus(); document.querySelector(${JSON.stringify(selector)}).select()`
        );
        await win.webContents.insertText(value);
        await pause();
      };
      await win.loadFile(path.join(process.argv[2], "index.html"));
      await wait(`!!document.querySelector('[data-connection-id="existing"]')`);
      await pause();
      await menu("existing", "编辑");
      await click('button[type="submit"]');
      await wait("window.smoke.writes.length === 1");
      const saved = await run("window.smoke.writes[0]");
      assert.equal(saved.id, "existing");
      assert.equal(saved.proxyId, "proxy");
      assert.equal(saved.strictHostKeyChecking, true);
      assert.equal(saved.keepAliveIntervalSec, 42);
      assert.equal(saved.terminalEncoding, "gbk");
      assert.equal(saved.monitorSession, false);
      assert.deepEqual(saved.tags, ["prod"]);
      assert.equal(saved.notes, "keep me");
      assert.equal(await run("window.smoke.records.length"), 2);
      await menu("existing", "编辑");
      await run("window.smoke.deferSave = true");
      await click('button[type="submit"]');
      await run(
        `document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`
      );
      await click('[data-connection-id="second"]');
      assert.equal(await run("window.smoke.writes.length"), 2);
      assert.equal(await run("!!document.querySelector('.cm2-editor')"), true);
      await run("window.smoke.finishSave(); window.smoke.deferSave = false");
      await wait("!document.querySelector('.cm2-editor')");
      // A renamed record must also replace the detail snapshot used by its Edit button.
      await click('[data-connection-id="existing"]');
      await menu("existing", "重命名");
      await fill(".ant-modal-confirm input", "renamed");
      await click(".ant-modal-confirm .ant-btn-primary");
      await wait(`document.querySelector('.cm2-detail-title')?.textContent === 'renamed'`);
      await wait("!document.querySelector('.ant-modal-confirm')");
      // Outside-click dismissal uses rc-trigger's click hide action.
      await click('[data-connection-id="existing"]', "right");
      await wait("!!document.querySelector('.ant-dropdown-menu')");
      await click(".cm2-title");
      await wait("!document.querySelector('.ant-dropdown-menu')");
      await click('[data-connection-id="existing"]', "right");
      await wait("!!document.querySelector('.ant-dropdown-menu')");
      await pause();
      win.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
      win.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
      await wait("!document.querySelector('.ant-dropdown-menu')");
      assert.equal(await run("window.smoke.closed"), 0);
      // Batch auth must not leave an old editor snapshot available to overwrite it.
      await menu("existing", "编辑");
      await fill("#name", "unsaved draft");
      await run(
        `document.querySelector('[data-connection-id="second"]').dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}))`
      );
      await button("绑定认证");
      await wait(
        `document.querySelector('.ant-modal-confirm-title')?.textContent === '放弃未保存的修改？'`
      );
      await button("继续编辑");
      await wait("!document.querySelector('.ant-modal-confirm')");
      assert.equal(await run("document.querySelector('#name').value"), "unsaved draft");
      await button("绑定认证");
      await button("放弃修改");
      await wait("!document.querySelector('.ant-modal-confirm')");
      await wait("!document.querySelector('.cm2-editor')");
      await button("取消");
      await wait(
        `!Array.from(document.querySelectorAll('.ant-modal-title')).some(e => e.textContent === '批量绑定认证')`
      );
      // Multi-selection, partial delete failure, then retry only the remaining server.
      await click('[data-connection-id="existing"]');
      await run(
        `document.querySelector('[data-connection-id="second"]').dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}))`
      );
      await run("window.smoke.failRemove = 'second'");
      await menu("existing", "删除 2 个");
      await click(".ant-modal-confirm .ant-btn-primary");
      await wait("window.smoke.removes.length === 2");
      await wait(`!document.querySelector('[data-connection-id="existing"]')`);
      assert.equal(await run("!!document.querySelector('.ant-modal-confirm')"), true);
      await run("window.smoke.failRemove = ''");
      await click(".ant-modal-confirm .ant-btn-primary");
      await wait("window.smoke.records.length === 0");
      assert.deepEqual(await run("window.smoke.removes"), ["existing", "second", "second"]);
      await wait("!document.querySelector('.ant-modal-confirm')");
      await button("新建连接");
      await fill("#host", "new.example.com");
      await button("保存并连接");
      await wait("window.smoke.connects.length === 1");
      assert.equal(await run("window.smoke.writes.at(-1).id"), undefined);
      assert.equal(await run("window.smoke.connects[0]"), await run("window.smoke.records[0].id"));
      // The edit variant must keep the same identity as ordinary Save.
      const newId = await run("window.smoke.records[0].id");
      await menu(newId, "编辑");
      await button("保存并连接");
      await wait("window.smoke.connects.length === 2");
      assert.equal(await run("window.smoke.writes.at(-1).id"), newId);
      assert.equal(await run("window.smoke.records.length"), 1);
      console.log(
        "PASS: edit identity, collapsed settings, duplicate submit/save navigation guards, detail refresh, batch-auth draft guard, native menu click/dismissal, partial delete/retry, new/edit save-and-connect"
      );
      app.quit();
    })
    .catch((error) => {
      console.error(error);
      app.exit(1);
    });
}
