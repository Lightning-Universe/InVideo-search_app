import subprocess
import time
from pathlib import Path

import lightning as L

from video_search.server import VideoProcessingServer

DEFAULT_VIDEO_URL = "https://www.youtube.com/watch?v=sxaTnm_4YMY"
DEFAULT_SEARCH_QUERY = "Police Chase"


class ReactUI(L.LightningFlow):
    def __init__(self):
        super().__init__()

    def _build_static(self):
        subprocess.call(["yarn", "run", "build"])

    def configure_layout(self):
        return L.frontend.StaticWebFrontend(Path(__file__).parent / "react_ui/dist")


class VideoAppFlow(L.LightningFlow):
    """Main Flow of app, starts backend processing server (LightningWork) and frontend ui (LightningFlow)"""

    def __init__(self):
        super().__init__()

        self.server = VideoProcessingServer(parallel=True)
        self.ui = ReactUI()
        self.api_server_url = self.server.url

    def run(self):
        # Start the server
        self.server.run()

    def configure_layout(self):
        tab1 = [{"name": "home", "content": self.ui}]
        return tab1


lightningapp = L.LightningApp(
    VideoAppFlow(),
)
