
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
lightning run app app.py

## To run the app on the cloud to share it with your peers and users
lightning run app app.py --cloud
```
