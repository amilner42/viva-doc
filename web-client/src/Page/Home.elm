module Page.Home exposing (Model, Msg, init, subscriptions, toSession, update, view)

{-| The homepage.
-}

import Api.Core as Core
import Asset
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
    case model.session of
        Session.LoggedIn _ viewer ->
            { title = "Home"
            , content =
                renderLoggedInHomePage { viewer = viewer }
            }

        Session.Guest _ ->
            { title = "Welcome"
            , content =
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
        [ class "columns is-multiline"
        , style "height" "100vh"
        , style "padding-top" "30px"
        ]
    <|
        renderLandingPageIconTextCombo
            ++ renderLandingPageIconTextCombo
            ++ renderLandingPageIconTextCombo
            ++ renderLandingButtons


renderLandingPageIconTextCombo : List (Html msg)
renderLandingPageIconTextCombo =
    [ div [ class "column is-one-quarter" ] []
    , div
        [ class "column is-one-quarter has-text-centered"
        ]
        [ img
            [ Asset.src Asset.vdLandingIcon1, style "height" "200px" ]
            []
        ]
    , div
        [ class "column is-one-quarter"
        , style "height" "200px"
        ]
        [ div
            [ class "level level-item"
            , style "height" "100%"
            , style "padding" "10px"
            ]
            [ text "testing text testing text testing text testing text testing text" ]
        ]
    , div [ class "column is-one-quarter" ] []
    ]


renderLandingButtons : List (Html msg)
renderLandingButtons =
    [ div [ class "column is-one-quarter" ] []
    , div
        [ class "column is-half has-text-centered buttons"
        , style "margin-top" "20px"
        ]
        [ a [ class "button is-large is-light" ] [ text "Read the Docs" ]
        , button [ class "button is-large is-primary" ] [ text "Sign Up" ]
        ]
    , div [ class "column is-one-quarter" ] []
    ]



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
