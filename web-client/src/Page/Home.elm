module Page.Home exposing (Model, Msg, init, subscriptions, toSession, update, view)

{-| The homepage.
-}

import Api.Core as Core
import Asset
import Browser.Navigation as Nav
import Github
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Route
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
            { text = "In a single line tell VivaDoc to monitor critical documentation."
            , image = Asset.vdLandingIcon1
            }
            ++ renderLandingPageIconTextCombo
                { text = "Sit back as VivaDoc keenly monitors all of your critical documentation."
                , image = Asset.vdLandingIcon2
                }
            ++ renderLandingPageIconTextCombo
                { text = "Review critical documentation VivaDoc alerts you about before it makes it into production."
                , image = Asset.vdLandingIcon3
                }
            ++ renderLandingButtons


type alias RenderLandingPageIconTextComboConfig =
    { text : String
    , image : Asset.Image
    }


renderLandingPageIconTextCombo : RenderLandingPageIconTextComboConfig -> List (Html msg)
renderLandingPageIconTextCombo config =
    [ div [ class "column is-one-quarter" ] []
    , div
        [ class "column is-one-quarter has-text-centered" ]
        [ img [ Asset.src config.image, style "height" "190px" ] [] ]
    , div
        [ class "column is-one-quarter"
        , style "height" "190px"
        ]
        [ div
            [ class "level level-item"
            , style "height" "100%"
            , style "padding" "10px"
            ]
            [ text config.text ]
        ]
    , div [ class "column is-one-quarter" ] []
    ]


renderLandingButtons : List (Html Msg)
renderLandingButtons =
    [ div [ class "column is-one-quarter" ] []
    , div
        [ class "column is-half has-text-centered buttons"
        , style "margin-top" "20px"
        ]
        [ a
            [ class "button is-large is-light"
            , Route.href <| Route.Documentation Route.OverviewTab
            , style "min-width" "45%"
            ]
            [ text "Read the docs" ]
        , button
            [ class "button is-large is-primary"
            , onClick SignUpWithGithub
            , style "min-width" "45%"
            ]
            [ text "Sign up with GitHub" ]
        ]
    , div [ class "column is-one-quarter" ] []
    ]



-- UPDATE


type Msg
    = SignUpWithGithub


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        SignUpWithGithub ->
            ( model
            , Nav.load <| Github.oAuthSignInLink Github.oauthClientId
            )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession =
    .session
