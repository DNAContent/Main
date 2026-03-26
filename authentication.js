/**
 * OAuth2 authentication for Pipedrive.
 * Facebook Lead Ads uses its own OAuth handled by Zapier's built-in Facebook integration
 * as the trigger source — no extra auth needed on that side.
 */

const authentication = {
  type: 'oauth2',
  test: {
    url: 'https://api.pipedrive.com/v1/users/me',
    method: 'GET',
  },
  oauth2Config: {
    authorizeUrl: {
      url: 'https://oauth.pipedrive.com/oauth/authorize',
      params: {
        client_id: '{{process.env.PIPEDRIVE_CLIENT_ID}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
        response_type: 'code',
      },
    },
    getAccessToken: {
      url: 'https://oauth.pipedrive.com/oauth/token',
      method: 'POST',
      body: {
        code: '{{bundle.inputData.code}}',
        client_id: '{{process.env.PIPEDRIVE_CLIENT_ID}}',
        client_secret: '{{process.env.PIPEDRIVE_CLIENT_SECRET}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
        grant_type: 'authorization_code',
      },
    },
    refreshAccessToken: {
      url: 'https://oauth.pipedrive.com/oauth/token',
      method: 'POST',
      body: {
        refresh_token: '{{bundle.authData.refresh_token}}',
        client_id: '{{process.env.PIPEDRIVE_CLIENT_ID}}',
        client_secret: '{{process.env.PIPEDRIVE_CLIENT_SECRET}}',
        grant_type: 'refresh_token',
      },
    },
    autoRefresh: true,
  },
  fields: [],
  connectionLabel: '{{bundle.inputData.data.name}} (Pipedrive)',
};

const includeBearerToken = (request, z, bundle) => {
  if (bundle.authData.access_token) {
    request.headers.Authorization = `Bearer ${bundle.authData.access_token}`;
  }
  return request;
};

module.exports = { authentication, includeBearerToken };
