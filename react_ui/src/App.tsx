// App.tsx

import { TextField, Chip, Alert, LinearProgress, Grid } from "@mui/material";

import Box from "@mui/material/Box";
import { KeyboardEvent, ChangeEvent } from "react";
import React, { useState, useEffect } from 'react';
import cloneDeep from "lodash/cloneDeep";

import "./App.css";
import { useLightningState } from "./hooks/useLightningState";
import Background from "./components/background";
import zIndex from "@mui/material/styles/zIndex";
import { Dictionary } from "lodash";

const starterPlaceholderMessage = 'Enter a YouTube link';
const defaultTitle = 'Search inside any (5-minute) video';

const App = (props: any) => {
  const { lightningState, updateLightningState } = useLightningState();
  const [headerTitle, setHeaderTitle] = React.useState(defaultTitle);
  const [youtubeID, setYoutubeID] = React.useState('');
  const [videoURL, setVideoURL] = React.useState('');
  const [videoName, setVideoName] = React.useState('');
  const [inputValue, setInputValue] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [showError, setShowError] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [placeHolderText, setPlaceHolderText] = React.useState(starterPlaceholderMessage);
  const [results, setResults] = useState([]);


  useEffect(() => {
    setResults(lightningState?.works.video_processor.vars.results);
    setShowProgress(lightningState?.works.video_processor.vars.show_progress);
    setProgress(lightningState?.works.video_processor.vars.progress);
    console.log('progress:', progress, 'show:', showProgress);
    if (!showProgress && progress >= 99) {
      setHeaderTitle(defaultTitle);
    }
    if (showProgress) {
      setHeaderTitle('⚡ processing video ⚡');
    }

    if (!showProgress && progress == 0) {
      setHeaderTitle(defaultTitle);
    }

  });

  const set_lightning_state = (key_chain: string[], value: any) => {
    if (lightningState) {
      const newLightningState = cloneDeep(lightningState);
      
      let obj = (newLightningState as Dictionary<any>);
      for (const [i, val] of key_chain.entries()) {
        if (i === (key_chain.length - 1)) {
          obj[val] = value
        }else {
          obj = obj[val]
        }
      }
      console.log(lightningState);
      console.log(newLightningState);
      updateLightningState(newLightningState);
    }
  }

  const handleTextFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue((e.target as HTMLInputElement).value)
  }

  const handleDelete = (e: any) => {
    setYoutubeID('');
    setVideoURL('');
    setInputValue('');
    setHeaderTitle(defaultTitle);
    setPlaceHolderText(starterPlaceholderMessage);
    set_lightning_state(['vars', 'cancel_download'], true);
    set_lightning_state(['works', 'video_processor', 'vars', 'progress'], 0);
  }

  const closeErrorAlert = () => {
    setShowError(false);
    setErrorMessage('');
  }

  const onEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key == 'Enter') {
      const contentVideoExists = videoURL.length > 2;
      if (contentVideoExists) {
        // SEARCH WITHIN VIDEO
        let query = (event.target as HTMLInputElement).value;
        set_lightning_state(['vars', 'search_query'], query);
        setInputValue('');
        
      }else {
        let newUrl = (event.target as HTMLInputElement).value;
        if (newUrl !== null) {
          var regEx = "^(?:https?:)?//[^/]*(?:youtube(?:-nocookie)?\.com|youtu\.be).*[=/]([-\\w]{11})(?:\\?|=|&|$)";
          var matches = newUrl.match(regEx);
          if (matches) {
            setVideoURL(newUrl);
            getVideoMeta(matches[1], newUrl);
            set_lightning_state(['works', 'video_processor', 'vars', 'progress'], 0);
            set_lightning_state(['works', 'video_processor', 'vars', 'show_progress'], true);
            setProgress(0);
            set_lightning_state(['vars', 'video_url'], newUrl);
          } else {
            setShowError(true);
            setInputValue('');
            setErrorMessage("Invalid YouTube link!\n Valid link example: https://www.youtube.com/watch?v=-c55LCTdD90");
            setTimeout(() => {
              closeErrorAlert()
            }, 5000);
          }
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
        setYoutubeID(videoID);
        setVideoName(myJson.title);
        setInputValue('');
        setShowProgress(true);
        set_lightning_state(['works', 'video_processor', 'vars', 'show_progress'], true);
        setPlaceHolderText('Search for things, actions, etc...');
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

        <Background youtubeID={youtubeID}/>
        <div className="content">
          <p 
          style={{
            color: "white",
            marginBottom: "10px"
          }}>{headerTitle}</p>
          
          {showProgress ? 
            <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{
              zIndex: 9999, 
              maxWidth: "calc(100% - 43px)",
              width: 400,
              height: 6, 
              margin: "auto",
              border: "0.5px solid white",
              backgroundColor: "black",
              "& .MuiLinearProgress-colorPrimary": {
                backgroundColor: "black"
              },
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#792EE5"
              }
          }}
            />
          :
            <TextField
              size="small"
              value={inputValue}
              onChange={handleTextFieldChange}
              onKeyDownCapture={onEnter}
              fullWidth
              placeholder={placeHolderText}
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

          {youtubeID !== null && youtubeID.length > 2 ? 
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
          {results && results.length > 0 ?
            <Grid container rowSpacing={1} columnSpacing={{ xs: 12, sm: 4, md: 4 }} style={{overflowY:'scroll', height: 'calc(100% - 190px)', position:'fixed', zIndex: 1, top:160, padding: '0 20px'}}>
              {results.map( e =>
              <Grid item xs={12} md={4} lg={3}>
                <div style={{width: '100%', height: '100%'}}>
                  <iframe 
                    style={{width: '100%', height: '100%', border: 'none'}} 
                    src={e}>
                  </iframe>
                </div>
              </Grid>
              )}
            </Grid>
            :
            <p></p>
          } 
        
      </div>
    </div>
  );
}

export default App; 
