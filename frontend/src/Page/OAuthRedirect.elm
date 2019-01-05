module Page.OAuthRedirect exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import Html exposing (..)
import Route
import Session exposing (Session)
import Viewer exposing (Viewer)


type alias Model =
    { session : Session
    , hasGithubCode : Bool
    }



-- INIT


init : Session -> Maybe String -> ( Model, Cmd Msg )
init session maybeCode =
    case maybeCode of
        Nothing ->
            ( { session = session, hasGithubCode = False }
            , Cmd.none
            )

        Just code ->
            ( { session = session, hasGithubCode = True }
            , Api.githubLoginFromCode { code = code } CompletedGithubLogin
            )



-- VIEW


view : Model -> { title : String, content : Html Msg }
view { hasGithubCode } =
    { title = "redirect"
    , content =
        case hasGithubCode of
            False ->
                -- TODO
                div [] [ text "ERROR GETTING GITHUB CODE" ]

            True ->
                div [] [ text "Loading..." ]
    }



-- UPDATE


type Msg
    = CompletedGithubLogin (Result (Core.HttpError ()) Viewer)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        CompletedGithubLogin (Ok viewer) ->
            let
                newSession =
                    Session.fromViewer
                        (Session.getNavKey model.session)
                        (Just viewer)
            in
            ( { model | session = newSession }
            , Route.replaceUrl (Session.getNavKey newSession) Route.Home
            )

        CompletedGithubLogin (Err err) ->
            ( model, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession { session } =
    session
