module Page.BranchReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import Html exposing (Html, div, text)
import Session exposing (Session)
import Viewer



-- MODEL


type alias Model =
    { session : Session.Session
    }


init : Session -> Int -> String -> String -> ( Model, Cmd Msg )
init session repoId branchName commitHash =
    case session of
        -- TODO
        Session.Guest _ ->
            ( { session = session }, Cmd.none )

        Session.LoggedIn _ viewer ->
            let
                -- TODO
                -- Check that the viewer has that repoId listed, they might have had their permissions withdrawn
                -- in the meantime but this is a minimum client-side check.
                userHasAccessToThisRepo =
                    True
            in
            if userHasAccessToThisRepo then
                ( { session = session }
                , Api.getBranchReview repoId branchName commitHash CompletedGetBranchReview
                )

            else
                ( { session = session }, Cmd.none )



-- VIEW


view : Model -> { title : String, content : Html Msg }
view model =
    { title = "Review"
    , content =
        case model.session of
            Session.Guest _ ->
                div [] [ text "You need to be logged in to view this page..." ]

            Session.LoggedIn _ viewer ->
                div [] [ text "Logged in " ]
    }



-- UPDATE


type Msg
    = CompletedGetBranchReview (Result.Result (Core.HttpError ()) Viewer.Viewer)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        CompletedGetBranchReview (Result.Ok viewer) ->
            ( model, Cmd.none )

        -- TODO handle error
        CompletedGetBranchReview (Result.Err err) ->
            ( model, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession =
    .session
