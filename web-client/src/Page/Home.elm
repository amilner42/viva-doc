module Page.Home exposing (Model, Msg, init, subscriptions, toSession, update, view)

{-| The homepage.
-}

import Api.Core as Core
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
        case model.session of
            Session.LoggedIn _ viewer ->
                renderLoggedInHomePage { viewer = viewer }

            Session.Guest _ ->
                renderLandingPage
    }


renderLoggedInHomePage : { viewer : Viewer.Viewer } -> Html Msg
renderLoggedInHomePage config =
    section
        [ class "section is-medium" ]
        [ div
            [ class "container" ]
            [ div
                [ class "columns is-centered" ]
                [ div [ class "column is-half" ] <|
                    [ h1
                        [ class "title has-text-centered" ]
                        [ text <| Viewer.getUsername config.viewer ]
                    ]
                        ++ List.map
                            (\repo -> p [] [ text <| Core.getRepoFullName repo ])
                            (Viewer.getRepos config.viewer)
                ]
            ]
        ]


renderLandingPage : Html Msg
renderLandingPage =
    div
        []
        [ text "TODO" ]



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
toSession =
    .session
