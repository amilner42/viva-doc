module Route exposing (Route(..), fromUrl, href, replaceUrl)

{-| A type to represent possible routes with helper functions.
-}

import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes as Attr
import Url exposing (Url)
import Url.Parser as Parser exposing ((</>), (<?>), Parser, oneOf, s, string)
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


parser : Parser (Route -> a) a
parser =
    oneOf
        [ Parser.map Home Parser.top
        , Parser.map OAuthRedirect (s "oauth_redirect" <?> Query.string "code")
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



-- INTERNAL


routeToString : Route -> String
routeToString page =
    let
        pieces =
            case page of
                Home ->
                    []

                Root ->
                    []

                -- Certain routes shouldn't be accessed directly
                _ ->
                    [ "error" ]
    in
    "/" ++ String.join "/" pieces
