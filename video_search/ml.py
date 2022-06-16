import math
from typing import Callable

import clip as openai_clip
import cv2
import torch
from PIL import Image
from pytube import YouTube

from .storage import LRUCache

storage: LRUCache[dict] = LRUCache()


def process_video(
    video_id: str,
    video_url: str,
    on_start: Callable,
    on_end: Callable,
    on_error: Callable,
):

    try:
        on_start()
        _process_video(video_id, video_url)
        on_end()

    except Exception as e:
        on_error(e)


def _process_video(video_id: str, video_url: str):

    print(f"Video procssing started ({video_url})")

    yt = YouTube(video_url)

    streams = yt.streams.filter(
        adaptive=True, subtype="mp4", resolution="360p", only_video=True
    )
    length = yt.length
    if length >= 300:
        raise ValueError(
            "Please find a YouTube video shorter than 5 minutes."
            " Sorry about this, the server capacity is limited"
            " for the time being."
        )

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
    device = "cuda" if torch.cuda.is_available() else "cpu"
    video_features = torch.empty([0, 512], dtype=torch.float16).to(device)

    # Load clip model
    model, preprocess = openai_clip.load("ViT-B/32", device=device)
    for i in range(batches):
        batch_frames = frames[i * batch_size : (i + 1) * batch_size]
        batch_preprocessed = torch.stack(
            [preprocess(frame) for frame in batch_frames]
        ).to(device)
        with torch.no_grad():
            batch_features = model.encode_image(batch_preprocessed)
            batch_features /= batch_features.norm(dim=-1, keepdim=True)
        video_features = torch.cat((video_features, batch_features))

    # Save video features for future use in search
    storage.save(
        video_id,
        {
            "video_features": video_features,
            "skip_frames": SKIP,
            "fps": fps,
        },
    )
    print(f"Video procssing finished ({video_url})")


def search_video(video_id: str, search_query: str, results_count: int):

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = openai_clip.load("ViT-B/32", device=device)

    # Load from storage (here: process memory) could be db in future or something :D
    video_features = storage.get(video_id)["video_features"]
    skip_frames = storage.get(video_id)["skip_frames"]
    fps = storage.get(video_id)["fps"]

    with torch.no_grad():
        text_features = model.encode_text(openai_clip.tokenize(search_query).to(device))
        text_features /= text_features.norm(dim=-1, keepdim=True)
    similarities = 100.0 * video_features @ text_features.T
    _, best_photo_idx = similarities.topk(results_count, dim=0)

    # frames numbers
    search_results = best_photo_idx.cpu().numpy().tolist()

    frames_result = [result for sub_list in search_results for result in sub_list]

    results_in_ms = [round(frame * skip_frames / fps * 1000) for frame in frames_result]

    return results_in_ms
