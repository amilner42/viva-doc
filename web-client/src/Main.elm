module Main exposing (main)

{-| The entry-point to the application. This module should remain minimal.
-}

import Api.Api as Api
import Api.Core as Core
import Browser exposing (Document)
import Browser.Navigation as Nav
import Github
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http exposing (Error(..))
import Json.Decode as Decode
import LocalStorage
import Page
import Page.Blank as Blank
import Page.BranchReview as BranchReview
import Page.Home as Home
import Page.NotFound as NotFound
import Page.OAuthRedirect as OAuthRedirect
import Ports
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
    | BranchReview BranchReview.Model


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
        maybeRoute ->
            ( { mobileNavbarOpen = False
              , pageModel = Redirect <| Session.Guest navKey
              }
            , Api.getUser (CompletedGetUser maybeRoute)
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
                        , loginWithGithub = OnClickLoginWithGithub
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

        Home homeModel ->
            viewPage GotHomeMsg (Home.view homeModel)

        OAuthRedirect oauthRedirect ->
            viewPage GotOAuthRedirectMsg (OAuthRedirect.view oauthRedirect)

        BranchReview branchReviewModel ->
            viewPage GotBranchReviewMsg (BranchReview.view branchReviewModel)



-- UPDATE


type Msg
    = Ignored
    | OnLoadLocalStorage String
    | ChangedUrl Url
    | ClickedLink Browser.UrlRequest
    | OnClickLoginWithGithub
    | ToggledMobileNavbar
    | CompletedGetUser (Maybe Route.Route) (Result (Core.HttpError ()) Viewer.Viewer)
    | Logout
    | CompletedLogout (Result (Core.HttpError ()) ())
    | GotHomeMsg Home.Msg
    | GotBranchReviewMsg BranchReview.Msg
    | GotOAuthRedirectMsg OAuthRedirect.Msg


toSession : Model -> Session
toSession { pageModel } =
    case pageModel of
        Redirect session ->
            session

        NotFound session ->
            session

        Home homeModel ->
            Home.toSession homeModel

        OAuthRedirect oauthRedirect ->
            OAuthRedirect.toSession oauthRedirect

        BranchReview branchReviewModel ->
            BranchReview.toSession branchReviewModel


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

        Just (Route.BranchReview repoId branchName commitId) ->
            BranchReview.init session repoId branchName commitId
                |> updatePageModel BranchReview GotBranchReviewMsg model


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

        -- NOTE: Currently local storage is strictly for temporarily saving a url
        ( OnLoadLocalStorage str, _ ) ->
            ( model
            , case Decode.decodeString LocalStorage.decodeLocalStorage str of
                Ok { relativeUrl } ->
                    Cmd.batch
                        [ Nav.pushUrl currentNavKey relativeUrl
                        , LocalStorage.clearModel
                        ]

                Err err ->
                    Route.replaceUrl currentNavKey Route.Home
            )

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

        ( OnClickLoginWithGithub, _ ) ->
            ( model
            , Cmd.batch
                [ -- Save a url to jump back to after auth if needed
                  case model.pageModel of
                    BranchReview { repoId, branchName, commitId } ->
                        LocalStorage.saveModel
                            { relativeUrl =
                                Route.BranchReview repoId branchName commitId
                                    |> Route.routeToString
                            }

                    Redirect _ ->
                        Cmd.none

                    NotFound _ ->
                        Cmd.none

                    Home _ ->
                        Cmd.none

                    OAuthRedirect _ ->
                        Cmd.none
                , Nav.load <| Github.oAuthSignInLink Github.oauthClientId
                ]
            )

        ( ToggledMobileNavbar, _ ) ->
            ( { model | mobileNavbarOpen = not model.mobileNavbarOpen }
            , Cmd.none
            )

        ( CompletedGetUser maybeRoute (Ok viewer), _ ) ->
            let
                goToRoute =
                    Maybe.withDefault Route.Home maybeRoute
            in
            ( { model
                | mobileNavbarOpen = False
                , pageModel = Redirect <| Session.LoggedIn currentNavKey viewer
              }
            , Route.replaceUrl currentNavKey goToRoute
            )

        -- TODO handle error better (eg. network error)
        ( CompletedGetUser maybeRoute (Err err), _ ) ->
            changeRouteTo maybeRoute model

        ( Logout, _ ) ->
            ( model, Api.getLogout CompletedLogout )

        ( CompletedLogout (Ok _), _ ) ->
            changeRouteTo
                (Just Route.Home)
                { model | pageModel = Redirect <| Session.Guest currentNavKey }

        -- TODO
        ( CompletedLogout (Err _), _ ) ->
            ( model, Cmd.none )

        ( GotHomeMsg pageMsg, Home homeModel ) ->
            Home.update pageMsg homeModel
                |> updatePageModel Home GotHomeMsg model

        ( GotBranchReviewMsg pageMsg, BranchReview branchReviewModel ) ->
            BranchReview.update pageMsg branchReviewModel
                |> updatePageModel BranchReview GotBranchReviewMsg model

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
    Sub.batch
        [ Ports.onLoadFromLocalStorage OnLoadLocalStorage
        , case model.pageModel of
            NotFound _ ->
                Sub.none

            Redirect _ ->
                Sub.none

            Home homeModel ->
                Sub.map GotHomeMsg <| Home.subscriptions homeModel

            OAuthRedirect oauthRedirect ->
                Sub.map GotOAuthRedirectMsg <| OAuthRedirect.subscriptions oauthRedirect

            BranchReview branchReviewModel ->
                Sub.map GotBranchReviewMsg <| BranchReview.subscriptions branchReviewModel
        ]



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
