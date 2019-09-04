module Github exposing (githubIcon, githubPullRequestLink, githubRepoLink, installAppOnRepositoriesLink, oAuthSignInLink, oauthClientId)

{-| A module for all things relating to Github.
-}

import Asset
import Html exposing (Html, a, img)
import Html.Attributes exposing (href, style)
import Url.Builder as UB


{-| The github page for verifying oauth access from a user.

The `clientID` is from the github oauth app.

-}
oAuthSignInLink : String -> String
oAuthSignInLink clientID =
    UB.crossOrigin
        githubUrl
        [ "login", "oauth", "authorize" ]
        [ UB.string "client_id" clientID
        , UB.string "scope" "repo read:org"
        ]


oauthClientId : String
oauthClientId =
    "__WEBPACK_CONSTANT_OAUTH_CLIENT_ID__"


installAppOnRepositoriesLink : String
installAppOnRepositoriesLink =
    UB.crossOrigin
        githubUrl
        [ "apps", "__WEBPACK_CONSTANT_GITHUB_APP_NAME__" ]
        []


githubRepoLink : String -> String
githubRepoLink fullRepoName =
    UB.crossOrigin
        githubUrl
        [ fullRepoName ]
        []


githubPullRequestLink : String -> Int -> String
githubPullRequestLink fullRepoName prNumber =
    UB.crossOrigin
        githubUrl
        [ fullRepoName, "pull", String.fromInt prNumber ]
        []


githubIcon : String -> Html msg
githubIcon url =
    a
        [ href url ]
        [ img
            [ Asset.src Asset.githubLogo
            , style "width" "24px"
            , style "height" "24px"
            ]
            []
        ]



-- INTERNAL


githubUrl : String
githubUrl =
    "https://github.com"
