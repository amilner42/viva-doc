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


{-| TODO make the request to the API for the current user.
-}
init : Decode.Value -> Url -> Nav.Key -> ( Model, Cmd Msg )
init flags url navKey =
    let
        maybeRoute =
            Route.fromUrl url
    in
    case maybeRoute of
        -- Completing the process to get access code
        Just (Route.OAuthRedirect _) ->
            changeRouteTo
                (Route.fromUrl url)
                { mobileNavbarOpen = False
                , pageModel = Redirect <| Session.Guest navKey
                }

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
    | ChangedRoute (Maybe Route)
    | ChangedUrl Url
    | ClickedLink Browser.UrlRequest
    | ToggledMobileNavbar
    | CompletedGetUser (Result (Core.HttpError ()) Viewer.Viewer)
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

        -- TODO
        Just Route.Logout ->
            ( closeMobileNavbar
            , Cmd.none
            )

        Just Route.Home ->
            Home.init session
                |> updatePageModel Home GotHomeMsg model

        Just (Route.OAuthRedirect maybeCode) ->
            OAuthRedirect.init session maybeCode
                |> updatePageModel OAuthRedirect GotOAuthRedirectMsg model


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case ( msg, model.pageModel ) of
        ( Ignored, _ ) ->
            ( model, Cmd.none )

        ( ClickedLink urlRequest, _ ) ->
            case urlRequest of
                Browser.Internal url ->
                    case url.fragment of
                        Nothing ->
                            -- If we got a link that didn't include a fragment,
                            -- it's from one of those (href "") attributes that
                            -- we have to include to make the RealWorld CSS work.
                            --
                            -- In an application doing path routing instead of
                            -- fragment-based routing, this entire
                            -- `case url.fragment of` expression this comment
                            -- is inside would be unnecessary.
                            ( model, Cmd.none )

                        Just _ ->
                            ( model
                            , Nav.pushUrl (Session.getNavKey (toSession model)) (Url.toString url)
                            )

                Browser.External href ->
                    ( model
                    , Nav.load href
                    )

        ( ChangedUrl url, _ ) ->
            changeRouteTo (Route.fromUrl url) model

        ( ChangedRoute route, _ ) ->
            changeRouteTo route model

        ( ToggledMobileNavbar, _ ) ->
            ( { model | mobileNavbarOpen = not model.mobileNavbarOpen }
            , Cmd.none
            )

        ( CompletedGetUser (Ok viewer), _ ) ->
            let
                session =
                    toSession model
            in
            ( { model
                | mobileNavbarOpen = False
                , pageModel =
                    Redirect <|
                        Session.LoggedIn
                            (Session.getNavKey session)
                            viewer
              }
            , Route.replaceUrl (Session.getNavKey session) Route.Home
            )

        -- TODO handle error
        ( CompletedGetUser (Err err), _ ) ->
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
