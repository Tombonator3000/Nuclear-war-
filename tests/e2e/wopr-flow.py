#!/usr/bin/env python3
"""Durable browser E2E for Nuclear War — WOPR Edition."""
import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SEED = os.environ.get("E2E_SEED", "20260730")
SHOTS = Path(os.environ.get("E2E_SHOTS", "/tmp/browser/wopr-e2e"))
SHOTS.mkdir(parents=True, exist_ok=True)
failures: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(("PASS  " if ok else "FAIL  ") + name + (f"  [{detail}]" if detail else ""))
    if not ok:
        failures.append(name)


async def warhead_positions(page):
    return await page.evaluate(
        """() => [...document.querySelectorAll('svg circle')]
             .map(e => e.getBoundingClientRect())
             .filter(r => r.width > 0 && r.width < 14)
             .map(r => Math.round(r.x) + ',' + Math.round(r.y)).join('|')"""
    )


async def telex(page):
    return await page.locator("aside").inner_text()


async def main() -> int:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)

        await page.goto(f"{BASE}/play?seed={SEED}", wait_until="networkidle")
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOTS / "1_situation_room.png"))

        arm = page.locator("button:has-text('PICK A TARGET')").first
        check("weapon card is present in hand", await arm.count() > 0)
        await arm.click()
        await page.wait_for_timeout(300)
        city = page.locator('[data-city="USSR-MOSCOW"] circle').first
        await city.click(force=True)
        await page.wait_for_timeout(600)
        flying = await warhead_positions(page)
        check("missile is airborne right after the city click", flying != "", flying[:40])
        await page.screenshot(path=str(SHOTS / "2_in_flight.png"))

        await page.locator("button:has-text('PAUSE')").first.click()
        frozen_a = await warhead_positions(page)
        before = await telex(page)
        await page.wait_for_timeout(2200)
        frozen_b = await warhead_positions(page)
        check("warhead is frozen while paused", frozen_a == frozen_b)
        check("no impact resolves while paused", (await telex(page)) == before)
        await page.screenshot(path=str(SHOTS / "3_paused.png"))

        await page.locator("button:has-text('RESUME')").first.click()
        resolved = False
        for _ in range(80):
            t = await telex(page)
            if any(k in t for k in ("DIRECT HIT", "INTERCEPT", "wasted", "GUIDANCE FAULT")):
                resolved = True
                break
            await page.wait_for_timeout(200)
        check("launch resolves after resume", resolved)
        await page.screenshot(path=str(SHOTS / "4_resolved.png"))

        attackers: list[str] = []

        async def sample_attacker():
            txt = await page.locator("body").inner_text()
            for nid in ("USSR", "CHINA", "EURO"):
                if f"{nid} IS ACTING" in txt or f"{nid} IS EMPTYING" in txt:
                    return nid
            return None

        await page.locator("button:has-text('END TURN')").first.click()
        for _ in range(150):
            a = await sample_attacker()
            if a and (not attackers or attackers[-1] != a):
                attackers.append(a)
            if len(attackers) >= 2:
                break
            await page.wait_for_timeout(200)
        check("AI nations act one at a time", len(attackers) >= 1 and len(set(attackers)) == len(attackers), " -> ".join(attackers))
        await page.screenshot(path=str(SHOTS / "5_ai_turn.png"))

        for _ in range(150):
            txt = await page.locator("body").inner_text()
            if "AWAITING ORDERS" in txt or "END TURN" in txt and not await sample_attacker():
                break
            await page.wait_for_timeout(200)

        check("no console or page errors", not errors, "; ".join(errors[:3]))
        await browser.close()

    if failures:
        print(f"E2E FAILED: {len(failures)} check(s): {', '.join(failures)}")
        return 1
    print("E2E PASSED")
    return 0


sys.exit(asyncio.run(main()))
