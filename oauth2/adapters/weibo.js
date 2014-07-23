OAuth2.adapter('weibo', {
  /**
   * @return {URL} URL to the page that returns the authorization code
   */
  authorizationCodeURL: function(config) {
    return ('https://auth.sina.com.cn/oauth2/authorize?' +
      'client_id={{CLIENT_ID}}&' +
      'scope={{API_SCOPE}}&' +
      'redirect_uri={{REDIRECT_URI}}')
        .replace('{{CLIENT_ID}}', config.clientId)
        .replace('{{API_SCOPE}}', config.apiScope)
        .replace('{{REDIRECT_URI}}', this.redirectURL(config));
  },

  /**
   * @return {URL} URL to the page that we use to inject the content
   * script into
   */
  redirectURL: function(config) {
    return 'http://auth.sina.com.cn/robots.txt';
  },
  parseAuthorizationCode: function(url) {
    var error = url.match(/[&\?]error=([^&]+)/);
    if (error) {
      throw 'Error getting authorization code: ' + error[1];
    }
    return url.match(/[&\?]code=([\w\/\-]+)/)[1];
  },

  /**
   * @return {URL} URL to the access token providing endpoint
   */
  accessTokenURL: function() {
    return 'https://auth.sina.com.cn/oauth2/access_token';
  },

  /**
   * @return {String} HTTP method to use to get access tokens
   */
  accessTokenMethod: function() {
    return 'POST';
  },

  /**
   * @return {Object} The payload to use when getting the access token
   */
  accessTokenParams: function(authorizationCode, config) {
    return {
      code: authorizationCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: this.redirectURL(config),
      grant_type: 'authorization_code'
    };
  },

  /**
   * @return {Object} Object containing accessToken {String},
   * refreshToken {String} and expiresIn {Int}
   */
  parseAccessToken: function(response) {
    var parsedResponse = JSON.parse(response);
    return {
      accessToken: parsedResponse.access_token,
      refreshToken: parsedResponse.refresh_token,
      expiresIn: parsedResponse.expires_in,
      time_left: parsedResponse.time_left,
      uid: parsedResponse.uid
    };
  }
});
