from time import sleep

from lightning.app.utilities.imports import _is_playwright_available

from lightning_gallery_e2e_testing import (
    test_launch_app_from_gallery,
    test_clone_and_run_app_from_gallery,
)

if _is_playwright_available():
    import playwright


def validate_app_functionalities(app_page: "Page") -> None:
    """
    app_page: The UI page of the app to be validated.
    """

    while True:
        try:
            app_page.reload()
            sleep(5)
            video_url_input_label = app_page.frame_locator("iframe").locator(
                "text=Search inside any (5-minute) video"
            )
            video_url_input_label.wait_for(timeout=30 * 1000)
            break
        except (
            playwright._impl._api_types.Error,
            playwright._impl._api_types.TimeoutError,
        ):
            pass

    video_url_input_field = app_page.frame_locator("iframe").locator("#input-video-box")
    video_url_input_field.wait_for(timeout=1000)
    video_url_input_field.type("https://www.youtube.com/watch?v=Vj4Y1c-DSM0")
    video_url_input_field.press("Enter")

    search_box_input = app_page.frame_locator("iframe").locator("#search-box")
    search_box_input.wait_for(timeout=150 * 1000)
    search_box_input.fill("cooking pizza")
    search_box_input.press("Enter")
    search_results_container = app_page.frame_locator("iframe").locator(
        ".MuiGrid-container"
    )
    search_results_container.wait_for(timeout=150 * 1000)
    sleep(5)
    search_results = app_page.frame_locator("iframe").locator(".MuiGrid-item")
    assert search_results.count() == 5


test_launch_app_from_gallery(validate_app_functionalities)
test_clone_and_run_app_from_gallery(validate_app_functionalities)
