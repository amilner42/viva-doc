module Page.Repo exposing (Model, Msg(..), init, update, view)

import Html exposing (div)
import Session


type alias Model =
    { session : Session.Session, repoId : Int }


init : Session.Session -> Int -> ( Model, Cmd.Cmd Msg )
init session repoId =
    ( { session = session, repoId = repoId }, Cmd.none )


view : Model -> { title : String, content : Html.Html msg }
view model =
    { title = "Repo"
    , content = div [] []
    }


type Msg
    = NoOp


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    ( model, Cmd.none )
