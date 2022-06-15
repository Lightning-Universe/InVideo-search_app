
<div align="center">

<img src="visuals/video-search.png" width="300px">

**Video Search App :video_camera:**

______________________________________________________________________

<p align="center">
  <a href="#running-the-app">Getting Started</a> •
  <a href="https://01g3x67k638bh051zfjkdn1rge.litng-ai-03.litng.ai/view/Home">Video Search App URL</a>
</p>

[![PyPI - Python Version](https://img.shields.io/pypi/pyversions/video_search)](https://pypi.org/project/video_search/)
[![PyPI Status](https://badge.fury.io/py/video_search.svg)](https://badge.fury.io/py/video_search)
[![PyPI Status](https://static.pepy.tech/badge/random)](https://pepy.tech/project/video_search)
[![Slack](https://img.shields.io/badge/slack-chat-green.svg?logo=slack)](https://join.slack.com/t/pytorch-lightning/shared_invite/zt-pw5v393p-qRaDgEk24~EjiZNBpSQFgQ)
[![license](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/PytorchLightning/video_search/blob/master/LICENSE)

______________________________________________________________________

</div>

# Video Search App

A smart video app that understands videos and makes it as searchable as the web. Go Beyond Metadata.

## Running the app

```bash
conda create --name video_search python=3.8
conda activate video_search

git clone https://github.com/PyTorchLightning/video_search
cd video_search
pip install -r requirements.txt
pip install -e .

## To run the app locally
python -m lightning run app app.py

## To run the app on the cloud to share it with your peers and users
python -m lightning run app app.py --cloud
```

## About this Lightning App
This Lightning App enables to search through the YouTube videos. 
Just provide a url and wait for the processing to finish, now you can search for anything You want in it.
This application is fairly simple already showcases the following features of Lightning Framework:
 - Multi-tenant Frontend & Backend application architecture
 - UI written in React
 - Backend serving REST API (with FastAPI + in-memory database)
 - Environment variables to parametrize execution environment

### Structure
Application consists of the following files:
 - `app.py` - Definition of Lightning App main architecture.
 - `video_search/server.py` - Backend service (FastAPI) running in Lightning Work.
 - `video_search/storage.py` - Simple in-memory storage for our application.
 - `video_search/ml.py` - Dedicated (and independent) ML module for processing and searching the videos.
