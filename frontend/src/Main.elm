module Main exposing (main)

{-| The entry-point to the application. This module should remain minimal.
-}

import Api.Api as Api
import Api.Core as Core
import Browser exposing (Document)
import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http exposing (Error(..))
import Json.Decode as Decode
import Page
import Page.Blank as Blank
import Page.Home as Home
import Page.NotFound as NotFound
import Page.OAuthRedirect as OAuthRedirect
import Route exposing (Route)
import Session exposing (Session)
import Url exposing (Url)
import Viewer exposing (Viewer)


-- MODEL


type alias Model =
    { mobileNavbarOpen : Bool
    , pageModel : PageModel
    }


type PageModel
    = Redirect Session
    | NotFound Session
    | Home Home.Model
    | OAuthRedirect OAuthRedirect.Model


{-| On init we have 2 cases:

    1. Github redirects the user with an access code (not a token yet)
    2. The user goes to the website (the common case)

-}
init : Decode.Value -> Url -> Nav.Key -> ( Model, Cmd Msg )
init flags url navKey =
    case Route.fromUrl url of
        -- Sent here by github, completing the process to get access token.
        (Just (Route.OAuthRedirect _)) as oauthRedirectRoute ->
            changeRouteTo
                oauthRedirectRoute
                { mobileNavbarOpen = False, pageModel = Redirect <| Session.Guest navKey }

        -- Otherwise we've hit the website and should try to get the user
        _ ->
            ( { mobileNavbarOpen = False
              , pageModel = Redirect <| Session.Guest navKey
              }
            , Api.getUser CompletedGetUser
            )



-- VIEW


view : Model -> Document Msg
view model =
    let
        viewPage toMsg pageView =
            let
                { title, body } =
                    Page.view
                        { mobileNavbarOpen = model.mobileNavbarOpen
                        , toggleMobileNavbar = ToggledMobileNavbar
                        , logout = Logout
                        }
                        (Session.getViewer (toSession model))
                        pageView
                        toMsg
            in
            { title = title
            , body = body
            }
    in
    case model.pageModel of
        Redirect _ ->
            viewPage (\_ -> Ignored) Blank.view

        NotFound _ ->
            viewPage (\_ -> Ignored) NotFound.view

        Home home ->
            viewPage GotHomeMsg (Home.view home)

        OAuthRedirect oauthRedirect ->
            viewPage GotOAuthRedirectMsg (OAuthRedirect.view oauthRedirect)



-- UPDATE


type Msg
    = Ignored
    | ChangedUrl Url
    | ClickedLink Browser.UrlRequest
    | ToggledMobileNavbar
    | CompletedGetUser (Result (Core.HttpError ()) Viewer.Viewer)
    | Logout
    | CompletedLogout (Result (Core.HttpError ()) ())
    | GotHomeMsg Home.Msg
    | GotOAuthRedirectMsg OAuthRedirect.Msg


toSession : Model -> Session
toSession { pageModel } =
    case pageModel of
        Redirect session ->
            session

        NotFound session ->
            session

        Home home ->
            Home.toSession home

        OAuthRedirect oauthRedirect ->
            OAuthRedirect.toSession oauthRedirect


changeRouteTo : Maybe Route -> Model -> ( Model, Cmd Msg )
changeRouteTo maybeRoute model =
    let
        session =
            toSession model

        closeMobileNavbar =
            { model | mobileNavbarOpen = False }
    in
    case maybeRoute of
        Nothing ->
            ( { model
                | mobileNavbarOpen = False
                , pageModel = NotFound session
              }
            , Cmd.none
            )

        Just Route.Root ->
            ( closeMobileNavbar
            , Route.replaceUrl (Session.getNavKey session) Route.Home
            )

        Just Route.Home ->
            Home.init session
                |> updatePageModel Home GotHomeMsg model

        Just (Route.OAuthRedirect maybeCode) ->
            OAuthRedirect.init session maybeCode
                |> updatePageModel OAuthRedirect GotOAuthRedirectMsg model


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    let
        currentSession =
            toSession model

        currentNavKey =
            Session.getNavKey currentSession
    in
    case ( msg, model.pageModel ) of
        ( Ignored, _ ) ->
            ( model, Cmd.none )

        ( ClickedLink urlRequest, _ ) ->
            case urlRequest of
                Browser.Internal url ->
                    ( model
                    , Nav.pushUrl currentNavKey (Url.toString url)
                    )

                Browser.External href ->
                    ( model
                    , Nav.load href
                    )

        ( ChangedUrl url, _ ) ->
            changeRouteTo (Route.fromUrl url) model

        ( ToggledMobileNavbar, _ ) ->
            ( { model | mobileNavbarOpen = not model.mobileNavbarOpen }
            , Cmd.none
            )

        ( CompletedGetUser (Ok viewer), _ ) ->
            ( { model
                | mobileNavbarOpen = False
                , pageModel = Redirect <| Session.LoggedIn currentNavKey viewer
              }
            , Route.replaceUrl currentNavKey Route.Home
            )

        -- TODO handle error better (eg. network error)
        ( CompletedGetUser (Err err), _ ) ->
            changeRouteTo (Just Route.Home) model

        ( Logout, _ ) ->
            ( model, Api.getLogout CompletedLogout )

        ( CompletedLogout (Ok _), _ ) ->
            changeRouteTo
                (Just Route.Home)
                { model | pageModel = Redirect <| Session.Guest currentNavKey }

        -- TODO
        ( CompletedLogout (Err _), _ ) ->
            ( model, Cmd.none )

        ( GotHomeMsg pageMsg, Home home ) ->
            Home.update pageMsg home
                |> updatePageModel Home GotHomeMsg model

        ( GotOAuthRedirectMsg pageMsg, OAuthRedirect oauthRedirect ) ->
            OAuthRedirect.update pageMsg oauthRedirect
                |> updatePageModel OAuthRedirect GotOAuthRedirectMsg model

        ( _, _ ) ->
            -- Disregard messages that arrived for the wrong page.
            ( model, Cmd.none )


{-| For updating the model given a page model and page msg.

This update will close the mobileNavbar.

-}
updatePageModel :
    (pageModel -> PageModel)
    -> (pageMsg -> Msg)
    -> Model
    -> ( pageModel, Cmd pageMsg )
    -> ( Model, Cmd Msg )
updatePageModel toPageModel toMsg model ( pageModel, pageCmd ) =
    ( { model
        | mobileNavbarOpen = False
        , pageModel = toPageModel pageModel
      }
    , Cmd.map toMsg pageCmd
    )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    case model.pageModel of
        NotFound _ ->
            Sub.none

        Redirect _ ->
            Sub.none

        Home home ->
            Sub.map GotHomeMsg <| Home.subscriptions home

        OAuthRedirect oauthRedirect ->
            Sub.map GotOAuthRedirectMsg <| OAuthRedirect.subscriptions oauthRedirect



-- MAIN


main : Program Decode.Value Model Msg
main =
    Browser.application
        { init = init
        , onUrlChange = ChangedUrl
        , onUrlRequest = ClickedLink
        , subscriptions = subscriptions
        , update = update
        , view = view
        }
