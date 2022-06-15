// App.tsx

import {TextField, Chip, Alert, LinearProgress, Grid, Stack, Link} from "@mui/material";

import { KeyboardEvent, ChangeEvent } from "react";
import React, { useState, useEffect } from 'react';
import CircularProgress from "@mui/material/CircularProgress";

import "./App.css";
import { useLightningState } from "./hooks/useLightningState";
import Background from "./components/background";
import ImageLoader from "./components/imageLoading";


const defaultTitle = 'Search inside any (5-minute) video';

const App = (props: any) => {
  const { lightningState, updateLightningState } = useLightningState();
  const [headerTitle, setHeaderTitle] = React.useState(defaultTitle);
  const [videoName, setVideoName] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [showError, setShowError] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);
  const [results, setResults] = useState([]);
  const [API_URL, setApiUrl] = useState([]);
  const [youtubeVideoId, setYoutubeVideoId] = React.useState('');
  const [appView, setAppView] = React.useState('');
  const [imagesLoaded, setImageLoaded] = React.useState(false);


  useEffect(() => {

        // Get FastAPI server url (running inside a lightning work) from lightning state :)
        setApiUrl(lightningState?.vars.api_server_url);

        const timer = setInterval(doEverySecond, 1000);
        return () => clearInterval(timer);

  });

  const doEverySecond = async () => {
    const request_route = `${API_URL}/ping`;

    // check if the server is available
    fetch(request_route)
        .then(function(response) {
          return response;
        }).catch((error) => {
              setAppView("server_unavailable")
              setHeaderTitle('Server is not available, please wait !')
              console.log("error", error)

        })
        .then(function(response) {
          if(response && appView=='server_unavailable'){
            setAppView('')
            setHeaderTitle('')
          }
          if (response && !response.ok){
              setAppView("server_unavailable")
              setHeaderTitle('Server is not available, please wait !')
          }

        }).catch((error) => {
            setAppView("server_unavailable")
            setHeaderTitle('Server is not available, please wait !')
            console.log("error", error)
          });

    if (appView =='processing') {
      getVideoProcessingStatus(youtubeVideoId)
    }

  };


  const handleDelete = (e: any) => {
      // When user clicks on cancel

    if (appView=="search_results" || appView=="searching"){
      setAppView("search_input")
      setHeaderTitle('')
    }
    else if (appView=="search_input" || appView=="processing"){
      setAppView("video_input")
      setYoutubeVideoId('')
      setHeaderTitle(defaultTitle)
      setVideoName('')
    }
  }

  const closeErrorAlert = () => {
    setShowError(false);
    setErrorMessage('');
  }

  const onImagesLoaded = () =>{
      setImageLoaded(true)
      setHeaderTitle('')
      setImageLoaded(true)
  }

  const onSearch = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key == 'Enter') {
        setImageLoaded(false)
        setAppView("searching")
        let query = (event.target as HTMLInputElement).value;
        console.log("do video search", query)
        setHeaderTitle('⚡ Searching in video ⚡')
        const request_route = `${API_URL}/search/${youtubeVideoId}?search_query=${query}&results_count=5`;
        fetch(request_route)
            .then(function(response) {
              return response.json();
            })
            .then(function(myJson) {
                console.log("input_search_query", query, "server_search_query", myJson.search_query, "results", results)
                setResults(myJson.results)
                setAppView("search_results")
            });
    }
  }


  const onVideoProcess = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key == 'Enter') {
      let newUrl = (event.target as HTMLInputElement).value || "https://www.youtube.com/watch?v=aWzlQ2N6qqg"
      console.log("do video process", newUrl)

      if (newUrl !== null) {
        var regEx = "^(?:https?:)?//[^/]*(?:youtube(?:-nocookie)?\.com|youtu\.be).*[=/]([-\\w]{11})(?:\\?|=|&|$)";
        var matches = newUrl.match(regEx);
        if (matches) {
        setHeaderTitle('⚡ Processing Video ⚡')

          setYoutubeVideoId(matches[1])
          getVideoMeta(matches[1], newUrl);
          startVideoProcessingTask(matches[1], newUrl)
        } else {
          setShowError(true);
          setErrorMessage("Invalid YouTube link!\n Valid link example: https://www.youtube.com/watch?v=aWzlQ2N6qqg");
          setTimeout(() => {
            closeErrorAlert()
          }, 5000);
        }
      }
    }
  }


  const getVideoMeta = (videoID:any, videoUrl: String) => {
    const queryUrl = `https://www.youtube.com/oembed?url=${videoUrl}&format=json`;
    fetch(queryUrl)
      .then(function(response) {
        return response.json();
      })
      .then(function(myJson) {
        setVideoName(myJson.title);
        setShowProgress(true);

      });
  }


  const getVideoProcessingStatus = (videoID:any) => {
    const request_route = `${API_URL}/video/${videoID}`;
    fetch(request_route, )
        .then(function(response) {
          return response.json();
        })
        .then(function(myJson) {
          if(myJson.state == 'done'){
            setAppView("search_input")
            setHeaderTitle('')
          }
          if(myJson.state == 'error'){
              setShowError(true);
              setErrorMessage(myJson.msg);
              setAppView("video_input")
              setTimeout(() => {
                  closeErrorAlert()
              }, 5000);
          }
        });
  }

    const secondsToHms= (seconds:any) => {
        let m = Math.floor(seconds % 3600 / 60);
        let s = Math.floor(seconds % 3600 % 60);

        let mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        let sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        return mDisplay + sDisplay;
    }

  const startVideoProcessingTask = (videoID:any, newUrl:any) => {
    console.log("API_URL", API_URL)
    const request_route = `${API_URL}/video/`;
    setAppView("processing")
    fetch(request_route, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({"url": newUrl})
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(myJson) {
          console.log("api_response", myJson)
        });
  }

  return (
      <Background youtubeID={youtubeVideoId}>
    <div >
      <div >
        {showError ?
          <Alert
            onClose={closeErrorAlert}
            severity="error" 
            sx={{zIndex: 9999, position: 'absolute', top: 6, left: 6, maxWidth: "calc(100% - 43px)"}}
            >
              {errorMessage}
            </Alert>
        :  
          <p/>
        }


        <div className="content">
            <Stack justifyContent={"center"} alignItems={"center"}>

          <p 
          style={{
            color: "white",
            marginBottom: "10px"
          }}>{headerTitle}</p>
            </Stack>
          {(() => {
            switch (appView) {
              case 'searching':
              case 'processing':
                  return <Stack justifyContent={"center"} alignItems={"center"}>
                      <CircularProgress/>
                  </Stack>
              case 'search_results':
                  return !imagesLoaded ?
                          <Stack justifyContent={"center"} alignItems={"center"}>
                              <CircularProgress/>
                          </Stack>

                          :
                          <></>


              case '':
              case 'video_input':
                return <TextField
                    id="input-video-box"
                    size="small"
                    onKeyDownCapture={onVideoProcess}
                    fullWidth
                    placeholder='Enter a YouTube link'
                    sx={{
                      display: "contents",
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "rgba(109, 109, 110, 0.7)",
                        color: "white"
                      },
                      "& .MuiFormHelperText-root": {
                        color: "white"
                      }
                    }}
                />
              case 'search_input':
                return <TextField
                    id="search-box"
                    size="small"
                    onKeyDownCapture={onSearch}
                    fullWidth
                    placeholder='Search for things, actions, etc...'
                    sx={{
                      display: "contents",
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "rgba(109, 109, 110, 0.7)",
                        color: "white"
                      },
                      "& .MuiFormHelperText-root": {
                        color: "white"
                      }
                    }}
                />
            }
          })()}

          {appView !== '' && appView != 'video_input' ?
            <Chip
              label={videoName}
              variant="outlined"
              color="primary"
              onDelete={handleDelete}
              sx={{
                color: "white",
                marginTop: "10px",
                borderColor: "white",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                "& .MuiSvgIcon-root": {
                  color: "white"
                }
              }}
            />
          :
            <p></p>
          }

        </div>
          {appView !== '' && appView == 'search_results' ?
          <Stack>

          {results && results.length > 0 ?
              <>

                  <Grid container justifyContent={"center"} rowSpacing={1} columnSpacing={{ xs: 20, sm: 1, md: 4 }} style={{overflowY:'scroll', height: 'calc(100% - 90px)', position:'fixed', zIndex: 1, top:130, padding: '0 20px'}}>
                      {results.map( e =>
                          <Grid item >

                              {imagesLoaded ?
                              <Link href={`https://www.youtube.com/watch?v=${youtubeVideoId}/&t=${e/1000}s`} target="_blank"> Seen at {secondsToHms(e/1000)}</Link> : <> </>}
                              <ImageLoader onLoad={onImagesLoaded} imageURL={`${API_URL}/thumbnail/${youtubeVideoId}/${e}`}/>
                          </Grid>
                      )}
                  </Grid>
              </>
              :
              <></>
              }
          </Stack>: <></>
          }
      </div>
    </div>
      </Background>
  );
}

export default App; 
