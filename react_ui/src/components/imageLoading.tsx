import React from 'react';


const ImageLoader = (props: any) => {

    return (
        <div>

            <img src={props.imageURL}  onLoad={props.onLoad}/>

        </div>
    );
}

export default ImageLoader;
