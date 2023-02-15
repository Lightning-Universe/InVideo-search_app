import io
import os
from enum import Enum
from typing import List

import cv2
import uvicorn
from fastapi import APIRouter, BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from lightning.app import LightningWork
from PIL import Image
from pydantic import BaseModel
from pytube import YouTube, extract
from starlette.responses import StreamingResponse

from . import ml
from .storage import LRUCache

# ------------------ Models ------------------


class VideoSubmission(BaseModel):
    url: str


class VideoProcessingState(Enum):
    Scheduled = "scheduled"
    Running = "running"
    Done = "done"
    Failure = "error"


class VideoProcessingStatus(BaseModel):
    id: str
    url: str
    state: VideoProcessingState
    msg: str = ""


class VideoSearchResults(BaseModel):
    id: str
    search_query: str
    results: List[int]


# ------------------- API -------------------


class VideoSearchAPI:
    def __init__(self):
        self.router = APIRouter()
        # We use this endpoint to check if the server is available.
        self.router.add_api_route("/ping", self.hello, methods=["GET"])
        self.router.add_api_route("/video", self.process_video, methods=["POST"])
        self.router.add_api_route("/video/{video_id}", self.get_video, methods=["GET"])
        self.router.add_api_route("/search/{video_id}", self.search_video, methods=["GET"])
        self.router.add_api_route("/thumbnail/{video_id}/{time_ms}", self.get_image_at, methods=["GET"])
        # We use simple in-memory LRU cache to store information about processed videos
        # This could be simillarly used to access any other database or storage
        self.videos: LRUCache[VideoProcessingStatus] = LRUCache(
            capacity=int(os.getenv("LIGHTNING_LRU_CAPACITY", "100"))
        )
        self.processor = ml.VideoProcessor()

    def hello(self):
        return "ping"

    async def search_video(self, video_id: str, search_query: str, results_count: int = 5) -> VideoSearchResults:
        """Search in a video using 'search_query'."""

        # Assert that video processing finished
        status = self.get_video(video_id)
        if status.state != VideoProcessingState.Done:
            raise ValueError("Video was not yet processed, please wait")

        # Make search
        results = self.processor.search_video(video_id, search_query, results_count)

        return VideoSearchResults(id=video_id, search_query=search_query, results=results)

    async def get_image_at(self, video_id: str, time_ms: int):
        """Returns a still image from a video at given time."""

        video = self.get_video(video_id)
        yt = YouTube(video.url)
        streams = yt.streams.filter(adaptive=True, subtype="mp4", resolution="360p", only_video=True)
        capture = cv2.VideoCapture(streams[0].url)
        capture.set(cv2.CAP_PROP_POS_MSEC, time_ms)
        ret, frame = capture.read()
        # Handle strange behaviours when we read nothing.
        result_image = Image.fromarray(frame[:, :, ::-1])
        bytes_image = io.BytesIO()
        result_image.save(bytes_image, format="PNG")
        bytes_image.seek(0)

        return StreamingResponse(bytes_image, media_type="image/png")

    def get_video(self, video_id: str) -> VideoProcessingStatus:
        """Returns current processing status of a video."""

        if video_id in self.videos:
            return self.videos.get(video_id)

        raise HTTPException(status_code=404, detail="Video not found")

    def process_video(self, submission: VideoSubmission, background_tasks: BackgroundTasks) -> VideoProcessingStatus:
        """Submitted video will be processed and later available for search."""

        # Return status if video has already been submitted before
        video_id = extract.video_id(submission.url)
        if video_id in self.videos:
            return self.videos.get(video_id)

        # Create and save new Video entry
        video = VideoProcessingStatus(
            id=video_id,
            url=submission.url,
            state=VideoProcessingState.Scheduled,
        )
        self.videos.save(video.id, video)

        # Implement on_* hooks to update processing status
        def on_start():
            video.state = VideoProcessingState.Running

        def on_end():
            video.state = VideoProcessingState.Done

        def on_error(error):
            video.state = VideoProcessingState.Failure
            video.msg = str(error)

        # Processing takes a while, so we schedule it to background task
        #   and return control to the user
        background_tasks.add_task(
            self.processor.process_video,
            video_id=video.id,
            video_url=video.url,
            on_start=on_start,
            on_end=on_end,
            on_error=on_error,
        )
        return video


# Lightning Work is only responsible for spinning up the FastApi server
class VideoProcessingServer(LightningWork):
    def run(self):
        # Because UI (React) calls server from browser we need to allow it with CORS policies
        app = FastAPI()
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )
        app.include_router(VideoSearchAPI().router)
        uvicorn.run(app, host=self.host, port=self.port, access_log=False)
