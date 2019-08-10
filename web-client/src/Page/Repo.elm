module Page.Repo exposing (Model, Msg(..), init, update, view)

import Api.Api as Api
import Api.Core as Core
import Api.Errors.GetOpenPullRequests as GoprError
import FetchData
import Html exposing (div, text)
import PullRequest
import Session


type alias Model =
    { session : Session.Session
    , repoId : Int
    , openPullRequests : FetchData.FetchData (Core.HttpError GoprError.GetOpenPullRequestsError) (List PullRequest.PullRequest)
    }


init : Session.Session -> Int -> ( Model, Cmd.Cmd Msg )
init session repoId =
    ( { session = session
      , repoId = repoId
      , openPullRequests = FetchData.Loading
      }
    , Api.getOpenPullRequests repoId CompletedGetOpenPullRequests
    )


view : Model -> { title : String, content : Html.Html msg }
view model =
    { title = "Repo"
    , content =
        case model.session of
            Session.Guest _ ->
                div [] [ text "You must be logged in to view this page." ]

            Session.LoggedIn _ viewer ->
                case model.openPullRequests of
                    FetchData.Loading ->
                        div [] [ text "loading..." ]

                    FetchData.Success pullRequests ->
                        div [] [ text "got it" ]

                    FetchData.Failure err ->
                        div [] [ text "some err" ]
    }


type Msg
    = CompletedGetOpenPullRequests (Result.Result (Core.HttpError GoprError.GetOpenPullRequestsError) (List PullRequest.PullRequest))


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        CompletedGetOpenPullRequests (Result.Ok pullRequests) ->
            ( { model | openPullRequests = FetchData.Success pullRequests }, Cmd.none )

        CompletedGetOpenPullRequests (Result.Err err) ->
            ( { model | openPullRequests = FetchData.Failure err }, Cmd.none )
