module Route exposing (DocumentationTab(..), Route(..), fromUrl, href, replaceUrl, routeToString)

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
    | Documentation DocumentationTab


type DocumentationTab
    = InstallationTab
    | GettingStartedTab
    | Example1Tab
    | Example2Tab
    | Example3Tab
    | SupportedLanguagesTab
    | OverviewTab
    | TagsTab
    | FileTagTab
    | LineTagTab
    | BlockTagTab
    | OwnershipTab


parser : Parser (Route -> a) a
parser =
    oneOf
        [ Parser.map Home Parser.top
        , Parser.map OAuthRedirect (s "oauth_redirect" <?> Query.string "code")
        , Parser.map CommitReview (s "review" </> s "repo" </> int </> s "pr" </> int </> s "commit" </> string)
        , Parser.map (Documentation InstallationTab) (s "documentation" </> s "installation")
        , Parser.map (Documentation GettingStartedTab) (s "documentation" </> s "getting-started")
        , Parser.map (Documentation Example1Tab) (s "documentation" </> s "getting-started" </> s "example-1")
        , Parser.map (Documentation Example2Tab) (s "documentation" </> s "getting-started" </> s "example-2")
        , Parser.map (Documentation Example3Tab) (s "documentation" </> s "getting-started" </> s "example-3")
        , Parser.map (Documentation SupportedLanguagesTab) (s "documentation" </> s "supported-languages")
        , Parser.map (Documentation OverviewTab) (s "documentation" </> s "overview")
        , Parser.map (Documentation TagsTab) (s "documentation" </> s "tags")
        , Parser.map (Documentation FileTagTab) (s "documentation" </> s "tags" </> s "file")
        , Parser.map (Documentation LineTagTab) (s "documentation" </> s "tags" </> s "line")
        , Parser.map (Documentation BlockTagTab) (s "documentation" </> s "tags" </> s "block")
        , Parser.map (Documentation OwnershipTab) (s "documentation" </> s "ownership")
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
        docTabToUrlSegments docTab =
            case docTab of
                InstallationTab ->
                    [ "installation" ]

                GettingStartedTab ->
                    [ "getting-started" ]

                Example1Tab ->
                    [ "getting-started", "example-1" ]

                Example2Tab ->
                    [ "getting-started", "example-2" ]

                Example3Tab ->
                    [ "getting-started", "example-3" ]

                SupportedLanguagesTab ->
                    [ "supported-languages" ]

                OverviewTab ->
                    [ "overview" ]

                TagsTab ->
                    [ "tags" ]

                FileTagTab ->
                    [ "tags", "file" ]

                LineTagTab ->
                    [ "tags", "line" ]

                BlockTagTab ->
                    [ "tags", "block" ]

                OwnershipTab ->
                    [ "ownership" ]

        pieces =
            case page of
                Home ->
                    []

                Root ->
                    []

                CommitReview repoId prNumber commitId ->
                    [ "review", "repo", String.fromInt repoId, "pr", String.fromInt prNumber, "commit", commitId ]

                Documentation docTab ->
                    "documentation" :: docTabToUrlSegments docTab

                -- Certain routes shouldn't be accessed directly
                _ ->
                    [ "error" ]
    in
    "/" ++ String.join "/" pieces
