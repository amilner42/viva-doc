module Page.BranchReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import Html exposing (Html, div, text)
import Session exposing (Session)
import Viewer



-- MODEL


type alias Model =
    { session : Session.Session
    , repoId : Int
    , branchName : String
    , commitId : String
    }


init : Session -> Int -> String -> String -> ( Model, Cmd Msg )
init session repoId branchName commitId =
    let
        model =
            { session = session, repoId = repoId, branchName = branchName, commitId = commitId }
    in
    case session of
        -- TODO
        Session.Guest _ ->
            ( model, Cmd.none )

        Session.LoggedIn _ viewer ->
            let
                -- TODO
                -- Check that the viewer has that repoId listed, they might have had their permissions withdrawn
                -- in the meantime but this is a minimum client-side check.
                userHasAccessToThisRepo =
                    True
            in
            ( model
            , if userHasAccessToThisRepo then
                Api.getBranchReview repoId branchName commitId CompletedGetBranchReview

              else
                Cmd.none
            )



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
    = CompletedGetBranchReview (Result.Result (Core.HttpError ()) Api.GetBranchReviewResponse)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        CompletedGetBranchReview (Result.Ok (Api.GetBranchReviewResponse branchReview user repos)) ->
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
