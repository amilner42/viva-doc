module Api.Endpoint exposing (Endpoint, githubLoginFromCode, logout, request, user)

{-| This module hides creates the opaque Endpoint type and keeps all endpoints within this file so
this file serves as the single source of truth for all app API endpoints.
-}

import Http
import Url.Builder exposing (QueryParameter, string)


-- TYPES


{-| Get a URL to the app API.
-}
type Endpoint
    = Endpoint String



-- INTERNAL


unwrap : Endpoint -> String
unwrap (Endpoint str) =
    str


url : List String -> List QueryParameter -> Endpoint
url paths queryParams =
    let
        -- Webpack will set this to the API base URL according to prod/dev mode
        apiBaseUrl =
            "__WEBPACK_CONSTANT_API_BASE_URL__"
    in
    Url.Builder.crossOrigin apiBaseUrl
        paths
        queryParams
        |> Endpoint



-- HELPERS


{-| Http.request, except it takes an Endpoint instead of a Url.
-}
request :
    { body : Http.Body
    , expect : Http.Expect msg
    , headers : List Http.Header
    , method : String
    , timeout : Maybe Float
    , url : Endpoint
    , tracker : Maybe String
    }
    -> Cmd msg
request config =
    Http.request
        { body = config.body
        , expect = config.expect
        , headers = config.headers
        , method = config.method
        , timeout = config.timeout
        , url = unwrap config.url
        , tracker = config.tracker
        }



-- ENDPOINTS


{-| For logging in with Github given a code.

The code is the standard code in the OAuth2 process, generated by github after the user approves
access to their account.

-}
githubLoginFromCode : String -> Endpoint
githubLoginFromCode code =
    url [ "github", "login", "fromCode" ] [ string "code" code ]


{-| The endpoint for logging out, the server has to delete the session.
-}
logout : Endpoint
logout =
    url [ "user", "logout" ] []


user : Endpoint
user =
    url [ "user" ] []
