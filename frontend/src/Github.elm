module Github exposing (oAuthSignInLink)

{-| A module for all things relating to Github.
-}

import Url.Builder as UB


{-| The github page for verifying oauth access from a user.

The `clientID` is from the github oauth app.

-}
oAuthSignInLink : String -> String
oAuthSignInLink clientID =
    UB.crossOrigin
        githubURL
        [ "login", "oauth", "authorize" ]
        [ UB.string "client_id" clientID, UB.string "scope" "repo" ]



-- INTERNAL


githubURL : String
githubURL =
    "https://github.com"
