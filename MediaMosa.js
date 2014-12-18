/**
 * MediaMosa API class for Node.js
 **/

var Q = require('q'),
    http = require('http'),
    parseXml2js = require('xml2js').parseString,
    crypto = require('crypto'),
    MM_OK = '601',
    MM_AUTH_REQUIRED = '1601',
    MM_NO_MEDIAFILE_FOUND = '608';

/**
 * MediaMosa Constructor
 **/

function MediaMosa (host, user, password) {
    
    /* The user/password need setting up in MediaMosa configuration by creating a 
     * "connector application" login.
     * The host is the back-end address.
     * The cookie will be stored during authentication.
     * */
    
    if(!host || !user || !password){
        throw new Error("MediaMosa constructor missing or null parameters");
    }
    /*instance properties*/
    this.cookie = '';
    this.host = host;
    this.user = user;
    this.password = password;
    
    return;
}

/**
 * Private methods 
 **/

function mm_challenge_hash(challenge, random, password){
    
    var shasum, response = challenge + ":" + random + ":" + password;
    
    shasum = crypto.createHash('sha1');
    shasum.update(response);
    
    return shasum.digest('hex');
}

function mm_challenge(challenge, options, password, cookie){
    
    var random, hash, body, random_len = 12,
        deferred = Q.defer();

    random = crypto.randomBytes(Math.ceil(random_len/2)).toString('hex').slice(0,random_len);
    hash = mm_challenge_hash(challenge, random, password);
    body = "dbus=DATA " + random + " " + hash;
    
    options.headers = {'Content-Type' : 'application/x-www-form-urlencoded',
                       'Content-Length' : body.length,
                       'Cookie' : cookie};
        
    var post_req = http.request(options, function(resp) {
        
        var status, description, dbusStatus, data = '';
        resp.setEncoding('utf8');
        
        resp.on('data', function(chunk) {
            data += chunk;
        });
        resp.on('end', function () {
            if (data !== ''){
                parseXml2js(data, function (parseErr, result) {
                    if(parseErr || !result){
                        console.log("MediaMosa: Error: " + parseErr);
                        deferred.reject(parseErr);
                    }
                    if(result){
                        status = result.response.header[0].request_result_id[0];
                        description = result.response.header[0].request_result_description[0];
                        
                        if (status === MM_OK){
                            /*"DBUS authentication protocol: challenge received"*/
                            dbusStatus = result.response.items[0].item[0].dbus[0];
                            console.log("MediaMosa: dbus challenge result: " + dbusStatus);
                            deferred.resolve(dbusStatus);
                        }else{
                            console.log("MediaMosa: Error: (" + status + ") " + description);
                            deferred.reject(status);
                        }
                    }
                });
            }else{
                console.log("MediaMosa: Error: no challenge returned");
                deferred.reject();
            }
        });
        resp.on('error', function(err) {
            console.log("MediaMosa: Error: http.request error: " + err);
            deferred.reject(err);
        });
    });
    // post the data
    console.log("MediaMosa: dbus challenge reply: " + body);
    post_req.write(body);
    post_req.end();
    
    return deferred.promise;
}

function mm_login(host, user, password) {
    
    var deferred = Q.defer(),
        body = 'dbus=AUTH DBUS_COOKIE_SHA1 ' + user,
        options = {
            host: host,
            port: 80,
            path: '/login',
            method: 'POST',
            headers: {'Content-Type' : 'application/x-www-form-urlencoded',
                      'Content-Length' : body.length}
        };

    var post_req = http.request(options, function(resp) {
        
        var status, description, challenge, key, challengeStart, data = '', cookie = '';
        resp.setEncoding('utf8');
        cookie = resp.headers["set-cookie"][0];
        
        resp.on('data', function(chunk) {
            data += chunk;
        });
        resp.on('end', function () {
            if (data !== '' ){
                parseXml2js(data, function (parseErr, result) {
                    if(parseErr || !result){
                        console.log("MediaMosa: Error: " + parseErr);
                        deferred.reject(parseErr);
                    }
                    if(result){
                        status = result.response.header[0].request_result_id[0];
                        description = result.response.header[0].request_result_description[0];

                        if (status === MM_OK){
                            /*"DBUS authentication protocol: negotiation started"*/
                            challenge = result.response.items[0].item[0].dbus[0];
                            key = "DATA vpx 0 ";
                            challengeStart = key.length;
                            
                            /*handle the challenge*/
                            challenge = challenge.substring(challengeStart);
                            console.log("MediaMosa: challenge received: " + challenge);
                            mm_challenge(challenge, options, password, cookie)
                            .then( function(dbusStatus){
                                if(dbusStatus === "OK server_guid"){
                                    deferred.resolve(cookie);
                                }else{
                                    console.log("MediaMosa: Error: unexpected challenge status");
                                    deferred.reject(dbusStatus);
                                }
                            }, function (err) {
                                console.log("MediaMosa: Error: challenge failed");
                                deferred.reject(err);
                            });
                        }else{
                            console.log("MediaMosa: Error: (" + status + ") " + description);
                            deferred.reject(status);
                        }
                    }
                });
            }else{
                console.log("MediaMosa: Error: no challenge returned");
                deferred.reject();
            }
        });
        resp.on('error', function(err) {
            console.log("MediaMosa: Error: http.request error: " + err);
            deferred.reject(err);
        });
    });
    // post the data
    console.log("MediaMosa: begin dbus protocol: " + body);
    post_req.write(body);
    post_req.end();

    return deferred.promise;
}

function mm_get(host, path, cookie) {
    
    var deferred = Q.defer(),
        options = {
            host: host,
            port: 80,
            path: path,
            headers: {'Content-Type' : 'application/x-www-form-urlencoded',
                      'Cookie' : cookie }
    };

    var get = http.get(options, function (resp) {
        
        var status, description, url, data = '';
        resp.setEncoding('utf8');
        
        resp.on('data', function(chunk) {
            data += chunk;
        });
        resp.on('end', function() {
            if (data !== ''){
                parseXml2js(data, function (parseErr, result) {
                    if(parseErr || !result){
                        console.log("MediaMosa: Error: " + parseErr);
                        deferred.reject(parseErr);
                    }
                    if(result){
                        status = result.response.header[0].request_result_id[0];
                        description = result.response.header[0].request_result_description[0];

                        if(status === MM_OK){
                            deferred.resolve(result);
                        }else {
                            console.log("MediaMosa: Error: (" + status + ") " + description);
                            deferred.reject(status);
                        }
                    }
                });
            }else{
                console.log("MediaMosa: Error: empty GET result returned");
                deferred.reject();
            }
        });
        resp.on('error', function(err) {
            console.log("MediaMosa: Error: http.request GET error: " + err);
            deferred.reject(err);
        });
    });
    return deferred.promise;
}

function mm_post(host, cookie, body, path) {
    
    var deferred = Q.defer(),
        options = {
            host: host,
            port: 80,
            path: path,
            method: 'POST',
            headers: {'Content-Type' : 'application/x-www-form-urlencoded',
                      'Content-Length' : body.length,
                      'Cookie' : cookie }
        };

    var post_req = http.request(options, function(resp) {
        
        var status, description, mediafile, data = '';
        resp.setEncoding('utf8');
        
        resp.on('data', function(chunk) {
            data += chunk;
        });
        resp.on('end', function () {
            if (data !== '' ){
                parseXml2js(data, function (parseErr, result) {
                    if(parseErr || !result){
                        console.log("MediaMosa: Error: " + parseErr);
                        deferred.reject(parseErr);
                    }
                    if(result){
                        status = result.response.header[0].request_result_id[0];
                        description = result.response.header[0].request_result_description[0];
                       
                        if(status === MM_OK){
                            deferred.resolve(result);
                        }else{
                            console.log("MediaMosa: Error: (" + status + ") " + description);
                            deferred.reject(status);
                        }
                    }
                });
            }else{
                console.log("MediaMosa: Error: empty POST response");
                deferred.reject();
            }
        });
        resp.on('error', function(err) {
            console.log("MediaMosa: Error: http.request POST error: " + err);
            deferred.reject(err);
        });
    });
    /* post the data*/
    console.log("MediaMosa: POST request: " + body);
    post_req.write(body);
    post_req.end();
    
    return deferred.promise;
}

function mm_authenticate(self) {

    var deferred = Q.defer(),
        that = self;
    
    mm_login(that.host, that.user, that.password)
    .then( function(cookie){
        that.cookie = cookie;
        deferred.resolve();
    }, function (err) {
        console.log("MediaMosa: Error: authenticate failed");
        that.cookie = '';
        deferred.reject();
    });
    return deferred.promise;
}

function mm_do_request(self, body, path, type) {
    
    /* Calls GET or POST based on type
     * Handles authentication*/
    
    var deferred = Q.defer(),
        that = self;
    
    if (!type || !path || !self.host){
        return;
    }
    
    if (type === 'GET'){
        mm_get(that.host, path, that.cookie)
        .then(function(result){
            deferred.resolve(result);
        }, function (err) {
            if( err === MM_AUTH_REQUIRED){
                mm_authenticate(that)
                .then( function(){
                    /*now logged in, attempt request again, just once*/
                    mm_get(that.host, path, that.cookie)
                    .then(function(result){
                        deferred.resolve(result);
                    }, function (err) {
                        console.log("MediaMosa: Error: mm_get failed");
                        deferred.reject(err);
                    });
                }, function (err) {
                    console.log("MediaMosa: Error: authenticate failed");
                    deferred.reject(err);
                });
            }else{
                deferred.reject(err);
            }
        });
    }else if (type === 'POST'){
        mm_post(that.host, that.cookie, body, path)
        .then(function(result){
            deferred.resolve(result);
        }, function (err) {
            if( err === MM_AUTH_REQUIRED){
                mm_authenticate(that)
                .then( function(){
                    /*now logged in, attempt request again, just once*/
                    mm_post(that.host, that.cookie, body, path)
                    .then(function(result){
                        deferred.resolve(result);
                    }, function (err) {
                        console.log("MediaMosa: Error: mm_post failed");
                        deferred.reject(err);
                    });
                }, function (err) {
                    console.log("MediaMosa: Error: authenticate failed");
                    deferred.reject(err);
                });
            }else{
                deferred.reject(err);
            }
        });
    }else{
        console.log("MediaMosa: Error: unknown HTTP type");
        deferred.reject();
    }
    return deferred.promise;
}

/**
 * Instance Methods
 **/

/*
 * Generic operations
 * The client must supply the correct REST call (path) and parse the JSON responses
 */

MediaMosa.prototype.get = function(path) {

    var deferred = Q.defer(),
        that = this;

    mm_do_request(that, null, path, 'GET')
    .then(function(result){
        deferred.resolve(result);
    }, function (err) {
        console.log("MediaMosa: Error: get failed");
        deferred.reject(err);
    });

    return deferred.promise;
};

MediaMosa.prototype.post = function(path, body) {

    var deferred = Q.defer(),
        that = this;

    mm_do_request(that, body, path, 'POST')
    .then(function(result){
        deferred.resolve(result);
    }, function (err) {
        console.log("MediaMosa: Error: post failed");
        deferred.reject(err);
    });
    
    return deferred.promise;
};

/*
 * Specific MediaMosa API operations
 * The REST call is generated and key values are extracted from the response and returned to client
 * 
 * This section should be expanded to cover more of the API
 */

MediaMosa.prototype.getAssetFirstProfileId = function(id) {

    var deferred = Q.defer(),
        that = this,
        path = '/asset/' + id + '?show_stills=TRUE&show_collections=FALSE&acl_realm=&' +
                                'acl_domain=172.20.2.143&acl_user_id=&is_app_admin=FALSE';

    mm_do_request(that, null, path, 'GET')
    .then(function(result){
        var profile_id = result.response.items[0].item[0].mediafiles[0].mediafile[0].transcode_profile_id[0];
        console.log("MediaMosa: image url :" + profile_id);
        deferred.resolve(profile_id);
    }, function (err) {
        console.log("MediaMosa: Error: getAssetFirstProfileId failed");
        deferred.reject(err);
    });

    return deferred.promise;
};

MediaMosa.prototype.getAssetPlayUrl = function(id, query) {

    var deferred = Q.defer(),
        that = this,
        path = '/asset/' + id + '/play' + query;
    
    mm_do_request(that, null, path, 'GET')
    .then(function(result){
        var url = result.response.items[0].item[0].output[0];
        console.log("MediaMosa: image url :" + url);
        deferred.resolve(url);
    }, function (err) {
        console.log("MediaMosa: Error: getAssetPlayUrl failed");
        deferred.reject(err);
    });

    return deferred.promise;
};

MediaMosa.prototype.createAsset = function() {

    var deferred = Q.defer(),
        that = this,
        path = '/asset/create',
        body =  'user_id=' + that.user,
        asset = '';

    mm_do_request(that, body, path, 'POST')
    .then(function(result){
        asset = result.response.items[0].item[0].asset_id[0];
        deferred.resolve(asset);
    }, function (err) {
        console.log("MediaMosa: Error: createAsset failed");
        deferred.reject(err);
    });
    
    return deferred.promise;
};

MediaMosa.prototype.createMediaFile = function(asset) {

    var deferred = Q.defer(),
        that = this,
        path = '/mediafile/create',
        body =  'user_id=' + that.user + '&asset_id=' + asset,
        mediafile = '';

    mm_do_request(that, body, path, 'POST')
    .then(function(result){
        mediafile = result.response.items[0].item[0].mediafile_id[0];
        deferred.resolve(mediafile);
    }, function (err) {
        console.log("MediaMosa: Error: createMediaFile failed");
        deferred.reject(err);
    });
    
    return deferred.promise;
};

MediaMosa.prototype.createMediaFileUploadTicket = function(mediafile) {

    var deferred = Q.defer(),
        that = this,
        path = '/mediafile/' + mediafile + '/uploadticket/create',
        body =  'user_id=' + that.user + '&mediafile_id=' + mediafile,
        action = '';

    mm_do_request(that, body, path, 'POST')
    .then(function(result){
        action = result.response.items[0].item[0].action[0];
        deferred.resolve(action);
    }, function (err) {
        console.log("MediaMosa: Error: createMediaFileUploadTicket failed");
        deferred.reject(err);
    });
    
    return deferred.promise;
};

module.exports = MediaMosa;
