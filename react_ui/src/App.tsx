// App.tsx

import { TextField, Chip, Alert, LinearProgress, Grid } from "@mui/material";

import Box from "@mui/material/Box";
import { KeyboardEvent, ChangeEvent } from "react";
import React, { useState, useEffect } from 'react';
import cloneDeep from "lodash/cloneDeep";
import CircularProgress from "@mui/material/CircularProgress";

import "./App.css";
import { useLightningState } from "./hooks/useLightningState";
import Background from "./components/background";
import zIndex from "@mui/material/styles/zIndex";
import { Dictionary } from "lodash";

const defaultTitle = 'Search inside any (5-minute) video';

const App = (props: any) => {
  const { lightningState, updateLightningState } = useLightningState();
  const [headerTitle, setHeaderTitle] = React.useState(defaultTitle);
  const [videoName, setVideoName] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [showError, setShowError] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [results, setResults] = useState([]);
  const [API_URL, setApiUrl] = useState([]);
  const [youtubeVideoId, setYoutubeVideoId] = React.useState('');
  const [appView, setAppView] = React.useState('');


  useEffect(() => {

        // Get FastAPI server url (running inside a lightning work) from lightning state :)
        setApiUrl(lightningState?.vars.api_server_url);
        console.log('lightning state:', lightningState);
        console.log('progress:', progress, 'show:', showProgress);

        const timer = setInterval(doEverySecond, 1000);
        return () => clearInterval(timer);

  });

  const doEverySecond = async () => {
    console.log("trigger every second", "appView", appView, "youtubeVideoId", youtubeVideoId)
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
    if (appView=='searching'){
        setProgress(progress+5);
    }
  };


  const handleDelete = (e: any) => {
      // When user clicks on cancel

    if (appView=="search_results" || appView=="searching"){
      setAppView("search_input")
      setProgress(0);
      setHeaderTitle('')
    }
    else if (appView=="search_input" || appView=="processing"){
      setAppView("video_input")
      setProgress(0);
      setYoutubeVideoId('')
      setHeaderTitle(defaultTitle)
      setVideoName('')
    }
  }

  const closeErrorAlert = () => {
    setShowError(false);
    setErrorMessage('');
  }


  const onSearch = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key == 'Enter') {
        setAppView("searching")
        let query = (event.target as HTMLInputElement).value;
        console.log("do video search", query)
        setHeaderTitle('⚡ Searching in video ⚡')
        const request_route = `${API_URL}/search/${youtubeVideoId}?search_query=${query}&results_count=5`;
        setProgress(10);  // TODO: having better in progress status maybe a spinner instead of progressbar.
        fetch(request_route)
            .then(function(response) {
              return response.json();
            })
            .then(function(myJson) {
                setProgress(0);
                console.log("input_search_query", query, "server_search_query", myJson.search_query, "results", results)
                setResults(myJson.results)
                setAppView("search_results")
                setHeaderTitle('')
            });
    }
  }


  const onVideoProcess = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key == 'Enter') {
      let newUrl = (event.target as HTMLInputElement).value || "https://www.youtube.com/watch?v=sxaTnm_4YMY"
      console.log("do video process", newUrl)

      if (newUrl !== null) {
        var regEx = "^(?:https?:)?//[^/]*(?:youtube(?:-nocookie)?\.com|youtu\.be).*[=/]([-\\w]{11})(?:\\?|=|&|$)";
        var matches = newUrl.match(regEx);
        if (matches) {
        setHeaderTitle('⚡ Processing Video ⚡')

          setYoutubeVideoId(matches[1])
          getVideoMeta(matches[1], newUrl);
          startVideoProcessingTask(matches[1], newUrl)
          setProgress(5);
        } else {
          setShowError(true);
          setErrorMessage("Invalid YouTube link!\n Valid link example: https://www.youtube.com/watch?v=-c55LCTdD90");
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
          console.log("video_status_response", myJson)
          if(myJson.state == 'running'){
            setProgress(progress+3);  // TODO: having better in progress status maybe a loading icon instead of progressbar.
          }
          if(myJson.state == 'done'){
            setProgress(99);
            setAppView("search_input")
            setHeaderTitle('')
          }
          if(myJson.state == 'error'){
              setShowError(true);
              setErrorMessage(myJson.msg);
              setTimeout(() => {
                  closeErrorAlert()
              }, 5000);
          }
        });
  }



  const startVideoProcessingTask = (videoID:any, newUrl:any) => {
    console.log("API_URL", API_URL)
    const request_route = `${API_URL}/video/`;
    setAppView("processing")
    console.log("app_view", appView)
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
    <div className="App">
      <div className="wrapper">
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

        <Background youtubeID={youtubeVideoId}/>
        <div className="content">
          <p 
          style={{
            color: "white",
            marginBottom: "10px"
          }}>{headerTitle}</p>

          {(() => {
            switch (appView) {
              case 'searching':
              case 'processing':
                  return <CircularProgress />;
                // return   <LinearProgress
                //     variant="determinate"
                //     value={progress}
                //     placeholder='Enter a YouTube link'
                //     sx={{
                //       zIndex: 9999,
                //       maxWidth: "calc(100% - 43px)",
                //       width: 400,
                //       height: 6,
                //       margin: "auto",
                //       border: "0.5px solid white",
                //       backgroundColor: "black",
                //       "& .MuiLinearProgress-colorPrimary": {
                //         backgroundColor: "black"
                //       },
                //       "& .MuiLinearProgress-bar": {
                //         backgroundColor: "#792EE5"
                //       }
                //     }}
                // />;
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
                />;
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
                />;
              case 'search_results':
                return    <div>
                  {results && results.length > 0 ?
                      <Grid container rowSpacing={1} columnSpacing={{ xs: 20, sm: 1, md: 4 }} style={{overflowY:'scroll', height: 'calc(100% - 190px)', position:'fixed', zIndex: 1, top:160, padding: '0 20px'}}>
                        {results.map( e =>
                            <Grid item xs={12} md={4} lg={2}>
                              <div style={{width: '100%', height: '100%',
                                  backgroundImage: `url(https://c.tenor.com/hRBZHp-kE0MAAAAM/loading-circle-loading.gif)`,
                                  backgroundRepeat: 'no-repeat',

                              }}>
                                <img src={ `${API_URL}/results/${youtubeVideoId}/${e}` }
                                     style={{
                                }}
                                />
                              </div>
                            </Grid>
                        )}
                      </Grid>
                      :
                      <p></p>
                  } ;
                </div>;
              default:
                return null;
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
        
      </div>
    </div>
  );
}

export default App; 
