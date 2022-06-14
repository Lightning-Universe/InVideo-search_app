import io
import math
from enum import Enum
from functools import lru_cache
from typing import Dict, List

import clip as openai_clip
import cv2
import torch
import uvicorn
from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from lightning import LightningWork
from PIL import Image
from pydantic import BaseModel
from pytube import YouTube, extract
from starlette.responses import StreamingResponse


class VideoSubmission(BaseModel):
    url: str


class VideoProcessingState(Enum):
    Scheduled = "scheduled"
    Running = "running"
    Done = "done"
    Failure = "error"


class Video(BaseModel):
    id: str
    url: str
    state: VideoProcessingState
    progress: int
    msg: str = ""


class VideoSearch(BaseModel):
    id: str
    search_query: str
    results: List[int]


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
videos: Dict[
    str, Video
] = (
    {}
)  # We should be fine for now with in-memory storage... right ? TODO: have inmemory LRU
storage = {}


@app.get("/ping")
def hello():
    return "pong"


@app.post("/video")
async def submit_video(
    submission: VideoSubmission, background_tasks: BackgroundTasks
) -> Video:

    # TODO: do not add if already exists in mapping and in state done
    video = Video(
        id=extract.video_id(submission.url),
        url=submission.url,
        state=VideoProcessingState.Scheduled,
        progress=0,
    )

    background_tasks.add_task(process_video, video)
    return video


@app.get("/status/{video_id}")
def get_video(video_id: str) -> str:
    return f"HELLO FROM THE SERVER {video_id}"


@app.get(
    "/results/{video_id}/{time_ms}",
)
async def get_result_image_at(video_id: str, time_ms: int):
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    yt = YouTube(video_url)
    streams = yt.streams.filter(
        adaptive=True, subtype="mp4", resolution="360p", only_video=True
    )
    capture = cv2.VideoCapture(streams[0].url)
    capture.set(cv2.CAP_PROP_POS_MSEC, time_ms)
    ret, frame = capture.read()
    # Handle strange behaviours when we read nothing.
    result_image = Image.fromarray(frame[:, :, ::-1])
    bytes_image = io.BytesIO()
    result_image.save(bytes_image, format="PNG")
    bytes_image.seek(0)

    return StreamingResponse(bytes_image, media_type="image/png")


@app.get("/video/{video_id}")
def get_video(video_id: str) -> Video:
    # TODO add search parameter here :D <---

    # TODO: error handling here

    if video_id in videos:
        return videos[video_id]
    else:
        return None


@app.get("/search/{video_id}")
async def search_video(
    video_id: str, search_query: str, results_count: int = 5
) -> VideoSearch:
    """Search in a video using 'search_query'."""

    if videos[video_id].state != VideoProcessingState.Done:
        raise ValueError("Video was not yet processed, please wait")

    results = search_video(videos[video_id], search_query, results_count)
    return VideoSearch(id=video_id, search_query=search_query, results=results)


def process_video(video: Video):
    # I have no idea what this ML code does ... <3 hope it's OK

    print("Video starting ", VideoProcessingState.Running)

    videos[video.id] = video
    videos[video.id].state = VideoProcessingState.Running

    yt = YouTube(video.url)

    streams = yt.streams.filter(
        adaptive=True, subtype="mp4", resolution="360p", only_video=True
    )
    length = yt.length
    if length >= 300:
        videos[video.id].state = VideoProcessingState.Failure
        error_msg = "Please find a YouTube video shorter than 5 minutes."
        " Sorry about this, the server capacity is limited"
        " for the time being."
        videos[video.id].msg = error_msg
        raise ValueError(error_msg)

    capture = cv2.VideoCapture(streams[0].url)
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = capture.get(cv2.CAP_PROP_FPS)
    current_frame = 0
    frames = []
    SKIP = 30
    while capture.isOpened():
        ret, frame = capture.read()
        if ret:
            frames.append(Image.fromarray(frame[:, :, ::-1]))
        else:
            break
        if current_frame + SKIP >= total_frames:
            # fix it
            current_frame = total_frames
            break
        current_frame += SKIP
        capture.set(cv2.CAP_PROP_POS_FRAMES, current_frame)

    batch_size = 256
    batches = math.ceil(len(frames) / batch_size)
    video_features = torch.empty([0, 512], dtype=torch.float16)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Load clip model
    model, preprocess = openai_clip.load("ViT-B/32", device=device)
    for i in range(batches):
        batch_frames = frames[i * batch_size : (i + 1) * batch_size]
        batch_preprocessed = torch.stack([preprocess(frame) for frame in batch_frames])
        with torch.no_grad():
            batch_features = model.encode_image(batch_preprocessed)
            batch_features /= batch_features.norm(dim=-1, keepdim=True)
        video_features = torch.cat((video_features, batch_features))

    # Save video features for future use in search
    storage[video.id] = {
        "video_features": video_features,
        "skip_frames": SKIP,
        "fps": fps,
    }

    # Mark as DONE
    videos[video.id].state = VideoProcessingState.Done

    print("Video done ", VideoProcessingState.Done)


def search_video(video: Video, search_query: str, results_count: int):

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = openai_clip.load("ViT-B/32", device=device)

    # Load from storage (here: process memory) could be db in future or something :D
    video_features = storage[video.id]["video_features"]

    with torch.no_grad():
        text_features = model.encode_text(openai_clip.tokenize(search_query).to(device))
        text_features /= text_features.norm(dim=-1, keepdim=True)
    similarities = 100.0 * video_features @ text_features.T
    _, best_photo_idx = similarities.topk(results_count, dim=0)

    # frames numbers
    search_results = best_photo_idx.cpu().numpy().tolist()

    frames_result = [result for sub_list in search_results for result in sub_list]

    results_in_ms = [
        round(
            frame * storage[video.id]["skip_frames"] / storage[video.id]["fps"] * 1000
        )
        for frame in frames_result
    ]

    return results_in_ms


class VideoProcessingServer(LightningWork):
    def run(self):

        uvicorn.run(app, host=self.host, port=self.port)
