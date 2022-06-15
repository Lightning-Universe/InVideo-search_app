
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


### Presentation

#### Demo Time
By now most of you probably already seen how the app works (via link access). But let's just take a look together:
```
You insert a youtube video url.
Wait for the processing to finish.
We can even open another tab and process different video.
And now you can search in it.
Let's say we look for "Glasses" or "police chase" whatever etc.
... and wait for results to pop up.
Yay!!! 
Bravo!
It works (hopefully)!
```

Viola! 
Demo time over.

Let's now take a look how this Lightning App is actually built.
This is a "classical" Frontend / Backend application built in Lightning Framework.
Simple frontent written in React, and backend on FastAPI with in-memory LRU storage.

Let's first ask a question "why might we want to use this kind of architecture?"

(Here's something missing I think... we can say a bit more ?)

#### Problems & Solutions (Architecture)
One of the core ideas of Lightning Framework is it's communication between components via State. 
Flow reacting to changes will update the State that will be eventually visible to all other components (Lightning Flows & Lightning Works).
Currently there is a small limitation as the Work State changes are not visible outside to other components, making the State communication "one-directional" (Flow ---> Work, Work -X-> Flow).
It's not to say that there is no way of retrieving data from Lighning Work's results, but it's only about the communication via State.

One way of returning results from Work is using it's `run()` method.
We just need to pass arguments and function will be executed directly on Work, and result of `run()` will be available when the function returns in the calling Flow 
(please note that the exact behaviour might vary depending on usage of Work's `parallel` and `cache_calls` flags).

A more responsive way to communicate with Work is to host a webserver on a Work.
This way eg. UI (hosted on Lightning Flow) can directly make API calls to the server and obtain necessary data.
This is the approach and architecture we present in this Video Search Lightning App.

Here we can read the "About this Lightning App" section to describe a bit more Framework's features.
 - Multi-tenant Frontend & Backend application architecture
 - UI written in React
 - Backend serving REST API (with FastAPI + in-memory database)
 - Environment variables to parametrize execution environment

Then we briefly explain the file structure
I think we should make some description as to what `setup_tools.py` is -- But I dont really know what's it exacly for :/

Then we jump to app.py
Show the structure of application - Main Flow. Work. App.
UI flow is just hosting React - that should be enough to say about that.
Work is hosting FastAPI server (Note that we're using `parallel` here! - Otherwise it would be blocking!) - we can jump to class definition and show that all it does it the `uvicorn.run()`
Note that the Work CloudCompute is parametrizable via envvars

This ends the description of the architecture. And we can proceed with the video_search specifics. 

----


The UI is written in React. Backend is a FastAPI server with simple in-memory RLU storage.
We've also separated the ML from the serve logic to keep responsibilities separate and code reusable.

Show method by method in FastAPI?
Then go to the ML module?
