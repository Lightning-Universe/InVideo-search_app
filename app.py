import subprocess
from pathlib import Path

import lightning as L
from lightning import CloudCompute

from video_search.server import VideoProcessingServer


class ReactUI(L.LightningFlow):
    def __init__(self):
        super().__init__()
        self.server_url = ""

    def _build_static(self):
        subprocess.call(
            ["yarn", "--cwd", "./react_ui", "run", "build"]
        )  # TODO: run build

    def configure_layout(self):
        return L.frontend.StaticWebFrontend(Path(__file__).parent / "react_ui/dist")


class VideoAppFlow(L.LightningFlow):
    """Main Flow of app, starts backend processing server (LightningWork) and frontend ui (LightningFlow)"""

    def __init__(self):
        super().__init__()

        self.server = VideoProcessingServer(
            parallel=True, cloud_compute=CloudCompute("cpu-medium")
        )
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


lightningapp = L.LightningApp(
    VideoAppFlow(),
)
