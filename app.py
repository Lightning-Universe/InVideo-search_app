import os
import subprocess
from pathlib import Path

from lightning.app import CloudCompute, LightningApp, LightningFlow
from lightning.app.frontend import StaticWebFrontend

from video_search.server import VideoProcessingServer


class ReactUI(LightningFlow):
    def __init__(self):
        super().__init__()
        self.server_url = ""

    def _build_static(self):
        subprocess.call(
            ["yarn", "--cwd", "./react_ui", "run", "build"]
        )  # TODO: run build

    def configure_layout(self):
        return StaticWebFrontend(Path(__file__).parent / "react_ui/dist")


class VideoAppFlow(LightningFlow):
    """Main Flow of app, starts backend processing server (LightningWork) and frontend ui (LightningFlow)"""

    def __init__(self):
        super().__init__()

        self.server = VideoProcessingServer(parallel=True)
        self.ui = ReactUI()

        self.api_server_url = None

    def run(self):
        # Start the server
        self.server.run()

        if self.server.url and not self.api_server_url:
            self.api_server_url = self.server.url

    def configure_layout(self):
        tab1 = [{"name": "home", "content": self.ui}]
        return tab1


lightningapp = LightningApp(VideoAppFlow())
