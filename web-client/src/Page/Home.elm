module Page.Home exposing (Model, Msg, init, subscriptions, toSession, update, view)

{-| The homepage.
-}

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Session exposing (Session)
import Viewer



-- MODEL


type alias Model =
    { session : Session
    }


init : Session -> ( Model, Cmd Msg )
init session =
    ( { session = session }, Cmd.none )



-- VIEW


view : Model -> { title : String, content : Html Msg }
view model =
    { title = "Home"
    , content =
        section
            [ class "section is-medium" ]
            [ div
                [ class "container" ]
                [ div
                    [ class "columns is-centered" ]
                    [ div
                        [ class "column is-half" ]
                        (case model.session of
                            Session.Guest _ ->
                                [ h1
                                    [ class "title has-text-centered" ]
                                    [ text "Landing Page" ]
                                ]

                            Session.LoggedIn _ viewer ->
                                [ h1
                                    [ class "title has-text-centered" ]
                                    [ text <| Viewer.getUsername viewer ]
                                ]
                                    ++ List.map
                                        (\repoName -> p [] [ text repoName ])
                                        (Viewer.getRepos viewer)
                        )
                    ]
                ]
            ]
    }



-- UPDATE


type Msg
    = Ignored


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Ignored ->
            ( model, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession model =
    model.session
