module Route exposing (Route(..), fromUrl, href, replaceUrl, routeToString)

{-| A type to represent possible routes with helper functions.
-}

-- import Html.Events exposing (on)

import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes as Attr
import Html.Events as Events
import Json.Decode as Decode
import Url exposing (Url)
import Url.Parser as Parser exposing ((</>), (<?>), Parser, int, oneOf, s, string)
import Url.Parser.Query as Query



-- ROUTING


{-| All website routes.

NOTE: Root will just redirect to whatever other page is currently set as the route.

-}
type Route
    = Root
    | Home
      -- Maybe string is code from github redirect
    | OAuthRedirect (Maybe String)
      -- Repo number / prNumber / commit hash
    | CommitReview Int Int String
    | Documentation


parser : Parser (Route -> a) a
parser =
    oneOf
        [ Parser.map Home Parser.top
        , Parser.map OAuthRedirect (s "oauth_redirect" <?> Query.string "code")
        , Parser.map CommitReview (s "review" </> s "repo" </> int </> s "pr" </> int </> s "commit" </> string)
        , Parser.map Documentation (s "documentation")
        ]



-- PUBLIC HELPERS


{-| A href that takes a Route instead of a url.
-}
href : Route -> Attribute msg
href targetRoute =
    Attr.href (routeToString targetRoute)


{-| A replaceUrl that takes a Route instead of a url.
-}
replaceUrl : Nav.Key -> Route -> Cmd msg
replaceUrl key route =
    Nav.replaceUrl key (routeToString route)


fromUrl : Url -> Maybe Route
fromUrl =
    Parser.parse parser


routeToString : Route -> String
routeToString page =
    let
        pieces =
            case page of
                Home ->
                    []

                Root ->
                    []

                CommitReview repoId prNumber commitId ->
                    [ "review", "repo", String.fromInt repoId, "pr", String.fromInt prNumber, "commit", commitId ]

                Documentation ->
                    [ "documentation" ]

                -- Certain routes shouldn't be accessed directly
                _ ->
                    [ "error" ]
    in
    "/" ++ String.join "/" pieces
