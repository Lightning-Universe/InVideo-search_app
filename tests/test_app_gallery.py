import json
import os
from contextlib import contextmanager
from time import sleep
from typing import Generator

import requests
from lightning.app.testing.config import Config
from lightning.app.utilities.imports import _is_playwright_available, requires

if _is_playwright_available():
    import playwright
    from playwright.sync_api import HttpCredentials, sync_playwright


@requires("playwright")
@contextmanager
def run_app_from_gallery() -> Generator:
    app_name = os.getenv("TEST_APP_NAME", None)
    # 5. Create chromium browser, auth to lightning_app.ai and yield the admin and view pages.
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=bool(int(os.getenv("HEADLESS", "0"))))
        payload = {
            "apiKey": Config.api_key,
            "username": Config.username,
            "duration": "120000",
        }
        context = browser.new_context(
            # Eventually this will need to be deleted
            record_video_dir=os.path.join(Config.video_location, app_name),
            record_har_path=Config.har_location,
        )
        admin_page = context.new_page()
        res = requests.post(Config.url + "/v1/auth/login", data=json.dumps(payload))
        token = res.json()["token"]
        print(f"The Lightning App Token is: {token}")
        print(f"The Lightning App user key is: {Config.key}")
        print(f"The Lightning App user id is: {Config.id}")
        admin_page.goto(Config.url)
        admin_page.evaluate(
            """data => {
            window.localStorage.setItem('gridUserId', data[0]);
            window.localStorage.setItem('gridUserKey', data[1]);
            window.localStorage.setItem('gridUserToken', data[2]);
        }
        """,
            [Config.id, Config.key, token],
        )
        admin_page.goto(f"{Config.url}/apps")
        admin_page.locator(f"text={app_name}").click()
        admin_page.locator(f"text=Launch").click()

        def fetch_logs() -> str:
            return admin_page.evaluate("window._logs;")

        try:
            yield admin_page, _, fetch_logs
        except KeyboardInterrupt:
            pass


def test_video_app():
    with run_app_from_gallery() as (
        _,
        view_page,
        fetch_logs,
    ):
        sleep(1)
