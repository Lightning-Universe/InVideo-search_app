import React from 'react'; // get the React object from the react module

const Background = (props: any) => {
    return (
        <div>
        {props.youtubeID !== null && props.youtubeID.length > 2 ?  
            <div className="background-image" 
            style={{
                backgroundImage: `url(https://img.youtube.com/vi/${props.youtubeID}/mqdefault.jpg)`,
                backgroundColor: "black"
            }}></div>
        :  
            <div className="empty-background-image" style={{backgroundColor: "black"}}></div>
        }
            {props.children}
        </div>
    );
}

export default Background; 
