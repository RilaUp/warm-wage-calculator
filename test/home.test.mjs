import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("study landing rewrite preserves the upstream directory URL before matching assets", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.trailingSlash, false);
  assert.deepEqual(config.rewrites[0], {
    source: "/work/studies/agentic-commerce-study",
    destination: "https://agentic-commerce-study.vercel.app/work/studies/agentic-commerce-study/",
  });
  assert.equal(config.rewrites[1].source, "/work/studies/agentic-commerce-study/:path*");
});

test("personal home preserves product entry points and has real section destinations", () => {
  assert.match(html, /href="\/salary-calculator\.html"/);
  assert.match(html, /href="https:\/\/rehab\.lalabear\.top\/"/);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes(`id="${id}"`), `Missing anchor: ${id}`);
  }
});

test("personal home provides both content languages and independent assets", async () => {
  assert.ok((html.match(/lang="zh-CN"/g) || []).length > 30);
  assert.equal((html.match(/<span lang="zh-CN">/g) || []).length, (html.match(/<span lang="en">/g) || []).length);
  for (const path of ["home.css", "home.js", "assets/lalabear-mark.svg", "salary-calculator.html"]) {
    assert.ok((await readFile(new URL(`../${path}`, import.meta.url))).length > 0);
  }
  assert.ok(!html.includes("fonts.googleapis.com"));
  assert.ok(!html.includes('src="/app.js"'));
});

test("public home uses an alias and a shared connection mark, without personal identity metadata", async () => {
  const script = await readFile(new URL("../home.js", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const removedName = ["ju", "bee"].join("");
  for (const content of [html, script, readme]) {
    assert.ok(!content.toLowerCase().includes(removedName));
    assert.doesNotMatch(content, /Microsoft|ByteDance|linkedin\.com|mailto:/);
  }
  assert.match(html, /<title>LALABEAR/);
  assert.equal((html.match(/src="\/assets\/lalabear-mark.svg"/g) || []).length, 4);
  assert.doesNotMatch(html, /asterisk|closing-star|art-orbit/);
  await assert.rejects(access(new URL(`../assets/${removedName}-mark.svg`, import.meta.url)), { code: "ENOENT" });
});

test("personal home omits private interview metrics and unconfirmed biography details", () => {
  for (const term of ["gross adds", "4x", "22 个国家", "70 人", "Why 剪映", "5年", "8 年"]) {
    assert.ok(!html.includes(term), `Private or unconfirmed detail: ${term}`);
  }
});
