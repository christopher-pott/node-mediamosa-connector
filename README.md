

# mediamosa

The current functionality implements a MediaMosa connector as well as a framework to enable 
GET and POST. 

Additionally, there are a limited set of instance methods which can be used to store and 
retrieve still images:

To negotiate a ticket for an image (jpg) upload, the client should call methods in this order:
      asset_id = createAsset()
      media_id = createMediaFile(asset_id)
      upload_url = createMediaFileUploadTicket(media_id)
      
    The node client passes the upload URL to the application. The application
    should embed the image in a multipart form which it posts to the upload URL.
     
To retrieve an image URL by asset id use:
      getAssetPlayUrl(asset_id)

## Usage

    /*Include the module*/
	var MM = require('mediamosa');

    /*Call the constructor with the MediaMosa application connector credentials*/
	var MeMo = new MM('host', 'user', 'password');
	
	/*Call an instance method, providing promise handlers*/
	MeMo.createAsset()
    .then( function(asset_id){
        ....
    }, function (err) {
        ....
    });

## Developing



### Tools

