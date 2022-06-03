import time
from functools import partial
from pathlib import Path

import lightning as L
from lightning.utilities.state import AppState
import cv2
import requests
import streamlit as st
from humanfriendly import format_timespan
from lightning import CloudCompute, LightningApp, LightningFlow
from lightning.frontend import StreamlitFrontend
from lightning.utilities.state import AppState
from PIL import Image
from pytube import YouTube, extract
from pytube.helpers import RegexMatchError

from lit_video_stream import LitVideoStream
from lit_video_stream.feature_extractors import OpenAIClip
from lit_video_stream.stream_processors import YouTubeStreamProcessor
import threading
import torch

from time import sleep


class VideoSearch(LitVideoStream):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.progress = 0
        self.show_progress = False
        self.stop_counting = False
        self.running = False
        #self._t = None
        self.results = []
        self.video_url = None
        self.total_frames = 0

    def update(self, current_frame):
        self.progress = int((current_frame/self.total_frames) * 100)
        print('PROGRESS 2:', self.progress, current_frame, self.total_frames)

    def reset(self, total_frames):
        self.progress = 0
        self.total_frames = total_frames

    def process(self):
        self.show_progress = True
        self.running = True
        self.download([self.video_url])
        self.show_progress = False

    def search(self, search_query: str, results_count:int = 5):
        self.run('search', search_query, results_count)

    def progressive_download(self, video_url=""):
        self.run('progressive_download', video_url)
    
    def stop(self):
        self.run('stop')
    
    def run(self, action, *args, **kwargs):
        if action == 'download':
            self._download(*args, **kwargs)
        if action == 'progressive_download':
            self._progressive_download(*args, **kwargs)
        if action == 'stop':
            self._stop(*args, **kwargs)
        if action == 'search':
            self._search(*args, **kwargs)

    def _search(self, search_query: str, results_count:int):
        features = self._features[self.video_url]
        results = self._feature_extractor.search(search_query, results_count, features)
        results_seconds = [x//1000 for x in results]
        results = [self._stream_processor.embed_link(self.video_url, x) for x in results_seconds]
        self.results.clear()
        self.results.extend(results)


    def _progressive_download(self, video_url=""):
        if video_url:
            self.video_url = video_url
            self.process()
            # self._t = threading.Thread(target=self.process, daemon=True)
            # self._t.start()

    def _stop(self):
        self.show_progress = False
        self.stop_counting = True
        self.progress = 0
        # self._t.join()
        self.stop_counting = False
        self.running = False
        self.progress = 0


class VideoAppFlow(L.LightningFlow):
    """Main Flow of app, just starts server + ui."""

    def __init__(self):
        super().__init__()

        self.video_processor = VideoSearch(
            feature_extractor=OpenAIClip(batch_size=256),
            stream_processor=YouTubeStreamProcessor(),
            process_every_n_frame=30,
            num_batch_frames=256,
            parallel=True,
            cloud_compute=CloudCompute("gpu", 1)
        )
        self.video_processor._prog_bar = self.video_processor
        self.ui = VideoSearchUI()
        self.video_url = ''
        self.cancel_download = False
        self.time = time.time()
        self.search_query = ''

    def run(self):
        if len(self.video_url) > 0:
            self.video_processor.progressive_download(self.video_url)
            self.video_url = ''

        if self.cancel_download and self.video_processor.running:
            self.video_processor.stop()
            self.video_url = ''
            self.cancel_download = False
            self.video_processor.show_progress = False
            self.video_processor.progress = 0

        if len(self.search_query) > 0:
            self.video_processor.search(self.search_query)
            self.search_query = ''

    def configure_layout(self):
        tab1 = [{"name": "home", "content": self.ui}]
        return tab1


class VideoSearchUI(L.LightningFlow):
    def __init__(self):
        super().__init__()

    def configure_layout(self):
        return L.frontend.StaticWebFrontend(Path(__file__).parent / "react_ui/dist")

lightningapp = L.LightningApp(
    VideoAppFlow(),
)
