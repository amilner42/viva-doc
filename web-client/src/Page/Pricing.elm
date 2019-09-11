module Page.Pricing exposing (Model, Msg(..), init, update, view)

import Html exposing (div, text)
import Session


type alias Model =
    { session : Session.Session }


type Msg
    = NoOp


init : Session.Session -> ( Model, Cmd.Cmd Msg )
init session =
    ( { session = session }, Cmd.none )


view : Model -> { title : String, content : Html.Html Msg }
view model =
    { title = "Pricing", content = div [] [ text "Pricing Page TODO" ] }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
